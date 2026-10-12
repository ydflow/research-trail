# P2-06：证券详情与专业 K 线增强

日期：2026-10-12（Asia/Shanghai）。当前状态：验收通过（用户已审核三张实际Electron截图并认可；最后本机完整离线991项通过）。用户授权提交、普通推送、独立Draft PR并等待当前Head两条CI；远程结果须独立核验，不以本机通过代替。不合并、不执行P2-07/08、不创建Release或安装包。当前结果见第10节及EVIDENCE第75节；第1～9节保留本地开发验收范围。

合并前针对性审查：旧Head `8b81d3b15bf8babe23925e22361425a5a9262790` 两条CI均成功；发现并最小修复同一图表组件的数据更新读数残留。当前修复本机验收通过，范围与证据见第11节，新Head两条远程CI待核验，不把旧Head的CI计为修复后成功。

## 1. 进入基线与范围

P2-05 已由 [PR #33](https://github.com/ydflow/research-trail/pull/33) 普通 Merge Commit 合并，main SHA 为 `3c522ee2d9206352c467f68d7c0e1cc329892dcf`。开发前核对本地 main、origin/main、GitHub main 一致，工作区/暂存区干净。用户指定的 [main CI 38229238638](https://github.com/ydflow/research-trail/actions/runs/38229238638) 最初仍运行时暂停开发；收到继续指令后复查 completed/SUCCESS 且 head_sha 精确匹配，才创建 `feat/phase2-security-chart-enhancement`。原基线 828 Python / 51 Node / 67 Electron，共946项。

阅读 AGENTS、ROADMAP、EVIDENCE、P2-05技术/参考说明，以及仓库外 `P2-06-HANDOFF-3c522ee.md`。P2-05手册内的 Draft/未合并/P2-06未开始均保留为当轮历史；当前状态以路线顶部与本文为准。

保留 React → preload/main 白名单 → FastAPI → Python 的调用链。Python掌握金融数据与业务状态；前端只管理展示和交互，MA由已有图表库计算。不修改App、左侧15入口、顶部工具栏、AI会话组件、常驻资产、AgentRunner/pi、SSE、取消、恢复、数据库迁移或公开API/DTO。不增加交易、新行情账户、付费接口或依赖。

## 2. 改造前后的实际能力

| 项目 | P2-05 基线 | P2-06 本地实现 |
| --- | --- | --- |
| 历史长度 | 固定模拟10根；证券请求20根；归一化截前100根 | 证券请求最多260根，排序后保留最新260根；模拟日线260根、周线53根 |
| 证券概览周期 | 请求固定1d | 概览及K线视图共享六周期，period真实传到Python |
| 模拟周期 | Provider忽略period，日线可被标成分钟/周线 | 证券专用样例按分钟/周聚合；旧仅日线样例拒绝其他周期 |
| 指标/量柱 | 未开启 | 库内置MA5/10/20主图，VOL独立分区；可开关 |
| 鼠标交互 | 库默认交互，缺少可核查读数/控制 | 原生十字光标与OHLCV/UTC读数、滚轮缩放、拖动、放大/缩小、复位 |
| Resize | 每次resize自动fit，抹掉用户视野 | 只resize；新数据与显式复位恢复默认视野 |
| 状态 | 旧来源/缺失/失败反馈 | 原反馈保留；新增无效时间/OHLCV防护与指标样本/量缺失提示 |

## 3. 六周期与历史真实性

| 周期 | 证券模拟数据 | Longbridge 5.2.0 SDK映射 | Massive REST映射 | 验收边界 |
| --- | --- | --- | --- | --- |
| 1m | 260根合成分钟OHLCV；间隔60秒 | Min_1 | 1/minute | 离线模拟与协议夹具通过 |
| 5m | 同一合成分钟规则按300秒桶聚合，260根 | Min_5 | 5/minute | 同上 |
| 15m | 按900秒桶聚合，260根 | Min_15 | 15/minute | 同上 |
| 1h | 按3600秒桶聚合，260根 | Min_60 | 60/minute | 同上 |
| 1d | 250根合成前缀+既有10根自主编写日线，260根 | Day | 1/day | 同上 |
| 1w | 对260根日线按周聚合，53根；周一UTC桶起点 | Week | 1/week | 同上 |

以上是真实执行的适配映射，**不是实际金融服务、数据授权、市场覆盖或账户权限已经验收**。真实提供商没有在本轮联网调用。不支持能力/权限受限/未配置继续显示原状态与错误，不能伪装成功，更不回退为模拟数据。

260是请求/投影上限，不保证真实服务返回260根。Longbridge无显式日期时按count读取；Massive仍沿用原默认近30个自然日的日期范围（日线可能约20根，周线可能约4～5根，依市场日历/权限而定）。本轮未改变该真实默认范围、复权或权限语义，数据不足时相应MA不绘制。模拟更长历史不证明真实历史窗口同样可用。

新 `chart_fixtures.py` 只用于证券工作台 `mode=simulated` 的K线读取。固定规则不依赖系统时间、随机数或账户；全部示例非真实苹果/微软等历史行情。OHLC上下界、成交量非负、时间唯一递增由测试及既有Kline契约检查。日线前缀只按工作日安排，不声称交易所日历；分钟是连续合成时间线，不声称真实交易时段。周线末桶仅包含已有样本，不声称完整交易周。

分钟OHLCV按源分钟实际聚合（首开、最高、最低、末收、量求和），不是日线重标或真实数据插值。锚定既有样例的最终价，最后分钟收价与旧报价一致；分钟、日线、周线的市场时间各自表示最后蜡烛的时间/桶起点。市场演示页、Agent及金融分析默认仍使用原10根日线；它们的旧fixture读取若请求非日线会明确返回UNSUPPORTED_CAPABILITY。未知证券无编造样例。

ProviderService只新增内部可选 `chart_history` 参数，不加入HTTP请求或preload白名单。真实执行分支不读取这个模拟选择；自定义执行器没有专用chart_history时保留其原返回/错误，不能覆盖失败来制造成功。离线missing/failure注入也保留原错误。

公开 `Provenance.data_label` 是固定枚举：保留“模拟数据”，没有扩大枚举或改生成类型；证券图表标题、说明明确标记“合成样例 · 非真实历史”。来源、币种（存在时）、市场时间、获取时间、服务时间继续显示。无法从供应商取得币种时明确未提供，不猜测USD。

币种来自现有报价/公司资料DTO，概览报价与图表在取得该字段时显示；独立K线DTO本身没有币种字段，不根据US/HK等后缀推测，也不为了图例自动追加真实报价请求。该元数据限制保留，未扩展公开契约。

现有Kline DTO要求有效volume。后端缺量的整根数据仍按原契约缺失，不补零；若全部缺量则暂无K线。渲染边界另有防御性测试：即使运行时收到缺量OHLC数据，也可画价图，但整个VOL分区隐藏并说明，防止库默认补零。保留价格并传输逐根缺量的能力需要将来明确授权DTO设计，本轮未扩展。

## 4. 图表与证券展示实现

继续使用锁定的 `klinecharts@10.0.3`，未安装Pro或Lightweight Charts。证券视图传 `professional`；市场演示及聊天工具图表保留基础模式，不增加助手中的控制项。

- `ChartPeriodBar`：中文周期按钮、选中状态、保留原“证券K线周期”select的名称与角色，支持键盘操作。真实模式的周期变化仍等待新的显式查询，不能复用旧授权自动读取。
- 原生MA通过 `createIndicator`，calcParams按可用样本筛选5/10/20；库只从第N根开始返回MA值，测试检查真实indicator.result的前N−1项为空及首个均值。没有自写投资信号或策略。
- VOL独立 `volume_pane`，共享原时间轴，使用已有金融涨跌色；不完整量数据时不创建VOL，不用库的缺量补零默认值。
- 原生十字光标事件在v10可仅有坐标；使用公开 `convertFromPixel` 和实例 `getDataList` 取得选中蜡烛，展示UTC日期时间与开高低收量。滚轮和鼠标拖动由库处理。
- 放大/缩小调用 `zoomAtCoordinate`；复位设置默认barSpace、右侧空隙并回到最新。默认展示最近约80根（受宽度影响），历史通过拖动/缩放访问，不自动请求更多数据。
- ResizeObserver只调用resize，不fit、不回到最新；卸载断开observer、取消待处理RAF、退订action并dispose。新证券/周期沿用原请求隔离与清空状态，不保留旧数据。
- 证券标题、主报价与来源层级沿用P2-05。概览图卡内增加周期栏，局部控制项紧凑；概览画布200px，独立K线画布360px（窄窗口280px），没有重建全局布局。财报/新闻/公司资料只用已有真实交互与样例内容，空值仍明确未提供。

图表DOM上的 `chartEvidence` 只提供实例数据/指标/可视范围/事件次数的检查读取，不开放图表操作、业务写入或新桥接API。Electron测试由这里核查真正进入引擎的蜡烛和指标，旧data-loaded-*证据字段也保留。

## 5. 开源参考与许可证边界

实施前核查GitHub提交对象、未截断tree、README、许可证及主要组件，取得blob内容并验证Git blob SHA和本地SHA256。原始缓存在仓库外 `research-trail-p2-06-qa/references/`，未导入产品。

| 项目/固定SHA | 本轮实际阅读 | 使用的通用思路 | 未使用内容与许可记录 |
| --- | --- | --- | --- |
| [klinecharts/pro](https://github.com/klinecharts/pro/tree/4234b79f0bcfc26734d0a721c38cbd6d23aa38f5) `4234b79f0bcfc26734d0a721c38cbd6d23aa38f5` | README、LICENSE、src/index.ts、widget/period-bar、indicator-modal、component/loading | 紧凑周期栏、主/副图指标入口、事件清理 | Apache-2.0；未复制SolidJS组件、SVG、样式或安装Pro。复杂指标/全屏/截图/时区菜单仅调研，未添加无功能按钮 |
| [tradingview/lightweight-charts](https://github.com/tradingview/lightweight-charts/tree/cb06581a0ae28778de17521b5c3edc8119e46d5d) `cb06581a0ae28778de17521b5c3edc8119e46d5d` | README、LICENSE、NOTICE、chart-api、time-scale-api、moving-average-calculation、legends及price-and-volume教程 | 价量共用时间轴、十字光标图例、显式复位与普通resize区分、MA样本不足留空 | Apache-2.0；README另记录tslib BSD-0-Clause及TradingView attribution/链接要求。未安装、复制计算/API或品牌素材，未替换引擎 |

固定许可文件：[Pro LICENSE](https://github.com/klinecharts/pro/blob/4234b79f0bcfc26734d0a721c38cbd6d23aa38f5/LICENSE)、[Lightweight LICENSE](https://github.com/tradingview/lightweight-charts/blob/cb06581a0ae28778de17521b5c3edc8119e46d5d/LICENSE)、[NOTICE](https://github.com/tradingview/lightweight-charts/blob/cb06581a0ae28778de17521b5c3edc8119e46d5d/NOTICE)。如果以后实际导入代码/依赖，应重新评估工程与声明义务并等待用户授权；本轮没有发生这种复用。

本轮React周期栏、样例生成、展示防护、样式和测试由研迹实现；MA/VOL/交互核心来自既有KLineCharts库，不能记作自行开发图表引擎。保留FinancialKLineChart原Folio适配声明及既有授权记录。P2-05四个金融终端只属于当轮补充调研，未追记为P2-06代码来源。此前概念图继续提供白/浅灰、绿色品牌与证券研究主次方向，没有把图中数字、新闻、财报或虚构按钮导入应用。

## 6. 文件范围

| 文件 | 作用 |
| --- | --- |
| renderer/market/FinancialKLineChart.tsx、financial-kline.css | 原引擎增强、原生指标与交互、清理与局部样式 |
| renderer/securities/ChartPeriodBar.tsx | 可复用周期栏 |
| SecurityWorkspace.tsx、SecurityOverview.tsx、SecurityViews.tsx | 周期上下文、专业图表与准确标签 |
| backend/research_trail/chart_fixtures.py | 明确隔离的确定性合成历史 |
| provider_service.py、security_workspace.py、workspace_fixtures.py、workspace_normalize.py | 私有模拟选择、260根读取/展示、原错误保持 |
| backend/tests/test_chart_history.py、tests/desktop.test.cjs | 38个Python、7个Electron新增回归 |
| 本文、ROADMAP、EVIDENCE | 当前基线、能力/来源/验收/后续边界 |

开发轮16个文件，合计新增872/删除68行：11个产品源码文件新增288/删除66行，2个测试文件新增410/删除0行，3个文档文件；该轮逐文件差异见仓库外delivery-manifest.json。未改锁文件、依赖、App、SessionPanel、公共设计tokens、main/preload桥、DTO、迁移、金融计算或pi。原Electron测试正文逐行保持，该轮最终verify前后的13个代码/测试文件SHA256一致。当前提交清单见第10节。

## 7. 验收结果与实际截图

已执行：契约/TypeScript、main/preload/renderer构建；相关Python专项209项通过；图表专项加P2-05首屏原断言8项实际Electron通过。收尾统一状态截图尺寸、补准确周期说明后，图表7项再次通过，并冻结代码/测试后重新运行完整verify。

| 最终完整离线验收 | 通过 | 失败/取消/跳过/todo |
| --- | --- | --- |
| Python | 866（319.68秒） | 0 |
| Node | 51（24 pi + 27原Node） | 0 |
| 实际Electron | 74（549.12秒） | 0 |
| 总计 | 991，较原946新增45（38 Python + 7 Electron） | 0 |

最终 `bun.cmd run verify` 退出0。两轮完整验收均991通过；第一轮日志verify.log，最终日志verify-final.log。契约、TypeScript、main/preload/renderer构建、pi/native许可审计、两条pi离线往返、工程/历史样例、隔离0020迁移重复升级与一致性全部通过。只有既有Starlette/httpx弃用1条及Vite主chunk522.90kB体积警告，未放宽阈值或新增依赖。远程证据仅是已核验的P2-05 main CI；本轮未提交，未触发P2-06远程CI。

过程问题与修复如实记录：初版尝试新data_label被公开枚举拒绝，改为原枚举+UI明示；第一版周期栏/全局label样式使卡片过高，收紧图卡局部布局恢复原首屏断言；v10事件不一定包含kLineData，改公开坐标转换；新增测试的Electron evaluate参数与空会话前置条件错误已修正。未删除、跳过、放宽原946项测试。

使用现有Playwright `_electron` 启动真实应用、真实preload/Python、隔离临时SQLite与离线Fixture；Browser plugin not available。截图来自运行中应用，不是概念图。各阶段日志/截图在仓库外，原阶段失败日志保留。

最终截图目录：`D:\folio\research-trail-p2-06-qa\final\`，最终完整verify运行保存，已实查图表/光标/状态/三个尺寸，14张P2-06截图的PNG尺寸与SHA256见delivery-manifest.json。主要文件：

- `p2-06-overview-1d-1440.png`：1440×900证券首屏、日线/量柱/MA、常驻助手真实保存的Fake工具消息。
- `p2-06-full-kline-day-1440.png`、`p2-06-full-kline-week-1440.png`：独立K线视图。
- `p2-06-overview-5m-1440.png`、`p2-06-overview-1w-1440.png`：有效其他周期。
- `p2-06-crosshair-ma-volume-1440.png`：真实鼠标十字光标与读数。
- `p2-06-chart-1440.png`、`p2-06-chart-1000.png`、`p2-06-chart-600.png`：1440×900、1000×700、600×700图表。
- `p2-06-empty-1440.png`、`p2-06-invalid-1440.png`、`p2-06-unsupported-1440.png`：IPC交付边界防御注入，Python原响应来自真实离线应用，不冒称供应商故障。
- `p2-06-python-missing-1440.png`、`p2-06-python-failure-1440.png`：Python离线missing/failure夹具，无伪造成功或量柱。

基线截图归档在仓库外 `D:\folio\research-trail-p2-06-qa\before\`；中间stage1/2/3与最终verify分开。实查三个尺寸无整页横向溢出，1440保持三栏，1000与600沿用P2-05响应式规则将助手放在后续区域；窄窗口需滚动，但导航、资产页签、图表与助手输入保留。异常状态明确且可刷新恢复，没有空白画布冒充成功。用户视觉审核尚未执行；不声称与概念图完全一致。图片/日志/数据库不纳入Git，测试环境移除私人凭证，未使用真实模型或账户。

## 8. 与概念图的差距及后续边界

已接近：主报价优先、图卡内有效周期/指标/读数、成交量分区、历史密度、浅色绿色品牌和已有三栏研究布局。概览图区为了保留首屏财务/新闻入口仍较紧凑，独立K线视图提供更大画布；现有公司名称为样例英文，不复制第三方证券logo或虚构完整公司资料。

未实现：概念图丰富的真实财报、新闻、公司指标和研究结论，真实交易日历、自动历史分页/无限回溯、更多市场、实时流、复杂指标/绘图工具/交易信号。这些不能通过合成数据冒充。没有声称与概念图完全一致。

P2-07独立授权后继续真实数据源/多市场覆盖与热力图能力，明确历史长度、时区、复权、交易时段和权限；本轮只读取既有能力，不实施P2-07/08。两个真实Provider的套餐/权限/返回质量和金融数据再分发授权均未验收。Windows分发的既有许可证/运行时缺口保留，不创建新安装包或Release。

## 9. Windows CMD 复核

```bat
cd /d D:\folio\research-trail
git status --short --branch
bun.cmd run check
cd /d D:\folio\research-trail\services\backend
.venv\Scripts\python.exe -m pytest -q tests\test_chart_history.py tests\test_workspace.py tests\test_providers.py tests\test_market.py tests\test_agent.py
cd /d D:\folio\research-trail
bun.cmd run build
set RESEARCH_TRAIL_OFFLINE=1
set RESEARCH_TRAIL_QA_DIR=D:\folio\research-trail-p2-06-qa\review
node --test --test-name-pattern="P2-06" tests\desktop.test.cjs
bun.cmd run verify
set RESEARCH_TRAIL_QA_DIR=
set RESEARCH_TRAIL_OFFLINE=
```

不要并行运行verify、另一套Electron测试或截图进程。开发轮结束时保持未提交；用户随后已确认截图并单独授权最终提交，本轮边界见第10节。

## 10. 最终审查与 Draft PR 交付

2026-10-12用户确认三张实际Electron截图符合本阶段视觉要求，授权最终验收、提交、普通推送、独立Draft PR；不自动合并或发布。核对研迹根目录、当前feature分支、HEAD/main/origin/main及远程main均为3c522ee2d9206352c467f68d7c0e1cc329892dcf，暂存区为空；无同分支已有PR，GitHub身份为ydflow。

逐项复核六周期聚合/时间间隔、合成标识、MA样本、VOL/光标、缩放/拖动/复位/resize/清理、迟到请求与真实显式查询。发现新增迟到用例释放后只检查终价的证据缺口：补交付计数、等待IPC旧响应交付并经过渲染帧，再检查当前小时周期及全部3600000ms间隔，防止相同终价掩盖错误周期。专项1项通过；产品源码未修改，不因已知合成走势、周期选择重复或窄窗口小字进行视觉重构。原946项测试不删除、不跳过、不放宽；新增仍为38 Python/7 Electron，共45项。

16个文件的允许清单、UTF-8、相对链接、git diff --check、敏感凭证特征及第三方固定blob/SHA256核查通过。11个产品文件哈希与用户审核实现一致；只有新增Electron测试加强，源码原Folio声明与既有KLineCharts许可保留，未复制开源参考项目的代码/图标。既有依赖附带的KLineChart/TradingView NOTICE、LICENSE及LICENSE-lightweight-charts原样保留于docs/third-party/klinecharts；未新安装Pro或独立Lightweight Charts包。既有Windows分发许可风险不因本轮调研而解除。

本轮完整 `bun.cmd run verify` 退出0：866 Python（297.64秒）、51 Node（24 pi+27原Node）、74实际Electron（473.34秒），共991项，失败/取消/跳过/todo均0，原946项与新增45项全部保留。契约、TypeScript、main/preload/renderer、许可图审计、离线pi往返、固定工程/历史样例与隔离迁移检查通过。保留既有Starlette/httpx弃用及Vite主chunk522.90kB警告，不放宽阈值。

日志与14张实际Electron截图分别保存到仓库外 `pr-final-verify.log` 和 `pr-final/`，覆盖1440×900、1000×700、600×700、日/分钟/周线、量柱/光标/指标和无数据/异常；PNG尺寸及哈希按提交前清单复核。测试只用离线Fixture/Fake与隔离SQLite，不调用真实行情/模型/账户。验收后按授权提交/普通推送/Draft，远程Push/PR CI须核对最终Head并单独记录，不以本机结果代替；不自动合并。

实际交付：主体提交 `d065d59b0244b5461777c641b67447418f9b28d4`，16文件新增906/删除68行，普通推送并创建 [Draft PR #34](https://github.com/ydflow/research-trail/pull/34)，目标main、OPEN/isDraft=true、MERGEABLE。当前段只补交付回执，不改代码/测试。主体Head的Push CI 38260973870与PR CI 38261033248已触发，记录时均在运行；补回执后的最新Head与两条CI须以PR检查单独核验，不将旧Head状态计为最终成功。不合并、不创建Release或安装包。

## 11. 合并前 OHLCV 残留边界审查

2026-10-12复核Draft PR #34，Head为 `8b81d3b15bf8babe23925e22361425a5a9262790`，Push 38261231530与PR 38261238140均SUCCESS。有效行情选中历史蜡烛后，同一个FinancialKLineChart接收无效时间戳：画布已销毁、错误已显示，但selected未清除，读数仍为旧蜡烛（1700254800000ms；收178.04）。既有页面刷新会先卸载图表，因此原边界用例未覆盖该路径。

只修改选择状态与当前数据的对应关系：保存数据批次/证券/周期/时间戳，渲染时从当前有效批次查找OHLCV，批次或上下文变化即回退当前末根，无有效数据则显示暂无数据/未提供。不会依赖被动effect先清空旧读数，正常十字光标仍读取原生图表当前蜡烛。未改图表引擎、MA/VOL、缩放/拖动/resize、CSS、业务/API/后端或P2-05外壳。

扩展既有P2-06 Electron边界测试，不新增或跳过测试项。使用已有esbuild编译实际生产组件，通过Playwright在真实Electron渲染器的独立测试root里连续传递props；测试层不接触React私有状态、不修改应用CSP/桥/后端，React组件始终保持挂载。选中蜡烛后验证无效数据的时间戳为空、五项读数均未提供；恢复后选中历史蜡烛，再以相同时间戳的新OHLCV更新，layout提交证据确认在resetData被动effect前已使用新批次末根。实际图表数据更新、画布节点保留、刷新后的十字光标五项读数及单次挂载均核对。测试内加1000价差/123量差仅为对抗性输入，不写入演示fixture或真实业务数据。

修复前扩展用例明确失败；修复后7项P2-06 Electron专项全部通过，类型/契约及构建通过。截图与日志在仓库外 `D:\folio\research-trail-p2-06-qa\readout-review-before*`、`readout-review-after/`，截图是运行中Electron的组件边界测试，非用户产品演示数据；无有效数据的修复前/后及刷新后读数均留证。完整verify与当前修复Head的远程CI须分别验收；只更新已有Draft，不合并或发布。

完整复验 `bun.cmd run verify` 退出0：866 Python（297.05秒）、51 Node（24+27）、74实际Electron（471.31秒），共991项，失败/取消/跳过/todo均0。原946项与新增45项全部保留，仅扩展既有Electron边界断言；契约/类型、构建、离线流程与隔离迁移均通过。保留Starlette/httpx弃用和Vite主chunk523.17kB既有警告，不修改阈值。日志为仓库外readout-review-verify.log，最新截图为readout-review-final/。当前按授权更新已有Draft PR #34，修复Head的Push/PR CI须单独等待核验，不以旧Head或本机结果代替，不合并或发布。
