# P2-07：多市场总览与热力图实施方案

日期：2026-10-13（Asia/Shanghai）。状态：验收通过（三市场离线总览）。用户已认可A股、美股、加密和600px实际Electron截图，最终审查与完整1039项复验通过；授权提交、普通推送及独立Draft PR，远程双CI另核。第1～8节保留批准前方案、第9节保留本地开发快照；最新收尾以第10节为准。详见 [数据源审计](PHASE2-MARKET-DATA-AUDIT.md)。

## 1. 推荐的本轮范围

采用现有React/CSS与Python权威数据层，不安装依赖，不新增真实Provider、不调用行情/模型服务。保留P2-05三栏、15个入口和常驻AI助手；在原“模拟行情”中增加“市场总览”内部视图，同时保留原单股模拟卡片/日线视图，让旧流程仍可操作。P2-06证券六周期图表不改。

本轮建议交付：

1. A股、美股、加密三市场切换、代码/中文或英文名称搜索、涨跌幅升降序排序。
2. 样例池表现摘要（上涨/下跌/平盘/缺失数、有效样本涨跌幅统计），显著注明“样例池”，不伪装上证/S&P/全币种指数或全市场涨跌分布。
3. 每个市场等面积热力格、颜色图例、hover/focus详情、可触屏选中详情；所有数值来自Python离线样例。
4. 市场/币种或计价资产、成交量及单位、可得成交额、来源、固定市场时间/样例生成时间、缓存与时效标签；未知值显示“—”，不补市值或行业。
5. 仅原四只受支持美股允许跳转证券工作台。A股新样例与crypto只选中总览详情，明确“证券详情尚未支持”或“交易对行情；尚无详情页”，不发股票选择IPC。
6. 真实总览模式只展示未接入/本轮未授权及已有非敏感Provider状态，不自动查询Provider、不把真实失败回退成模拟成功。已有证券工作台和ProviderPanel的独立显式查询流程保持。
7. 加载、无匹配/无数据、连接失败、未配置、权限、限流、超时/取消和迟到响应状态。后三类供应商错误用隔离测试注入验证，不在生产菜单添加假权限故障。

预览图用作布局参考。图中行业矩形、总市值、BTC占比/恐惧贪婪指数和助手市场分析没有已核数据来源，不复制这些事实内容；AI助手不新增读取总览或自动解释行情逻辑。

## 2. 需要单独批准的最小公开契约

现有Quote为USD股票，ReadQuery与SecurityQuery只接受股票后缀，ProviderId无crypto。用任意JSON、渲染器内硬编码市场业务真相、或把BTC/USDT改成BTC.US都会破坏项目边界，因此推荐新增独立契约，旧类型/端点保持原语义。

### 2.1 新增模型草案（尚未写入代码）

Python `market_overview_contracts.py` 作为唯一类型来源，使用Pydantic extra=forbid、有限数校验及判别联合，生成OpenAPI/TypeScript：

