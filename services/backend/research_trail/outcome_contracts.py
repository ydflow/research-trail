"""Investment observations are separate from Agent engineering evaluations."""
from decimal import Decimal
from typing import Literal
from pydantic import AwareDatetime, Field, JsonValue, model_validator
from .provider_contracts import Boundary, Provenance

Horizon = Literal['1w', '1m', '3m']
Origin = Literal['prospective', 'retrospective', 'authored-history']
class OutcomeCapture(Boundary):
    report_id: str = Field(pattern=r'^[a-f0-9-]{36}$')
    horizon: Horizon = '1m'

class OutcomeOpinion(Boundary):
    id: str
    report_id: str
    report_version: int
    report_hash: str
    run_id: str
    symbol: str
    strategy: str
    skill_ids: list[str]
    stance: Literal['bullish', 'bearish', 'neutral']
    source_mode: Literal['simulated', 'real']
    analysis_mode: Literal['fixed', 'real']
    origin: Origin
    horizon: Horizon
    research_at: AwareDatetime
    captured_at: AwareDatetime
    window_end: AwareDatetime
    due_at: AwareDatetime
    entry_price: str | None
    entry_market_at: AwareDatetime | None
    entry_fetched_at: AwareDatetime | None
    entry_code: str | None
    provider: Literal['longbridge', 'massive']
    provider_revision: int
    provider_identity: str | None
    evidence_ids: list[str]
    confidence: None = None
    capture_version: str = 'research-trail-capture-v1'

class OutcomeRequest(Boundary):
    request_id: str = Field(pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')

class OutcomeBar(Boundary):
    timestamp: int = Field(strict=True, ge=946684800, le=4102444800)
    close: Decimal = Field(gt=0, max_digits=30, decimal_places=12)

class OutcomeAttempt(Boundary):
    id: str
    opinion_id: str
    request_id: str
    started_at: AwareDatetime
    evaluated_at: AwareDatetime | None
    status: Literal['running', 'pending', 'unable', 'evaluated', 'interrupted']
    code: str | None
    exit_price: str | None = None
    return_percent: str | None = None
    direction_correct: bool | None = None
    maximum_drawdown: str | None = None
    benchmark_return: None = None
    engine_version: str = 'research-trail-outcome-v1'
    bars: list[OutcomeBar] = Field(default_factory=list, max_length=260)
    source_data: list[JsonValue] | None = Field(default=None, max_length=260)
    provenance: Provenance | None = None
    data_hash: str | None = None
    bars_hash: str | None = None
    query: dict | None = None
    price_basis: str = 'unadjusted-daily-close'
    @model_validator(mode='after')
    def no_false_evaluation(self):
        values=(self.exit_price,self.return_percent,self.direction_correct,self.maximum_drawdown)
        if self.status != 'evaluated':
            if any(v is not None for v in values): raise ValueError('非有效评价不得有价格评价值')
        else:
            if self.evaluated_at is None or any(v is None for v in values): raise ValueError('有效评价需要完整数值及完成时点')
            price,change,drawdown=Decimal(self.exit_price),Decimal(self.return_percent),Decimal(self.maximum_drawdown)
            if not all(v.is_finite() for v in (price,change,drawdown)) or price<=0 or not 0<=drawdown<=100:
                raise ValueError('评价数值无效')
        return self

class OutcomeView(Boundary):
    opinion: OutcomeOpinion
    attempts: list[OutcomeAttempt]
    label: str = '不复权日线价格变化及方向匹配，不是账户收益；未计交易成本、分红、拆股或基准超额收益。'

class WeightParameters(Boundary):
    min_samples: int = Field(default=30, ge=30, le=1000, strict=True)
    full_confidence_samples: int = Field(default=100, ge=30, le=10000, strict=True)
    sensitivity: Decimal = Field(default=Decimal('0.5'), ge=0, le=1, max_digits=8, decimal_places=6)
    unable_penalty: Decimal = Field(default=Decimal('0.05'), ge=0, le=Decimal('0.05'), max_digits=8, decimal_places=6)
    @model_validator(mode='after')
    def sample_order(self):
        if self.full_confidence_samples < self.min_samples: raise ValueError('置信样本门槛不能低于最低样本数')
        return self

class WeightChange(OutcomeRequest):
    expected_version: int = Field(ge=1, strict=True)
    reason: str = Field(min_length=1, max_length=240)
    parameters: WeightParameters | None = None
    rollback_version: int | None = Field(default=None, ge=1, strict=True)
    @model_validator(mode='after')
    def one_action(self):
        if (self.parameters is None) == (self.rollback_version is None): raise ValueError('选择参数调整或回滚之一')
        if not self.reason.strip(): raise ValueError('需要说明调整理由')
        return self

class WeightVersion(Boundary):
    version: int
    parent_version: int | None
    rollback_version: int | None
    created_at: AwareDatetime
    reason: str
    parameters: WeightParameters
    calculation_version: str = 'research-trail-calibration-v1'

class WeightHistory(Boundary):
    current_version: int
    versions: list[WeightVersion]

class PerformanceQuery(Boundary):
    horizon: Horizon = '1m'
    source_mode: Literal['simulated', 'real'] = 'real'
    analysis_mode: Literal['fixed', 'real'] = 'real'
    origin: Origin = 'prospective'
    as_of: AwareDatetime | None = None

class PerformanceRow(Boundary):
    kind: Literal['skill', 'strategy']
    key: str
    samples: int
    unable: int
    pending: int
    insufficient_data: bool
    direction_hit_rate: str | None
    average_return: str | None
    median_excess_return: None = None
    unable_rate: str | None
    historical_reliability: str | None
    sample_confidence: str | None
    adaptive_weight: str | None
    evaluation_ids: list[str]

class PerformanceSnapshot(Boundary):
    id: str
    as_of: AwareDatetime
    filter: PerformanceQuery
    policy_version: int
    calculation_version: str = 'research-trail-calibration-v1'
    rows: list[PerformanceRow]
    input_hash: str
    opinion_ids: list[str] = Field(default_factory=list)
    attempt_ids: list[str] = Field(default_factory=list)
    label: str = '至少30个有效样本；样本置信度是样本强度，非预测概率。权重仅供参考，不自动改策略。工具正确率不代表盈利能力。'
