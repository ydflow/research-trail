"""ResearchTrail-authored engineering cases. No copied Folio cases or scores."""
from .evaluation_contracts import EvaluationCase

def case(identity,title,category,prompt,tool=None,code=None,purpose=''):
    return EvaluationCase(id=identity,title=title,category=category,prompt=prompt,
                          expected_tool=tool,expected_code=code,purpose=purpose)

CASES = [
    case('quote-aapl','行情来源与事实','normal','查询AAPL.US行情','market.quote',purpose='工具、原始价格、模拟标签及固定市场时间'),
    case('kline-nvda','K线证据','normal','查看NVDA.US的K线','market.kline',purpose='同一行情适配链及K线根数/收盘事实'),
    case('unknown-symbol','未知代码拒绝','error','查询ZZZZ.US行情','market.quote','UNKNOWN_SYMBOL','定位到工具结果及错误终态'),
    case('invalid-args','非法参数不执行','error','内部有界非法参数探针',code='INVALID_ARGUMENT',purpose='整批工具校验先于任何执行'),
    case('unknown-tool','非白名单工具拒绝','error','内部未注册工具探针',code='UNKNOWN_TOOL',purpose='拒绝下单式工具，不执行'),
    case('model-shape','模型消息结构错误','error','内部消息形状探针',code='MODEL_RESPONSE_INVALID',purpose='定位模型环节而不是给质量假分'),
    case('tool-budget','工具循环预算','error','内部重复调用探针','market.quote','TOOL_LIMIT','真实AgentRunner受限循环停止'),
    case('provider-error','提供商错误保留','error','查询AAPL.US行情','market.quote','PROVIDER_ERROR','失败工具/错误代码可定位，不回退'),
    case('restart-interrupted','重启中断恢复','recovery','隔离SQLite中断恢复',purpose='实际Store恢复仅写唯一终态、不重新执行工具'),
    case('replay-no-tools','已保存事件重复读取','recovery','隔离SQLite完成事件重读','market.quote',purpose='读取及重复终态不调用工具'),
    case('quote-msft','跨股票事实回归','regression','查询MSFT.US行情','market.quote',purpose='避免回答只匹配固定AAPL价格'),
    case('minimal-redaction','上传最小字段回归','regression','合成敏感字段脱敏探针',purpose='提示、回复、工具参数/结果和人工反馈不能进入上传载荷'),
]
CATALOG = {c.id:c for c in CASES}
