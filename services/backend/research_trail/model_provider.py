"""A deterministic rule demonstration, not an LLM or a data provider."""
import re
from typing import Protocol

from .conversation import MODEL_LABEL, ToolArguments, ToolCall, ToolData

SUPPORTED_SCOPE = "当前规则演示只支持带单一US股票代码的行情或K线查询，例如“查询AAPL.US行情”“查看NVDA.US的K线”。模拟数据支持AAPL.US、NVDA.US、MSFT.US、TSLA.US。"


class ModelProvider(Protocol):
    label: str
    def plan(self, text: str) -> ToolCall | None: ...
    def respond(self, data: ToolData) -> str: ...


class FakeModelProvider:
    label = MODEL_LABEL

    def plan(self, text: str) -> ToolCall | None:
        match = re.fullmatch(r"(?:查询|查看)\s*([A-Z0-9]{1,6}\.US)\s*(?:的)?\s*(行情|K线)[。！？?!]?",
                             text.strip(), flags=re.IGNORECASE)
        if match is None:
            return None
        symbol, intent = match.groups()
        return ToolCall(name="market.quote" if intent == "行情" else "market.kline",
                        arguments=ToolArguments(symbol=symbol.upper()))

    def respond(self, data: ToolData) -> str:
        # Every number comes from a validated tool result, never from rule constants.
        if data.kind == "quote":
            detail = f"{data.quote.symbol}最新价 {data.quote.last_price:.2f} {data.quote.currency}"
        else:
            detail = f"{data.symbol}共有{len(data.klines)}根日K线，最后收盘 {data.klines[-1].close:.2f} USD"
        market_time = data.market_time.strftime("%Y-%m-%d %H:%M UTC")
        return f"{MODEL_LABEL}：{detail}。{data.data_label}，固定市场时间{market_time}，非实时行情。"
