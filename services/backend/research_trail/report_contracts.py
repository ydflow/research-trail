"""Structured synthesis references collected facts; model prose is never market data."""
from typing import Literal
from pydantic import Field, StrictBool, StrictFloat, StrictInt, StrictStr
from .provider_contracts import Boundary, ProviderSuccess
from .calendar_contracts import EventResearchContext

class ReportGenerate(Boundary):
    mode: Literal['fixed', 'real'] = 'fixed'
    request_id: str | None = Field(default=None, pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')

class ReportClaim(Boundary):
    kind: Literal['fact', 'analysis', 'prediction']
    text: str = Field(default='', max_length=480)
    evidence_ids: list[str] = Field(min_length=1, max_length=8)

class ReportSection(Boundary):
    key: str = Field(pattern=r'^[a-z][a-z-]{0,39}$')
    title: str = Field(min_length=1, max_length=60)
    claims: list[ReportClaim] = Field(min_length=1, max_length=8)

class ReportSynthesis(Boundary):
    stance: Literal['bullish', 'bearish', 'neutral']
    summary: list[ReportClaim] = Field(min_length=1, max_length=4)
    sections: list[ReportSection] = Field(min_length=1, max_length=8)
    risks: list[ReportClaim] = Field(min_length=1, max_length=4)
    catalysts: list[ReportClaim] = Field(min_length=1, max_length=4)
    bull_case: list[ReportClaim] = Field(min_length=1, max_length=4)
    bear_case: list[ReportClaim] = Field(min_length=1, max_length=4)

class ReportEvidence(Boundary):
    id: str
    run_id: str
    capability: str
    ordinal: int
    pointer: str
    value: StrictBool | StrictInt | StrictFloat | StrictStr
    result_hash: str
    provider: str
    source_mode: Literal['simulated', 'real']
    fetched_at: str

class ReportGap(Boundary):
    scope: Literal['capability', 'field', 'skill', 'projection']
    key: str
    code: str

class ReportDocument(Boundary):
    symbol: str
    strategy: str
    source_mode: Literal['simulated', 'real']
    provider: str
    collection_status: str
    source_run_id: str
    evidence: list[ReportEvidence]
    gaps: list[ReportGap]
    synthesis: ReportSynthesis
    event_context: EventResearchContext | None = None
    disclaimer: str = '事实值来自能力执行记录；分析与预测来自合成器。引用可追溯不等于论断正确。'

class ReportSummary(Boundary):
    id: str
    run_id: str
    version: int
    symbol: str
    mode: Literal['fixed', 'real']
    status: Literal['generating', 'completed', 'failed', 'cancelled', 'interrupted']
    code: str | None
    started_at: str
    completed_at: str | None
    requests_started: int
    request_uncertain: bool

class ReportJob(ReportSummary):
    document: ReportDocument | None

class ReportOriginal(Boundary):
    evidence: ReportEvidence
    step_started_at: str
    step_completed_at: str
    result: ProviderSuccess

class ReportMarkdown(Boundary):
    filename: str
    content: str

class ReportDiffInput(Boundary):
    before_id: str
    after_id: str

class ReportChange(Boundary):
    kind: Literal['fact', 'gap', 'analysis']
    key: str
    before: str | None
    after: str | None
    before_evidence: str | None = None
    after_evidence: str | None = None

class ReportDiff(Boundary):
    before_id: str
    after_id: str
    symbol: str
    source_changed: bool
    changes: list[ReportChange]
    label: str = '比较两份已保存报告；字段或文字变化不代表论断已证明，也不自动推断投资结果。'
