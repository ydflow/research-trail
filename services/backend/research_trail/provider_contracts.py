"""Python read-only provider boundary, checked against Folio ba5dcdfd (not imported)."""
from datetime import date, datetime
from typing import Annotated, Literal
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, JsonValue, SecretStr, field_validator, model_validator

ProviderId = Literal['longbridge', 'longbridge-account', 'massive']
Capability = Literal['market.quote', 'market.kline', 'market.intraday', 'market.depth', 'market.trades',
    'market.capitalFlow', 'market.sentiment', 'market.status', 'company.profile', 'company.valuation',
    'company.financials', 'company.dividends', 'company.earnings', 'company.ratings', 'research.news',
    'research.events', 'account.accounts', 'account.portfolio', 'account.positions', 'account.assets', 'account.cashFlow']
MARKET_CAPABILITIES = list(Capability.__args__[:16])
ACCOUNT_CAPABILITIES = list(Capability.__args__[16:])
MASSIVE_CAPABILITIES = ['market.quote', 'market.kline', 'company.profile']
Timeliness = Literal['unknown', 'realtime', 'delayed', 'historical']

class Boundary(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)

class ProviderConfiguration(Boundary):
    enabled: bool = True
    region: Literal['global', 'cn'] = 'global'
    timeout_seconds: int = Field(default=15, ge=1, le=60, strict=True)
    cache_ttl_seconds: int = Field(default=30, ge=0, le=300, strict=True)
    timeliness: Timeliness = 'unknown'
    cli_path: str = Field(default='', max_length=300)

    @field_validator('cli_path')
    @classmethod
    def safe_cli(cls, value):
        if value:
            from pathlib import PureWindowsPath
            p = PureWindowsPath(value)
            if not p.is_absolute() or p.name.lower() != 'longbridge.exe' or any(c in value for c in '\x00\r\n"'):
                raise ValueError('CLI需要本机longbridge.exe的绝对路径。')
        return value

class ProviderCredentials(Boundary):
    api_key: SecretStr | None = None
    app_key: SecretStr | None = None
    app_secret: SecretStr | None = None
    access_token: SecretStr | None = None

    @field_validator('api_key', 'app_key', 'app_secret', 'access_token')
    @classmethod
    def safe_secret(cls, value):
        if value is not None:
            text = value.get_secret_value()
            if not text.strip() or any(c in text for c in '\x00\r\n') or len(text.encode()) > 700:
                raise ValueError('凭证长度或格式不符合要求。')
        return value

    @model_validator(mode='after')
    def credential_bundle(self):
        native = (self.app_key, self.app_secret, self.access_token)
        if not ((self.api_key is not None and not any(native)) or (self.api_key is None and all(native))):
            raise ValueError('保存Massive单项Key或Longbridge三项凭证。')
        return self

class ProviderProfile(ProviderConfiguration):
    provider: ProviderId
    configured: bool
    credential_present: bool
    revision: int
    credential_storage: Literal['windows-credential-manager'] = 'windows-credential-manager'

class ReadQuery(Boundary):
    capability: Capability
    mode: Literal['simulated', 'real'] = 'simulated'
    symbol: str | None = Field(default=None, pattern=r'^[A-Z0-9]{1,6}\.(US|HK|SG|SH|SZ|HAS)$')
    period: Literal['1m', '5m', '15m', '1h', '1d', '1w'] = '1d'
    count: int = Field(default=20, ge=1, le=100, strict=True)
    market: Literal['US', 'HK', 'CN', 'SG'] = 'US'
    start: date | None = None
    end: date | None = None
    kind: Literal['IS', 'BS', 'CF', 'ALL'] = 'ALL'
    report: str | None = Field(default=None,pattern=r'^(annual|interim|quarter|[12][0-9]{3}(Q[1-4]|H[12])?)$')
    event_type: Literal['financial', 'report', 'dividend', 'ipo', 'macrodata', 'closed'] = 'financial'
    use_cache: bool = True

    @model_validator(mode='after')
    def valid_read(self):
        if self.capability not in ('market.sentiment', 'market.status', 'research.events', *ACCOUNT_CAPABILITIES) and self.symbol is None:
            raise ValueError('此能力需要股票代码。')
        if bool(self.start) != bool(self.end) or (self.start and (self.start > self.end or (self.end-self.start).days > 366)):
            raise ValueError('日期必须成对、顺序正确且窗口不超过366天。')
        if self.start and self.capability not in ('market.kline','research.events','account.cashFlow'):
            raise ValueError('此能力不支持日期筛选。')
        if self.symbol and self.capability in ('market.sentiment','market.status','account.accounts','account.portfolio','account.assets'):
            raise ValueError('此能力不支持股票筛选。')
        if (self.report or self.kind!='ALL') and self.capability!='company.financials':
            raise ValueError('财报参数仅用于财报查询。')
        return self

class Provenance(Boundary):
    provider: ProviderId
    transport: Literal['fixture', 'sdk', 'cli', 'http']
    mode: Literal['simulated', 'real']
    data_label: Literal['模拟数据', '真实数据', '延迟行情', '历史行情', '真实数据（延迟未知）']
    timeliness: Timeliness
    timeliness_basis: Literal['fixture', 'historical-request', 'user-declared', 'unknown']
    cached: bool = False
    fetched_at: AwareDatetime
    served_at: AwareDatetime
    market_time: AwareDatetime | None = None
    permission: Literal['unknown', 'request-succeeded'] = 'unknown'
    credential_source: Literal['none', 'system-store', 'external-cli-session'] = 'none'

class ProviderSuccess(Boundary):
    ok: Literal[True] = True
    provider: ProviderId
    capability: Capability
    state: Literal['ready'] = 'ready'
    data: JsonValue
    provenance: Provenance

class ProviderFailure(Boundary):
    ok: Literal[False] = False
    provider: ProviderId
    capability: Capability
    state: Literal['unconfigured', 'disabled', 'restricted', 'unsupported', 'failed', 'timed_out', 'cancelled']
    code: str
    message: str
    retryable: bool = False

ProviderResult = ProviderSuccess | ProviderFailure

class CapabilityView(Boundary):
    provider: ProviderId
    capability: Capability
    transport: Literal['sdk', 'cli', 'http']
    implemented: bool = True
    validation: Literal['unverified', 'simulated', 'real', 'restricted', 'failed'] = 'unverified'
    code: str | None = None
    checked_at: AwareDatetime | None = None
