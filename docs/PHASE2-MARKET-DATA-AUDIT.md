# P2-07：三市场数据源审计

审计日期：2026-10-13（Asia/Shanghai）。状态：审计完成；方案A已由用户正式批准，离线实现/专项已完成，当前实施见PHASE2-MULTI-MARKET第9节。第1～7节保留开发前main基线审计，不倒填真实能力。本文的“官方支持”是文档证据，不等于研迹已实现，也不等于用户账户拥有权限。

## 1. 恢复基线与证据等级

- 本轮现场核对本地 main、origin/main、`git ls-remote origin refs/heads/main` 均为 `3c428fd2005959fef4f2931da266eb8ba7b8f53c`，开发前工作区/暂存区干净。
- [PR #34](https://github.com/ydflow/research-trail/pull/34) 已 MERGED；[main CI 38274410878](https://github.com/ydflow/research-trail/actions/runs/38274410878) completed/success，headSha 精确匹配该 Merge SHA。991 项是既有完整基线（866 Python / 51 Node / 74 Electron），不是本轮新增实现的测试数。
- 从该 main 新建 `feat/phase2-multi-market-heatmap`，没有覆盖、重置或删除既有分支。
- 已读 AGENTS、ROADMAP、EVIDENCE、PROVIDER-COVERAGE-step10、PHASE2-SECURITY-KLINE、PHASE2-UI-FOUNDATION、仓库外 P2-06-HANDOFF-3c428fd 及 PROJECT_STATE。旧开发/Draft 状态保留为历史，以现场 Git/CI 与最新交接为准。
- 本轮仅查询官方文档、公开源码与 GitHub 状态；没有请求行情 API、读取私人运行数据库、查询实际账户权限或消耗模型额度。

| 等级 | 本文含义 |
| --- | --- |
| 已实现 | main 源码存在对应接口和处理链 |
| 已通过模拟测试 | Fixture、SDK 假上下文或 httpx.MockTransport 通过；不证明真实权限 |
| 已通过真实请求（历史） | 既有项目记录的有限请求；本轮未重验，不扩大到其他市场/能力 |
| 需要用户凭证 | 实现具备尝试条件，仍需配置、套餐和本次授权 |
| 不支持 | 研迹当前没有适配或契约；官方有接口也不能改称已支持 |

## 2. 实际代码审计

| 文件/入口 | 已实现事实 | P2-07 缺口 |
| --- | --- | --- |
| [provider_contracts.py](../services/backend/research_trail/provider_contracts.py) | 三种 ProviderId；ReadQuery 为单股票，后缀 US/HK/SG/SH/SZ/HAS；六周期；K 线 count≤260，其他≤100，日期成对≤366天；Provenance 区分 mode/transport/时间/缓存/权限 | 无 crypto、交易对、批量股票池契约；CapabilityView 无市场和请求上下文 |
| [market.py](../services/backend/research_trail/market.py) | 原 Fixture 四只美股；Quote.currency 固定 USD；价格/前收/涨跌一致性校验；Agent 原日线样例 | 不能表达 CNY、USDT、股票与币种类别；样例 fetched_at 使用系统时间，不可直接作为全确定性新样例 |
| [provider_service.py](../services/backend/research_trail/provider_service.py) | 显式模拟/真实选择，无失败自动回退；真实缓存键含 provider/generation/revision/query；128键，TTL配置0–300秒，默认30秒；账户不缓存 | 无批量适配、统一速率预算或并发请求去重；缓存命中不代表行情新鲜；模拟与真实最近状态共用同一健康键 |
| [provider_sdk.py](../services/backend/research_trail/provider_sdk.py) | Longbridge 5.2.0 单股票 quote/static_info/calc_indexes 等19种SDK读方法；quote实际传 `[symbol]`，结果必须恰好一项；六周期/不复权 | 没有 quote_package_details/quote_level、安全批量报价或标的列表入口；quote投影丢弃turnover和盘前/盘后字段，没有币种/行业 |
| [provider_massive.py](../services/backend/research_trail/provider_massive.py) | 仅 .US；单股快照、聚合K线、单股资料；Bearer头；不重试、不跟重定向；响应≤256KiB；401/403/429等固定错误 | 无全市场快照/榜单/分页；资料白名单含market_cap，但未保留sic_code/sic_description；报价必须lastTrade与prevDay，免费聚合权限不等于报价权限 |
| [capabilities.py](../services/backend/research_trail/capabilities.py) | 24个Provider能力条目，由ProviderService生成健康；原Agent行情工具仅模拟 | “真实查询通过”按provider/capability/revision记录，没有按市场/标的区分，不能据AAPL成功宣称A股可用 |
| [provider_settings.py](../services/backend/research_trail/provider_settings.py)、[credentials.py](../services/backend/research_trail/credentials.py) | Windows Credential Manager保存Key/三项凭证；SQLite仅非敏感配置、UUID引用、revision；行情与只读账户独立；删除/配置变更失效 | 不应为公开crypto行情引入钱包私钥或复用账户凭证；本轮不查看实际密钥 |
| [provider_process.py](../services/backend/research_trail/provider_process.py)、[provider_job.py](../services/backend/research_trail/provider_job.py) | 所属子进程、stdin秘密、环境清理、输出限额、超时/取消/Windows Job回收 | 多个独立SDK子进程不能直接视为共享QuoteContext限速；未来批量生命周期须另设计 |
| [ProviderPanel.tsx](../apps/desktop/src/renderer/ProviderPanel.tsx) | 非敏感配置/凭证存在、逐能力验证、来源、缓存和时效依据；真实按钮显式触发 | 未展示支持市场/批量覆盖/checked_at；不具备每市场最近成功与最近失败历史 |
| [MarketPanel.tsx](../apps/desktop/src/renderer/market/MarketPanel.tsx) | 原“模拟行情”四股票、单股卡片/日线；effect清理丢弃旧响应 | 无总览、三市场、搜索/排序/热力格；丢弃响应不是停止底层请求 |
| [SecurityWorkspace.tsx](../apps/desktop/src/renderer/securities/SecurityWorkspace.tsx)、[security_workspace.py](../services/backend/research_trail/security_workspace.py) | 真实模式显式操作；请求generation/key与持久自选revision保护；每页最多4读并发；K线传count=260 | 模拟详情实际只有原四美股；A股代码可保存不证明详情样例存在；crypto不能进入股票selectSecurity |
| [workspace_contracts.py](../services/backend/research_trail/workspace_contracts.py)、[workspace_normalize.py](../services/backend/research_trail/workspace_normalize.py) | SecurityQuery仍股票后缀；Metric可带unit；缺字段null；Kline无币种且volume必填 | 市场总览不宜复用通用Metric列表或把交易对塞进SymbolInput |
| [bridge.ts](../apps/desktop/src/bridge.ts)、[main/backend.ts](../apps/desktop/src/main/backend.ts)、[main/index.ts](../apps/desktop/src/main/index.ts)、[preload/index.ts](../apps/desktop/src/preload/index.ts) | 具名market/providers/workspace IPC；sender核验；本机FastAPI token；无渲染器任意URL访问 | 新overview及取消操作需新增精确白名单，不能偷偷复用queryProvider.data任意JSON扩展公开语义 |

### 必须纠正的历史窗口说明

P2-06交接称Massive默认“近30天”，但当前代码为 `start = end - timedelta(days=min(366, query.count * 3))`。ReadQuery默认count=20对应60天；ProviderPanel传5对应15天；证券工作台传260对应366天。这里是源码事实，不是新修复，也没有在本轮修改行为。Longbridge K线无日期时调用candlesticks(count)，其通用30天变量并不限制该分支。

此外，Massive官方聚合 `limit` 控制的是基础聚合数量，不能直接视为最终合成K线根数。本地传count=260、只取一个响应且不跟next_url，小时/周线可能不足260根。官方[聚合文档](https://massive.com/docs/rest/stocks/aggregates/custom-bars)区分基础聚合limit、毫秒时间和next_url。未来扩展应显式日期、限定页数/总根数/总时限，校验下一页HTTPS同域固定路径、循环游标和时间去重，不透传带密钥URL，不无限回溯。该扩展不属于本轮推荐MVP。

## 3. 三市场能力矩阵

下表“模拟”区分原产品Fixture和供应商协议假响应；没有把 .SH/.SZ 正则接受当成实际行情覆盖。

| 审计项 | A股 | 美股 | 加密货币 |
| --- | --- | --- | --- |
| 可用提供商 | 已有Longbridge适配；官方文档明确 .SH/.SZ。Massive当前不支持 | Longbridge、Massive既有适配 | 没有正式Provider；Binance/CoinGecko/Coinbase仅候选调研 |
| 已实现接口 | Longbridge单股报价、六周期K线、资料/估值等通用读映射；没有A股专用覆盖清单 | Longbridge16行情/公司/研究条目；Massive quote/kline/profile 三条目 | 0；股票ReadQuery拒绝BTC/USDT |
| 凭证 | Longbridge App Key/App Secret/Access Token；需用户账户及OpenAPI权限 | Longbridge三项凭证或Massive API Key；每能力仍受套餐限制 | 公开Binance行情候选无需Key；CoinGecko Demo需免费账户Key；本轮不申请 |
| 真实报价覆盖 | 官方支持不等于本机验证；尚未验证任何 .SH/.SZ | 历史仅Longbridge AAPL.US报价/5条K线/5条新闻的有限成功，见EVIDENCE第56节；本轮未重验。Massive未验证 | 无 |
| K线语义 | 六周期映射已实现；不复权；A股交易日历/停牌/真实日期完整性未验收 | 原Agent10日线；P2-06证券260/53合成样例；真实两Provider只证明协议映射，不保证长度/权限 | 无；候选接口有OHLCV，未适配、不与P2-06股票样例混用 |
| 行业/分类 | 当前投影没有行业字段；估值可取总市值，但权限/币种/覆盖未验 | Massive资料有市值；当前不投影SIC分类；Longbridge资料不是已验证行业源 | Binance exchangeInfo提供base/quote资产，不提供可信全市场市值/币种行业；CoinGecko有币种分类候选，非证券行业 |
| 批量行情/榜单 | 官方Longbridge quote最多500代码，当前研迹单股；security-list/screener未适配 | 同左；Massive有批量快照候选，当前没有；无完整市场榜单 | Binance指定交易对批量ticker候选；CoinGecko币种批量候选；当前均不支持 |
| 调用/速率限制 | 官方通用报价限制10次/秒、并发≤5、单账户长连接限制；本地没有跨子进程统一预算 | Longbridge同左；Massive Basic 5次/分钟，付费不限调用的宣传不等于所有接口无限可用 | 候选具体配额见第5节；本轮真实调用预算0 |
| 时间/时区 | .SH/.SZ业务时区Asia/Shanghai；SDK本地naive时间只在SDK边界转UTC；没有交易所日历能力 | 业务时区America/New_York，夏令时不能固定UTC-5；存储/DTO使用aware UTC，Massive报价纳秒/K线毫秒映射，市场/获取/服务时间独立 | 预期UTC；滚动24h涨跌不能叫股票昨收涨跌；USDT不等于USD |
| 缓存/新鲜度 | 既有真实内存缓存128键、TTL默认30秒/最大300秒，revision失效；无A股专用时效证据 | 同左；缓存served_at刷新不改变fetched_at/market_time；自行声明realtime不证明权限 | 尚无缓存；候选服务端缓存/配额与本地TTL分别管理 |
| 个人/网站/再分发 | 个人权限仍依账户与适用协议；没有公开展示/商业分发授权证据 | Massive个人套餐仅个人非商业；Longbridge交易所数据不能凭SDK许可公开分发 | 公开技术访问不等于公开展示/再分发权；见第5、6节 |
| 本轮联网验证 | 未执行；仅浏览文档 | 未执行；历史AAPL不当作本轮成功 | 未执行；未探测网络/地域可达性 |
| 模拟测试状态 | SDK映射已假测，主要输入AAPL；原市场Fixture没有A股 | 原四美股Fixture与SDK/MockTransport通过；本轮相关188项离线通过 | 原系统无crypto样例/测试；新Fixture待批准契约后开发 |
| 尚不可用 | A股离线总览、行业热图、真实批量/账户权限详情、全市场覆盖 | 总览、真实批量/榜单、行业图、历史分页、逐市场健康与权限 | 整个正式Provider、交易对DTO、真实总览/详情/历史；不制造假跳转 |

## 4. Longbridge与Massive的官方依据

- Longbridge[行情概览](https://open.longbridge.com/docs/quote/overview)明确 .SH/.SZ/.US，[报价接口](https://open.longbridge.com/docs/quote/pull/quote)支持数组且单次最多500代码，[security-list](https://open.longbridge.com/docs/cli/market-data/security-list)支持CN/US分页。这些不在研迹批量白名单内。
- [Longbridge通用限制](https://open.longbridge.cn/docs)列出报价10次/秒、并发≤5及长连接/订阅限制；SDK自带控制不代表多个研迹子进程共享预算。SDK 5.2.0本地类型包含quote_level/quote_package_details，当前服务没有暴露或调用。
- [Longbridge价格与权限](https://open.longbridge.com/pricing)列出US/CN基础层，并说明OpenAPI与App/Web权限独立；CN实时还依大陆IP，其他地区标15分钟延迟。是否获赠、促销有效、套餐激活、专业身份及具体标的权限须按用户账户核验。本轮没有读取这些信息；不声称免费基础层已在本机生效。
- [Massive价格页](https://massive.com/pricing?product=stocks)当前列Basic $0、5次/分钟及日终数据；Starter $29/月、Developer $79/月、Advanced $199/月（月付展示价）。Snapshot/Trades/实时能力分层，现有quote要求lastTrade，不能因Key能读聚合就认定quote成功。价格按2026-10-13页面记录，不是本轮支出。
- [Massive批量快照](https://www.massive.com/docs/rest/stocks/snapshots/full-market-snapshot)可按tickers过滤；未来只允许≤20股票池，禁止拉全市场再截取。批量快照仍没有“全部能力已授权”的含义；本轮不调用、不接入。

## 5. 加密候选比较（全部未接入）

| 项目 | Binance公开现货行情 | CoinGecko | Coinbase Exchange |
| --- | --- | --- | --- |
| 适合场景 | 特定交易所BTC/USDT等现货交易对 | 跨交易所币种估值/市值/分类研究，币种ID不是交易对 | 特定交易所BTC-USD等现货交易对 |
| 技术入口 | 官方[market-data-only](https://github.com/binance/binance-spot-api-docs/blob/master/faqs/market_data_only.md)明确无需认证；只列只读data-api端点 | [coins/markets](https://docs.coingecko.com/reference/coins-markets)支持币种ID批量、市值/24h变化与分类筛选；[simple/price](https://docs.coingecko.com/reference/simple-price)为简价候选 | [ticker](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-ticker)、[candles](https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles)公开行情 |
| Key/费用 | 所列公开行情无需Key；不需要钱包/交易账户私钥 | [价格页](https://www.coingecko.com/en/api/pricing) Demo $0，100次/分钟、10,000次/月，需署名；keyless池不作为稳定配额承诺 | 公共REST无私有签名，不购买WebSocket套餐 |
| 批量预算 | 官方[ticker/Kline文档](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints)：指定1–20交易对24h ticker权重2；Kline权重2/最多1000根；不请求无symbols全市场 | MVP若未来单次20币种/手动刷新≤每日100次，30天约3,000调用；分类/历史另计，不超过10,000总预算 | 主要按product读取，不建议20标的逐股高频轮询 |
| 频率/错误 | 官方[REST限制](https://developers.binance.com/docs/binance-spot-api-docs/rest-api/limits)按IP权重和响应头；429遵守Retry-After，继续请求可418封禁；未来用当次exchangeInfo限制，不写死总权重额度 | 当前公布Demo配额不等于用户账户生效；429/缺Key/权限错误须显式失败，不能自动换数据源 | 官方[REST速率](https://docs.cdp.coinbase.com/exchange/rest-api/rate-limits)：公共10次/秒、突发15，按IP；candles最多300根，无成交桶可缺失 |
| 时间/单位 | UTC时间；24h滚动变化，volume为base、quoteVolume为quote；与股票前收变化不同 | 聚合币种价格及服务last_updated；vs_currency=usd不能展示为BTC/USDT的交易所成交价 | UTC；BTC-USD的USD是真实报价资产，不能改名USDT；无成交桶不补假K线 |
| 分类/权重 | exchangeInfo资产对结构不是币种行业分类；没有可靠全币种市值 | 具市值/分类候选，可用于未来权重图，但须保留来源/更新时间与分类版本 | 无可信全市场行业/币种市值分类 |
| 地域与许可 | 未验证本机地域可用；[Terms入口](https://www.binance.com/en/terms)本轮只返回导航，未取到完整适用条款；不能确认公共展示/缓存/再分发权。data-api域是官方公开数据入口，不能作为绕过地域限制手段 | [API条款](https://www.coingecko.com/en/api_terms)、[商业/定制许可说明](https://support.coingecko.com/articles/1043089972-what-are-the-differences-between-commercial-and-custom-licenses)要求区分署名展示与原始数据再分发；商业套餐也不自动允许转售/转授；未核验本机可用性 | [2026-08-07市场数据条款](https://www.coinbase.com/legal/market_data)限制外部用户应用/第三方展示与衍生作品，且3.5明确限制AI、chatbot、agent等使用；地域可达与实际协议未验证 |
| 推荐结论 | 未来交易对行情首选技术候选；条款/地域确认和单独批准前不实现 | 未来市值/分类研究备选；币种报价与交易对必须不同模型。免费Demo不是商业/再分发授权 | 不作为P2-08 Agent数据基础；除非获得匹配用途的明确授权，否则保持排除 |

本轮没有真实请求这些端点，也没有非官方抓取、下载行情数据集、尝试地域代理或申请账户。Binance条款提取缺口明确保留，不能靠社区转载文本作授权依据。

## 6. 许可边界与推荐

- 当前优先自主编写离线样例；API费用、真实调用数、付费账户新增数均0。样例只演示功能，价格不是历史事实；不得署名为Longbridge/Massive/Binance真实来源。
- Longbridge [美国实体条款](https://longbridge.com/us/en/support/articles/14864594652431)对市场数据公开、再分发、商业使用另设授权限制。这是一个实体的证据，不代替用户实际所属实体的协议；其他实体/交易所授权尚未确认。
- Massive[个人服务条款](https://www.massive.com/legal/individuals-terms-of-service)与[市场数据条款](https://www.massive.com/legal/market-data-terms-of-service)限定个人非商业用途；网站向第三方展示或分发应另核业务/交易所许可，不能把Basic免费或付费订阅视作再分发权。
- CoinGecko商业展示、署名与原始数据再分发/白标应分别核验，后者需要定制许可。Binance无法取到完整条款属于真实接入阻塞，Coinbase的AI限制属于P2-08用途阻塞；均不阻塞自主样例。
- 推荐股票保留Longbridge主适配/Massive美股备选，先不增强真实批量/历史；crypto只保留候选研究。先批准独立overview契约再实现三市场离线MVP，准确方案见 [PHASE2-MULTI-MARKET](PHASE2-MULTI-MARKET.md)。
- SDK、图表与数据许可证是三件事。ECharts Apache-2.0不授权第三方行情；既有Folio/KLineCharts/Windows原生依赖与Pi分发边界仍保留，本轮不打包/发布。

## 7. 现有验证与未验证事项

本轮使用现有Python 3.12虚拟环境、隔离测试数据库/假凭证、SDK假上下文、MockTransport，并启用scripts/offline网络护栏，执行：

```bat
cd /d D:\folio\research-trail\services\backend
set RESEARCH_TRAIL_OFFLINE=1
set UV_OFFLINE=1
set UV_NO_SYNC=1
set PYTHONUTF8=1
set PYTHONPATH=D:\folio\research-trail\scripts\offline
.venv\Scripts\python.exe -m pytest -q tests\test_providers.py tests\test_market.py tests\test_workspace.py tests\test_chart_history.py
```

结果188 passed，失败/跳过0，27.67秒，1项既有Starlette/httpx弃用警告。覆盖已有24条模拟能力、只读边界、凭证隔离/缓存失效、SDK/HTTP映射、权限/认证/限流/网络/响应限额、所属进程超时/取消与P2-06数据回归；不证明A股真实覆盖、账户权限、crypto新能力或新UI。

本轮没有新增测试或修改旧测试。完整 `bun.cmd run verify` 与新的三尺寸Electron/截图尚未执行：产品开发须先获公开契约扩展批准；991仅既有main基线，不写成本轮完整复验。所有UI/新增模拟流程/真实数据三个交付层级均保持未验收。


## 8. 方案A执行后的支持边界

P2-07新增独立市场总览契约/两个本机只读API和具名IPC，自主A股6只CNY/美股4只USD/crypto6对USDT；等面积热力格、筛选/统计/详情和有界共享缓存/取消已实现，专项34 Python/6 Node/8实际Electron通过。上一轮完整verify退出0：900 Python/57 Node/82实际Electron，共1039通过，失败/取消/跳过0，原991保留。用户现已认可三市场和600px实际Electron截图，授权最终复验/提交/Draft PR；最新回执见PHASE2-MULTI-MARKET第10节。真实总览未接入、未验证。

上述是新增UI与确定性模拟流程，不改变第3节供应商真实覆盖、第4节Massive窗口缺口或第5～6节许可判断。真总览模式拒绝请求，无Provider调用/模拟回退；没有新API账户、费用、行情依赖、数据集抓取或交易功能。旧Quote/ReadQuery/SecurityQuery/Agent工具与既有所有OpenAPI模型/路径保持；只有独立overview契约获批准。

最终审查继续保持API费用/新增行情请求0。GitHub提交/Push/PR与CI查询属于本轮交付授权，不代表允许真实行情联网验证。数据源接入、逐市场实际账户权限、用户所属协议的个人使用/网站展示/再分发、Binance地域与完整条款、CoinGecko账户/配额/署名与商业授权，以及Windows/Pi原生分发许可仍需单独决定；不在本轮修复Massive历史分页，不把公开接口可访问性写作数据使用许可。

本轮最终完整离线复验退出0：900 Python/57 Node/82实际Electron，共1039项通过，失败/取消/跳过/todo均0；用户视觉认可与本机模拟验收通过。20张三尺寸/操作/状态实际Electron截图在仓库外pr-final/，本次源码审查未更改认可产品，新增专项只加强键盘/原生触摸与截图证据。该结论没有增加任何三市场真实请求证据，当前Head的Push/PR CI另核。
