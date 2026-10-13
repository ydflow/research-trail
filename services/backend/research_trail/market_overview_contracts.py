"""Independent, read-only overview contracts; legacy stock and Agent DTOs stay unchanged."""
from datetime import timedelta
from math import isclose
import re
from typing import Annotated, Literal
from uuid import UUID
from pydantic import AwareDatetime, Field, model_validator
from .provider_contracts import Boundary

MarketId = Literal['CN', 'US', 'CRYPTO']
DETAIL_SYMBOLS = ('AAPL.US', 'MSFT.US', 'NVDA.US', 'TSLA.US')
SOURCE = 'authored-market-v1'


class EquityAsset(Boundary):
    asset_class: Literal['equity'] = 'equity'
    id: str
    market: Literal['CN', 'US']
    symbol: str
    name: str = Field(min_length=1, max_length=80)
    currency: Literal['CNY', 'USD']

    @model_validator(mode='after')
    def identity(self):
        pattern = r'[0-9]{6}\.(SH|SZ)' if self.market == 'CN' else r'[A-Z0-9]{1,6}\.US'
        if not re.fullmatch(pattern, self.symbol) or self.currency != ('CNY' if self.market == 'CN' else 'USD'):
            raise ValueError('证券市场、代码与币种不一致')
        if self.id != f'equity:{self.market}:{self.symbol}':
            raise ValueError('证券标识不一致')
        return self


class CryptoPairAsset(Boundary):
    asset_class: Literal['crypto_pair'] = 'crypto_pair'
    id: str
    market: Literal['CRYPTO'] = 'CRYPTO'
    symbol: str
    name: str = Field(min_length=1, max_length=80)
    base_asset: str = Field(pattern=r'^[A-Z0-9]{2,12}$')
    quote_asset: Literal['USDT'] = 'USDT'
    venue: Literal['authored-fixture'] = 'authored-fixture'

    @model_validator(mode='after')
    def identity(self):
        if self.base_asset == self.quote_asset or self.symbol != f'{self.base_asset}/{self.quote_asset}':
            raise ValueError('交易对标识不一致')
        if self.id != f'crypto_pair:fixture:{self.symbol}':
            raise ValueError('交易对资产标识不一致')
        return self


Asset = Annotated[EquityAsset | CryptoPairAsset, Field(discriminator='asset_class')]
Positive = Annotated[float, Field(gt=0, strict=True)]
Nonnegative = Annotated[float, Field(ge=0, strict=True)]
Finite = Annotated[float, Field(strict=True)]


class OverviewRow(Boundary):
    asset: Asset
    last_price: Positive | None
    reference_price: Positive | None
    change: Finite | None
    change_percent: Finite | None
    change_basis: Literal['previous_close', 'rolling_24h']
    window_start: AwareDatetime | None = None
    window_end: AwareDatetime | None = None
    volume: Nonnegative | None = None
    volume_unit: str
    turnover: Nonnegative | None = None
    turnover_unit: str
    market_cap: Nonnegative | None = None
    market_cap_currency: str | None = None
    market_cap_source: str | None = None
    market_cap_time: AwareDatetime | None = None
    classification: str | None = Field(default=None, max_length=40)
    classification_kind: Literal['unclassified', 'watch_group'] = 'unclassified'
    classification_source: Literal['authored-example-group'] | None = None
    detail_target: Literal['security'] | None = None
    security_symbol: Literal['AAPL.US', 'MSFT.US', 'NVDA.US', 'TSLA.US'] | None = None
    market_time: AwareDatetime

    @model_validator(mode='after')
    def semantics(self):
        crypto = self.asset.asset_class == 'crypto_pair'
        unit = self.asset.quote_asset if crypto else self.asset.currency
        if self.volume_unit != (self.asset.base_asset if crypto else 'shares') or self.turnover_unit != unit:
            raise ValueError('行情单位与资产类别不一致')
        if self.change_basis != ('rolling_24h' if crypto else 'previous_close'):
            raise ValueError('涨跌基准与资产类别不一致')
        if crypto:
            if self.window_start is None or self.window_end != self.market_time or self.window_end - self.window_start != timedelta(hours=24):
                raise ValueError('交易对须声明24小时涨跌窗口')
        elif self.window_start is not None or self.window_end is not None:
            raise ValueError('股票不使用24小时滚动窗口')
        if self.last_price is None or self.reference_price is None:
            if self.change is not None or self.change_percent is not None:
                raise ValueError('缺少涨跌依据')
        elif self.change is None or self.change_percent is None or not isclose(self.change, self.last_price-self.reference_price, abs_tol=1e-8) or not isclose(self.change_percent, self.change/self.reference_price*100, abs_tol=1e-8):
            raise ValueError('涨跌额与百分比不一致')
        if self.market_cap is not None and not all((self.market_cap_currency, self.market_cap_source, self.market_cap_time)):
            raise ValueError('市值缺少来源/币种/时间')
        if self.market_cap is None and any((self.market_cap_currency, self.market_cap_source, self.market_cap_time)):
            raise ValueError('缺市值不得伪造市值元数据')
        if self.classification_kind == 'unclassified':
            if self.classification is not None or self.classification_source is not None:
                raise ValueError('未分类不能附分类信息')
        elif not self.classification or self.classification_source is None:
            raise ValueError('示例分组须声明来源')
        if self.detail_target is not None or self.security_symbol is not None:
            if crypto or self.asset.market != 'US' or self.asset.symbol not in DETAIL_SYMBOLS or self.security_symbol != self.asset.symbol or self.detail_target != 'security':
                raise ValueError('此资产不支持证券详情')
        return self


