"""One run-bound, offline report reader; existing stores own every fact."""
from dataclasses import dataclass
import json
import re

from .agent import AgentRunner
from .capabilities import CapabilityRegistry, ToolSpec
from .conversation import (MODEL_LABEL, ReportContextRef, ReportReadArguments, ReportReadSource,
                           ReportReadToolData, ToolSuccess)
from .report_facts import packet, result_hash, resolve_pointer, canonical
from .research_store import ResearchError
from .session_capacity import wire_json, REPORT_RESULT_BYTES
from .session_capacity import json_units
from .openai_provider import ModelError
from .store import MissingRecord, RunStopped
from .tools import ToolRegistry, ToolExecutionError

NAME = 'research.report.read'
SUPPORTED = frozenset(('AAPL.US', 'MSFT.US', 'NVDA.US', 'TSLA.US'))


def require_report_reply(answer):
    # Four thousand characters can serialize much larger with control escapes.
    # Opt-in report replies reserve <=8192 UTF-16 units per persisted text copy.
    if json_units({'text': answer}) > 8192:
        raise ModelError('MODEL_RESPONSE_INVALID', '报告回复超出本次序列化预算；工具证据保留，没有截断成成功。')
    return answer


@dataclass(frozen=True)
class VerifiedReport:
    service: object
    ref: ReportContextRef
    digest: str
    generation: int

    @classmethod
    def prepare(cls, service, ref):
        job, run = validate_saved(service, ref)
        return cls(service, ref.model_copy(deep=True), result_hash(job.model_dump(mode='json')), run.generation)

    def validate(self):
        job, run = validate_saved(self.service, self.ref)
        if run.generation != self.generation or result_hash(job.model_dump(mode='json')) != self.digest:
            raise ResearchError('EVIDENCE_CHANGED')
        return job


def validate_saved(service, ref):
    try:
        job = service.completed(ref.report_id)
    except ResearchError:
        raise
    except Exception:
        raise ResearchError('EVIDENCE_CHANGED') from None
    doc = job.document
    if job.run_id != ref.source_run_id or doc.source_run_id != ref.source_run_id:
        raise ResearchError('REPORT_CONTEXT_MISMATCH')
    if job.mode != 'fixed' or doc.source_mode != 'simulated' or doc.symbol not in SUPPORTED:
        raise ResearchError('REPORT_CONTEXT_UNSUPPORTED')
    try:
        bundle = packet(service.research, ref.source_run_id)
        run = service.research.get(ref.source_run_id)
        for key in ('symbol', 'strategy', 'source_mode', 'provider', 'collection_status', 'source_run_id'):
            if bundle[key] != getattr(doc, key): raise ValueError()
        if len(doc.evidence) > 384 or canonical([f.model_dump(mode='json') for f in doc.evidence]) != canonical([f.model_dump(mode='json') for f in bundle['evidence']]):
            raise ValueError()
        if canonical([g.model_dump(mode='json') for g in doc.gaps]) != canonical([g.model_dump(mode='json') for g in bundle['gaps']]):
            raise ValueError()
        if not doc.evidence or any(f.source_mode != 'simulated' or f.provider != doc.provider or f.run_id != ref.source_run_id for f in doc.evidence):
            raise ValueError()
        ids = {f.id for f in doc.evidence}
        claims = [*doc.synthesis.summary, *doc.synthesis.risks, *doc.synthesis.catalysts, *doc.synthesis.bull_case, *doc.synthesis.bear_case,
                  *(c for section in doc.synthesis.sections for c in section.claims)]
        if any(not set(c.evidence_ids) <= ids for c in claims): raise ValueError()
        if doc.synthesis.forecast and not set(doc.synthesis.forecast.evidence_ids) <= ids: raise ValueError()
    except ResearchError:
        raise ResearchError('EVIDENCE_CHANGED') from None
    except Exception:
        raise ResearchError('EVIDENCE_CHANGED') from None
    return job, run


