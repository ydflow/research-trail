"""Python owns the bounded screening plan, decisions and evidence."""
from typing import Literal
from uuid import UUID
from pydantic import Field, field_validator
from .provider_contracts import Boundary, ReadQuery, ProviderResult
from .capabilities import CapabilityState
from .workspace_contracts import SymbolInput

ScreeningId = Literal['top-gainers','top-losers','high-volume','unusual-movement','low-valuation',
    'high-roe','revenue-growth','high-dividend','quality-growth','strong-momentum','breakout',
    'oversold','trend-reversal','upcoming-earnings','rating-changes','news-surge','dividend-events']

class ScreeningContext(Boundary):
    provider: Literal['longbridge','massive'] = 'longbridge'
    mode: Literal['simulated','real'] = 'simulated'

class ScreeningInput(ScreeningContext):
    strategy: ScreeningId = 'top-gainers'
    universe: list[str] | None = Field(default=None, min_length=1, max_length=40)
    limit: int = Field(default=20, ge=1, le=40, strict=True)
    request_id: UUID

    @field_validator('universe')
    @classmethod
    def symbols(cls, values):
        if values is None: return None
        result = [SymbolInput(symbol=s).symbol for s in values]
        if len(set(result)) != len(result): raise ValueError('股票池不能包含重复代码。')
        return result

class ScreeningTask(Boundary):
    id: ScreeningId
    title: str
    rule: str
    score_rule: str
    capabilities: list[CapabilityState]

class ScreeningReference(Boundary):
    read_id: str
    pointer: str

class ScreeningMetric(Boundary):
    name: str
    value: str
    unit: str
    formula: str
    inputs: list[ScreeningReference]

class ScreeningDecision(Boundary):
    symbol: str
    name: str
    status: Literal['included','excluded','missing','failed']
    code: str | None = None
    reasons: list[str] = Field(default_factory=list)
    score: str | None = None
    metrics: list[ScreeningMetric] = Field(default_factory=list)

class ScreeningRead(Boundary):
    id: str
    symbol: str
    query: ReadQuery
    status: Literal['pending','running','completed','failed'] = 'pending'
    code: str | None = None
    started_at: str | None = None
    ended_at: str | None = None
    result_hash: str | None = None

class ScreeningSummary(Boundary):
    id: str
    strategy: ScreeningId
    status: Literal['fetching','completed','partial','failed','cancelled','interrupted']
    created_at: str
    candidate_count: int = 0

class ScreeningRun(ScreeningSummary):
    input: ScreeningInput
    task: ScreeningTask
    universe: list[str]
    universe_source: Literal['explicit','watchlist','fixture-catalog']
    reference_time: str
    timeout_seconds: float = 15
    concurrency: int = 4
    reads: list[ScreeningRead]
    decisions: list[ScreeningDecision] = Field(default_factory=list)
    candidates: list[ScreeningDecision] = Field(default_factory=list)
    label: str = '仅筛选这个有界股票池；分数是固定规则分数，不是收益概率。模拟、历史和缺失数据见原始执行记录。未调用LLM。'

class ScreeningEvidence(Boundary):
    run_id: str
    read: ScreeningRead
    result: ProviderResult
