"""Typed security pages; raw SDK objects and private configuration never cross this boundary."""
from typing import Literal
from pydantic import AwareDatetime, Field
from .provider_contracts import Boundary, Provenance
from .market import Kline

SecurityView = Literal['watchlist', 'overview', 'quote', 'kline', 'financials', 'news', 'status']
Symbol = str

class SymbolInput(Boundary):
    symbol: str = Field(pattern=r'^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$')

class WatchEntry(SymbolInput):
    name: str

class WorkspaceState(Boundary):
    revision: int
    active_symbol: str | None
    entries: list[WatchEntry]

class SecurityQuery(Boundary):
    view: SecurityView
    provider: Literal['longbridge', 'massive'] = 'longbridge'
    mode: Literal['simulated', 'real'] = 'simulated'
    symbol: str | None = Field(default=None, pattern=r'^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$')
    period: Literal['1m', '5m', '15m', '1h', '1d', '1w'] = '1d'
    kind: Literal['ALL', 'IS', 'BS', 'CF'] = 'ALL'
    report: Literal['annual', 'interim', 'quarter'] = 'annual'
    offset: int = Field(default=0, ge=0, le=16, strict=True)

class Metric(Boundary):
    label: str
    value: float | str | None = None
    unit: str | None = None

class News(Boundary):
    id: str
    title: str | None = None
    summary: str | None = None
    source: str | None = None
    url: str | None = None
    published_at: AwareDatetime | None = None

class FinancialRow(Boundary):
    statement: Literal['IS', 'BS', 'CF']
    label: str
    period: str | None = None
    currency: str | None = None
    value: float | None = None

class TradingStatus(Boundary):
    market: str
    status: str | None = None
    market_time: AwareDatetime | None = None

class SecurityBlock(Boundary):
    title: str
    capability: str
    symbol: str | None = None
    status: Literal['ready', 'missing', 'failed', 'restricted', 'unsupported', 'unconfigured', 'disabled', 'timed_out', 'cancelled']
    code: str | None = None
    message: str | None = None
    provenance: Provenance | None = None
    metrics: list[Metric] = Field(default_factory=list)
    bars: list[Kline] = Field(default_factory=list)
    news: list[News] = Field(default_factory=list)
    financials: list[FinancialRow] = Field(default_factory=list)
    markets: list[TradingStatus] = Field(default_factory=list)

class SecurityPage(Boundary):
    view: SecurityView
    symbol: str | None
    provider: Literal['longbridge', 'massive']
    mode: Literal['simulated', 'real']
    status: Literal['ready', 'missing', 'partial', 'failed']
    requested_at: AwareDatetime
    blocks: list[SecurityBlock]
