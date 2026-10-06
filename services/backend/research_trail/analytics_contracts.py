"""Step13 deterministic analytics; values are Python decimal strings, never LLM estimates."""
from typing import Annotated, Literal
from pydantic import Field, field_validator
from .provider_contracts import Boundary, Provenance
from .portfolio_contracts import Id, Currency

Symbol = Annotated[str, Field(pattern=r'^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$')]

class AnalyticsOptions(Boundary):
    provider: Literal['longbridge', 'massive'] = 'longbridge'
    mode: Literal['simulated', 'real'] = 'simulated'
    refresh: bool = False

class RiskQuery(AnalyticsOptions):
    portfolio_id: Id

class CompareQuery(AnalyticsOptions):
    symbols: list[Symbol] = Field(min_length=2, max_length=4)
    currency: Currency = 'USD'
    report_year: int = Field(default=2023, ge=1900, le=2100, strict=True)

    @field_validator('symbols')
    @classmethod
    def unique(cls, value):
        if len(set(value)) != len(value): raise ValueError('对比代码不能重复。')
        return value

class AnalysisRead(Boundary):
    symbol: str | None
    capability: str
    status: str
    code: str | None = None
    provenance: Provenance | None = None

class SeriesStats(Boundary):
    symbol: str
    status: Literal['ready', 'missing', 'invalid']
    bars: int = 0
    returns: int = 0
    start: str | None = None
    end: str | None = None
    daily_volatility: str | None = None
    annualized_volatility: str | None = None
    drawdown: str | None = None
    reason: str | None = None

class Allocation(Boundary):
    symbol: str
    quantity: str
    price: str | None
    market_value: str | None
    weight: str | None

class RiskSignal(Boundary):
    kind: str
    severity: Literal['low', 'medium', 'high']
    detail: str
    symbol: str | None = None

class RiskGroup(Boundary):
    currency: Currency
    status: Literal['ready', 'empty', 'partial']
    total_market_value: str | None
    allocation: list[Allocation]
    top1_weight: str | None = None
    top5_weight: str | None = None
    herfindahl: str | None = None
    portfolio_volatility: SeriesStats | None = None
    series: list[SeriesStats]
    signals: list[RiskSignal]
    unavailable: list[str]

class RiskReport(Boundary):
    snapshot_id: str
    calculated_at: str
    portfolio_id: Id
    account_id: Id
    portfolio_revision: int
    account_kind: str
    input_source: str
    input_time: str | None
    input_status: str
    input_code: str | None = None
    input_message: str | None = None
    provider: Literal['longbridge', 'massive']
    mode: Literal['simulated', 'real']
    status: Literal['ready', 'empty', 'partial', 'failed']
    groups: list[RiskGroup]
    reads: list[AnalysisRead]
    summary: str
    limitations: list[str]

class CompareCell(Boundary):
    value: str | None = None
    reason: str | None = None
    currency: str | None = None
    period: str | None = None

class CompareRow(Boundary):
    metric: str
    label: str
    unit: str
    cells: dict[str, CompareCell]

class Comparison(Boundary):
    snapshot_id: str
    calculated_at: str
    symbols: list[str]
    provider: Literal['longbridge', 'massive']
    mode: Literal['simulated', 'real']
    currency: Currency
    report_period: str
    status: Literal['ready', 'partial', 'missing']
    rows: list[CompareRow]
    reads: list[AnalysisRead]
    summary: str
    limitations: list[str]
