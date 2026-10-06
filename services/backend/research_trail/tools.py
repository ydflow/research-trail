"""Named, validated Python tools backed by the same provider as the market API."""
from collections.abc import Callable

from pydantic import TypeAdapter, ValidationError

from .conversation import ErrorPayload, ToolArguments, ToolCall, ToolData, QuoteToolData, KlineToolData
from .market import MarketProvider, MarketSnapshot, UnknownSymbolError
from .capabilities import CapabilityRegistry, TOOL_SPECS

ARGUMENTS = {name: spec.arguments for name, spec in TOOL_SPECS.items()}
RESULT_KINDS = {name: spec.result_kind for name, spec in TOOL_SPECS.items()}

DATA_ADAPTER = TypeAdapter(ToolData)


class ToolExecutionError(Exception):
    def __init__(self, code: str, message: str):
        self.error = ErrorPayload(code=code, message=message)
        super().__init__(message)


class ToolRegistry:
    def __init__(self, capabilities=None):
        self.capabilities = capabilities or CapabilityRegistry()

    @property
    def _handlers(self):
        return self.capabilities.handlers

    def register(self, name: str, handler: Callable[[ToolArguments], ToolData]):
        self.capabilities.register_tool(name, handler)

    def definitions(self):
        # Wire names cannot contain dots; map back only through this registered allowlist.
        result=[]
        for name in self._handlers:
            if not self.capabilities.tool_available(name): continue
            schema=ARGUMENTS[name].model_json_schema()
            schema['required']=list(schema['properties'])
            result.append({"type":"function","function":{"name":name.replace('.', '_'),
                "description":"Read-only "+name+"; Python computed facts; inspect source, currency and missing data. Default simulated mode. Portfolio ID must be supplied by user; never guess.",
                "parameters":schema,"strict":True}})
        return result

    def decode(self, name, arguments):
        allowed = {key.replace(".", "_"): key for key in self._handlers if self.capabilities.tool_available(key)}
        if name not in allowed:
            raise ToolExecutionError("UNKNOWN_TOOL", "模型请求的工具未注册或不是允许的只读工具。")
        try:
            return ToolCall(name=allowed[name], arguments=ARGUMENTS[allowed[name]].model_validate(arguments))
        except ValidationError:
            raise ToolExecutionError("INVALID_ARGUMENT", "模型工具参数不符合注册工具契约。") from None

    def execute(self, call: ToolCall) -> ToolData:
        handler = self._handlers.get(call.name)
        if handler is None or not self.capabilities.tool_available(call.name):
            raise ToolExecutionError("UNKNOWN_TOOL", f"工具未注册：{call.name}。")
        # Validate again at the execution boundary, not just in the rule model.
        try:
            arguments = ARGUMENTS[call.name].model_validate(call.arguments.model_dump())
        except ValidationError:
            raise ToolExecutionError("INVALID_ARGUMENT", "工具股票参数不符合US代码契约。" if call.name.startswith('market.') else "工具参数不符合注册契约。") from None
        try:
            data = DATA_ADAPTER.validate_python(handler(arguments).model_dump(mode="json"))
            valid = data.kind == RESULT_KINDS[call.name]
            if not valid: raise ToolExecutionError('INVALID_RESULT','工具返回的结果类型与请求不符。')
            if data.kind in ('quote','kline'):
                valid = valid and (data.quote.symbol if data.kind=='quote' else data.symbol)==arguments.symbol
            elif data.kind=='risk': valid=valid and data.report.portfolio_id==arguments.portfolio_id and data.report.provider==arguments.provider and data.report.mode==arguments.mode
            else: valid=valid and data.report.symbols==arguments.symbols and data.report.currency==arguments.currency and data.report.provider==arguments.provider and data.report.mode==arguments.mode and data.report.report_period==f'{arguments.report_year} Annual'
            if not valid:
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
