"""Step12 contracts. Financial values are decimal strings, calculated only in Python."""
from decimal import Decimal, InvalidOperation
import re
from typing import Annotated, Literal
from pydantic import Field, field_validator
from .provider_contracts import Boundary, Provenance

Id = Annotated[str, Field(pattern=r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')]
Kind = Literal['manual', 'simulated', 'read_only']
Currency = Annotated[str, Field(pattern=r'^[A-Z]{3}$')]

def decimal_value(value, *, nonnegative=True):
    if not isinstance(value, str) or not re.fullmatch(r'-?\d{1,15}(\.\d{1,6})?', value):
        raise ValueError('数值须为普通十进制，最多15位整数、6位小数。')
    try: result = Decimal(value)
    except InvalidOperation: raise ValueError('无效数值。') from None
    if nonnegative and result < 0: raise ValueError('数量与单价不能为负。')
    return result

def decimal_text(value):
    if value is None: return None
    if value==0: return '0'
    result = format(value, 'f')
    return result.rstrip('0').rstrip('.') if '.' in result else result

class HoldingInput(Boundary):
    symbol: str = Field(pattern=r'^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$')
    currency: Currency
    quantity: str
    cost_price: str | None = None
    market_price: str | None = None

    @field_validator('quantity', 'cost_price', 'market_price')
    @classmethod
    def number(cls, value):
        return decimal_text(decimal_value(value)) if value is not None else None

class CashInput(Boundary):
    currency: Currency
    amount: str | None = None

    @field_validator('amount')
    @classmethod
    def number(cls, value):
        return decimal_text(decimal_value(value, nonnegative=False)) if value is not None else None

class PortfolioSnapshot(Boundary):
    holdings: list[HoldingInput] = Field(default_factory=list, max_length=100)
    cash: list[CashInput] = Field(default_factory=list, max_length=100)

class PortfolioCreate(Boundary):
    name: str = Field(min_length=1, max_length=40)
    kind: Kind = 'manual'

    @field_validator('name')
    @classmethod
    def safe_name(cls, value):
        if not value.strip() or any(ord(c)<32 for c in value): raise ValueError('名称格式无效。')
        return value.strip()

class PortfolioInfo(Boundary):
    id: Id
    name: str
    account_id: Id
    account_name: str
    kind: Kind

class HoldingValue(HoldingInput):
    cost: str | None = None
    market_value: str | None = None
    pnl: str | None = None
    pnl_percent: str | None = None

class CurrencyValue(Boundary):
    currency: Currency
    holdings_count: int
    valued_count: int
    cost: str | None
    known_market_value: str
    market_value: str | None
    pnl: str | None
    cash: str | None
    assets: str | None

class PortfolioView(PortfolioInfo):
    revision: int
    source: Literal['csv-snapshot', 'authored-fixture', 'longbridge-account']
    status: Literal['ready', 'partial', 'empty', 'unverified', 'failed', 'restricted', 'unconfigured']
    holdings: list[HoldingValue]
    currencies: list[CurrencyValue]
    cash_rows: list[CashInput]
    reported_net_assets: list[CashInput] = Field(default_factory=list)
    updated_at: str | None = None
    market_time: str | None = None
    provenance: list[Provenance] = Field(default_factory=list)
    code: str | None = None
    message: str | None = None
    undo_batch: Id | None = None
    limitations: list[str]

class PortfolioId(Boundary):
    portfolio_id: Id

class CsvPreviewInput(PortfolioId):
    csv_text: str = Field(max_length=131072)

class ImportIssue(Boundary):
    line: int
    code: str
    message: str

class ImportPreview(Boundary):
    portfolio_id: Id
    draft_id: Id | None
    revision: int
    expires_in_seconds: int = 600
    can_import: bool
    duplicate: bool
    issues: list[ImportIssue]
    snapshot: PortfolioSnapshot
    valuation: PortfolioView

class ImportConfirm(PortfolioId):
    draft_id: Id

class ImportUndo(PortfolioId):
    batch_id: Id
