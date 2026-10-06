"""A deterministic rule demonstration, not an LLM or a data provider."""
import re
from typing import Protocol

from .conversation import MODEL_LABEL, ToolArguments, ToolCall, ToolData
from .analytics_contracts import RiskQuery, CompareQuery

SUPPORTED_SCOPE = "当前规则演示只支持带单一US代码的行情/K线、分析组合UUID风险或对比2—4只代码，例如“查询AAPL.US行情”“查看NVDA.US的K线”“分析组合<完整ID>风险”“对比AAPL.US MSFT.US”。模拟数据支持AAPL.US、NVDA.US、MSFT.US、TSLA.US。"


class ModelProvider(Protocol):
    label: str
    def plan(self, text: str) -> ToolCall | None: ...
    def respond(self, data: ToolData) -> str: ...


class FakeModelProvider:
    label = MODEL_LABEL

    def plan(self, text: str) -> ToolCall | None:
        risk=re.fullmatch(r'分析组合([0-9a-f-]{36})风险',text.strip())
        if risk:
            try: return ToolCall(name='portfolio.risk',arguments=RiskQuery(portfolio_id=risk[1]))
            except ValueError: return None
        compare=re.fullmatch(r'对比\s*((?:[A-Z0-9]{1,6}\.(?:US|HK|SG|SH|SZ|HAS)[\s,，]*){2,4})',text.strip())
        if compare:
            try: return ToolCall(name='stocks.compare',arguments=CompareQuery(symbols=re.findall(r'[A-Z0-9]{1,6}\.(?:US|HK|SG|SH|SZ|HAS)',compare[1])))
            except ValueError: return None
        match = re.fullmatch(r"(?:查询|查看)\s*([A-Z0-9]{1,6}\.US)\s*(?:的)?\s*(行情|K线)[。！？?!]?",
                             text.strip(), flags=re.IGNORECASE)
        if match is None:
            return None
        symbol, intent = match.groups()
        return ToolCall(name="market.quote" if intent == "行情" else "market.kline",
                        arguments=ToolArguments(symbol=symbol.upper()))

    def respond(self, data: ToolData) -> str:
        if data.kind in ('risk','compare'):
            return f'{MODEL_LABEL}：{data.report.summary}。Python确定性计算，{data.report.mode}行情，快照{data.report.snapshot_id}；缺失值与方法限制见工具卡片。'
        # Every number comes from a validated tool result, never from rule constants.
        if data.kind == "quote":
            detail = f"{data.quote.symbol}最新价 {data.quote.last_price:.2f} {data.quote.currency}"
        else:
            detail = f"{data.symbol}共有{len(data.klines)}根日K线，最后收盘 {data.klines[-1].close:.2f} USD"
        market_time = data.market_time.strftime("%Y-%m-%d %H:%M UTC")
        return f"{MODEL_LABEL}：{detail}。{data.data_label}，固定市场时间{market_time}，非实时行情。"