@dataclass(frozen=True)
class BoundReportRead:
    verified: VerifiedReport
    store: object
    session_id: str
    agent_run_id: str

    def active(self):
        try:
            run = self.store.run(self.session_id, self.agent_run_id)
        except MissingRecord:
            raise RunStopped() from None
        if run.status != 'running': raise RunStopped()

    def validate(self):
        self.active()
        return self.verified.validate()

    def read(self, args):
        ref = self.verified.ref
        if args.report_id != ref.report_id or args.source_run_id != ref.source_run_id:
            raise ToolExecutionError('REPORT_CONTEXT_MISMATCH', '只能读取本次运行显式绑定的报告。')
        try:
            job = self.validate()
            doc = job.document
            facts = doc.evidence[args.evidence_offset:args.evidence_offset + args.evidence_limit]
            sources, originals = [], {}
            for fact in facts:
                self.active()
                if fact.capability not in originals:
                    original = self.verified.service.evidence(ref.report_id, fact.id)
                    originals[fact.capability] = original
                    sources.append(ReportReadSource(capability=fact.capability, provenance=original.result.provenance,
                        step_started_at=original.step_started_at, step_completed_at=original.step_completed_at))
                original = originals[fact.capability]
                if result_hash(original.result.model_dump(mode='json')) != fact.result_hash or canonical(resolve_pointer(original.result.data, fact.pointer)) != canonical(fact.value):
                    raise ResearchError('EVIDENCE_CHANGED')
            ids = {f.id for f in facts}
            summary = [c for c in doc.synthesis.summary if set(c.evidence_ids) <= ids]
            forecast = doc.synthesis.forecast
            include_forecast = bool(forecast and set(forecast.evidence_ids) <= ids)
            next_offset = args.evidence_offset + len(facts)
            data = ReportReadToolData(**ref.model_dump(), symbol=doc.symbol, strategy=doc.strategy,
                report_version=job.version, provider=doc.provider, collection_status=doc.collection_status,
                facts=facts, sources=sources[:16], gaps=doc.gaps[:16], saved_summary=summary,
                saved_forecast=forecast if include_forecast else None, evidence_offset=args.evidence_offset,
                total=len(doc.evidence), returned=len(facts), next_offset=next_offset if next_offset < len(doc.evidence) else None,
                omitted_facts=len(doc.evidence)-len(facts), omitted_sources=len({f.capability for f in doc.evidence})-len(sources[:16]),
                omitted_gaps=max(0, len(doc.gaps)-16), omitted_summary=len(doc.synthesis.summary)-len(summary),
                omitted_forecast=int(bool(forecast) and not include_forecast))
            if len(wire_json(ToolSuccess(data=data).model_dump(mode='json')).encode('utf-8')) > REPORT_RESULT_BYTES:
                raise ToolExecutionError('TOOL_RESULT_TOO_LARGE', '报告证据页超过24KiB；没有自动缩减或继续读取。')
            self.validate()
            return data
        except ResearchError as error:
            raise ToolExecutionError(error.code, '保存报告或原始证据已不可读取；没有重采或回退。') from None


class BoundReportFake:
    """Deterministic actual tool consumption, not an LLM or investment analysis."""
    label = MODEL_LABEL

    def __init__(self, ref): self.ref = ref

    def complete(self, messages, tools, stop, deadline):
        if messages[-1]['role'] != 'tool':
            args = ReportReadArguments(**self.ref.model_dump())
            # Explicit page instruction; no inferred IDs, no automatic next page.
            match = re.search(r'证据偏移\s*(\d{1,3})(?!\d)', messages[-1]['content'])
            if match: args.evidence_offset = int(match[1])
            return {'role': 'assistant', 'content': None, 'tool_calls': [{'id': 'bound-report-read', 'type': 'function',
                'function': {'name': 'research_report_read', 'arguments': args.model_dump_json()}}]}
        data = ReportReadToolData.model_validate(json.loads(messages[-1]['content'])['data'])
        lines = [f'{self.label}：已通过research.report.read读取保存报告 {data.report_id}；采集任务 {data.source_run_id}。',
                 f'{data.symbol} · 模拟数据 · 固定合成器演示；本页{data.returned}/{data.total}条事实，未读{data.omitted_facts}条。']
        for fact in data.facts[:3]:
            lines.append(f'【保存事实】{fact.capability}{fact.pointer} = {canonical(fact.value)}；引用{fact.id}，来源{fact.provider}，采集时间{fact.fetched_at}。')
        summary = next((claim for claim in data.saved_summary if claim.kind != 'fact' and claim.text), None)
        if summary is not None:
            lines.append('【固定摘要／分析演示】' + summary.text)
        lines.append('缺口及遗漏见工具证据卡；分析与未校准预测不是金融事实。此处只处理本次请求，不自动重采或调用真实模型。')
        return {'role': 'assistant', 'content': require_report_reply('\n'.join(lines))}


def bound_runner(verified, store, session_id, run_id):
    bound = BoundReportRead(verified, store, session_id, run_id)
    registry = ToolRegistry(CapabilityRegistry(tool_specs={NAME: ToolSpec(ReportReadArguments, 'research_report')}))
    registry.report_context = verified.ref
    registry.register(NAME, bound.read)
    runner = AgentRunner(BoundReportFake(verified.ref), registry, max_tool_rounds=1)
    runner.report_result_guard = bound.validate
    return runner
