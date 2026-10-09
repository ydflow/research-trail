"""Explicit, bounded model A/B over identical saved facts; no polling side effects."""
from dataclasses import replace
from datetime import datetime, timezone
import threading
import time
from uuid import uuid4
from sqlalchemy import select, func
from .models import ResearchComparisonRecord
from .report_facts import packet, result_hash
from .report_synthesis import FixedReportSynthesizer, LiveReportSynthesizer, validate, validate_forecast_time
from .report_contracts import ReportDocument
from .openai_provider import OpenAIModelProvider, ModelError
from .research_store import ResearchError
from .evaluation import EvaluationError
from .research_evaluation_contracts import (ResearchComparisonView, ResearchCandidate,
    ResearchQualityReview, ResearchRubric)

RUBRIC = ResearchRubric(dimensions={
    'completeness': '所选研究策略覆盖哪些资料；未取得资料和投影限制是否明确列出。',
    'fact_accuracy': '关键事实是否逐项匹配原始证据；引用相关性不能替代内容核对。',
    'source_quality': '来源、时点、真实/模拟标签及资料可靠性是否足以复核。',
    'uncertainty': '区分事实、推断和预测；缺口、反证和概率限制是否说明。',
    'balanced_reasoning': '多空观点是否均有证据，风险是否针对该标的而非空泛模板。',
    'catalyst_conditions': '催化因素是否有触发条件、失效条件，且不把预告写成已发生。',
    'time_horizon': '判断适用期限和复审时间是否清楚，是否混用不同时点资料。',
    'decision_usefulness': '是否提供可验证论点、下一步检查或放弃条件；不以保证盈利评分。'})

def now(): return datetime.now(timezone.utc).isoformat()

def summarize(view):
    view.quality_delta = None
    if view.status in ('cancelled', 'run_error'):
        view.quality_status = 'invalid'
    elif view.status != 'completed' or any(not c.reviews for c in view.candidates):
        view.quality_status = 'not_reviewed'
    else:
        reviews = [c.reviews[-1] for c in view.candidates]
        view.quality_status = 'passed' if all(r.status == 'passed' for r in reviews) else 'quality_failed'
        view.quality_delta = reviews[1].score - reviews[0].score
    return view

