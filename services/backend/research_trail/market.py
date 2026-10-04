"""Authored offline examples; independent of any present or future model provider."""
from datetime import datetime, timezone
from math import isclose
from typing import Literal, Protocol

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, model_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class MarketSymbol(Contract):
    symbol: str
    name: str


class Quote(Contract):
    symbol: str
    name: str
    currency: Literal["USD"] = "USD"
    last_price: float = Field(gt=0)
    previous_close: float = Field(gt=0)
    change: float
    change_percent: float
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    volume: int = Field(ge=0)
    market_time: AwareDatetime

    @model_validator(mode="after")
    def consistent(self):
        if not self.low <= min(self.open, self.last_price) <= max(self.open, self.last_price) <= self.high:
            raise ValueError("Quote OHLC range is inconsistent")
        if not isclose(self.change, self.last_price - self.previous_close, abs_tol=0.000001):
            raise ValueError("Quote change is inconsistent")
        if not isclose(self.change_percent, self.change / self.previous_close * 100, abs_tol=0.000001):
            raise ValueError("Quote percentage is inconsistent")
        return self


class Kline(Contract):
    timestamp: int = Field(gt=0, description="UTC Unix seconds, never milliseconds")
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    close: float = Field(gt=0)
    volume: int = Field(ge=0)

    @model_validator(mode="after")
    def consistent(self):
        if not self.low <= min(self.open, self.close) <= max(self.open, self.close) <= self.high:
            raise ValueError("Kline OHLC range is inconsistent")
        return self


class MarketSnapshot(Contract):
    source: Literal["fixture"] = "fixture"
    data_label: Literal["模拟数据"] = "模拟数据"
    fixture_version: Literal["authored-v1"] = "authored-v1"
    period: Literal["1d"] = "1d"
    market_time: AwareDatetime
    fetched_at: AwareDatetime
    quote: Quote
    klines: list[Kline] = Field(min_length=2)

    @model_validator(mode="after")
    def consistent(self):
        timestamps = [bar.timestamp for bar in self.klines]
        if timestamps != sorted(set(timestamps)):
            raise ValueError("Klines must have unique ascending timestamps")
        last = self.klines[-1]
        if last.timestamp != int(self.market_time.timestamp()) or self.quote.market_time != self.market_time:
            raise ValueError("Market timestamps differ")
        if (last.open, last.high, last.low, last.close, last.volume) != (
            self.quote.open, self.quote.high, self.quote.low, self.quote.last_price, self.quote.volume
        ):
            raise ValueError("Quote and last candle differ")
        if self.quote.previous_close != self.klines[-2].close:
            raise ValueError("Previous close differs")
        return self


class MarketError(Contract):
    code: Literal["UNKNOWN_SYMBOL"]
    message: str
    symbol: str


class UnknownSymbolError(ValueError):
    pass


class MarketProvider(Protocol):
    def symbols(self) -> list[MarketSymbol]: ...
    def snapshot(self, symbol: str) -> MarketSnapshot: ...


# These deliberately authored prices are not historical exchange data.
_EXAMPLES = (
    ("AAPL.US", "Apple", (180, 182, 181, 184, 183, 185, 187, 186, 188, 189.43)),
    ("NVDA.US", "NVIDIA", (830, 840, 835, 850, 860, 855, 870, 865, 876, 880.12)),
    ("MSFT.US", "Microsoft", (398, 401, 400, 404, 403, 407, 409, 408, 410, 412.60)),
    ("TSLA.US", "Tesla", (190, 187, 189, 185, 183, 180, 182, 179, 178, 175.22)),
)
_DATES = (2, 3, 4, 5, 8, 9, 10, 11, 12, 16)
MARKET_TIME = datetime(2024, 1, 16, 21, tzinfo=timezone.utc)


class FixtureMarketProvider:
    def symbols(self) -> list[MarketSymbol]:
        return [MarketSymbol(symbol=symbol, name=name) for symbol, name, _ in _EXAMPLES]

    def snapshot(self, symbol: str) -> MarketSnapshot:
        spec = next((item for item in _EXAMPLES if item[0] == symbol), None)
        if spec is None:
            raise UnknownSymbolError(symbol)
        _, name, closes = spec
        bars = []
        for index, (day, close) in enumerate(zip(_DATES, closes, strict=True)):
            opening = closes[index - 1] if index else close - 1
            bars.append(Kline(
                timestamp=int(datetime(2024, 1, day, 21, tzinfo=timezone.utc).timestamp()),
                open=opening, high=round(max(opening, close) + 2, 2),
                low=round(min(opening, close) - 2, 2), close=close,
                volume=1_000_000 + index * 100_000,
            ))
        last = bars[-1]
        change = round(last.close - bars[-2].close, 2)
        return MarketSnapshot(
            market_time=MARKET_TIME, fetched_at=datetime.now(timezone.utc), klines=bars,
            quote=Quote(symbol=symbol, name=name, last_price=last.close,
                        previous_close=bars[-2].close, change=change,
                        change_percent=change / bars[-2].close * 100,
                        open=last.open, high=last.high, low=last.low, volume=last.volume,
                        market_time=MARKET_TIME),
        )
