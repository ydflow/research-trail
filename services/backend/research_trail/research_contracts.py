"""Python-owned collection contracts. A collection is not a research report."""
from typing import Literal
from pydantic import AwareDatetime, Field
from .provider_contracts import Boundary, ReadQuery, ProviderSuccess
from .capabilities import CapabilityState

StrategyId = Literal['comprehensive', 'value', 'growth', 'technical', 'earnings', 'event-driven', 'risk-review', 'income']
ResearchStatus = Literal['fetching', 'collected', 'partial', 'failed', 'cancelled', 'interrupted']
StepStatus = Literal['queued', 'running', 'success', 'failed', 'unavailable', 'timed_out', 'cancelled', 'interrupted']

class ResearchInput(Boundary):
    symbol: str = Field(pattern=r'^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$')
    strategy: StrategyId = 'comprehensive'
    mode: Literal['simulated', 'real'] = 'simulated'
    provider: Literal['longbridge', 'massive'] = 'longbridge'
    concurrency: int = Field(default=4, ge=1, le=4, strict=True)

class ResearchStrategy(Boundary):
    id: StrategyId
    name: str
    description: str
    skill_ids: list[str]
    capability_ids: list[str]

class PlannedSkill(Boundary):
    id: str
    status: Literal['ready', 'partial', 'unavailable', 'disabled', 'invalid', 'missing']
    code: str

class PlannedRead(Boundary):
    capability: str
    query: ReadQuery
    availability: CapabilityState

class ResearchPlan(Boundary):
    input: ResearchInput
    source: str
    provider_revision: int
    provider_identity: str | None = None
    timeout_seconds: float
    skills: list[PlannedSkill]
    reads: list[PlannedRead]
    label: str = '仅结构化数据采集；策略名称不代表指标、投资结论或报告已实现'

class ResearchStep(Boundary):
    capability: str
    ordinal: int
    status: StepStatus
    code: str | None
    started_at: AwareDatetime | None
    completed_at: AwareDatetime | None
    has_result: bool

class ResearchSummary(Boundary):
    id: str
    symbol: str
    strategy: StrategyId
    mode: Literal['simulated', 'real']
    provider: Literal['longbridge', 'massive']
    status: ResearchStatus
    started_at: AwareDatetime
    completed_at: AwareDatetime | None
    total: int
    completed: int
    succeeded: int
    failed: int
    generation: int
    parent_run_id: str | None
    abandoned_at: AwareDatetime | None

class ResearchRun(ResearchSummary):
    plan: ResearchPlan
    steps: list[ResearchStep]

class ResearchData(Boundary):
    run_id: str
    capability: str
    result: ProviderSuccess

class RecoveryAction(Boundary):
    request_id: str = Field(pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')

class RecoveryView(Boundary):
    run_id: str
    checkpoint_id: int | None
    generation: int
    stage: Literal['collecting','collection_interrupted','report_generating','awaiting_report','completed','no_data','abandoned','blocked']
    resume_allowed: bool
    code: str
    reuse_capabilities: list[str]
    remaining_capabilities: list[str]
    report_ids: list[str]
    warnings: list[str]
    model_request_uncertain: bool
    label: str = '恢复保留原任务并复用采集；重新发起创建新任务并重新采集。恢复不会调用模型，报告须另行显式生成。'