class OverviewQuery(Boundary):
    request_id: UUID
    market: MarketId
    mode: Literal['simulated', 'real'] = 'simulated'


class OverviewSummary(Boundary):
    total: int = Field(ge=0, le=20)
    advancing: int = Field(ge=0, le=20)
    declining: int = Field(ge=0, le=20)
    unchanged: int = Field(ge=0, le=20)
    missing: int = Field(ge=0, le=20)
    average_change_percent: Finite | None


class MarketOverview(Boundary):
    ok: Literal[True] = True
    request_id: UUID
    market: MarketId
    mode: Literal['simulated'] = 'simulated'
    source: Literal['authored-market-v1'] = SOURCE
    fixture_version: Literal['overview-v1'] = 'overview-v1'
    data_label: Literal['模拟数据'] = '模拟数据'
    status: Literal['ready', 'empty']
    area_encoding: Literal['equal'] = 'equal'
    freshness: Literal['fixture'] = 'fixture'
    freshness_basis: Literal['fixed-authored-example'] = 'fixed-authored-example'
    timezone: Literal['Asia/Shanghai', 'America/New_York', 'UTC']
    fetched_at: AwareDatetime
    served_at: AwareDatetime
    cache_hit: bool = False
    cache_age_seconds: Nonnegative = 0
    rows: list[OverviewRow] = Field(max_length=20)
    summary: OverviewSummary

    @model_validator(mode='after')
    def consistent(self):
        ids = [r.asset.id for r in self.rows]
        if len(ids) != len(set(ids)) or any(r.asset.market != self.market or r.market_time > self.fetched_at for r in self.rows):
            raise ValueError('跨市场、重复资产或获取时间不一致')
        values = [r.change_percent for r in self.rows if r.change_percent is not None]
        expected = (len(self.rows), sum(v > 0 for v in values), sum(v < 0 for v in values), sum(v == 0 for v in values), len(self.rows)-len(values))
        if expected != (self.summary.total, self.summary.advancing, self.summary.declining, self.summary.unchanged, self.summary.missing):
            raise ValueError('样例池统计不一致')
        average = sum(values)/len(values) if values else None
        if (average is None) != (self.summary.average_change_percent is None) or average is not None and not isclose(average, self.summary.average_change_percent, abs_tol=1e-8):
            raise ValueError('样例均值不一致')
        if self.status != ('ready' if self.rows else 'empty') or self.timezone != {'CN':'Asia/Shanghai','US':'America/New_York','CRYPTO':'UTC'}[self.market]:
            raise ValueError('市场状态或时区不一致')
        return self


OverviewCode = Literal['REAL_OVERVIEW_NOT_AUTHORIZED', 'CRYPTO_PROVIDER_NOT_CONNECTED', 'UNCONFIGURED', 'ACCESS_DENIED', 'RATE_LIMITED', 'NETWORK_ERROR', 'TIMEOUT', 'CANCELLED', 'INVALID_RESPONSE', 'REQUEST_LIMIT', 'REQUEST_ID_CONFLICT']


class OverviewFailure(Boundary):
    ok: Literal[False] = False
    request_id: UUID
    market: MarketId
    mode: Literal['simulated', 'real']
    status: Literal['unauthorized', 'unavailable', 'unconfigured', 'restricted', 'rate_limited', 'failed', 'timed_out', 'cancelled', 'busy']
    code: OverviewCode
    message: str
    retryable: bool = False


MarketOverviewResult = MarketOverview | OverviewFailure


class OverviewCancelResult(Boundary):
    request_id: UUID
    cancelled: bool
