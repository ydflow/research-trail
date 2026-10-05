# 第10步：固定 Folio 基线与 Python 能力覆盖

核对日期：2026-10-05。固定参考提交：`ba5dcdfd31b162f5edb8b908f7f099a560389326`，来源 [helsome/folio](https://github.com/helsome/folio)。本表核对能力和参数语义，不表示真实行情或账户权限通过。

基线文件：`packages/shared/src/providers/longbridge/adapter.ts`（16项）、`longbridge/broker.ts`（5项）、`massive/adapter.ts`（3项）；CLI参数及JSON字段核对 `packages/longbridge-tools/src/tools`、`parser.ts`、`normalizer.ts`。这些是只读参考；本步Python为新实现，没有导入原TS业务内核、原账户数据或作者历史。既有出处、版权声明和EVIDENCE第9—11节用户确认授权保持；未独立核验原始授权文件，不宣称全仓MIT。

采用当前官方包 `longbridge==5.2.0`，锁入uv.lock；原longport包改名的说明见 [官方SDK入口](https://open.longbridge.com/sdk)。方法与参数以已安装5.2.0的 `longbridge/openapi.pyi` 及运行时类核对，而非只按旧博客猜测SDK缺口。另见 [官方Python SDK](https://longbridge.github.io/openapi/python/)、[CLI](https://open.longbridge.com/docs/cli)、[错误码](https://open.longbridge.com/docs/error-codes)。Massive沿固定基线REST语义使用现有httpx，依据 [官方REST文档](https://massive.com/docs/rest/stocks/overview)及 [官方Python客户端](https://github.com/massive-com/client-python)核对认证方式；未额外安装Massive SDK。Longbridge依赖来源、上游两份许可文本与wheel分发核验边界另保留在 [NOTICE](third-party/longbridge/NOTICE)；没有据此把Folio或研迹整仓标为MIT。

| 提供商/基线能力 | 当前SDK或REST支持 | Python实现及边界 | 验证 |
| --- | --- | --- | --- |
| Longbridge market.quote | QuoteContext.quote | 单股票最新价/前收/涨跌/市场时间；缺价报NO_DATA | 假响应通过；真实未验证 |
| market.kline | candlesticks / history_candlesticks_by_date | 1m/5m/15m/1h/1d/1w，不复权；成对日期，最多100根 | 假响应通过；真实未验证 |
| market.intraday | intraday | 原SDK DTO公开字段，有界截取 | 假响应通过；真实未验证 |
| market.depth | depth | SDK买卖档位 | 假响应通过；真实未验证 |
| market.trades | trades | 有界逐笔；只读成交数据，不是交易操作 | 假响应通过；真实未验证 |
| market.capitalFlow | capital_flow | SDK资金流 | 假响应通过；真实未验证 |
| market.sentiment | market_temperature | US/HK/CN/SG市场温度 | 假响应通过；真实未验证 |
| market.status | MarketContext.market_status | SDK市场状态；不捏造价格时间 | 假响应通过；真实未验证 |
| company.profile | static_info | SDK静态资料单股票匹配 | 假响应通过；真实未验证 |
| company.valuation | calc_indexes | PE/PB/股息率/总市值/换手/年初涨跌/量比/振幅 | 假响应通过；真实未验证 |
| company.financials | FundamentalContext.financial_report | IS/BS/CF/ALL；annual/interim/quarter映射SDK枚举；年/季度标签如2024Q1走readonly CLI financial-report | SDK及CLI假响应通过；真实未验证 |
| company.dividends | FundamentalContext.dividend | SDK股息 | 假响应通过；真实未验证 |
| company.earnings | FundamentalContext.forecast_eps | SDK盈利预测，保留供应商字段 | 假响应通过；真实未验证 |
| company.ratings | FundamentalContext.institution_rating | SDK评级 | 假响应通过；真实未验证 |
| research.news | ContentContext.news | SDK新闻，Python截取count | 假响应通过；真实未验证 |
| research.events | CalendarContext.finance_calendar（部分） | 无symbol的report/dividend/ipo/macrodata/closed走SDK；SDK缺symbol过滤与独立financial分类时走CLI finance-calendar，不能把financial冒充Report | SDK及CLI分组JSON假响应通过；真实未验证 |
| Longbridge只读账户 account.accounts | SDK无基线身份响应 | CLI auth status，投影账户ID/名称/区域 | 假响应通过；未找到可用CLI/真实未验证 |
| account.portfolio | SDK无基线完整组合响应 | CLI portfolio；投影overview/market_accounts/holdings，缺数值null，不计算跨币种合计或持仓收益 | 假响应通过；未找到可用CLI/真实未验证 |
| account.positions | TradeContext.stock_positions | 只读持仓；成本/数量/币种，SDK缺市价与市值保持null | 假响应通过；真实未验证 |
| account.assets | TradeContext.account_balance | 按币种资产/现金；不相加 | 假响应通过；真实未验证 |
| account.cashFlow | TradeContext.cash_flow | 成对日期，默认过去30天；第一页最多100项，UTC边界 | 假响应通过；真实未验证 |
| Massive market.quote | GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker} | 仅US；必须有lastTrade价/时间与前收，缺交易权限不会用日线假充实时 | 假HTTP响应通过；真实未验证 |
| Massive market.kline | GET /v2/aggs/ticker/{ticker}/range/... | 6周期、不复权、有界日期与数量，验证OHLC、唯一时间、非负量 | 假HTTP响应通过；真实未验证 |
| Massive company.profile | GET /v3/reference/tickers/{ticker} | 单股票资料公开字段白名单 | 假HTTP响应通过；真实未验证 |

总计24个提供商能力条目，Longbridge涉及19种SDK读方法映射（日历/财报部分参数走CLI），2个仅CLI账户能力，Massive3个REST能力。交易方法不在查询枚举、IPC或dispatch中；SDK自身提供哪些写接口不代表研迹开放这些接口。

## 参数、数据与验收边界

- 新契约为Python ReadQuery/ProviderResult，非Folio原TS接口的逐字兼容替代。股票代码沿固定基线正则，单股票；日期成对且≤366天、count 1—100；不接任意CLI参数。基线的多股票日历列表收窄为单股票过滤，财报自由文本收窄为已校验周期或年/季度标签；K线日期输入统一ISO日粒度。未实现完整分页、任意报告标识或毫秒区间查询，不宣称所有参数完全等价。
- quote、只读账户和CLI组合转中立字段；其余SDK数据使用已安装类型注解的公开字段白名单投影成JSON，可能有Decimal/枚举/UTC时间转换，不能当作原Folio领域DTO完全同形。缺失数值null，非法数值固定失败。不会用模拟补齐真实缺字段。
- 模拟价格/K线沿既有四股票Fixture；其他24条目对应样例为本项目自主编写。模拟K线仍是固定日线样本，不证明所选周期、日期或真实市场支持。模拟验收只证明契约流程；不验证财务准确性、实时性或投资效果。
- CLI须手动提供本机longbridge.exe绝对路径和既有CLI认证会话。调用数组、shell=False；查询前auth status检查，不调用登录/刷新/下单命令。CLI原有OAuth会话及其存储/可能内部续期属于外部CLI，研迹不迁移、不声称由Windows凭证管理器托管；真实CLI兼容性与内部行为本轮未验证。本机未找到CLI，本轮没有安装/登录。
- 项目管理的Longbridge三项凭证和Massive Key由Python保存到Windows Credential Manager，SQLite只存非敏感配置、UUID引用和修订号。行情/账户分开配置；不读环境密钥、不枚举系统凭证。凭证、异常正文和stderr不出现在API、日志或诊断。CLI输出只投影必要数据字段，不导出auth/config/debug响应。
- SDK/Massive真实调用位于所属Python子进程；stdin传入凭证，argv与环境不带Key，256KiB输出上限，1—60秒总时限，无重试或重定向。Windows Job Object在关闭/后端崩溃时回收所属进程树，[官方Job说明](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)。此措施是进程生命周期管理，不能代替OS网络沙箱。
- 来源明确mode/transport、独立fetched_at/served_at/market_time、cached、timeliness和依据。默认真实行情延迟未知；自行声明实时或延迟不证明供应商权限。K线历史；账号读取不当作实时行情。行情仅进程内缓存≤128键/TTL≤300秒，账户不缓存/不写库；过期、换配置/凭证、删除重建都不能复活旧成功。
- 认证、权限、限流、网络、超时、取消、响应异常分别固定码。SDK识别已核对的401003/403201/403203认证、403205权限和429001/429002限流；其他供应商码安全归为PROVIDER_ERROR，实际外部错误未验证。成功只证明本次能力，不给其他条目授权；模拟不标为真实。状态是当前进程最近一次结果，重启后须重新验证。
- 现有Agent只注册原模拟行情/K线工具；新增Provider验收面板不接入完整研究、组合、新闻或市场工作台。第11—24步没有实施。
