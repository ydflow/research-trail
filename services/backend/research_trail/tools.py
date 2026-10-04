"""Named, validated Python tools backed by the same provider as the market API."""
from collections.abc import Callable

from pydantic import TypeAdapter, ValidationError

from .conversation import ErrorPayload, ToolArguments, ToolCall, ToolData, QuoteToolData, KlineToolData
from .market import MarketProvider, MarketSnapshot, UnknownSymbolError

DATA_ADAPTER = TypeAdapter(ToolData)


class ToolExecutionError(Exception):
    def __init__(self, code: str, message: str):
        self.error = ErrorPayload(code=code, message=message)
        super().__init__(message)


class ToolRegistry:
    def __init__(self):
        self._handlers: dict[str, Callable[[ToolArguments], ToolData]] = {}

    def register(self, name: str, handler: Callable[[ToolArguments], ToolData]):
        if name not in ("market.quote", "market.kline") or name in self._handlers:
            raise ValueError("工具名称未允许或已注册")
        self._handlers[name] = handler

    def execute(self, call: ToolCall) -> ToolData:
        handler = self._handlers.get(call.name)
        if handler is None:
            raise ToolExecutionError("UNKNOWN_TOOL", f"工具未注册：{call.name}。")
        # Validate again at the execution boundary, not just in the rule model.
        try:
            arguments = ToolArguments.model_validate(call.arguments.model_dump())
        except ValidationError:
            raise ToolExecutionError("INVALID_ARGUMENT", "工具股票参数不符合US代码契约。") from None
        try:
            data = DATA_ADAPTER.validate_python(handler(arguments).model_dump(mode="json"))
            symbol = data.quote.symbol if data.kind == "quote" else data.symbol
            if data.kind != call.name.split(".")[1] or symbol != arguments.symbol:
                raise ToolExecutionError("INVALID_RESULT", "数据工具返回的类型或股票代码与请求不一致。")
            return data
        except ToolExecutionError:
            raise
        except UnknownSymbolError:
            raise ToolExecutionError("UNKNOWN_SYMBOL", f"未知股票代码：{arguments.symbol}。模拟数据仅支持 AAPL.US、NVDA.US、MSFT.US、TSLA.US。") from None
        except Exception as error:
            # Future providers may include credentials in exception text; retain a public reason.
            raise ToolExecutionError("PROVIDER_ERROR", f"数据工具 {call.name} 执行失败（{type(error).__name__}）；没有可用结果。") from error


def market_tools(provider: MarketProvider) -> ToolRegistry:
    registry = ToolRegistry()

    def snapshot(arguments: ToolArguments):
        # Revalidate the step 2 contract even if an injected provider mutated a DTO.
        return MarketSnapshot.model_validate(provider.snapshot(arguments.symbol).model_dump(mode="json"))

    def quote(arguments: ToolArguments):
        data = snapshot(arguments)
        return QuoteToolData(**data.model_dump(exclude={"quote", "klines", "period"}), quote=data.quote)

    def kline(arguments: ToolArguments):
        data = snapshot(arguments)
        return KlineToolData(**data.model_dump(exclude={"quote", "klines"}), symbol=data.quote.symbol,
                             name=data.quote.name, klines=data.klines)

    registry.register("market.quote", quote)
    registry.register("market.kline", kline)
    return registry