class ResearchEvaluationService:
    def __init__(self, database, research, settings, *, transport=None, synthesizer_factory=None):
        self.database, self.research, self.settings = database, research, settings
        self.transport, self.synthesizer_factory = transport, synthesizer_factory
        self.lock = threading.RLock(); self.work = {}; self.closed = False
        with database.write() as db:
            for row in db.scalars(select(ResearchComparisonRecord).where(ResearchComparisonRecord.status == 'running')):
                view = ResearchComparisonView.model_validate(row.payload)
                for candidate in view.candidates:
                    if candidate.status == 'running':
                        candidate.status = 'run_error'; candidate.code = 'APPLICATION_RESTARTED'
                        candidate.failure_stage = 'runtime'; candidate.request_uncertain = view.input.mode == 'real'
                view.status = 'run_error'; view.completed_at = now(); self.save(row, view)

    @staticmethod
    def save(row, view):
        view = summarize(view); row.status = view.status; row.payload = view.model_dump(mode='json')

    @staticmethod
    def row(db, identity):
        row = db.get(ResearchComparisonRecord, str(identity))
        if row is None: raise EvaluationError('RESEARCH_COMPARISON_NOT_FOUND')
        return row

    def get(self, identity):
        with self.database.sessions() as db:
            return ResearchComparisonView.model_validate(self.row(db, identity).payload)

    def history(self):
        with self.database.sessions() as db:
            return [ResearchComparisonView.model_validate(r.payload) for r in db.scalars(
                select(ResearchComparisonRecord).order_by(ResearchComparisonRecord.created_at.desc()).limit(50))]

    def create(self, body):
        fingerprint = result_hash(body.model_dump(mode='json'))
        with self.lock:
            with self.database.sessions() as db:
                old = db.scalar(select(ResearchComparisonRecord).where(ResearchComparisonRecord.request_id == str(body.request_id)))
                if old:
                    if old.request_hash != fingerprint: raise EvaluationError('EXPERIMENT_REQUEST_CONFLICT')
                    return ResearchComparisonView.model_validate(old.payload)
            bundle = packet(self.research, str(body.run_id))
            identity = self.settings.model_identity() if body.mode == 'real' else None
            if body.mode == 'real': self.settings.model_configuration()  # validate only, no network
            frozen = {**bundle, 'evidence': [f.model_dump(mode='json') for f in bundle['evidence']],
                      'gaps': [g.model_dump(mode='json') for g in bundle['gaps']]}
            view = ResearchComparisonView(id=str(uuid4()), input=body, created_at=now(),
                source_hash=result_hash(frozen), configuration_identity=identity, source_mode=bundle['source_mode'],
                candidates=[ResearchCandidate(model=m) for m in body.models])
            with self.database.write() as db:
                if db.scalar(select(func.count()).select_from(ResearchComparisonRecord)) >= 100:
                    raise EvaluationError('RESEARCH_COMPARISON_LIMIT')
                db.add(ResearchComparisonRecord(id=view.id, request_id=str(body.request_id), request_hash=fingerprint,
                    created_at=view.created_at, status=view.status, payload=view.model_dump(mode='json'), bundle=frozen))
            return view

    def start(self, identity):
        with self.lock:
            if self.closed: raise EvaluationError('EVALUATION_CLOSED')
            with self.database.write() as db:
                row = self.row(db, identity); view = ResearchComparisonView.model_validate(row.payload)
                if view.status != 'not_run': return view
                if db.scalar(select(ResearchComparisonRecord.id).where(ResearchComparisonRecord.status == 'running')):
                    raise EvaluationError('EVALUATION_BUSY')
                configuration = None
                if view.input.mode == 'real':
                    with self.settings.lock:
                        if view.configuration_identity != self.settings.model_identity():
                            raise EvaluationError('MODEL_CONFIGURATION_CHANGED')
                        configuration = self.settings.model_configuration()
                        if view.input.reasoning_effort!='default':
                            configuration=replace(configuration,reasoning_effort=view.input.reasoning_effort)
                view.status = 'running'; self.save(row, view)
            stop = threading.Event()
            thread = threading.Thread(target=self.execute, args=(view.id, stop, configuration), daemon=True,
                                      name='research-model-comparison')
            self.work[view.id] = (stop, thread)
            try: thread.start()
            except Exception:
                self.work.pop(view.id, None)
                with self.database.write() as db:
                    row=self.row(db,identity);view.status='run_error';view.completed_at=now();self.save(row,view)
                raise EvaluationError('WORKER_START_FAILED') from None
            return self.get(identity)

    def execute(self, identity, stop, configuration):
        try:
            with self.database.sessions() as db:
                row=self.row(db,identity);initial=ResearchComparisonView.model_validate(row.payload);frozen=row.bundle
            if result_hash(frozen)!=initial.source_hash: raise EvaluationError('RESEARCH_SOURCE_CHANGED')
            from .report_contracts import ReportEvidence, ReportGap
            bundle={**frozen,'evidence':[ReportEvidence.model_validate(f) for f in frozen['evidence']],
                    'gaps':[ReportGap.model_validate(g) for g in frozen['gaps']]}
            for index, candidate in enumerate(initial.candidates):
                if stop.is_set(): break
                with self.database.write() as db:
                    row=self.row(db,identity);view=ResearchComparisonView.model_validate(row.payload)
                    if row.status!='running': return
                    view.candidates[index].status='running';view.candidates[index].request_uncertain=initial.input.mode=='real'
                    self.save(row,view)
                synthesizer=None; result=ResearchCandidate(model=candidate.model)
                def record_request(count):
                    # Persist before sending: cancel/restart must not erase an in-flight charge.
                    with self.database.write() as db:
                        row=self.row(db,identity);view=ResearchComparisonView.model_validate(row.payload)
                        if row.status!='running' or stop.is_set():
                            from .store import RunStopped
                            raise RunStopped()
                        view.candidates[index].requests_started=count
                        view.candidates[index].request_uncertain=True
                        self.save(row,view)
                try:
                    if self.synthesizer_factory:
                        synthesizer=self.synthesizer_factory(candidate.model,configuration)
                    elif configuration is not None:
                        synthesizer=LiveReportSynthesizer(OpenAIModelProvider(replace(configuration,model=candidate.model),transport=self.transport))
                    else: synthesizer=FixedReportSynthesizer()
                    if isinstance(getattr(synthesizer,'model',None),OpenAIModelProvider):
                        synthesizer.model.on_request_started=record_request
                    output=synthesizer.synthesize(bundle,stop,time.monotonic()+120)
                    if stop.is_set(): break
                    synthesis=validate(output,bundle['evidence'])
                    validate_forecast_time(synthesis,bundle,initial.created_at)
                    result.document=ReportDocument(**bundle,synthesis=synthesis)
                    result.status='completed';result.request_uncertain=False
                    result.engineering_checks=['schema-valid','references-bound-to-frozen-facts','same-source-hash']
                except (ModelError,ResearchError) as error:
                    result.status='run_error';result.code=error.error.code if isinstance(error,ModelError) else error.code
                    result.failure_stage=('model-response' if result.code in ('MODEL_RESPONSE_INVALID','MODEL_RESPONSE_LIMIT') else 'model-transport') if isinstance(error,ModelError) else 'report-validation'
                    result.request_uncertain=result.code in ('MODEL_NETWORK_ERROR','MODEL_TIMEOUT')
                except Exception:
                    result.status='run_error';result.code='RESEARCH_EVALUATOR_ERROR';result.failure_stage='evaluator'
                    result.request_uncertain=initial.input.mode=='real'
                result.requests_started=getattr(getattr(synthesizer,'model',None),'requests_started',0)
                result.response_diagnostics=getattr(getattr(synthesizer,'model',None),'last_response_info',None)
                with self.database.write() as db:
                    row=self.row(db,identity);view=ResearchComparisonView.model_validate(row.payload)
                    if row.status!='running' or stop.is_set(): return
                    view.candidates[index]=result;self.save(row,view)
            with self.database.write() as db:
                row=self.row(db,identity);view=ResearchComparisonView.model_validate(row.payload)
                if row.status!='running': return
                view.status='run_error' if any(c.status!='completed' for c in view.candidates) else 'completed'
                view.completed_at=now();self.save(row,view)
        except Exception:
            with self.database.write() as db:
                row=self.row(db,identity);view=ResearchComparisonView.model_validate(row.payload)
                if row.status=='running':
                    view.status='run_error';view.completed_at=now()
                    for c in view.candidates:
                        if c.status in ('not_run','running'):
                            c.status='run_error';c.code='RESEARCH_EVALUATOR_ERROR';c.failure_stage='evaluator'
                    self.save(row,view)
        finally:
            with self.lock:self.work.pop(identity,None)

    def cancel(self, identity):
        with self.lock:
            pair=self.work.get(str(identity))
            if pair:pair[0].set()
            with self.database.write() as db:
                row=self.row(db,identity);view=ResearchComparisonView.model_validate(row.payload)
                if view.status in ('not_run','running'):
                    for c in view.candidates:
                        if c.status in ('not_run','running'):c.status='cancelled';c.code='EVALUATION_CANCELLED';c.failure_stage='runtime'
                    view.status='cancelled';view.completed_at=now();self.save(row,view)
            return self.get(identity)

    def review(self, identity, body):
        with self.database.write() as db:
            row=self.row(db,identity);view=ResearchComparisonView.model_validate(row.payload)
            for candidate in view.candidates:
                for previous in candidate.reviews:
                    if previous.request_id==body.request_id:
                        if previous.model_dump(include=set(type(body).model_fields))!=body.model_dump():
                            raise EvaluationError('FEEDBACK_REQUEST_CONFLICT')
                        return view
            if view.status!='completed':raise EvaluationError('QUALITY_REQUIRES_VALID_EXPERIMENT')
            candidate=view.candidates[body.candidate]
            if candidate.status!='completed' or candidate.document is None:raise EvaluationError('QUALITY_REQUIRES_VALID_REPORT')
            if body.expected_version!=len(candidate.reviews):raise EvaluationError('QUALITY_VERSION_CONFLICT')
            if len(candidate.reviews)>=100:raise EvaluationError('QUALITY_REVIEW_LIMIT')
            ids={f.id for f in candidate.document.evidence}
            if any(i not in ids for r in body.ratings.values() for i in r.evidence_ids):raise EvaluationError('QUALITY_EVIDENCE_INVALID')
            score=sum(r.score for r in body.ratings.values())/len(body.ratings)/5
            review=ResearchQualityReview(**body.model_dump(),version=len(candidate.reviews)+1,created_at=now(),score=score,
                status='passed' if all(r.score>=3 for r in body.ratings.values()) else 'quality_failed')
            candidate.reviews.append(review);self.save(row,view)
        return view

    def close(self):
        with self.lock:
            self.closed=True;pairs=list(self.work.items())
        for identity,(_,thread) in pairs:
            self.cancel(identity);thread.join(0.5)