| 模型/字段 | 精确定义 |
| --- | --- |
| MarketId | `CN / US / CRYPTO`；不扩展旧ReadQuery.market枚举 |
| EquityAsset | `asset_class=equity`；id如`equity:CN:600519.SH`；symbol必须市场匹配（CN六位数字.SH/.SZ，US沿现有股票格式）；currency为CNY或USD；不出现base_asset/quote_asset |
| CryptoPairAsset | `asset_class=crypto_pair`；id如`crypto_pair:fixture:BTC/USDT`；symbol是BTC/USDT，单独base_asset=BTC、quote_asset=USDT、venue=authored-fixture；不把USDT作为法币USD，不进入股票SymbolInput |
| 行情数值 | last_price、reference_price、change、change_percent；有效价格>0，变化一致性验证；缺失为null，bool/NaN/Infinity为异常；百分比按百分数如1.2表达1.2%，不是0.012 |
| change_basis | 股票`previous_close`；crypto `rolling_24h`；同时提供window_start/window_end以标明24小时样例窗口。两者不汇总成同一市场指数 |
| volume/turnover | nullable非负值，volume_unit：股票shares、crypto为base_asset；turnover单位股票currency、crypto quote_asset；缺失不推算为last_price×volume |
| market_cap | nullable；另有market_cap_currency/source/time元数据。MVP统一null，面积不使用该值 |
| 分类 | classification可null；kind=`unclassified / watch_group`，source可null或`authored-example-group`；无行业来源则“未分类”，可按明确标注的“示例分组”筛选；不写金融/Layer1等伪造归属 |
| 详情能力 | detail_target为null或`security`，security_symbol只有已核四美股；前后端白名单同时约束，不依据股票后缀猜测支持 |
| 来源 | source=`authored-market-v1`，mode=`simulated`，data_label=`模拟数据`，fixture_version独立；固定aware UTC market_time/fetched_at；served_at可为实际服务时间但不用于样例价格/时效判断 |
| 时效/缓存 | freshness=`fixture / unknown / historical / stale`与依据；fixture永不显示实时；cache_hit/age只指本机缓存，不指行情市场年龄 |
| MarketOverview | request_id、market、mode、source、status、rows≤20、summary（Python从有效rows计算）、area_encoding=`equal`；空/失败不附前批次旧rows |
| OverviewFailure | 固定code/message、retryable与status；未配置/未授权/权限受限/限流/网络失败/超时/取消/尚未接入分别可辨；模拟与真实响应不可互用 |
| OverviewQuery | UUID request_id、market、mode=`simulated / real`；没有任意URL、无限股票池、任意Provider或交易参数；市场固定池由Python控制 |

### 2.2 新增只读本机API与IPC草案

- `POST /market/overview`：返回上述总览结果；默认simulated读取独立固定样例。real仅返回`REAL_OVERVIEW_NOT_AUTHORIZED`（股票）或`CRYPTO_PROVIDER_NOT_CONNECTED`，零Provider调用。
- `POST /market/overview/{request_id}/cancel`：只取消本进程该次只读请求，不影响会话/研究/其他市场用户操作；未知或已完成请求幂等回执，不创建新任务。
- 两个端点沿既有启动token保护。主进程/preload新增具名`market:overview`、`market:overview-cancel`操作，维持sender核验。渲染器无任意fetch/URL通道。
- 新增`MarketOverviewResult`、`OverviewCancelResult`等响应进入生成契约；`ProviderId`、ReadQuery、Quote、Kline、SecurityQuery、Agent工具契约均不扩展。无数据库迁移、无持仓/凭证写入。

批准项A：允许以上独立Python DTO、两个本机只读操作、生成契约和具名IPC白名单。批准范围包括离线服务/Fixture/前端/测试，不包括任何真实Provider或外部行情请求。

## 3. 离线数据设计

固定样例初始建议CN 6只、US 4只、CRYPTO 6对，每市场硬上限20；名称和代码是标识，价格/成交量是自主编写的演示值：

- CN：600519.SH、601318.SH、600036.SH、000001.SZ、000858.SZ、300750.SZ，CNY。
- US：AAPL.US、MSFT.US、NVDA.US、TSLA.US，USD。与原四证券可支持集合一致；新样例不修改原market.py、chart_fixtures.py或Agent数据。
- CRYPTO：BTC/USDT、ETH/USDT、SOL/USDT、BNB/USDT、XRP/USDT、ADA/USDT；venue必须写自主样例，不署名真实交易所。

市场时间分别固定2024-01-16 15:00 Asia/Shanghai、2024-01-16 16:00 America/New_York、2024-01-16 21:00 UTC；通过aware UTC序列化保留业务时区标识。生成时间固定晚于各market_time。样例不使用random或系统时钟决定价格/排序/统计；不冒充采集自2024交易所历史。

正常样例有正/负/零/缺失变化；异常有限数、缺市值、分类缺失、单位错误、跨市场ID、未授权与限流/网络失败由专用测试夹具注入。标识/币种/涨跌一致性由Python验证；无论异常是否有旧成功缓存，都不能显示为当前成功。

## 4. 热力图选择与真实性

优先React + CSS Grid等面积热力格。每格宽高在同一视口相等，排序只换顺序，不改变面积；所有格面积权重恒1。标题常驻“等面积热力格 · 不代表市值/成交额权重”，页面样例来源标签持续可见。暂不提供加权面积开关，未分类不冒充行业。

沿现有tokens的绿涨（positive）/砖红跌（negative）方向；预览图的部分红涨/绿跌不覆盖既有语义。涨跌幅分档：≤−3%、(−3%,−1%]、(−1%,0)、0、(0,1%)、[1%,3%)、≥3%；缺失单独中性纹理/文本“—”。0和缺失具有不同文字/样式。图例边界与色深一致，tooltip同时展示涨跌额及百分比，屏幕阅读器不只读颜色。

hover与键盘focus弹出代码/名称/最新价/涨跌幅及基准/单位/来源/时间/缺失项；点击或Enter选中下方详情，触屏不依赖悬浮。窄窗口格子列数减少，表格局部滚动，不以整页横滚或隐藏关键字段掩盖布局问题。

参考[Apache ECharts](https://github.com/apache/echarts)的[Treemap数据值与层级](https://github.com/apache/echarts/blob/master/src/chart/treemap/TreemapSeries.ts)、[Heatmap视觉编码](https://github.com/apache/echarts/blob/master/src/chart/heatmap/HeatmapSeries.ts)和[Tooltip触发/位置配置](https://github.com/apache/echarts/blob/master/src/component/tooltip/TooltipModel.ts)，只学习交互原则，不复制实现代码。官方交互文档的部分页面无法抓取，采用可读官方源码佐证，不声称看过交互演示。

ECharts为[Apache-2.0](https://github.com/apache/echarts/blob/master/LICENSE)。本轮无需不等面积树布局，现有体系足够；新增依赖体积为0。若之后取得可靠市值/分类，另提出精确版本、LICENSE/NOTICE、按需Treemap/Tooltip/VisualMap导入与lazy chunk方案，并实测min/gzip增量；目前没有安装，不能虚报bundle数字。

## 5. 有界请求与成本方案

| 约束 | 本轮拟实现 | 真实接入后另批准 |
| --- | --- | --- |
| 股票池 | 每市场≤20，初始6/4/6；返回/输入数量校验 | 同上，不拉全市场或按单股展开数百次 |
| 并发 | 新总览服务最多2个活动任务，等待队列≤2；重复request_id不能再次执行 | Provider统一并发/令牌预算，不能把SDK子进程限速当成全局限速 |
| 去重/缓存 | 进程内同市场/模式/样例版本合并读取，TTL30秒、≤3市场缓存；失败不缓存为成功；fixture确定性不靠TTL生成 | 缓存键再包括Provider/账户revision/股票池/数据窗口；共享请求最后一个订阅取消后停止 |
| 超时 | 总览5秒总时限，IPC传输略大于此预算；超时终态，不接迟到成功 | 遵守既有Provider 1–60秒边界，并设置整批总时限 |
| 取消 | 市场/模式切换和卸载调用该request_id取消，清理订阅/等待；取消不停止其他请求 | 传入既有QueryStop/子进程回收；传输abort和后端停止分别测试 |
| 迟到响应 | market/mode/request_id/source版本均匹配才提交UI；切换即清旧数据 | 还核revision/配置身份，旧成功不能复活 |
| 自动查询 | 仅本机simulated overview；搜索、排序、分类在已返回池中操作，不新增行情请求 | 真实模式只显式刷新，不自动轮询、不因翻页/重挂载重复付费请求 |
| 费用 | 新API/账户/模型开销0、外部行情请求0 | 股票已有账户权限仍逐项确认；加密新Provider待法律/地域与方案审批 |

去重共享同一执行时，为每个request_id保存独立取消/响应上下文，单次取消不能污染其他消费者。缓存/任务注册均进程内有上限，close清理；不会写入原研究状态或金融业务库。

未来调用预算的比较而非本轮授权：Longbridge若批准批量报价，≤20池一次批量、手动刷新最多每30秒、并发≤2，不能每只额外查profile/valuation作面积；Massive可用套餐若批准批量也是一次快照，Basic当前quote不能当作免费可用；Binance≤20对一次24h ticker权重2；CoinGecko一次≤20币种、每日100次上限约3,000次/30天，历史/分类请求另占总额度。未来缺批量适配时显示“尚未支持”，不悄悄退化为20次单股循环。

## 6. 文件级修改清单（全部产品改动待批准A）

| 文件 | 拟变更 |
| --- | --- |
| services/backend/research_trail/market_overview_contracts.py（新增） | 三市场判别资产、数值/单位/基准、来源、请求/响应/取消DTO |
| services/backend/research_trail/market_overview_fixtures.py（新增） | 自主确定性6/4/6样例，独立版本/时间 |
| services/backend/research_trail/market_overview.py（新增） | Python归一化/摘要、硬上限、缓存/共享请求、超时/取消/离线真实模式拒绝 |
| services/backend/research_trail/app.py | 生命周期与两个受保护只读端点，原业务链不切换 |
| packages/contracts/openapi.json、generated.ts | 由脚本生成独立新增类型/路径，不手改 |
| apps/desktop/src/market-overview-types.ts（新增） | 生成契约类型别名 |
| apps/desktop/src/bridge.ts、main/backend.ts、main/index.ts、preload/index.ts | 两个具名方法/IPC、安全验证与请求取消 |
| apps/desktop/src/renderer/market/MarketOverview.tsx（新增） | 三市场工具栏、样例池摘要、列表、状态和请求隔离 |
| apps/desktop/src/renderer/market/MarketHeatmap.tsx、market-overview.css（新增） | 等面积热力格、图例、tooltip/focus/触屏、三尺寸 |
| apps/desktop/src/renderer/market/MarketPanel.tsx | 原入口内切换总览/既有单股视图，旧卡片/图表保留可达 |
| apps/desktop/src/renderer/App.tsx | 复用已有证券选择与页面切换回调，仅支持四美股跳转；导航名/数目/助手不变 |
| apps/desktop/src/renderer/ProviderPanel.tsx | 仅增强支持市场/数据类型/checked_at与状态局限说明；现有查询仍显式，不发新真实请求 |
| services/backend/tests/test_market_overview.py（新增） | 资产边界、固定数据、来源/模式、上限/缓存/共享取消/超时/错误矩阵与Provider调用计数0 |
| tests/desktop.test.cjs | 只追加专项，原74项/时限/断言保留；真实Electron截图由隔离库离线应用产生 |
| docs/PHASE2-MARKET-DATA-AUDIT.md、PHASE2-MULTI-MARKET.md、ROADMAP.md、EVIDENCE.md | 当前已写审计/方案；开发后另更新实际结果/未验缺口 |

本轮不拟修改ProviderId/旧股票契约、SDK/Massive实际访问、凭证管理、数据库迁移、图表样例、金融计算、默认AgentRunner/Pi和研究SSE恢复逻辑。若实际实施需扩大上述范围，应先补方案，不能按此清单宣称额外契约已授权。

## 7. 验收安排与当前交付层级

批准后先专项Python，再类型/构建和真实Electron，最后完整 `bun.cmd run verify`；测试网络护栏、隔离SQLite、假凭证/Fixture/MockTransport保护既有991项。新增专项须覆盖用户列出的15类：三市场/标识、搜索排序、色阶图例/面积、无效/缺失、来源时效、模式隔离、配置权限限流失败、请求预算/超时/取消缓存、迟到响应、支持详情、P2-06全回归、会话/研究/SSE/导航和1440×900/1000×700/600×700。

截图保存到仓库外 `D:\folio\research-trail-p2-07-qa`，包括A股、美股、crypto、热力格focus/悬浮、搜索/分组、真实模式尚未接入、Mock权限/异常/空数据、600px；Mock异常截图明确为测试注入。实际查看PNG与交互/日志后才写Electron验收。不得把本提示词的预览图或概念图当成截图证据。

| 层级 | 当前状态 |
| --- | --- |
| 上下文/Provider审计/实施方案 | 已完成；相关既有Python专项188通过，失败0 |
| 新UI | 未实现，待批准独立契约 |
| 新三市场模拟流程 | 未实现/未验收 |
| 新三尺寸Electron及截图 | 未执行 |
| 本轮完整verify | 未执行；991为既有main成功基线 |
| 真实行情覆盖/账户权限/地域/分发许可 | 本轮未验证，候选阻塞和历史有限证据见审计 |

P2-08未来可以复用三市场资产标识、报价基准、单位、来源/时效、缺失/失败、池预算与取消隔离设计；是否接入Agent工具与真实数据是后续单独决策，当前不注册工具或改变解释逻辑。

## 8. 等待用户决定

当前需要决定的只有批准项A：允许第2节的独立overview公开DTO、只读查询/取消端点及IPC，按本方案实施离线MVP。批准后无需新账户/付费依赖/行情联网。

新增真实crypto Provider、股票批量适配、Massive窗口/分页修正、逐市场Provider健康契约、ECharts安装和公开数据展示授权均暂缓，不包含在A里。用户原要求“扩展公开契约……等待我的单独批准”，因此停在产品实现前；不是因技能推定或假设风险追加确认。


## 9. 方案A本地实现与验收（2026-10-13）

用户已明确批准独立总览公开契约、两项本机操作及IPC、三市场离线Fixture、总览/等面积热力格、请求控制和专项/完整回归；无需再等待第8节所述批准。以下为实际实现，旧报价/股票查询/证券查询/Agent工具契约与原数据/图表源文件不变。

### 9.1 已实现能力

- 原“模拟行情”新增内部“市场总览 / 单股行情”切换。为保留既有首屏流程，默认仍单股行情；点击市场总览进入三市场。未新增导航入口或更名。P2-05三栏/常驻助手与P2-06六周期保持；小屏沿既有布局把助手放到业务区下方。
- A股6只CNY、美股4只USD、加密6对USDT；crypto明确base/quote/venue、滚动24h窗口。市场与样例生成时间固定，服务时间单独记录，不参与价格或统计生成。
- 来源/模拟标签、样例池总数/等权平均/涨跌平/缺失、分布条、搜索、分组与升降序；统计是完整样例池，过滤结果另外显示匹配数。搜索/排序/分组只操作返回池，不发新行情请求。
- 等面积CSS Grid、所有权重恒1、绿涨/红跌七档与缺失第八种纹理、严格边界图例、hover/键盘focus提示、点击选中详情。缺市值/行业不编造，仅“示例分组一”或“未分类”。crypto无股票跳转；仅AAPL/MSFT/NVDA/TSLA有已核证券入口，前后端/回调均限定支持集合。
- 真模式返回股票REAL_OVERVIEW_NOT_AUTHORIZED或crypto CRYPTO_PROVIDER_NOT_CONNECTED，无rows、无热力格、无Provider调用或模拟回退；可以查看现有非敏感配置存在状态。ProviderPanel增加支持市场/能力局限/checked_at显示，不扩展旧健康契约或自动查询。
- 上限20标的、两个执行槽、最多4个活动逻辑请求（含等待/共享消费者）、三市场内存缓存TTL30秒、64个30秒幂等/提前取消记录。按市场共享一次离线读取，每个request_id独立取消；最后消费者结束时回收共享任务；5秒每请求总预算，没有通用调度框架或数据库任务表。
- UI同时校验market/mode/request_id/source与本次generation/key；切换/卸载发送取消并立即隐藏旧数据。显式取消马上终止本页接收，已完成但IPC迟到的成功也不能恢复显示。Python响应任务取消/超时/关闭也会回收最后共享工作，失败不缓存成成功。

### 9.2 新增契约、链路和代码范围

OpenAPI新增恰好8个schema：EquityAsset、CryptoPairAsset、OverviewRow、OverviewSummary、OverviewQuery、MarketOverview、OverviewFailure、OverviewCancelResult。新增路径恰好两个：POST /market/overview、POST /market/overview/{request_id}/cancel；已有所有schemas/paths与main逐项结构比较完全相同。MarketOverviewResult为生成模型联合的TypeScript别名。

调用链：MarketOverview → window.researchTrail.marketOverview / cancelMarketOverview → preload的market:overview / market:overview-cancel → main的sender核验/字段白名单/UUID/market/mode验证 → token保护FastAPI → MarketOverviewService → 自主Fixture → 结构化响应 → 当前请求上下文校验 → UI。没有连接ProviderService或模型。

实际文件对应第6节清单；新增overview-display.ts负责小型纯展示/过滤与证券入口守卫，新增Node tests/market-overview.test.cjs并加入verify的原Node测试列表。app.py仅注册服务生命周期/两个端点和可注入离线测试选项。没有新增运行依赖、迁移、交易/钱包/账户操作；Massive窗口/分页仅审计记录未修复。

### 9.3 验证结果和真实证据

专项最终34 Python、6 Node、8实际Electron全通过（失败/取消/跳过0）。原74项Electron全部保留；仅精确bridge白名单断言追加本轮已批准的marketOverview/cancelMarketOverview两个名称，其余正文/时限/断言保持，另新增8项；原991完整基线保留。首轮完整verify为900 Python/57 Node通过，Electron81通过/1失败：旧测试精确preload白名单未包含批准的两个方法；只将这两项加入期望集合，保留deepEqual/全部隔离与生命周期断言，原991用例不删/不跳/不放宽。随后旧项与新增专项共9项Electron通过。还修正股票Provider只在其支持市场展示、缺失统计中性、市场按钮hover可读性。最终完整verify已退出0，终态结果见下方回执。首轮日志与截图保存在qa/verify-initial.log与verify-initial目录。

新增Python覆盖三市场固定数据/资产/单位/统计/缺失，bool/NaN/Infinity/不一致涨跌/无来源市值/伪分类/跨市场/crypto股票跳转拒绝，token/参数保护、真实模式零Provider调用、空/21项溢出/重复/异常批次、未配置/权限/限流/网络、共享/同ID/上下文冲突/缓存过期/独立取消/最后取消/执行上限/超时/关闭/HTTP等待任务取消。Node覆盖主进程白名单、固定URL、6500ms传输预算、色阶精确边界、不可变筛选排序、详情守卫和CNY/USD/USDT隔离。

Electron从隔离Temp数据库/实际Python与main/preload打开；验证搜索/排序/分组、市场切换、等面积几何/图例、hover不改变色阶/focus、证券跳转/原单股回归、真模式无数据与无Provider查询IPC、迟到交付/显式取消和卸载、真实窗口contentSize=1440×900/1000×700/600×700（不是仅CSS模拟）；15导航/资产/助手可达，整页无横向溢出，正常流程pageerror/console warning/error为空。

空、权限、限流、网络错误截图是Electron主进程测试注入，显著带“离线错误夹具”；Python对应真实错误映射另有专项。没有声称账户实际收到403/429或完成真实联网验证。

最终专项日志：D:/folio/research-trail-p2-07-final-focused.log（P2-07新增8项 + 原bridge白名单/隔离/生命周期1项，共9通过）。此前focused-final.log保留迭代事实。完整日志：D:/folio/research-trail-p2-07-verify.log。截图目录D:/folio/research-trail-p2-07-qa/final-focused为最终专项，focused-final为前一轮专项，D:/folio/research-trail-p2-07-qa/verify为最终完整回归；日志/图片/隔离库不入Git。

| 截图文件 | 证据 |
| --- | --- |
| p2-07-cn-1440.png、p2-07-us-1440.png、p2-07-crypto-1440.png | 三市场总览、正确计价/来源/样例摘要与等面积图 |
| p2-07-heatmap-hover-1440.png | 鼠标/键盘focus提示、来源和单位 |
| p2-07-cn-filter-1440.png、p2-07-crypto-search-1440.png | 中文搜索/未分类过滤、交易对搜索 |
| p2-07-stock-unauthorized-1440.png、p2-07-crypto-unavailable-1440.png | 正式产品真实模式未授权/未接入，零模拟回退 |
| p2-07-injected-empty-1440.png、p2-07-injected-permission-1440.png、p2-07-injected-limited-1440.png、p2-07-injected-failure-1440.png | 测试注入的空/权限/限流/网络失败，非真实服务错误 |
| p2-07-responsive-1440.png、p2-07-responsive-1000.png、p2-07-responsive-600.png | 三实际窗口首屏 |
| p2-07-heatmap-600.png、p2-07-detail-600.png | 窄窗口滚动到热力格/列表/详情，助手仍可达 |

### 9.4 与概念图的差距和后续边界

- 没有概念图的市场指数/行业聚合/市值加权树图/币种图标/BTC占比/恐惧贪婪或AI市场分析；实际是有限单标的等面积格。US只有4只，网格末行留空，不填虚假标的。
- 初始仍保留单股首屏；总览多一个内部切换操作。1440首屏可见完整热力格和列表标题，完整列表/详情需业务区滚动；600导航沿原横向分组滚动，助手位于业务区下方，没有重构为概念图底部导航。
- 自主样例支持已经实现/模拟验收已通过；真实三市场覆盖本轮没有验证或增加，API费用0。历史Longbridge AAPL三项有限证据仍仅历史；不归为P2-07真实总览通过。
- Binance条款完整文本/地域/展示授权、CoinGecko免费账户/配额/署名与商用/分发界限、Longbridge/Massive逐市场账户权限/批量/许可均需后续单独授权；Coinbase AI限制保持排除。ECharts新依赖与市值权重、Massive历史分页/窗口变更不在本轮范围。P2-08可复用资产标识/涨跌基准/单位/来源/请求边界，但当前不暴露Agent工具。
- 既有Vite主chunk体积与Starlette/httpx弃用警告保留，无阈值放宽。没有Release/安装包/提交/推送/PR/合并。本轮状态代码完成/待用户截图验收。

### 9.5 Windows CMD复核

```bat
cd /d D:\folio\research-trail
set RESEARCH_TRAIL_QA_DIR=D:\folio\research-trail-p2-07-qa\review
bun.cmd run verify
set RESEARCH_TRAIL_QA_DIR=
```

启动源码应用后，从“模拟行情”点击“市场总览”。一个小练习：切到加密市场搜ETH，对照成交量ETH与成交额USDT及24h基准。三道理解题：为什么USDT不能标USD？为什么缺市值时采用等面积格？为什么取消一个消费者不能取消另一位共享读取者？


### 9.6 最终完整回执

最终 `bun.cmd run verify` 退出0：900 Python（270.90秒）/57 Node（24 Pi + 33原Node与新专项）/82实际Electron（502.83秒），共1039项通过，失败/取消/跳过/todo均0。原991项保留，新增34 Python + 6 Node + 8 Electron = 48项。契约/类型/构建、固定Pi依赖许可与离线往返、263外部/9本地crate/471文本原生声明、原创工程/历史CLI与隔离重复迁移均通过，不将这些离线结果称为真实市场或安装包验收。

最终P2-07截图17张在D:/folio/research-trail-p2-07-qa/verify，三尺寸PNG header、SHA-256与来源核对通过；最终专项17张已逐张查看，完整回归重采重点画面核对相同界面。screenshot-manifest.json记录尺寸/哈希，P2-07-acceptance.json记录基线SHA/未提交分支、统计与产品/测试/契约SHA-256。完整日志D:/folio/research-trail-p2-07-verify.log；首轮1项白名单失败日志及迭代截图保留，不覆盖失败事实。

最终范围26个新增/修改文件，仅独立总览Python/Fixture/API、生成契约、具名桥/UI/Provider展示、专项/verify接入与四份文档。旧股票/Provider/图表/Agent源文件与旧全部OpenAPI schemas/paths核对一致。没有真实Provider、模型、账户额度调用，没有依赖/锁文件/迁移/交易/钱包/安装包或GitHub写入，API费用0；既有主chunk538.54kB（gzip154.58kB）超500kB与Starlette/httpx弃用警告保留，无阈值放宽。

状态：代码完成/待用户真实界面审核。用户批准方案A不等于已经审核截图；本轮完整本机离线验收通过后停止，没有提交/推送/PR/合并/发布，P2-08未执行。

## 10. 最终审查与独立Draft交付（2026-10-13）

用户已认可四张实际Electron截图，授权最终审查、小范围必要修复、完整验收后提交当前开发分支并创建指向main的独立Draft PR。起始HEAD/main/origin/main/远程main均为3c428fd2005959fef4f2931da266eb8ba7b8f53c，main CI38274410878成功；GitHub身份ydflow，未发现同分支已有PR。第9节的“尚未用户审核/不提交”是上一轮历史，不再代表本轮授权。

最终源码审查核对独立DTO、token/sender保护、字段白名单/UUID/固定本机路径、三市场资产与币种、真实模式拒绝/零Provider调用、20标的/2槽/4逻辑请求/30秒缓存/64条幂等记录。按市场共享读取的不同request_id为独立消费者；同request_id是同一逻辑请求的幂等重试，不能当成两个可独立取消的消费者。取消一个不同ID消费者不取消其他消费者；最后消费者取消、超时或HTTP等待任务取消会回收工作。市场切换和用户显式取消后，已完成但迟到交付的成功不能恢复旧数据。

产品源码与用户认可版本SHA256一致，没有改动界面、调度或业务逻辑。旧OpenAPI模型/路径逐项结构一致，旧单股组件正文一致；旧74项Electron正文只含已经批准的两项具名bridge精确期望追加，其余断言/时限不变。新8项加强键盘Enter选择、Chromium原生touchStart/touchEnd实际触摸输入、排序/选中详情/取消截图；没有增加测试数量、放宽或跳过旧用例。专项8项通过，失败/取消/跳过/todo均0。Browser plugin not available，使用既有Playwright实际Electron和隔离SQLite/离线网络护栏，不安装浏览器依赖。600px触摸输入为Chromium事件验证，未宣称已测试实体触屏硬件。

1440px统计到分布、筛选和热力格的间距保留；600px图例分档、说明、价格/计价与时间可读，列表局部横滚、整页无横向溢出。三市场/三实际窗口、搜索、排序、键盘与触摸选择、未授权/未接入、空/权限/限流/网络注入和取消状态均保存。概念图差距仍为第9.4节所列，没有用指数、行业、市值或AI结论填空。

最终串行完整 `bun.cmd run verify` 退出0：900 Python（293.25秒）/57 Node（24 Pi + 33原Node与专项）/82实际Electron（532.09秒），共1039通过，失败/取消/跳过/todo均0。原991与新增48保留，契约/类型/构建、离线Pi往返与许可审计、原创工程/历史CLI、隔离库重复迁移和模型一致性全部通过。既有Starlette/httpx弃用与Vite主chunk538.54kB（gzip154.58kB）警告保留，无阈值放宽。没有真实行情/模型请求或新增依赖。

日志在仓库外research-trail-p2-07-qa/pr-final-verify.log；完整截图在pr-final/，补强专项在pr-focused/与pr-focused.log。新增p2-07-cn-sort-1440.png、p2-07-selected-detail-1440.png、p2-07-cancelled-1440.png，连同已有17张形成20张P2-07清单。专项20图逐张查看，完整回归重采重点核对；实际PNG三尺寸与SHA256记录于pr-final/screenshot-manifest.json，统计及验收前后代码/测试/契约哈希记录于pr-final/P2-07-acceptance.json。审查范围/UTF-8/相对链接/令牌特征扫描/认可产品与契约哈希记录于pr-review.json；图片/日志/临时数据库不入Git。

当前Head的Push与PR CI须分别核对，结果单独记录于Draft PR和仓库外pr-delivery.json，本机通过不能替代远程成功。交付仅Draft，不自动合并、P2-08、Release或安装包。自主模拟流程验收不等于三市场真实行情接入；真实Provider/账户/批量能力、地域、展示/再分发及既有Windows/Pi分发许可缺口仍保留，下一阶段须单独授权。
