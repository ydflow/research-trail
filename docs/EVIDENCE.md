# 研迹：来源、个人动作与验收证据

记录日期：2026-10-04（Asia/Shanghai）。只写实际事实，不把规划、上游运行或测试结果当作研迹成果。

## 1. 初始状态与责任

执行第0步前：目标目录不存在，没有本地 Git、提交或业务文件。用户确认先在当前聊天完成第0步，之后再交接。此前保存到父目录的交接草稿和提示词手册不算第0步完成。

第0步验收时创建七份材料和本地 main Git，文档/仓库验收通过；当时第1—24步未开始。以下第0步检查保留为历史记录；第1步见第6节，首次源码上传见第7节，第2步见第8节。

| 类别 | 本步实际动作 | 责任边界 |
| --- | --- | --- |
| 用户选择 | 项目命名、Python核心、空骨架移植、完整目标、模拟先行、分步学习与上传 | 已确认决策，不代表用户亲手编写这些文件或已经掌握源码 |
| AI协作生成 | AGENTS、README、路线、来源记录、参考源码学习大纲、练习位置和忽略规则 | 文档搭建；不是Python功能或应用实现 |
| 本地Git | 初始化main，无commit/remote | 本地状态；不是GitHub交付 |
| 上游阅读 | 查询入口、契约、事件、策略、筛选和许可位置 | 静态源码观察；未运行上游测试作为本项目证明 |

用户尚未完成本步文档练习或理解题；回答位置在 [practice](../practice.md)。不预填答案、不记“已掌握”。

## 2. 来源登记

| 项目 | 证据 |
| --- | --- |
| 上游 | https://github.com/helsome/folio |
| 本机只读目录 | D:\folio\主分支和简历skill\folio-main |
| 原始ZIP | D:\folio\folio-main.zip |
| ZIP comment提交 | ba5dcdfd31b162f5edb8b908f7f099a560389326 |
| ZIP SHA256 | b19a0895406e92200e890ce2bc30eb6c7d381af222fa05a6413dca398754688e |
| 上游package版本 | 0.4.0-beta.2，仅为参考版本 |
| 本地参考Git | 没有.git；不能查询本地HEAD，ZIP标识不保证本地逐文件等同上游提交 |
| 授权观察 | 查到skills/LICENSE为MIT，Copyright (c) 2026 Longbridge Inc.；整项目授权未核实 |
| 本步导入代码/素材 | 无；七份文件为本次协作编写的规则和学习文档，源码路径仅作引用 |

不自行添加声称覆盖上游全仓的MIT许可证。未来复用需保留适用声明并记录实际授权事实；用户希望复用源码与第三方授权核实是不同记录。

### 静态观察与解释

- 参考`dev`只启动Vite；新项目第1步须自己实现桌面+Python启动。
- 参考本地Agent按关键词路由；模拟行情与模型不同，当前不能称作LLM。
- 参考KernelBridge同时订阅旧AgentEvent和新StreamEvent；迁移时需防止重复显示。
- 8策略、17筛选是参考源码枚举，不代表研迹具备。
- 独立claim-verifier存在不代表报告已经自动核验；证据链接也不是结论真实性证明。
- 原打包配置包含mac目标；Windows发行需第24步独立验证。

## 3. 参考目录保护检查

方法：对只读参考目录进行文件摘要，排除任何路径中的node_modules、dist、.git、.venv、__pycache__、.cache；每个文件取SHA256，按相对路径序列化摘要表后再取SHA256。只输出数量与总摘要，不输出环境文件内容。

执行第0步前：1054个文件，摘要 `d607475466f8d7c809be75b7e07bba2206cc9a586c7ac9895080aa8ed962a20c`。

执行后：1054个文件，摘要仍为 `d607475466f8d7c809be75b7e07bba2206cc9a586c7ac9895080aa8ed962a20c`，与执行前一致。该摘要是文件保护证据，不是Git HEAD或应用正确性测试；排除目录的内容不在该摘要验证范围内，本轮也未向参考目录执行写入。

## 4. 第0步检查记录

以下是本次实际执行的文档/仓库检查，不是应用功能测试。

| 检查 | 当前结果 | 说明 |
| --- | --- | --- |
| 文件与链接 | 通过 | 精确七份材料；10处本地Markdown链接和86个完整参考路径存在；编码、空白和代码围栏检查通过 |
| 路线状态 | 通过 | 仅第0步验收通过，1—24未开始；8策略和17筛选范围与参考枚举核对 |
| Git根/main/提交数 | 通过 | 根为D:/folio/research-trail，main，0提交，尚无HEAD提交 |
| Git暂存与remote | 通过 | git ls-files、暂存差异、remote均为空；七份文件全部未追踪，无外部写入 |
| 忽略规则 | 通过 | git check-ignore检查23个合成路径：14项秘密/库/日志/私人数据/产物被忽略，9项配置示例/材料/测试fixture可追踪；未创建真实密钥或账户文件 |
| 无业务代码 | 通过 | 除.git外只有七份材料；没有package.json、pyproject.toml、启动脚本或应用源码；计划子目录为空 |
| 参考目录摘要 | 通过 | 前后均1054文件，总摘要相同，排除范围见上一节 |
| 文档与仓库验收 | 通过 | 第0步唯一交付检查；用户学习练习仍未完成 |
| 应用自动测试/构建 | 未执行 | 没有应用，不安装依赖或虚报测试数 |
| 桌面操作 | 未执行 | 研迹尚不可运行 |
| 假模型/模拟数据 | 未执行 | 尚未实现Provider或Agent |
| 真实模型/真实数据 | 未执行 | 无连接调用 |
| Windows安装包 | 未执行 | 留到第24步 |
| GitHub/发布 | 未执行 | 当前无授权执行上传模板 |

### 实际检查方式

- Git只读命令：`rev-parse --show-toplevel`、`symbolic-ref --short HEAD`、`rev-list --all --count`、`status --short --untracked-files=all`、`ls-files`、`diff --cached --name-only`、`remote -v`。
- 一次性Python 3.12文档检查：精确文件清单、UTF-8读取、尾部空白、代码围栏、本地链接、完整参考路径存在性；没有增加业务测试脚本或安装依赖。
- 忽略检查：对合成路径运行`git check-ignore --no-index -q`，核对忽略与允许结果，不写入模拟秘密文件。
- 原目录保护：使用Python os.walk剪枝、文件SHA256和排序后的摘要表SHA256，前后比较相同。
- 无运行调用链：本步只有“用户约定 → 七份文档与本地Git → 文档/仓库检查”，桌面到Python业务链留到第1步。

### 本步个人学习记录

- 小改动练习：未完成。
- 我选择Python核心后端的原因：待用户填写。
- 我希望首版如何演示：待用户填写。
- 三道理解题：见practice.md；未回答，不记已掌握。

## 5. 后续证据模板

每次追加，不覆盖历史和用户笔记。

```text
步骤/日期：
场景与问题：
用户已确认的决定：
复用来源与保留声明：
本次Python新实现/适配/修复：
真实入口 → 调用/事件 → 输出：
相关文件：
检查命令与实际结果：
桌面人工验收：
假模型/真实模型：
模拟/真实数据与权限：
安装包状态：
失败或未验证项：
用户亲自做的小改动与回答（未做则写未做）：
提交/PR/Release（未执行则写未执行）：
停止位置与下一步：
```

复制上游源码、已有测试或数据不能自动计入个人新增。每次GitHub写入前重新验证ydflow与目标，不以历史账号验证替代。

## 6. 第1步：桌面与 Python 健康链（2026-10-04）

- 授权：用户明确发送第1步，要求窗口、健康、失败解释、重试、随机本机端口/令牌和仅清理本次子进程。
- 新实现：本项目 Electron main/preload、React 健康页、Python FastAPI 健康服务、Bun/uv 清单与锁文件、根 CMD 启动器和生命周期测试。未复制 Folio 源码、图片或完整页面；参考功能只是方向，未运行上游 TS 内核。
- 调用链：`start-dev.cmd` → 锁定依赖同步 → `scripts/dev.mjs` 构建 main/preload、启动 Vite 和 Electron → `main/index.ts` → `BackendManager.retry` → 虚拟环境 Python `-m research_trail` → 绑定 `127.0.0.1:0` 后传同一 socket 给 Uvicorn → stdout 就绪端口 → 主进程带令牌检查 `/health` → 白名单状态事件 → React。
- 隔离：preload 仅暴露 status/checkHealth/retryBackend/onStatus；main 验证 IPC 来源；renderer 不含 Node、文件、进程或数据库接口。令牌随机生成，只经环境和本机请求传递，不传给页面或命令行。健康请求显式绕过代理，开发页面也直连本机；无令牌及其他实例令牌返回401。
- 退出：Electron 通过 stdin 通知本次 Python 优雅结束，超时才结束自身持有的子进程；Python 管道 EOF 也会结束。正常关窗触发 before-quit 清理；dev 启动器在 Electron 退出后关闭 Vite。启动器异常消失时 Electron 监测其精确 PID 后退出。
- 修复记录：Windows 动态 import 使用 file URL；Electron GUI 的重定向 stdin 会提前 EOF，改为启动器 PID 监测，未影响 Python 的 stdin 管道；Electron 首次官方下载遇到 Node 未使用当前代理的问题，安装时启用会话级 NODE_USE_ENV_PROXY，CMD 中使用 setlocal 限制作用域。未改系统策略、代理配置或参考目录。

| 检查 | 结果 | 实际边界 |
| --- | --- | --- |
| TypeScript | 通过 | `bun run check` |
| 构建 | 通过 | `bun run build`，main/preload 与 React 构建；不是安装包 |
| Python 自动测试 | 4通过 | 正确/缺失/错误令牌、文档接口关闭、随机端口与两实例令牌隔离、仅关闭所属后端、stdin EOF退出 |
| Electron 实窗自动化 | 4通过 | 真窗口健康、四接口/沙箱隔离、重新检查、故障/恢复、关闭后无所属Python、另一实例不受影响、缺Python启动/重试失败、Electron强制退出、Vite页面/CSP/热重载 |
| 根 CMD 启动链 | 通过 | 实际执行start-dev.cmd，Vite和Electron启动，终端报告starting→healthy；随后仅停止已核对归属的启动器，所属Electron/Python退出 |
| 画面 | 已检查 | Playwright Electron截图；1100×800窗口及600×620紧凑窗口；标题、文案、留白、颜色、按钮与失败原因可读；无横向溢出 |
| 桌面人工验收 | 待用户 | 未把自动截图/操作记为用户亲自点击或系统桌面人工确认 |
| 用户练习/理解题 | 未完成 | practice.md待用户填写，未代填 |
| 假模型/模拟行情/真实服务 | 未执行 | 均未实现或调用；健康服务是真实本机HTTP，不是模型连接 |
| Windows安装包/CI/GitHub | 未执行 | 未打包、未配CI、未提交/推送/发布 |

环境实测：Windows、Bun 1.4.2、Node 24.19.0、uv 管理的 Python 3.12.14；Electron 44.5.1、React 19.3.0、Vite 8.3.2、FastAPI 0.142.2、Uvicorn 0.54.0；依赖解析结果在锁文件中。后端 TestClient 出现一条上游 httpx 弃用提示，不影响4项结果，未为消除提示额外安装库。

QA 使用 Playwright Electron：本会话未提供 Browser 插件技能，且验收对象为原生 Electron。截图仅保存在本机验证目录，不随仓库上传。视觉概念只作参考，未作为位图嵌入应用；核对了白底、字号层次、水平健康行、按钮、间距与文案，时间替换为实际检查时刻。

状态：代码完成/待验收，待用户本机手动确认。第2—24步未开始，packages/contracts仍为空。当前停止；不自动上传或继续。

## 7. 首次源码上传检查（2026-10-04）

本节记录第1步开发轮结束后，用户另发的明确上传授权。第6节的GitHub“未执行”是开发轮结束时的历史状态，不代表本轮上传后的远程状态；手动验收和用户练习仍未完成，不由上传授权推定为已完成。

- 目标：[ydflow/research-trail](https://github.com/ydflow/research-trail)，公开仓库、初始main。用户授权首次建仓和上传，后续步骤另按真实改动走功能分支/PR；首次无既有main和PR基线，不制造空PR。
- 范围：第0步必需文档/忽略规则，第1步Electron/React与Python健康新实现、Windows启动修复、相关测试、依赖清单和锁文件。未导入Folio业务源码、图片、node_modules或ZIP，不将局部MIT声明为全仓许可，保留原来源事实。
- 责任：AI协作的新实现与修复，与上游功能清单/阅读引用区分。按现有ydflow Git作者配置和实际时间提交，不改写作者、时间或上游历史。
- 上传前复验：TypeScript检查和构建通过；Python4项与Electron实窗4项通过。Python出现一条上游httpx弃用提示，不影响结果；没有CI或付费评测。
- 文件审核：仅纳入项目内文本源码/测试/文档/锁文件；运行令牌在运行时生成，测试令牌是明显的合成值。密钥、账户/持仓、运行数据库、日志、依赖、缓存、构建产物和截图不进入提交。公开文档移除了不必要的本机截图路径。
- 远程核对：GitHub只读查询返回目标404，初始本地无remote；当前账号实测为ydflow。每次GitHub写入前再核验账号与目标，不删除、覆盖同名内容或强推。
- 未验证：用户桌面人工操作、学习练习、真实模型/行情/账户、安装包与干净机器启动。第2—24步未开始；不打标签、不建Release、不配置定时评测。

提交SHA和上传结果由Git历史、远程main以及本次交付回执共同确认，不在同一提交正文中虚构其自身SHA。

## 8. 第2步：固定模拟行情、K线与生成契约（2026-10-04）

授权：用户明确要求仅执行第2步；四股票固定示例、Pydantic/OpenAPI/TypeScript契约、必要界面局部复用、未知错误、固定市场时间与获取时间分开。本轮没有Agent、数据库、模型或真实行情接入，没有Git/GitHub写入。

执行前基线：Git根 `D:/folio/research-trail`，main，HEAD `55b1a3df6b31a2fb0c51c340d1c6ce30960ba0b8`，工作区干净；origin为 `https://github.com/ydflow/research-trail.git`。本步改动保留工作区，未暂存、提交、推送、PR、合并、标签或Release。已公开的初始提交不含本步组件适配。

### 复用来源、依赖检查与责任

固定来源仍为 Folio 0.4.0-beta.2，ZIP提交标识 `ba5dcdfd31b162f5edb8b908f7f099a560389326`，本机只读目录见第2节。下表为局部适配，不是原组件完整导入。

| 研迹文件（apps/desktop/src/renderer/market） | 上游路径（packages/ui/src/components） | 保留/改动 |
| --- | --- | --- |
| Watchlist.tsx | stock/Watchlist.tsx | 复用股票行名称/代码与选中布局、输入转大写；改原角色div为原生button，用Python目录；移除Jotai、原客户端、30秒轮询、增删自选、图标与国际化依赖 |
| QuoteCard.tsx | agent/structured/QuoteCard.tsx | 复用数值/成交量格式、价格变化与指标布局；改用生成的Quote类型、中文与原生dl；去掉原core/i18n/MetricGrid依赖；两种时间在快照层明确展示 |
| FinancialKLineChart.tsx | chart/FinancialKLineChart.tsx | 复用init/dispose、loader、秒转毫秒、symbol、ResizeObserver；改生成Kline类型、原生CSS、UTC、日线、固定示例视区；不搬指标和多周期UI |

每个适配文件开头保留上游URL、原路径、ZIP标识及本节索引。以上原文件未发现额外文件头版权文本；没有删除已有声明或伪造作者。仍只核实上游skills/LICENSE的MIT范围，不能据此给UI代码或本仓库整体标MIT。本机复用按用户本步指令实施；第三方整项目授权尚未核实，本步尚未公开，未来上传前须按实际授权核定这些适配文件的公开范围。

移植前检查：Watchlist依赖React、Jotai、i18n、lucide、原client/atoms和primitives；QuoteCard依赖原core/i18n/MetricGrid；FinancialKLineChart核心依赖React与klinecharts。仅新增前端运行依赖 **klinecharts 10.0.3**；未加入Folio工作区包、原TypeScript后端、Pi、Jotai、Tailwind、账户或Agent代码。该库npm包声明Apache-2.0，LICENSE/NOTICE及附带Lightweight Charts许可按原文复制到 `docs/third-party/klinecharts`，含原版权声明。

参考 `workspace/ChartView.tsx` 的过期响应取消思路，研迹实现自己的快照请求effect与取消标记；原文件未整体导入。参考 `demo-market-data.ts` 存在未知代码价格回退及Date.now市场时间，研迹不导入该TS数据实现，Python示例表为本轮独立编写。

### Python新实现、前端适配与修复

- `research_trail/market.py`：Pydantic Quote/Kline/MarketSnapshot/MarketSymbol/MarketError契约、独立MarketProvider协议和FixtureMarketProvider。只含AAPL.US、NVDA.US、MSFT.US、TSLA.US；每只10根编写的日线，非交易所历史数据。固定市场时间2024-01-16 21:00 UTC，获取时间单独使用本次UTC时刻。无随机数、网络数据或模型调用。
- 契约验证：拒绝非有限数值、负成交量、错误OHLC范围、无时区时间、逆序/重复时间、卡片与最后K线不一致、错误昨收与涨跌计算。重复查询返回新的对象，避免调用方修改影响后续示例。
- `app.py`：行情目录和快照HTTP接口统一校验启动令牌；未知代码返回404与UNKNOWN_SYMBOL，不生成报价。运行时docs/OpenAPI路由继续关闭。
- `export_openapi.py`、`scripts/contracts.mjs`：离线调用app.openapi()，不启动socket或读取运行凭证；由openapi-typescript 7.13.0生成openapi.json/generated.ts。bridge与页面用类型别名消费生成文件，健康生命周期类型仍是桌面传输层类型。
- main/preload：增加marketSymbols/marketSnapshot两个命名操作，桥共六项；IPC来源检查保留，main检查股票格式后带令牌请求本机，限制3秒和256KiB响应。renderer仍无Node、文件、进程、数据库、令牌或任意HTTP地址接口。
- MarketPanel：同一个快照更新卡片/图表；切换时隐藏旧结果，错误时清空；较早请求晚到时忽略。后台健康轮询不刷新示例。重复查询只有获取时间变化。
- 修复：原TypeScript 7.0.2缺少生成器所需ts.factory API，生成失败后调整为生成器peer范围兼容的5.9.3；类型/生成/build实测通过。图表库barSpace默认最大50，按该范围适配示例，补检查最后蜡烛绘制坐标在画布内。main的错误脱敏在尚无令牌时也保持可读。

真实调用链：CMD → 契约生成/Vite/Electron → Watchlist选择 → MarketPanel → preload.marketSnapshot → IPC来源校验 → BackendManager.marketSnapshot → 本机带令牌GET /market/snapshot/{symbol} → FixtureMarketProvider → Pydantic快照 → QuoteCard与FinancialKLineChart。类型链为Pydantic → 离线OpenAPI → openapi-typescript → generated.ts → market-types.ts；不是人工维护第二份行情结构。

### 验证记录与边界

| 检查 | 实际结果 | 覆盖/限制 |
| --- | --- | --- |
| 契约一致性、TypeScript | 通过 | bun run check；生成结果可重复，前端消费生成类型 |
| 开发构建 | 通过 | bun run build；main/preload与React；非安装包 |
| Python测试 | 22通过、1上游弃用提示 | 原4项生命周期/健康加18项行情：四股票、重复固定、独立对象、未知404、三路授权、8种非法/不一致契约、OpenAPI；不作为上游测试成绩 |
| Electron实窗 | 6通过 | 原4项回归加四股票/真实chart.getDataList及loader/视区/绘制坐标/未知清空/重复时间/退出测试，以及测试专用主进程延迟制造旧响应晚到；后者未加入生产行为 |
| 根CMD启动 | 通过 | 实际cmd.exe执行start-dev.cmd，锁依赖同步与契约生成，真实Vite/Electron和Python报告healthy；验证结束仅停止已核对的本次启动器PID，所属Electron/Python随后退出，异常停止终端返回255为预期 |
| 画面检查 | 通过 | Playwright Electron截图，宽窗口与600×620，模拟标签、代码/价格、十根示例、UTC两种时间、错误可读；无横向溢出。截图在仓库外本机验证目录 |
| 桌面人工、用户练习 | 待用户 | README验收清单、practice第2步小改动和三题；没有代填 |
| 模拟数据 | 通过 | Python固定Fixture与真实本机HTTP；不等同真实金融数据 |
| 假模型/真实模型/Agent | 未执行 | 本步无模型Provider、Agent或模型调用 |
| 真实行情/账户、安装包、干净机器、CI | 未执行 | 未接外部服务、未打包或新增CI |

本步状态：代码完成/待验收；用户手动验收仍待完成。README、ROADMAP、tutorial C02和practice已更新；第3—24步未开始。停止在第2步，不自动提交或上传。

收尾审核：Git可交付清单48个文本文件，本地Markdown链接/围栏、常见密钥签名、生成契约路由、无@finagent业务依赖、依赖声明字节一致性检查通过；git diff --check通过，暂存为空，HEAD仍为55b1a3d。最终Python22项与Electron6项通过；测试结束未发现属于本项目的Electron/Python残留。该签名检查不替代未来上传时按实际差异重新审核。

## 9. 第2步发布前复验与公开范围阻塞（2026-10-04）

用户本轮明确授权将当前已验收步骤按功能分支/PR上传，检查通过且无未解决阻塞才合并，保留提交并同步main。本节是发布准备记录，未把该授权写成已经完成远程发布，也未补填用户逐项手动验收或学习记录。

- 账号/仓库实测：`gh api user`返回ydflow；`gh repo view ydflow/research-trail`确认公开仓库、默认main、完整目标名和URL。origin fetch/push均为 `https://github.com/ydflow/research-trail.git`；远程main和本地HEAD均为 `55b1a3df6b31a2fb0c51c340d1c6ce30960ba0b8`，目标属于本项目。PR列表为空；未切换账号。
- 差异审核：16个已追踪文件变化、15个新增文本文件，均与第2步有关。发布候选清单共48个文本文件、245636字节（本节追加前统计）；常见密钥签名、运行库/日志/缓存/截图、Markdown链接与代码围栏检查无异常。依赖、构建输出和本机截图不在候选清单。暂存为空，git diff --check通过。签名检查不保证覆盖所有秘密，实际源码及数据来源另经人工式阅读核对。
- 重新验证：`bun run check`契约及TypeScript通过；`bun run build`通过；Python22项通过、1条上游TestClient弃用提示；Electron实窗6项通过，覆盖固定行情、错误、晚到响应、生命周期和退出隔离。测试结束未发现本项目Electron/Python残留。真实模型/行情/账户、安装包、干净机器、CI及逐项用户手动记录仍未验证。
- 公开范围阻塞：GitHub API实查固定提交的递归树只有 `skills/LICENSE`，仓库当前license元数据为空；[固定来源树](https://github.com/helsome/folio/tree/ba5dcdfd31b162f5edb8b908f7f099a560389326)中的 [skills/README.md](https://github.com/helsome/folio/blob/ba5dcdfd31b162f5edb8b908f7f099a560389326/skills/README.md)明确该目录为Longbridge技能的MIT导入。没有查到覆盖第8节三个UI适配文件的公开复用许可。已保留出处，但出处说明不能替代适用授权事实。
- 按AGENTS第5节“公开范围按实际授权事实记录”，停在GitHub写入边界，待用户提供覆盖UI的原作者授权依据，或确认将三个组件改为本项目独立实现、保留调查与历史来源记录后重新验收。没有自行改写已验收UI或发布不完整的后端子集。
- 本轮结果：未创建功能分支/新提交/PR，未推送、合并、打标签、创建Release或定时评测。当前提交SHA仍是初始main；本步发布未完成，第3步未执行。

## 10. 用户补充授权与第2步发布准备（2026-10-04）

本节记录第9节检查点后的进展，第9节的“未创建分支/新提交”和公开范围阻塞是当时状态。

用户先选择“已有公开复用授权”，随后在针对三组件修改后公开上传的询问中明确陈述其为Folio核心贡献者、已获原作者授权，可以复用相关代码，并再次维持本轮公开发布指令。按用户明确陈述及本轮授权，将当前Watchlist、QuoteCard、FinancialKLineChart的局部适配纳入本步公开范围。此处是用户授权确认记录，未独立核验原始授权文件，不将整项目自行标MIT，不宣称获得原作者署名或整个上游历史的作者身份。依赖原LICENSE/NOTICE与逐文件来源继续保留，公开范围阻塞解除。

本地功能分支为 `feat/step-2-fixture-market`，与已公开main基线正常分叉；当前作者沿用ydflow及现有noreply邮箱，日期为真实提交时间。将一次尚未推送的桌面提交拆分为修复与接入两项，拆分前后代码tree相同；没有修改已公开历史或强推。

| 提交 | 类型与责任 |
| --- | --- |
| f6138f33ed5f582081c53f24a447b90832e8ffed | 上游UI局部适配和依赖声明；保留ZIP来源，不伪装为原作者历史 |
| f46d989a887aec910ae07ef114a41a281ac3cd84 | Python固定Provider、Pydantic/OpenAPI契约、生成类型和依赖兼容适配的新实现 |
| 66acba728cf3830731f3d17792a379ffd7f6c67d | 修复尚无启动令牌时错误脱敏破坏文案的问题 |
| e2613e12548d9632c9d41a630b9c764c64649889 | 新增白名单行情通信、快照界面接入、显示样式及本项目实窗测试 |

发布前复验仍为契约/TypeScript/构建通过、Python22项和Electron实窗6项通过，1条上游TestClient弃用提示。工作区实际实现未因提交整理而改变。README与路线将第2步标为验收通过，依据为自动化复验和用户当前“已验收”发布确认；未补写用户逐项点击记录或学习答案。真实模型/行情/账户、安装包、干净机器及CI未执行。

本记录在推送前生成。后续按用户授权核验账号与目标后推送分支、创建PR；检查无未解决阻塞才采用保留提交的merge方式并同步main。最终PR、合并SHA及同步结果由Git/GitHub与发布回执确认，不在本提交中虚构自己的SHA。未执行第3步，不打标签、不创建Release、不配置付费评测。

完整已提交差异的git diff --check发现依赖附带LICENSE-lightweight-charts末尾有冗余空行；保留全部许可证正文与版权，只规范末尾换行，并单独作为格式修复记录。与npm包原文去除末尾换行后逐字节相同；其余LICENSE/NOTICE未变。随后重跑完整提交差异检查和文件审核，不为纯文本空白改动重复执行无关业务测试。

## 11. 第2步PR与合并前检查（2026-10-04）

- 交付：[ydflow/research-trail PR #1](https://github.com/ydflow/research-trail/pull/1)，base main，head feat/step-2-fixture-market。每次推送或创建PR前均实时验证gh账号ydflow、公开目标仓库/default main及准确的origin fetch/push地址；Git推送仅本次命令使用已核验gh凭证助手，未切换账号或修改全局凭证配置。
- 创建PR时head为 `f2a91a74e6d57f4c8b41ee295fb10318ce7911a9`，六项新增提交；31个差异文件均属第2步。推送前48个已追踪文本文件共251906字节，密钥特征及运行数据/截图检查无异常，工作区干净，完整提交差异空白检查通过，许可证正文校验通过。导入/Python/修复/桌面/文档按真实改动分别记录作者与当前时间。
- GitHub合并前查询：OPEN、非草稿、MERGEABLE、mergeStateStatus CLEAN，review列表和未解决review threads均为空。statusCheckRollup为空，未配置CI，不能写作CI通过。实际验收来自本地契约/类型/构建、Python22项、Electron实窗6项以及用户当前发布确认。
- 本节只补充PR链接与审核记录，不改变运行源码。核对新的最终head后，按用户明确授权采用普通merge commit保留全部提交，随后只做本地main的fast-forward同步；不用admin绕过、不强推、不删除分支。实际合并SHA与本地同步结果见Git/GitHub及最终回执。
- 未验证边界仍为用户逐项手动/学习记录、真实模型/行情/账户、Windows安装包、干净机器和CI。没有Agent或下一步功能；不打标签、不建Release、不启用付费定时评测。

## 12. 第3步：会话、消息、运行和事件持久化（2026-10-04）

### 范围、基线和参考核对

用户本轮仅授权第3步开发及本地交付，不授权本轮提交或发布。开始时Git根为 `D:/folio/research-trail`，main工作区干净，HEAD与origin/main为 `0e1dfd5ccf7e99c66d58188dcac9497ddd6e2bd8`。该基线是第2步PR #1普通合并提交；本轮完成后HEAD不变，暂存为空，改动留在本地。

先读取AGENTS、README、路线、已有证据、桌面桥/进程、后端契约和测试。只读核对固定Folio参考（ZIP标识ba5dcdfd31b162f5edb8b908f7f099a560389326）的 `packages/core/src/index.ts` Session/SessionMeta/Message/Run、`packages/core/src/stream-events.ts`、`packages/shared/src/kernel/session-manager.ts`、`packages/ui/src/components/kernel/KernelBridge.tsx` 和 `docs/adr/0001-stream-event-protocol.md`。未修改参考目录，未导入原TypeScript后端或本步新复制UI源码。第2步来源/授权记录继续保留。

参考对照：会话/消息/运行分别有独立ID，事件用runId＋sequence作身份；protocolVersion为1，timestamp只供显示，messageId仅在消息级事件出现，text_delta是增量。旧AgentEvent的message_delta可能是累计文本，参考KernelBridge有双协议订阅；本项目未同时发送两套协议。研迹采用snake_case与UTC ISO，前端 `session-adapter.ts`处理消息时间/文案转换；本步是协议语义核对与Python新实现，不复用原TS存储/运行内核，也不把原测试成绩计入本项目。

### 实际实现

- uv依赖新增并锁定SQLAlchemy 2.0.54、Alembic 1.20.0；Python仍为3.12，SQLite使用Python标准驱动。依赖同步完成。官方API参考：[SQLAlchemy SQLite](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html)、[Alembic commands](https://alembic.sqlalchemy.org/en/latest/api/commands.html)、[SSE帧格式](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)。
- `database.py`和Alembic：默认根runtime/research-trail.sqlite3，可用RESEARCH_TRAIL_DB_PATH显式改路径；外键开启、WAL、5秒busy_timeout。启动lifespan先迁移、后报告ready。四表明确迁移，版本0001_conversation，提供后续迁移模板；不使用create_all。升级写锁也串行化版本表初始化。离线契约导出不打开库、不建目录。
- `models.py` / `store.py`：sessions、messages、runs、events四表。消息有会话内sequence和唯一约束；事件有每运行sequence、复合主键。消息和事件的run_id/session_id复合外键禁止跨会话关联，删除会话级联清理子记录。写事务BEGIN IMMEDIATE；失败整体回滚。
- 会话API：POST/GET /sessions，GET/DELETE /sessions/{id}，GET其/messages与/runs。选择会话由前端保存选择ID，再查询后端历史，不把“当前选择”当作共享业务状态写库。未知/已删会话404，标题与测试输入由Pydantic校验。
- 运行API：POST /sessions/{id}/runs写一次固定测试，GET /runs/{run_id}查询。固定响应由本项目FIXTURE_PARTS定义，kind=fixture，实际状态仅completed；不创建Agent、FakeModelProvider、后台工作线程或模型/工具调用。
- 固定测试在同一事务写入两消息、一运行、七事件（run_started、message_started、status、text_delta×2、message_completed、run_completed），提交后才能返回或读取。事件包含protocol_version/session_id/run_id/sequence/type/timestamp和类型专属payload。事件不是行情数据，也不关联未来模型Provider。
- GET /events返回有限SSE：id=run_id:sequence、event=type、data=完整JSON；after_sequence或Last-Event-ID按游标读取，跨运行ID/无效/超前游标明确报错。GET /event-log另提供有界JSON页和last_sequence，并让Pydantic事件联合契约进入OpenAPI。读已有记录不生成新运行、不调用模型/工具。
- main/preload新增九个命名操作（会话五、运行四），共15项；main验证UUID、输入和游标，继续校验IPC来源，并携令牌发本机HTTP。有限SSE在main收集后校验身份、类型与连续序号再交给renderer；3秒/256KiB响应限制保留。renderer没有端口、令牌、任意请求接口、文件/进程或数据库能力。
- `SessionPanel`提供创建、列表、选择、删除、消息历史、固定运行记录与事件列表。选择变化清理显示缓存，忽略旧请求晚到；重新读取按run_id:sequence合并。没有localStorage业务备份或前端自行制造完成状态。行情页保留独立导航和原行为。
- 测试中发现Windows时钟可能给用户/响应消息同刻时间，原按时间＋UUID排序会颠倒顺序；已使用事务内分配的会话消息sequence排序，并验证并发写入后的1—16顺序及角色交替。没有改写开发时间来规避排序。

真实调用链：SessionPanel → preload命名操作 → main来源/参数校验 → 带令牌FastAPI → Pydantic → Store/SQLAlchemy事务 → SQLite提交 → RunDTO。读取链：runEvents → 本机SSE → 已提交事件查询 → main协议检查 → 前端显示缓存。类型链：conversation.py → 离线OpenAPI → generated.ts → conversation-types.ts。

### 验证结果与尚未验证

| 检查 | 实际结果 | 证明与限制 |
| --- | --- | --- |
| 契约/TypeScript/开发构建 | 通过 | bun run check、build；新DTO来自生成契约，未手改generated.ts |
| Python | 29项通过，1条上游TestClient弃用提示 | 原22项回归＋6项持久化/契约/并发/回滚约束＋1项真实网络SSE及进程重启 |
| Electron实窗 | 8项通过 | 原6项回归＋持久会话/桥/事件/重启/删除及数据库启动失败；最终文案调整后持久会话用例另复验通过 |
| 两会话隔离 | 通过 | 不同输入、运行/事件跨会话404、消息复合外键拒绝跨会话更新、删除甲后乙记录保留；真实桌面切换复验 |
| 重启历史 | 通过 | TestClient重新打开同库、真正Python子进程退出/重启、Electron关闭后同库重新打开；未重执行旧运行 |
| 事件先存后发/顺序 | 通过 | 真实HTTP流每收到一帧即另开SQLite连接核对已提交事件；序号1—7；Last-Event-ID/after游标尾段及重复读取内容相同 |
| 原子写入失败 | 通过 | 注入事件INSERT失败，消息、运行、事件均回滚，消息数仍0；不产生半条运行 |
| 重复迁移 | 通过 | 程序内多次upgrade保留16消息；独立临时库CLI连续两次upgrade head成功，current显示0001_conversation (head)，check无新升级操作 |
| 画面/退出 | 通过 | 查看仓库外实窗完整截图及600×620布局，无横向溢出；健康/故障原因可见，所属子进程退出，两实例不误杀。测试后未发现本项目Electron/Python/开发启动器残留 |
| 根start-dev.cmd | 本轮未重复执行 | 脚本本轮未变，第1/2步已有实际CMD记录；本轮实窗覆盖Vite开发加载、桥和Python迁移启动 |
| 用户手动/练习 | 待用户 | README第7—9项、practice第3步；未代填答案 |
| Agent/假模型/真实模型/真实行情/账户 | 未执行 | 本步仅固定测试事件，无模型或工具执行；第2步固定行情回归通过 |
| Agent取消/超时/中断恢复、自动流重连 | 未实现/未执行 | 有限已完成运行SSE在末尾关闭，main收集后交页面；不是长驻实时订阅或慢打字，后续步骤4—6单独实施 |
| 迁移降级、离线SQL、旧库升级/备份、安装包、干净机器、CI | 未执行 | 本步初始迁移；未把模型一致性检查写成这些项目通过 |

测试库均在系统临时目录，截图在仓库外本机step3验证目录；未改日常库或上传运行产物。README、ROADMAP、tutorial C03/C04和practice已更新。状态为代码完成/待验收，自动验证通过；第4—24步未开始。本轮不git add/commit/push/PR、标签或Release，不启用定时付费评测；交付后停止。

收尾：61个可交付文件均为文本；本地Markdown链接/围栏、常见密钥特征与运行产物候选检查无异常，数据库/WAL/SHM忽略规则有效，git diff --check通过。暂存仍为空，main HEAD未变；本步13个新增文件及19个已有文件修改均围绕持久化、白名单接入、测试和文档。参考目录未写入；测试窗口和所属后端均已结束。

## 13. 第3步发布复验与交付（2026-10-04）

本节记录第12节开发交付后的发布轮次。用户明确授权当前已验收步骤提交功能分支、创建PR，检查通过且无阻塞后保留提交合并并同步main；不执行第4步、不打标签/Release或启用付费评测。第3步状态按自动复验及用户本轮“已验收”发布确认更新为验收通过，未代填逐项手动操作或学习记录。

- 身份和目标实时检查：gh api user为ydflow；仓库nameWithOwner为ydflow/research-trail、公开、默认main，URL准确；origin fetch/push均为https://github.com/ydflow/research-trail.git。GitHub main、fetch后的origin/main和本地main均为0e1dfd5ccf7e99c66d58188dcac9497ddd6e2bd8，属于既有研迹项目。未切换账号，未覆盖无关仓库。
- 实际差异：19个已有文件修改、13个新增文件，均属第3步。第2步三个UI适配及第三方LICENSE/NOTICE没有修改；继续保留第8—10节来源及用户确认的原作者复用授权。本步只参考DTO/事件语义，新增Python和桌面代码由本项目实现，无新上游源码导入，因此不制造导入提交或伪造修复历史。
- 发布候选61个文本文件，文档更新前统计395266字节；本地Markdown链接/围栏、常见密钥签名及运行数据库/日志/缓存/账户/截图候选检查无异常。忽略规则覆盖数据库/WAL/SHM、.env、账户数据与日志。没有暂存被忽略产物、安装包或截图，参考目录只读。
- 发布复验：bun run check和build通过；Python29项通过，1条上游TestClient弃用提示；Electron实窗8项通过，含两会话隔离、事件重复读取、重启历史、删除级联、启动失败解释及所属进程清理。临时库CLI连续两次upgrade head成功，current为0001_conversation (head)，check为No new upgrade operations detected。未发现本项目Electron/Python残留。
- 提交安排：feat/step-3-persistence上分别记录Python持久化/API/生成契约、桌面白名单/会话显示与实窗测试、文档/验收记录。作者沿用ydflow及现有noreply邮箱，使用实际提交时间，不导入原作者历史、不修改已公开提交。具体SHA由Git提交后记录。
- 合并条件：核对PR准确base/head、最终SHA、CI状态、可合并状态及未解决review线程；没有配置CI时明确记为未配置，不能以空checks写成CI通过。无阻塞后用普通merge commit保留提交，不强推、不用admin绕过、不删除分支；本地main仅fast-forward。
- 尚未验证：逐项用户手动/学习记录、真实模型/行情/账户、完整Agent/取消恢复/自动流重连、迁移降级/离线SQL/旧库升级备份、Windows安装包、干净机器和CI。本轮根start-dev.cmd未重复执行，脚本未变，既有第1/2步实际CMD记录保留，当前实窗验证了Vite与Python迁移启动。

本节在首次推送前生成，PR链接及最终合并SHA以随后Git/GitHub回执为准，不提前宣称远程写入完成。

已按实际改动创建本地提交：

| 提交 | 范围 |
| --- | --- |
| 80c1443c0bdb0f3f44f2ffb8599e5f2f508f1220 | Python新实现：四类持久化、初始迁移、会话/运行API、有限SSE、生成契约及后端验证 |
| 4eb803cd849582e38df82fb0e0cc8961554f9270 | 桌面新接入：命名白名单、主进程SSE、会话/事件显示缓存和Electron实窗验证 |

文档独立提交记录路线、真实调用链、练习和发布复验；自身SHA由Git历史确认。本步没有新的上游导入，消息同刻排序问题已在未发布Python实现内修正并验证，不拆造一个历史上不存在的上游或修复版本。

PR已创建：[ydflow/research-trail #2](https://github.com/ydflow/research-trail/pull/2)，base main，head feat/step-3-persistence；首次head为44f6e867c4c34aa0f6d9cd87928b028e1e2c6288，前三项提交、32个差异文件与本地审核一致。创建后查询为OPEN、非草稿、MERGEABLE、mergeStateStatus CLEAN，reviews和未解决review线程为空；statusCheckRollup为空，Actions工作流为0，CI未配置。tags与Release也为0。

本次PR链接/合并前检查仅补文档并独立提交，不改已复验业务源码。最后一次上传前61个已追踪文本文件共399146字节，完整差异空白、常见密钥特征和产物审核通过，工作区干净。核对补文档后的最终head及账号/目标后，按用户授权普通合并并fast-forward本地main；最终合并SHA以Git/GitHub及发布回执为准。没有将合并前状态提前写作已合并。

## 14. 第4步：Python工具与规则Agent（2026-10-04）

### 范围、基线与来源

本轮只执行第4步开发。先读取项目规则、路线、证据和现有实现；开始时main工作区干净，HEAD为第3步PR #2普通合并提交 `7f925dee768ff33c076582dd9d41055aca9a5932`。本轮没有暂存、提交或GitHub写入，HEAD不变。状态为代码完成/待验收；第5—24步未开始。

只读核对固定Folio参考的 `packages/shared/src/agent/intent-router.ts`、`packages/core/src/stream-events.ts` 和 `packages/shared/src/agent/local-finance-agent-backend.ts`：意图路由、工具注册/执行与回复组合，以及tool_started/tool_result/error/run_completed的协议语义。本步自行实现Python模型、工具和运行器，没有复制原TS业务内核或新增上游源码导入。结果卡片使用第2步已适配的QuoteCard/FinancialKLineChart；这些组件及其来源、版权和授权记录未修改。此前用户确认的复用授权继续按第9—10节原文记载，不扩写为独立核实的全仓MIT许可。没有新增依赖。

### 实际实现与调用链

- `model_provider.py`定义独立ModelProvider协议和FakeModelProvider。确定性规则接受查询/查看、四只支持股票及行情/K线表达；未知意图返回明确支持范围，不调用工具。回复只取工具返回的类型化数据。界面、回复和RunDTO明确标记“规则演示／假模型”，不声称真实LLM。
- `tools.py`实现白名单注册和参数/结果校验。market.quote与market.kline绑定第2步同一个FixtureMarketProvider；完整快照重新经Pydantic校验，防止错误代码、非有限价格或重复K线时间进入成功结果。模型Provider与数据Provider分别注入，Agent不引用fixture价格常量。
- `agent.py`本步每次至多执行一个只读工具：计划→tool_started→注册表执行→tool_result→组合回复。调用ID保持一致。UNKNOWN_SYMBOL、PROVIDER_ERROR、INVALID_RESULT等保存为失败结果和error事件，回复说明原因，运行status=failed、终态stop_reason=error；不回退为模拟成功。模型失败另为MODEL_ERROR；回复阶段失败保留真实的成功工具记录。
- `store.py`沿用会话级事务与序号约束。工具开始事件在调用前收集；短同步运行结束后，将消息、运行及全部事件一起提交，提交后才返回或读取SSE。这里没有长驻实时订阅、逐事件实时落库发送或后台Agent循环。成功工具运行8事件、工具失败9事件、未知意图6事件。原固定测试运行仍有7事件，默认kind=fixture保持兼容。
- 新迁移 `0002_agent`仅为runs增加可空model_label/error列，不改已公开的0001迁移。RunDTO用契约约束failed/error及fake_agent/model_label一致性。创建失败运行仍返回HTTP201，含已创建记录的明确失败状态，并不表示执行成功。
- Pydantic/OpenAPI重新生成TypeScript类型。main/preload仅增加startAgentRun命名接口，共16项；渲染进程没有端口/令牌、任意网络请求或数据库权限。SessionPanel显示过程、保存的回复、失败原因及工具结果卡片。重新读取旧运行只显示已保存事件及原获取时间，不调用模型/工具或改成实时行情。

真实链路：SessionPanel → preload.startAgentRun → main参数/来源验证 → 带启动令牌的FastAPI → FakeModelProvider.plan → Python ToolRegistry → FixtureMarketProvider.snapshot → 类型化工具结果 → FakeModelProvider.respond → SQLite事务提交 → 运行/有限SSE → 前端适配和结果卡片。市场时间固定，获取时间由本次数据查询记录，卡片显示“模拟数据”。

### 验证与边界

| 检查 | 实际结果 | 证明与限制 |
| --- | --- | --- |
| 契约/TypeScript/开发构建 | 通过 | bun run check、build；生成类型一致，无新增依赖 |
| Python | 50项通过，1条上游TestClient弃用提示 | 原29项回归＋21项规则/工具/失败/升级验证；最后改动后完整复验通过 |
| fixture改变回答 | 通过 | 同一FakeModelProvider下改变AAPL/NVDA数据fixture，工具结果及回复同步改变，Agent无需修改；旧保存结果不变 |
| 实际工具执行证明 | 通过 | SpyProvider调用、匹配的tool_started/tool_result调用ID、工具名/代码/快照、回复数值与SSE/重开历史一致 |
| 未知意图与失败 | 通过 | 未知意图不调用工具；未知股票、异常Provider、错误代码/NaN/重复K线时间均为failed；模型计划/回复失败分别传播，不暴露原始私密异常文本 |
| 会话隔离与事件重读 | 通过 | 跨会话查询隔离、删除级联、旧事件重复读取不追加消息或刷新获取时间，失败历史重开保留 |
| Electron实窗 | 9项通过 | 原8项完整回归另加1项规则Agent实窗；Agent用例最后再复验通过。真实窗口中行情/回复189.43一致、NVDA图表10根K线/末值880.12一致；未知代码失败且无旧卡片 |
| 画面/进程清理 | 通过 | 查看行情、K线、600×620窄窗与失败截图，无横向溢出；关闭后所属Python退出，测试后未发现本项目Electron/Python/开发启动器残留 |
| 迁移 | 通过 | 构造真实0001旧结构升级至0002，原固定运行/消息/事件保留；临时库CLI两次upgrade head、current=0002_agent (head)、check无新升级操作 |
| 根start-dev.cmd | 本轮未重复执行 | 脚本未改，既有第1/2步CMD记录保留；本轮Electron回归覆盖Vite与Python迁移启动 |
| 用户逐项手动/练习 | 待人工验收 | README第10—12项、practice第4步与三题待用户完成，未代填答案 |
| 真实LLM/实时行情/账户 | 未执行 | 仅离线规则演示与固定模拟数据，未调用模型API或真实行情 |
| 多轮Agent/取消/超时/中断恢复/自动流重连 | 未实现/未执行 | 本步短同步、至多一工具；不把重读历史称为任务恢复 |
| 迁移降级/离线SQL/备份、安装包/干净机器、CI | 未执行 | 只验证现有迁移升级路径和本机开发环境 |

Browser plugin not available：当前会话未提供该插件入口，桌面检查使用本项目已有Playwright Electron实窗工作流。React检查参考react-best-practices技能；使用生成联合类型、基本值依赖和请求过期保护，未引入重复业务状态。

测试数据库在系统临时目录；截图位于仓库外本机 `C:/Users/38905/.codex/visualizations/2026/10/04/01a1052d-756d-7d41-8501-1f906d4fa709/step4`，未上传或加入项目文件。README、ROADMAP、tutorial C05和practice已更新；交付后停止，不执行下一步或自动发布。

收尾审核：67个可交付文件均为文本，常见密钥签名、运行/账户/截图候选以及Markdown本地链接/围栏检查无异常；数据库/WAL/SHM、.env与日志忽略规则有效。git diff --check通过，暂存为空，main HEAD不变。第4步为20个已有文件修改、6个新增文件；工作区外PROJECT_STATE同步当前事实，未修改只读参考。测试窗口与所属后端均已结束。

## 15. 第4步发布复验与交付（2026-10-04）

本节是第14节本地开发后的发布轮次。用户明确授权当前已验收步骤提交功能分支、创建PR，检查通过且无阻塞后保留提交合并并同步main。第4步状态依据自动复验和本轮已验收发布确认更新为验收通过，未代填逐项手动及学习记录。不执行第5步，不打标签、不建Release或配置定时付费评测。

- 身份与目标：gh api user实测ydflow；目标ydflow/research-trail为既有公开研迹项目，默认main，origin fetch/push均为https://github.com/ydflow/research-trail.git。GitHub main、fetch后的origin/main与本地基线均为7f925dee768ff33c076582dd9d41055aca9a5932；当前无开放PR。每次GitHub写入前重新核验，不切换账号或覆盖无关仓库。
- 差异：开发轮20个已有文件修改、6个新增文件，均属第4步。本次复验另修改test_market.py修复时钟测试，合计27个差异文件。无新上游源码导入；第2步已有组件来源及LICENSE/NOTICE未变，继续保留第9—10节用户确认的原作者复用授权，不扩写其范围。
- 首次Python复验49通过/1失败：旧行情测试要求两次紧邻查询的fetched_at不同，但Windows两次真实时钟返回相同值。这不说明fixture变为实时行情或遗漏获取时间。修复仅在测试使用受控时钟，覆盖相同tick和相隔1秒，分别核对两次记录时间及不变行情；不人为改业务时间，不删除必要断言，不靠sleep规避。按真实修复单独提交。
- 修复后完整复验：Python54项通过（新增4项相同时钟覆盖），1条上游TestClient弃用提示；Electron实窗9项完整通过。契约一致性、TypeScript和开发构建通过。临时库CLI两次upgrade head成功，current为0002_agent (head)，check无新升级操作；旧0001结构保留历史升级的验证包含在Python测试中。
- 上传文件审核：文档更新前67个文本文件470277字节；常见密钥签名、运行/账户/数据库/日志/缓存/截图候选、Markdown本地链接及围栏检查无异常。依赖、构建输出和截图不在候选清单。只提交明确文件，工作区外PROJECT_STATE不上传；测试后无本项目Electron/Python残留。
- 提交分类：Python新实现/生成契约、桌面新接入/实窗验证、时钟测试修复、文档与验收分别记录；作者沿用ydflow及既有noreply邮箱，使用实际提交时间，不伪造上游导入、作者或历史。
- 合并门槛：核对PR的base/head、最终提交SHA、可合并状态、checks及未解决review；CI为空时写未配置，不写CI通过。无阻塞时普通merge保留提交，本地main仅fast-forward；不强推、不用admin绕过、不删除分支。
- 尚未验证：逐项用户手动/学习记录、真实LLM/实时行情/账户、多轮Agent/取消/超时/中断恢复/自动流重连、迁移降级/离线SQL/备份、Windows安装包、干净机器和CI。根start-dev.cmd本轮未重复执行且未改；此前实际CMD记录保留，本轮实窗覆盖开发启动与后端退出。

本节在首次推送前生成；PR链接、提交与最终合并SHA以随后Git/GitHub回执为准，不提前宣称远程写入完成。

已按真实改动创建本地提交：Python新实现 `c47f1c63f32241bcf478444c7a65916dbfa36b11`，桌面接入 `edd32a4e17738f324acaa1acb399a614e5cc1ba9`，时钟测试修复 `655b2a5ad3d0cee49dbc04e02af080bfefbddf88`。文档独立记录验收、调用链和学习材料，自身SHA由Git历史确认；无新增上游导入提交。

PR已创建：[ydflow/research-trail #3](https://github.com/ydflow/research-trail/pull/3)，base main、head feat/step-4-rule-agent，首次head为6aaabeddfc20f7302b03c7ffc8d2fca73ae3c71d。首次推送前67个文本文件474063字节审核通过，完整提交差异空白检查通过，工作区干净。GitHub返回27个准确差异文件、4项提交、非草稿OPEN、MERGEABLE/CLEAN；reviews和未解决review threads均为空，checks为空，Actions工作流0（CI未配置），tags和Release均0。

本次仅补PR链接与检查记录，不改变已复验源码；文档追加单独提交。再次核对最终head、账号/目标与合并条件后，按授权采用普通merge保留提交，本地main只fast-forward。最终合并SHA及同步结果以Git/GitHub和发布回执确认，不在合并前虚构结果。

## 16. 第5步：运行生命周期、取消、超时与中断（2026-10-04）

### 范围、基线与来源

本轮只授权第5步开发及本地交付，不提交或发布。开始时main干净，HEAD为第4步PR #3普通合并提交 `4a72e47f79d478ed4f611444ee8d64dccf9d6a17`。先读AGENTS、路线、证据、现有同步Agent/Store、进程退出与白名单桥。只读参考固定Folio的 `packages/shared/src/kernel/run-manager.ts` cancelRun/consumeRuntime/预算停止与清理、`packages/core/src/stream-events.ts` cancelled.partial、messageId和stopReason语义。Python实现由本项目编写；没有新上游导入、依赖变化或参考目录写入，已有组件来源和授权声明不变。

### 实际实现与责任边界

- `lifecycle.py` / `RunManager`：先由Store.begin_agent提交running、用户消息、空响应占位和两个开始事件，再启动本后端拥有的daemon工作线程；POST返回已创建运行，不等终态。SCENARIOS独立提供normal（0秒延迟/2秒工具限时）、delayed（3秒/5秒）、timeout（2秒/0.6秒），整体15秒限时。Event.wait使假延迟可取消；Timer负责有界超时，事件status注明模拟时序，不把它当真实服务成绩。
- `Store.append_running`逐条事务落库，只允许过程事件；先检查数据库仍是running。取消、完成、失败、超时、中断统一走finish：BEGIN IMMEDIATE串行检查running，只有首个胜者更新终态、同一个响应消息和一次message_completed/run_completed。重复取消返回已保存胜者；晚到工具或模型结果被停止检查/数据库状态挡住。已保存文本和工具结果不删除，不追加重复最终消息。
- RunDTO状态为running/completed/failed/cancelled/timed_out/interrupted；只有running的completed_at为空，失败/超时/中断带明确error。cancelled事件带用户原因、消息ID和原部分文本；run_completed的stop_reason区分completed/error/cancelled/timeout/interrupted。契约由Python/OpenAPI重新生成TS；前端适配只转换显示文案。
- 同会话活动运行唯一，重复启动409；固定通信测试也不能插入活动运行。删除入口在同一管理锁内先取消该会话活动运行，再级联删除；启动/删除不能交错产生孤儿记录。跨会话取消404，另一个会话保留。
- DatabaseLease用系统文件锁限制同库一个活后端，避免第二个服务误中断第一实例；不杀进程、不删除锁文件，同库占用解释清楚。锁随进程退出由系统释放。启动在迁移后恢复遗留running为interrupted，保留保存内容并补唯一终态。正常关闭先中断活动运行、停止计时器并有界等待工作线程；硬退出由下次启动恢复。本步不自动重调工具/模型或自动重新发起。
- 当前fixture和假延迟可协作退出；Python线程无法强行终止任意第三方阻塞调用。受控阻塞Provider/Model测试在终态后释放闸门，证明晚返回不写结果；这不表示已完成真实网络Provider的取消支持。daemon线程不阻止所属后端退出。
- `0003_lifecycle`允许completed_at为空，增加每会话唯一running部分索引及每运行每角色唯一消息索引。SQLite batch重建保留历史、复合外键和last_sequence约束；将旧未命名CHECK反射并命名以避免被遗漏。仅专用迁移连接在BEGIN前临时关闭外键，提交前foreign_key_check、结束再开启；业务连接仍开启。0001/0002没有修改，0003明确不自动降级。[Alembic batch/约束说明](https://alembic.sqlalchemy.org/en/latest/batch.html)、[Python Timer说明](https://docs.python.org/3.12/library/threading.html#timer-objects)为实现参考。
- main/preload新增cancelRun，共17命名接口；startAgentRun只接受normal/delayed/timeout白名单，不暴露任意时长、URL、端口/令牌、文件/进程/数据库能力。界面有模拟时序、运行状态、取消按钮、中断原因和手动重新发起提示；正在运行时200ms读取已提交状态/有限SSE。查看旧运行也更新同会话活动状态，终态后停止；不是第6步长驻订阅或自动SSE重连。

真实链路：SessionPanel → preload.startAgentRun → main → FastAPI → RunManager.start → Store.begin_agent提交 → 后台AgentRunner/独立模型与工具 → append_running提交 → finish唯一终态提交 → main有限SSE/GET → 前端显示。取消走cancelRun→Python管理器→同一finish；重启走独占持有→迁移→recover_interrupted，不运行旧Agent。

### 验证过程、结果与未验范围

开发复验发现并修正：初次迁移会遗漏旧未命名CHECK，改为保留并命名后用非法last_sequence更新拒绝验证；Windows持有锁区域不能先读取，改用文件长度检查后锁定，第二实例可读地失败；进程测试的HTTP客户端已请求后不能再次进入上下文，改为显式关闭。原双服务健康/令牌/退出测试改用两个独立临时数据库，并另增同库活持有者保护用例，没有删除多实例隔离验收。

| 检查 | 实际结果 | 证明与限制 |
| --- | --- | --- |
| 契约/TypeScript/构建 | 通过 | bun run check、build；生成类型一致，无新依赖 |
| Python最终完整复验 | 67项通过，1条上游TestClient弃用提示 | 原54项回归＋本步13项参数化生命周期验证 |
| 主动取消/部分保存 | 通过 | 假延迟唤醒、重复取消幂等、保留部分文本、旧取消不影响新运行，取消后无工具调用/晚写 |
| 工具及整体超时 | 通过 | 延迟超过工具限时；模型计划/回复受控阻塞触发RUN_TIMEOUT，保留已经提交工具结果；晚返回不改终态 |
| 完成/取消/超时竞争 | 通过 | 工具闸门分别验证三种胜者；数据库三方同步闸门并发竞争8轮，每轮一个终态/最终消息且无running |
| 删除活动会话 | 通过 | 删除前观察到cancelled，再级联清空三类子记录；另一会话保留，无迟到写入；跨会话取消404/重复启动409 |
| 正常退出与硬退出 | 通过 | TestClient生命周期正常退出；真实Python子进程kill后重启，遗留running→interrupted，原已存事件保留，无自动调用或新运行；允许明确重新发起 |
| 升级/重复迁移/约束 | 通过 | 旧0001历史升级回归；临时库CLI连续两次upgrade、current=0003_lifecycle (head)、check无新操作，原外键/序号约束回归通过 |
| Electron实窗 | 10项通过 | 原9项完整回归＋1项本步流程；最后界面调整后Agent与生命周期两项另复验通过。取消/超时/删活动会话/杀所属后端重试/中断解释/手动新运行均有真实桥与DOM状态证明 |
| 桌面QA | 通过 | 本地dist页面和Vite回归；默认窗口、600×620，页面研迹身份/内容正常、无Vite overlay、无目标流程console error/warning或pageerror、无横向溢出；查看仓库外取消和中断全页/窄窗首屏截图 |
| 关闭清理 | 通过 | 原所属退出/EOF/两实例不误杀回归，Agent及生命周期末尾所属Python退出；收尾进程复查另记 |
| 根start-dev.cmd | 本轮未重复执行 | 脚本未改，第1/2步实际CMD记录保留，当前实窗覆盖Vite与Python启动/迁移/关闭 |
| 人工/学习 | 待人工验收 | README第13—14项、practice第5步小改动与三题，未代填 |
| 真实LLM/实时行情/账户、安装包/干净机器/CI | 未执行 | 当前仅规则演示与模拟数据，无模型API或实盘服务 |
| 自动流重连/完整快照对话、多轮Agent、研究显式恢复 | 未实现/未执行 | 第6步及以后，不把轮询或重读历史称为恢复执行 |
| 降级/离线SQL/备份恢复、其他OS/设备 | 未执行 | 本步0003拒绝自动降级；只验证本机Windows开发环境 |

Browser plugin not available：当前无Browser插件入口，按frontend-testing-debugging技能使用项目现有Playwright Electron工作流。React检查采用基本值effect依赖、取消过期读取、并行无依赖查询及显示缓存；不制造前端业务终态。

截图位于仓库外 `C:/Users/38905/.codex/visualizations/2026/10/04/01a1052d-756d-7d41-8501-1f906d4fa709/step5`；测试数据库及持有锁在系统临时目录，不修改日常库。README、ROADMAP、tutorial C04/C05和practice已更新。当前状态代码完成/待验收，本轮不暂存/提交/上传，不执行第6步；交付后停止。

收尾：70个可交付文件均为文本；Markdown本地链接/围栏、常见密钥特征、运行/账户/截图候选审核无异常。数据库/WAL/SHM、持有锁、.env和日志忽略规则有效，git diff --check通过。25个已有文件修改、3个新增文件，仅属第5步；main HEAD仍为4a72e47f79d478ed4f611444ee8d64dccf9d6a17，暂存为空。进程复查未发现本项目Electron/Python/开发启动器残留；工作区外PROJECT_STATE同步当前事实，参考目录未写入。

## 17. 第5步发布复验与范围（2026-10-04）

用户本轮明确要求发布当前已经验收通过的第5步，授权功能分支、PR及检查无阻塞后的普通合并，保留提交记录、同步本地main。第5步依据本轮完整自动复验及用户确认标为验收通过；第16节保留开发结束时的历史状态，未代填逐项手动、练习或三题回答。

- 身份与归属：`gh api user`实测ydflow；目标为公开、非fork的ydflow/research-trail，默认main；origin fetch/push均为`https://github.com/ydflow/research-trail.git`。本地HEAD、fetch后的origin/main及GitHub main均为`4a72e47f79d478ed4f611444ee8d64dccf9d6a17`，无已有开放PR。每次GitHub写入前重新核对账号/目标，不切换账号、覆盖其他仓库或强推。
- 实际差异：25个已追踪文件修改、3个新增文本文件，均属第5步。Python生命周期、事务终态、迁移及测试为独立新实现；桌面白名单取消和显示缓存为接入适配。没有本步新上游导入、新依赖或单独业务修复；不制造导入/修复提交。已有Folio UI适配来源及用户确认的原作者复用授权保留（第8—11节），第三方声明未改，不把全仓宣称为MIT。
- 文件审核：本节追加前70个文本候选共540824字节；逐项源码/文档差异、常见密钥签名、运行库/账户/日志/缓存/图片候选、Markdown本地链接/围栏无异常。`.env`、SQLite/WAL/SHM、owner.lock、日志、依赖及构建输出忽略规则实测有效。截图和测试数据库均在仓库外，未上传；签名扫描不替代来源与实际内容审核。
- 后端复验：按README的`uv run --directory services/backend --frozen python -m pytest`，67项通过、1条上游TestClient/httpx弃用提示。取消及部分保存、工具/整体超时、晚返回、完成/取消/超时三方竞争、先取消后删除、正常退出、真实子进程硬退出后重启中断、同库活持有者保护及原回归均通过。首次误用裸pytest导致模块查找错误；改用项目规定的python -m命令通过，无需更改代码或依赖。
- 桌面复验：`node --test tests/desktop.test.cjs`完整10项全部通过、无跳过，覆盖真实Electron窗口、Vite开发页、隔离白名单、健康/启动失败、四股票模拟、历史/SSE、规则工具及本步取消/超时/删除/硬退出重试中断/手动新运行；末尾验证所属Python退出。结果属于本机自动实窗验证，不等同用户逐项手动记录。
- 类型与迁移：`bun run check`契约一致性与TypeScript通过；`bun run build`通过。独立临时库CLI连续两次upgrade head、current显示`0003_lifecycle (head)`、check显示无新升级操作，原历史与约束回归通过。根start-dev.cmd未改，本轮未重复执行该入口；当前实窗覆盖Vite/Python启动迁移与关闭。
- 未验证/未实施：CI当前没有工作流，不能称CI通过；用户学习/逐项手动、真实LLM/实时行情/账户、真实外部Provider阻塞取消、安装包/干净机器、迁移降级/离线SQL/备份恢复及其他OS未验证。第6步自动SSE重连/完整快照对话及后续步骤未实施；重读事件与重启只保留数据，不自动调用模型/工具。

提交按实际Python新实现、桌面接入、验收文档分开，使用当前作者配置和实际时间。PR链接、最终分支head、检查/合并状态由后续记录及GitHub确认，不在提交中伪造自身SHA。没有打标签、创建Release或启用定时付费评测。

发布分支`feat/step-5-run-lifecycle`已推送，创建 [PR #4](https://github.com/ydflow/research-trail/pull/4)，base为main。已保留Python新实现`5c2791a1fe95b65e6e89bc10ad7e0f35784c6b52`、桌面接入`6b6c57a7d2ee5cb413623fc6ca2752af52c9e805`、验收文档`b094ecc034c7807111e262dfb2a3878951d97089`；无伪造上游作者或时间。创建后实查head与本地一致、28差异文件准确，MERGEABLE/CLEAN、非draft、无review或未解决讨论、检查列表为空；Actions工作流/标签/Release均为0，不能称远程CI通过。

本段仅补PR链接和发布事实；没有改变已验证代码，无需重复业务测试。最终合并前再核对账号/仓库/远程、最终head、base及阻塞检查；只普通merge保留分支提交，不压缩、删除分支或绕过保护。合并SHA、本地main同步和最终工作区状态以GitHub、Git及交付回执为准。测试后实查没有本项目Electron/Python/开发启动器残留；公开候选仍为70个文本文件，来源及第三方声明保留。

## 18. 第6步：会话快照、持续SSE与显示恢复（2026-10-04）

用户要求仅执行第6步：完善会话侧栏、输入、历史、工具状态、卡片/取消，先快照后订阅，按运行ID与序号续读/去重，切换解除旧订阅及断开状态。没有研究、组合等新页面或下一步实现。本轮仅本地开发，不暂存、提交或上传；基线main、HEAD为`a56cc62d9efe4ca6e02cb9f0f06af1bcd3dc6677`，执行前工作区干净，第5步已通过PR #4发布。

### 参考、依赖和实际导入

只读核对固定Folio ZIP `ba5dcdfd31b162f5edb8b908f7f099a560389326` 的`packages/ui/src/client.tsx`、`atoms/streamAtoms.ts`、`components/layout/Sidebar.tsx`、`components/chat/MessageList.tsx`/`TurnCard.tsx`和`components/agent/ToolActivity.tsx`。原侧栏含Jotai、国际化、lucide与额外业务导航，完整消息卡含Markdown/引用和研究展示；未导入这些文件或原TypeScript后端。侧栏、输入、消息容器继续使用研迹组件；行情/K线结果继续复用第2步已有局部适配。

本步新增`apps/desktop/src/renderer/ToolActivity.tsx`：从Folio同名组件局部适配折叠工具时间线、按call.id列示和formatDuration格式，保留源URL/路径/固定提交注释。移除react-i18next、lucide、Tailwind和@finagent/core类型，改用已有React、研迹CSS、前端`ToolView`；新增取消/超时/中断显示，状态由Python记录投影。无新依赖或锁文件变化。streamAtoms按run/sequence去重的思路仅作参考，没有导入Jotai缓存或同时接入旧事件渠道。原作者复用授权保持第9—11节的用户确认口径，未独立取得授权原文，不宣称全仓MIT；第三方声明保留。本轮未发生公开发布。

### Python业务真相与桌面适配

- `SessionSnapshot`为Pydantic新契约，GET /sessions/{id}/snapshot返回本会话消息、运行和已保存事件；`Store.snapshot`显式BEGIN，固定同一WAL读事务，消息文本及各运行水位一致。OpenAPI重新生成前端类型；没有新的数据库表/迁移。
- 原/events默认follow=false保留有限历史；follow=true重放游标后的已提交事件并持续等待新事件，活动流每100ms读取、10秒心跳。Last-Event-ID和query取较大水位，身份/负值/越界继续拒绝。终态末事件后正常关闭，终态/末序号响应头允许已读到终态末尾的客户端正确关闭空流。删除或断开结束订阅，不重建会话或执行工具。
- main新增`RunSubscription`与`FrameDecoder`，仅本机带启动令牌HTTP。完整帧验证版本、session/run、类型、id和连续序号，重复帧忽略；半帧不推进游标，重连丢弃未完成片段。HTTP处理跨块UTF-8，解析器处理CRLF/多帧/心跳。断流从最后完整接收序号续读，250ms→4秒退避；400/401/404明确失败，不盲目重试。终态EOF不空转。
- preload新增sessionSnapshot、subscribeRun，共19项命名桥；订阅ID仅由preload生成，用于过滤对应IPC。返回幂等解除函数，移除监听并关闭主进程请求；没有任意HTTP、路径、数据库、进程或令牌接口。main核对IPC来源/ID/非负安全整数、订阅数量，导航/页面销毁、后端状态变化和退出均清理。
- SessionPanel先显示快照再订阅其中活动运行，即使正在查看旧运行也持续接收本会话活动数据。`applySessionEvent`按运行水位去重，只更新同一消息ID的未见文字；快照已有内容不再追加，不接旧消息事件渠道。收到run_completed再读Python快照取得终态，取消按钮仍调用第5步Python接口。effect清理使过期快照与事件失效，解除HTTP/IPC和重连计时器，切换不串数据。
- sessionStorage仅记工作区、会话和运行选择，刷新先核对数据库中对象仍存在再恢复显示。后端断开时显示顶层健康及事件状态，保留已显示内容；重试后从Python读中断/历史，不自动重新调用。工具状态可折叠、卡片含原获取时间，未知意图/股票和取消错误继续明确区分。

真实读链：页面加载→preload.sessionSnapshot→main→带令牌FastAPI→Store单一读事务→页面缓存→preload.subscribeRun→main HTTP SSE→Python已提交事件→主进程完整帧/游标→IPC订阅ID过滤→前端消息ID/运行序号投影；run_completed后回到快照。只有用户点击运行的POST会进入RunManager/工具，所有恢复/历史读取不经过AgentRunner。

### 验证与桌面QA

| 检查 | 实际结果 | 证明及限制 |
| --- | --- | --- |
| 契约/TypeScript/构建 | 通过 | contracts:generate、bun run check、build，无新依赖；开发构建，非安装包 |
| Python完整回归 | 72通过、1条上游TestClient/httpx弃用提示 | 原67项＋本步5项；最终包含终态头/空流复验 |
| 快照一致/隔离 | 通过 | 读事务期间另线程完成写入，快照仍为旧消息/运行/事件同一版本；会话隔离、鉴权/未知404，重复读相同 |
| 实际HTTP持续流 | 通过 | 独立Python进程中，先读快照再订阅未来工具结果，每帧发送前可经HTTP查到已提交记录；完成自动关闭 |
| 实际HTTP断流续读 | 通过 | 活动连接读1—4后关闭，离线期间取消，Last-Event-ID 4大于query 2，重连只读5—8；终态末尾再读为空、正常结束 |
| 历史不重执行 | 通过 | 记录调用的Python模型/数据Provider各仅1次，三次快照/事件读取不增加；桌面刷新/切回/重复读保持原卡片获取时间及POST运行数 |
| 桌面传输/适配测试 | 5通过，无跳过 | bun run test:stream：跨块CRLF/心跳/边界、半帧掉线、续读游标、重复帧、取消重连计时器、鉴权终止、单消息去重/跨会话拒绝及终态空流 |
| Electron最终完整回归 | 12通过，无跳过 | 原10项＋活动刷新/单独断流续读/解除/历史去重、旧快照晚到两项；默认dist与Vite、取消/超时/删活动会话/后端重试及所属关闭回归通过 |
| 页面身份/非空/overlay/console | 通过 | 实窗标题研迹，dist/renderer/index.html；真实侧栏、输入/消息/工具卡/状态响应；无Vite overlay、目标流程console error/warning及pageerror |
| 图像与响应布局 | 通过 | 默认窗口与600×620，已查看全页断流提示/完整回复及工具卡、窄窗首屏；无横向溢出。窄窗后续内容需纵向滚动 |
| 迁移重复执行 | 通过 | 临时库CLI两次upgrade、current=0003_lifecycle (head)、check无新操作；本步无新迁移 |
| 根start-dev.cmd | 本轮未重复执行 | 入口未改；实窗Vite/Python启动与退出由原回归验证 |
| 人工/学习、真实服务/安装包/CI | 未验证 | README第15—17项和practice第6步未代填；真实LLM/行情/账户、真实Provider阻塞取消、干净机器、其他OS、CI仍未执行 |

新增桌面测试开发时修正了三处测试脚本问题：Electron evaluate中require不是全局，改用process.getBuiltinModule取内置HTTP；空会话提示本身含NVDA示例，改验证article为零；误把TSLA示例价格用于NVDA断言，改从Python保存的K线工具结果取末收对照。未修改fixture价格或放宽业务验收。最后完整12项全部通过。另补终态空流响应头与测试，避免已到末尾时反复重连；最终完整72项Python、5项传输测试及12项Electron均针对该实现。

Browser plugin not available：本会话没有Browser插件/skill，依frontend-testing-debugging采用项目已有Playwright Electron工作流。React采用基本值effect依赖、独立列表读取、活动标志拦截过期结果、订阅退出清理与单一快照缓存，没有新增状态框架。参考组件的完整国际化/图标/引用展示是有意未移植范围，研迹保留中文规则/模拟标签、独立Python客户端边界。

截图在仓库外`C:/Users/38905/.codex/visualizations/2026/10/04/01a1052d-756d-7d41-8501-1f906d4fa709/step6`：stream-reconnecting.png、stream-restored-history.png、stream-compact.png；测试数据库/锁在临时目录，不改日常库。没有性能或大型历史压力成绩：main继续保留256KiB普通响应/单帧限制；大历史分页、跨设备及长时重连压力未验证。真实外部网络/模型不在本步范围。

README、ROADMAP、tutorial C04/C05和practice第6步已同步，状态代码完成/待验收。本轮未暂存、提交、上传或实现第7步；用户手动及学习记录待填，交付后停止。

收尾审核：74个候选均为文本，本段追加前610282字节；本地Markdown链接/代码围栏、常见密钥签名及运行/账户/日志/缓存/图片候选检查无异常。git diff --check通过，21个已有文件修改、4个新增文件，全部属于第6步；暂存为空、main HEAD仍为a56cc62d9efe4ca6e02cb9f0f06af1bcd3dc6677。最终进程实查未发现本项目Electron/Python/开发启动器残留，参考目录未写入；工作区外PROJECT_STATE同步本轮事实。

## 19. 第6步发布复验与PR交付（2026-10-04）

用户明确要求仅发布当前已验收的第6步，授权功能分支、PR以及检查通过且无未解决阻塞后的普通合并，保留提交记录并同步本地main。依据本轮完整复验及用户已验收发布确认，将第6步标为验收通过；第18节保留开发结束时的历史状态，未代填逐项手动、学习或用户回答。第7—24步未开始。

- 身份/归属：gh api user实测ydflow；目标为公开、非fork的ydflow/research-trail，默认main，origin fetch/push均为https://github.com/ydflow/research-trail.git。fetch后的origin/main、本地main及GitHub main均为a56cc62d9efe4ca6e02cb9f0f06af1bcd3dc6677，没有已有开放PR。每次GitHub写入前重新核验，不切换账号、覆盖无关仓库、删除或强推。
- 实际范围：21个已有文件修改、4个新增文本文件，共25个，均属第6步。新增Folio ToolActivity局部适配单独记录上游来源；Python快照/持续SSE/生成契约及测试为本项目新实现；桌面白名单订阅、续读、显示缓存和回归为桌面接入。未新增依赖、迁移、原TS后端、完整页面或下一步功能；不制造不存在的修复提交，不伪造作者或时间。
- 公开范围：按第9—11节用户确认的原作者复用授权及本轮明确发布指令，纳入第18节ToolActivity局部适配。源码来源注释和原第三方LICENSE/NOTICE保留；仅用户确认授权事实，未独立取得原始授权文件，不宣称全仓MIT。
- 文件审核：文档更新前74个候选文本、610781字节；常见密钥特征、运行/账户/日志/缓存/二进制图片、本地Markdown链接（14处）及代码围栏无异常，git diff --check通过。环境、运行库/WAL/SHM/owner.lock、日志、账户、缓存、依赖/构建忽略实测有效。测试数据库及截图均在仓库外，没有上传私人数据。签名扫描与源码差异人工核对共同使用，不作为完整安全认证。
- 后端复验：README规定的uv run --directory services/backend --frozen python -m pytest，72通过、1条上游TestClient/httpx弃用提示。覆盖一致快照、隔离、先持久化后流出、实际HTTP持续/断流续读、终态空流及历史不重执行，并保留全部生命周期回归。首次误用裸pytest导致模块查找失败，改回规定命令全通过，无代码/依赖修复。
- 桌面复验：bun run test:stream 5通过、无跳过；bun run test:desktop真实Electron完整12通过、无跳过。断流续读不重复、活动刷新、会话切换解除请求、旧快照晚到、卡片/消息ID/获取时间不变及历史不重执行均通过，包含Vite和所属后端退出回归。
- 契约/构建/迁移：bun run check、build通过；临时库CLI upgrade head两次、current=0003_lifecycle (head)、check无新升级操作通过。本步未新增迁移、未修改日常运行库；进程实查没有本项目Electron/Python/开发启动器残留。
- 尚未验证：CI实查工作流数为0，不称CI通过。逐项手动和学习、真实LLM/行情/账户、真实外部Provider阻塞取消、安装包/干净机器、其他OS、迁移降级/离线SQL/备份恢复、大历史分页和长时重连压力未验证；普通响应/单帧继续限制256KiB。根start-dev.cmd未改，本轮未重复执行该入口。

提交按上游组件适配、Python新实现、桌面接入、验收文档分别记录，使用当前ydflow作者配置与实际提交时间。后续PR链接、最终head和合并SHA由实际Git/GitHub及回执确认，不在合并前虚构结果；不打标签、创建Release或启用定时付费评测。

发布分支feat/step-6-session-stream已推送，创建 [PR #5](https://github.com/ydflow/research-trail/pull/5)，base main；每次写入前实时核验ydflow、目标仓库及origin，推送只在本次命令使用已验证gh凭证助手，不改全局凭证配置。已保留上游组件适配bb584d777eb5cebb2f118739ec63e49574521d8e、Python新实现495ffd73f3cb11ed5a47d3f1f051074d2dcc83de、桌面接入3977107f083a151f41e48fa2fad5d5466f9a7bc4、验收文档2644973884e4e4016a0bfafbc0f82cff263ab68e。作者沿用ydflow及现有noreply邮箱，实际提交时间2026-10-04 21:45:17—18（Asia/Shanghai）；没有伪造原作者或时间。

创建后实查head与本地一致、25个差异文件及4个提交准确，MERGEABLE/CLEAN、非draft、无review或未解决讨论，检查列表为空；Actions工作流、标签与Release均为0，不宣称远程CI通过。PR创建前最终74个文本文件共614683字节，差异空白、常见密钥特征、运行产物与Markdown审核通过，工作区干净。

本次仅补PR链接与合并前检查，独立文档提交，不改已验证业务源码。最终再核对head/base、提交/文件清单、账号与目标、未解决阻塞后，按用户授权普通merge保留全部提交并fast-forward本地main；实际合并SHA、同步及最终工作区状态以Git/GitHub与交付回执确认，不提前声称合并。没有强推、删分支、标签、Release、定时付费评测或第7步实现。

## 20. 第7步：首版完整验收、离线检查与干净源码（2026-10-04）

用户只授权本步完整验收和发布准备，不增加业务，不提交、推送、打标签或创建Release。开始时main工作区干净、HEAD为第6步PR #5普通合并提交f51b802d61896f9da30cd1f6df331c90e75e24b9；本轮HEAD不变、暂存为空，所有改动留在本地。第8—24步未开始。

### 新增验收入口与网络边界

- 根check.cmd与bun run verify同一入口：Python3.12检查、离线导出契约/生成TS一致性、前端类型、完整pytest、隔离库重复迁移、Node离线/SSE/适配、main/preload/renderer构建、真实Electron完整回归。失败立即非零退出，不安装依赖，不用构建代替实窗证明；临时数据在仓库外，不读日常库。
- verify.mjs清除模型凭证、代理、外部Python/Electron路径及旧运行配置，给Python子进程PYTHONPATH/sitecustomize和Node子进程专用网络保护。Python TCP/DNS/UDP外部目的地被拒绝，Node外部TCP/DNS被拒绝，本机HTTP/SSE/IPC仍可用。Electron通过-r加载专用策略，独立窗口分区及默认session的桌面资源都限制本机；实际session.fetch外部测试地址在发送前收到ERR_BLOCKED_BY_CLIENT。它是回归保护，不是操作系统或不可信代码安全沙箱。
- 新Node离线测试3项、Python子进程策略1项，不重复已有业务案例；沿用原行情/工具错误/取消/硬重启/事件去重回归。确定性FakeModelProvider仍在本机被调用，以验证工具链；没有真实模型SDK/模型API、行情API、账户、追踪或付费评测。
- prepare-electron.mjs把Electron二进制的延迟安装放到依赖准备阶段；离线入口缺path.txt或electron.exe就立即失败，不触发补装。新增packageManager固定本机Bun1.4.2，没有新增业务依赖或修改锁文件。start-dev.cmd在RESEARCH_TRAIL_OFFLINE=1时两种安装器均用--offline；dev启动器此模式加载测试网络策略。默认业务与页面不变。
- .github/workflows/offline-checks.yml为只读Windows作业，push/PR/手动触发，无schedule、业务密钥或发布动作。先下载源码/Action/Node/Bun/uv/Python及锁定依赖，再运行相同check.cmd；验证阶段只本机通信，不把整个GitHub作业称为断网。Action使用官方仓库实查的固定SHA；本轮未上传或触发远程CI，只有本地静态与运行证据。

### 实际结果

| 检查 | 本轮最终结果 | 证明及限制 |
| --- | --- | --- |
| 统一CMD入口 | 通过、退出码0 | 原工作区实际cmd.exe /d /c check.cmd完整通过；不是只分别跑单项 |
| Python完整pytest | 73通过、无跳过 | 原72项＋子进程离线策略；1条上游Starlette/TestClient httpx弃用提示，未更换依赖 |
| 前端/契约/构建 | 通过 | Pydantic导出→OpenAPI/TS逐字检查→tsc；main/preload与Vite构建通过 |
| Node离线/SSE/适配 | 8通过、无跳过 | 3项网络策略＋原5项；拒绝外部/非法伪loopback地址、本机交流、继承、续读去重/半帧/终态空流 |
| Electron完整集成 | 12通过、无跳过 | 四股票和画布、未知代码、工具失败、取消/超时/删活动、正常/硬退出中断、刷新/切换/断流去重/晚快照、所属关闭全部保留；独立分区保护实际验证 |
| 临时库迁移 | 通过 | 两次upgrade head、current=0003_lifecycle (head)、check无新升级操作；无新迁移 |
| 干净源码 | 通过 | 86份当前源码导出到无.git/依赖/构建/运行数据的空格路径；新安装71个前端包、28个Python包，显式准备Electron，完整73/8/12及类型/构建/迁移再次通过 |
| 根CMD操作链 | 通过 | 副本自己的测试依赖连接真实start-dev.cmd窗口：NVDA选股→建会话→AAPL行情→延迟K线取消→关窗/再启动→历史快照完全相同，4消息/2运行，原获取时间不变，无新调用/运行；所属进程归零 |
| 可解释的检查失败 | 通过 | 仓库外副本人为生成契约漂移、暂移Electron标记均check.cmd退出1；标记缺失在检查前失败，不补装。随后原样恢复，未改实际源码或日常库 |
| Actions文件静态检查 | 通过 | actionlint 1.7.12官方Windows归档，SHA256 6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9与官方checksums一致；CLI检查通过，远程CI未执行 |

最终干净源码为系统临时目录的research-trail-clean-nj2IJD/clean source，未复制原node_modules或.venv；二进制准备前可复用本机已有下载缓存，不称空缓存/无工具机器验收。隔离CMD历史证据在research-trail-cmd-qa-r0Dqpb，result.json记录PASS、4消息/2运行、重启同快照、0所属进程。前一轮NLV2u6副本也通过，同一副本自身运行测试的复核在cmd-qa-662Y90通过。临时副本/库/证据均在仓库外保留，未导入本项目运行数据。

### 桌面观察、修正和未验证项

Browser plugin not available：依frontend-testing-debugging使用已有Playwright Electron/本机CDP，没有安装Browser插件。真实窗口1100×800及600×620；dist/renderer/index.html和127.0.0.1随机Vite地址、标题研迹、非空业务内容、无框架overlay及目标流程console error/warning/pageerror均通过。已查看行情画布、默认/窄窗、取消及重启后历史截图；窄窗内容纵向滚动，无横向溢出，不做新UI设计。截图位于仓库外step7/step7-clean/step7-final/step7-final-clean证据目录，没有上传；用户亲自清单仍待本人填写。

本步验收工具迭代遇到并解决：NODE_OPTIONS在Windows对反斜杠转义，改标准斜杠；Playwright会删除Electron的NODE_OPTIONS，改显式-r并断言策略生效；NODE_OPTIONS阶段早于Electron内置模块加载，拆出electron.cjs在-r阶段接入；干净安装首次require可延迟准备二进制，改准备阶段显式检查、验收阶段缺失即失败；应用使用独立session partition，改为web-contents-created保护各分区并补实际拒绝请求检查。未修改业务实现、fixture价格、Agent、原组件声明或生成契约。最后最终副本完整复验及根CMD链通过，没有未解决失败。

README架构图改为当前真实Python调用链，未来研究/账户不混写在已实现分支；补CMD准备/离线启动/统一检查/干净源码操作，tutorial增加真实验收链及修正健康课的历史接口数量，practice第7步保留一个实际操作记录练习和三道理解题。新ACCEPTANCE-v0.1.0.md提供用户选股票→创建会话→查询→取消→重启历史五段清单与逐项待填写位置。

结论：第7步验收通过，v0.1.0标为“源码可发布（仅假模型＋模拟数据）”，不是已发布版本、真实LLM/实时行情证明或安装包验收。远程Actions执行、用户亲自/学习、空缓存首次下载、无工具干净机器、安装包、其他OS、真实外部Provider阻塞取消、迁移降级/离线SQL/备份恢复、大历史分页/长时重连压力未验证。普通响应/单帧仍为256KiB上限。本轮没有暂存、提交、推送、标签、Release或定时付费评测，交付后停止。

最后补充离线CMD二进制缺失前置检查：prepare-electron.mjs --check只检查准备状态，不require Electron或补装；start-dev.cmd离线分支在打开窗口前调用它。临时副本移走标记时明确Electron binary missing、退出1，没有Downloading Electron或Vite开窗日志；恢复标记后副本自己的完整CMD操作链再次通过，最终证据cmd-qa-bkozSI，4消息/2运行/同快照/0残留。prepare:desktop正常准备分支、脚本语法及actionlint也复验通过；仅验收/启动保护改动，未改业务、页面或锁文件。

收尾审核：本段追加前86份候选均为文本、667882字节，17处本地Markdown链接/围栏、常见密钥特征与运行/账户/图片产物审核无异常，git diff --check通过。9个已有文件修改、12个新增，共21个，全部为第7步验证/启动保护/文档；后端业务、renderer、生成契约与锁文件无差异，来源声明保留。HEAD仍f51b802d61896f9da30cd1f6df331c90e75e24b9、main、暂存为空；进程实查无本项目及隔离副本Electron/Python/开发启动器残留。工作区外PROJECT_STATE已同步本轮事实，完成后停止。

## 21. 第7步发布复验与PR交付（2026-10-04）

用户另授权发布当前已验收的第7步：提交功能分支、创建PR，检查通过且无阻塞后普通合并，保留提交记录并同步main。先前版本发布核对因第7步尚未提交而停止，没有创建v0.1.0标签或Release；本轮只交付第7步源码，不开发第8步，不打标签、创建Release或启用定时付费评测。第20节保留开发轮次事实和逐项未验证记录。

- 身份与基线：本轮gh api user确认ydflow，公开、非fork的ydflow/research-trail默认main，origin fetch/push均为https://github.com/ydflow/research-trail.git。fetch后本地main、origin/main、GitHub main均为f51b802d61896f9da30cd1f6df331c90e75e24b9；没有既有开放PR或同名发布分支。Actions已启用，允许普通merge，main没有分支保护。每次GitHub写入前重新核验账号和目标，不切换账号、强推、删除或覆盖无关内容。
- 文件范围：发布开始时9个已有文本修改、12个新增，共21个，全部是第7步测试、离线策略、启动保护、CI和说明。远程CI复验后补一份.gitattributes并修正断流测试预期，最终9个修改、13个新增，共22个；后端业务、renderer、生成契约、锁文件和已有来源/第三方声明无差异，没有新依赖、迁移、Folio组件导入或原TS后端。公开范围沿用第9—11节用户确认的原作者复用授权，不宣称独立核实全仓MIT。
- 审核：本轮文档更新前86份候选文本共668476字节，常见密钥签名、运行/账户/日志/缓存/图片产物检查未发现异常，git diff --check通过；.env、库/WAL、日志、账户、截图、依赖、虚拟环境、构建目录忽略探针均有效。测试库和桌面证据始终在仓库外，不上传日常数据或截图。扫描是源码审核辅助，不是完整安全认证。
- 本机完整复验：实际cmd.exe /d /c check.cmd退出0，Python73项、Node离线/SSE/适配8项、真实Electron12项均通过且无跳过；契约、类型、构建和临时库重复迁移通过，head为0003_lifecycle、check无新升级。只有一条上游Starlette/TestClient httpx弃用提示，没有更换依赖或修复业务源码。隔离迁移证据research-trail-verify-y1FLZa。
- 干净源码重新验收：bun run verify:clean退出0，86份源码导出至系统临时research-trail-clean-2UksOW/clean source；不复制依赖/构建/日常库，新安装71个前端包、28个Python包并准备Electron。副本同样完整73/8/12及契约/类型/构建/重复迁移通过，再由副本自己的根start-dev.cmd打开真实Vite/Electron，完成选股→建会话→行情→取消→关闭/重启历史，保存快照完全相同、4消息/2运行、获取时间不变、无新运行、所属进程归零。最终结果research-trail-cmd-qa-5RzKNV/result.json。可复用本机下载缓存，不称无工具或空缓存机器验收；发布文档的随后更新不改变已验证运行代码。
- Actions静态：原固定Action SHA和只读Windows工作流保留，actionlint再次通过；安装阶段允许下载，check.cmd仅本机通信、规则假模型与模拟行情，没有真实模型/行情调用。实际远程CI需PR上传后单独核实，不由本地通过推定。
- 提交归类：Python离线策略/回归是本项目新增测试；桌面/统一验收工具与CI单独提交；开发启动器的离线保护修复单独提交；验收及学习文档单独提交。本步没有新上游导入，不制造不存在的导入或Python业务实现提交。作者沿用ydflow及现有noreply配置，使用实际当前时间，不伪造来源作者或开发时间。
- 验证边界：仅假模型＋模拟数据的Windows源码。用户亲自清单与练习、真实LLM/行情/账户、真实外部Provider阻塞取消、安装包/无工具干净机器、其他OS、迁移降级/离线SQL/备份恢复、大历史分页/长时重连压力未验证；普通响应/单帧仍为256KiB。PR、远程CI、最终head与合并SHA由实际Git/GitHub和交付回执确认，不提前虚构结果。

发布分支feat/step-7-offline-acceptance创建 [PR #6](https://github.com/ydflow/research-trail/pull/6)，base main、非draft，已核对初始21文件与4提交、作者ydflow及实际时间2026-10-04 23:22:14—15（Asia/Shanghai）。保留Python测试fa73caad79b3db7e22a9b0bb4636af6e6721349d、统一验收/CI 50dfef1cd7bb1fddfd8bdcb05c13de77d2d8b903、启动修复1dba7eff4a87ba8a7030816e65e831e3e53d7753、验收文档a72c1e925636a14fd58e91284e57254ca2ffe258；没有新上游导入。

远程首次 [PR检查37212809774](https://github.com/ydflow/research-trail/actions/runs/37212809774)及push检查37212801583均在契约逐字检查失败，没有合并。通过仓库外git clone --config core.autocrlf=true复现：两份生成文件i/lf、w/crlf，严格字节不同而仅归一CRLF后完全一致。独立修复bad3739a90ea718d6f1a2ebce996817023800329只新增.gitattributes，为这两份生成契约固定text eol=lf，不改契约内容或放宽比较。该隔离Git检出重写后i/lf、w/lf、严格散列相等，新装依赖后完整73/8/12、契约/类型/构建/重复迁移及根CMD历史链通过，证据research-trail-cmd-qa-Rlwsl0（4消息/2运行、同快照、0残留）。这补充了Windows真实Git检出证明，原verify:clean只是按清单复制。

换行修复后 [PR检查37213114420](https://github.com/ydflow/research-trail/actions/runs/37213114420)成功，但push检查37213111655在一个桌面断流断言失败：开始游标为run:3，断开前完整收到tool_started第4帧，正确重连游标为run:4；原测试错误地要求重连仍等于开始游标。独立修复c37a9875a85f4da0415360e4878733d8ae3c43d8：在生产解码器之后旁路观察完整帧ID，并在同一次主进程调用内保存水位/断开，严格断言重连Last-Event-ID等于该水位；保留恰好两次连接、8事件、消息ID去重、快照先于订阅、历史获取时间及POST次数不增、切会话解除等原断言。没有修改生产SSE/快照、fixture或Agent，不用重跑旧失败冒充修复。

断流修复针对性实窗测试1通过，最终本机check.cmd再次完整73/8/12及类型/构建/重复迁移全部通过、退出0，隔离迁移证据research-trail-verify-kmXine。修复后 [push CI 37213537186](https://github.com/ydflow/research-trail/actions/runs/37213537186)实测success，head=c37a9875a85f4da0415360e4878733d8ae3c43d8；对应PR检查及本文随后文档提交的最终检查以 [PR #6检查](https://github.com/ydflow/research-trail/pull/6/checks)中实际head为准。原失败保留为调查记录，不能替代最终检查。

本次仅同步PR链接、修复与已验证记录，独立文档提交，不改变已验证运行代码。合并前再核验最终head/base、全部检查、账号/目标、未解决讨论及文件清单；检查全通过且无阻塞才按用户授权普通merge保留提交，本地main只fast-forward。最终合并SHA、main同步及远程最新检查由Git/GitHub和交付回执确认，不提前写作已合并；没有标签、Release、删分支、强推或下一步功能。

## 22. 第8步：设置、独立假连接、系统凭证与脱敏诊断（2026-10-05）

用户授权本步在D:\folio\research-trail先读规则和实现，移植必要的模型设置、连接、个人资料和诊断界面；Python分别管理模型/行情/账户/技能/运行时配置及健康，密钥存系统凭证存储，DB仅非敏感配置；只用假连接验证，不发送真实请求，完成即停止。开始时main工作区干净，HEAD=716543305ba5d74f57336c589c4b2dffaf6e3592（v0.1.0源码标签解析提交）；开发未创建提交/分支、未暂存或上传，标签/Release不包含本地第8步。

### 来源与实际实现

- 只读Folio固定ZIP来源ba5dcdfd31b162f5edb8b908f7f099a560389326，读取`packages/ui/src/components/settings/SettingsView.tsx`、`ModelsTab.tsx`、`ConnectionsCenter.tsx`、`DiagnosticsTab.tsx`、`components/profile/ProfileSecurityView.tsx`。这些依赖Jotai、i18n、原client、primitives和原UI样式，未整体导入；本步局部适配分区、连接卡片、编辑/删除/测试动作、个人资料/健康概览和诊断导出的信息流，实际React实现为`settings/SettingsPanel.tsx`，附来源注释。没有导入原TS业务内核、账户实现或新前端依赖。第9—11节用户确认的原作者复用授权边界及现有第三方LICENSE/NOTICE保留，不宣称全仓MIT，不改只读参考目录。
- Python新增`settings.py`、`credentials.py`：五类显式kind独立配置/状态、首次待测试/变更失效/假成功/失败/失效/停用，缺凭证及存储不可用分别识别；编辑/测试串行，连接成功只写自己的记录。配置/凭证变更清除测试时间，重启保留状态但不自动重测。技能/运行时只配置启用和假结果，拒绝凭证；完整技能注册/真实Runtime属于后续步骤。
- 新增Alembic `0004_settings`和SQLAlchemy connections/profile表，只存非敏感字段、随机系统凭证引用和状态。Python通过ctypes调用Windows CredWriteW/CredReadW/CredDeleteW/CredFree，使用GENERIC/LOCAL_MACHINE（同本机用户持久化），原文不入DB或文件。API SecretStr校验1—2560字节，不允许空/NUL；不提供密钥读回。命名空间按数据库绝对路径哈希隔离，写新条目→提交引用→清理旧条目，提交失败保留旧引用并尝试清理新条目。系统存储失败固定报错，无明文降级。
- `/settings`白名单鉴权接口包含配置/凭证保存删除、单类假测试、资料保存删除、诊断读取；Pydantic生成OpenAPI/TS，新增桥11项，原19项保留，总30项。main只接五类kind，所有HTTP请求仍发随机本机Python地址；配置的endpoint不作为请求目标。密码框立即清空，UI只有显示缓存，清理卸载/后端变化后的过期结果。“重新读取状态”从Python读取而非制造健康。
- 验证失败返回固定422消息，避免FastAPI默认error.input回显原始凭证；系统/存储异常不传异常原文或traceback到页面/日志。endpoint拒绝用户名/密码、查询参数和fragment，未知敏感字段拒绝。诊断显式白名单投影，排除endpoint/model/资料/凭证引用/路径/环境；main用系统保存对话框选择目的地写JSON，不暴露任意文件接口。

### 本轮验证

| 项目 | 实际结果 | 证明及限制 |
| --- | --- | --- |
| 统一`check.cmd` | 通过、退出0 | 契约/TS、完整Python90、Node8、真实Electron13项均无跳过，构建、两次迁移/current/check通过，head=0004_settings；原TestClient/httpx弃用提示1条 |
| 新增Python设置回归 | 17通过 | 五类状态隔离、变更/缺凭证失效、停用、鉴权、输入错误不回显、URL嵌入密钥拒绝、存储错误脱敏、替换/删/提交失败保留旧凭证、诊断白名单、旧会话迁移快照不变 |
| 真实Windows凭证 | 通过 | 临时唯一命名空间和自造测试占位值，原生写/读/替换/删除/重复删除、独立native实例读回，最终清理；无真实API密钥 |
| 真实Electron第8步 | 1项新增通过 | 模型假成功与行情假失败/账户假失效互不影响、其余未配置；密码框清空、sessionStorage无凭证、资料/诊断/删/重启与状态时间保持、所属退出；运行在离线网络保护下 |
| 最终界面复验 | 通过 | 补充状态刷新/过期结果保护/选中态后重新check/build并重复同一实窗测试；改模型名保存失效、未保存禁测试及刷新状态也验证，不修改fixture或测试预期 |
| 导出诊断 | 通过（保存对话框返回值由测试注入） | 主进程真实读取白名单并写临时JSON、页面反馈；文件/页面均无测试凭证、地址、姓名、路径。人工系统对话框点击/取消待用户亲自操作 |
| 桌面QA | 通过 | Browser plugin not available，使用项目已有Playwright Electron；dist页URL/标题正确、非空、无overlay/相关console warning/error/pageerror，1100×800与600×620已看截图，无横向溢出，长表单纵向滚动 |
| 数据及日志 | 通过 | 测试DB/WAL/SHM、配置/诊断响应和caplog没有测试秘密；异常内容含同一测试秘密时也不回显。本项目uvicorn access_log=False，不记录请求体 |

统一验收隔离迁移目录：`C:\Users\38905\AppData\Local\Temp\research-trail-verify-kIWcvC`。截图：`C:\Users\38905\AppData\Local\Temp\research-trail-step8-qa\step8-overview.png`、`step8-model.png`、`step8-connections.png`、`step8-diagnostics.png`、`step8-compact.png`。实际设置QA的库/导出JSON位于`research-trail-settings-qa-*`临时目录，均为测试配置/假连接/占位凭证，系统凭证已清理。没有读取日常运行库、真实模型/行情/账户、付费评测或外部追踪；未重做v0.1.0的干净源码发布验收，本轮依赖/锁文件未改、未安装。

### 边界与停止

第8步自动验收通过，用户亲自清单/练习仍待填写；[第8步清单](ACCEPTANCE-step8.md)、README、ROADMAP、tutorial C06与practice同步，本轮不代填用户掌握程度。真实Provider健康、多轮模型工具循环、行情/账户接入、技能注册、其他OS/安装包未实现或未验证。凭证绑定本机用户与数据库路径，复制/移动DB不迁移系统凭证；极端进程崩溃/系统清理失败可能留下孤立系统条目，普通Python字符串不承诺内存完全擦除，未穷举全部崩溃点。诊断白名单/测试脱敏不等于完整安全认证。本轮main/HEAD不变，所有开发改动在本地，不暂存/提交/推送/打标签/发布、不开始第9步，交付后停止。


## 23. 第8步发布复验与PR交付（2026-10-05）

用户另行授权只发布当前已验收的第8步，按真实改动提交功能分支、创建PR；检查全通过且没有未解决阻塞后普通合并、保留提交并同步本地main。本节独立于第22节的开发轮次，不代填用户亲自操作或学习记录，不执行第9步，不打标签、创建Release或启用定时付费评测。

- 发布基线：本机main、origin/main和GitHub main均为716543305ba5d74f57336c589c4b2dffaf6e3592。实时gh api user为ydflow；目标公开、非fork、非归档的ydflow/research-trail，默认main，origin fetch/push均为https://github.com/ydflow/research-trail.git。现有仓库与本项目历史一致，无既有开放PR或同名发布分支；创建feat/step-8-settings-credentials，不覆盖无关仓库，不强推或删除。每次GitHub写入前重新验证账号和目标。
- 范围审核：18个已有文件修改、7个新增，共25个，均属于设置/凭证/独立假连接/诊断、契约/迁移/回归与文档；依赖锁文件、旧Agent/fixture和第三方LICENSE/NOTICE无差异。文档更新前94份候选文本共800482字节，常见密钥签名及运行/账户/日志/缓存/图片产物检查无异常；10项.env、运行库/WAL、日志、账户、截图、依赖/虚拟环境/构建忽略探针通过。按明确路径暂存，测试库/导出/截图在仓库外。扫描是辅助审核，不是完整安全认证。
- 来源与公开范围：沿用第9—11节用户确认的原作者复用授权，未独立核验原始授权文件，不宣称全仓MIT。本步Folio设置页只局部适配分区/卡片/表单及动作信息流，保留固定ZIP来源注释；未整体复制原组件、原TS内核、账户实现或作者历史。Python配置/系统凭证管理、迁移、契约与回归为本项目新实现，桌面接入与界面流程适配单独提交，文档另提交；没有制造不存在的原样导入或独立修复提交。作者沿用ydflow/noreply，使用实际当前时间。
- 发布轮次本机完整复验：实际cmd.exe /d /c check.cmd退出0，Python90项、Node8项、真实Electron13项均通过且无跳过；生成契约/类型/构建及临时库两次upgrade/current/check通过，head=0004_settings。仅既有Starlette/TestClient httpx弃用提示1条，未更换依赖。临时迁移证据research-trail-verify-ZRCqMH；本轮独立重跑，不拿第22节旧记录当新结果。
- 发布轮次干净源码：bun run verify:clean退出0，94份文本导出至系统临时research-trail-clean-g9r6zM/clean source，不复制.git、依赖、构建或运行数据；锁定新安装71个前端包、28个Python包并准备Electron。副本完整90/8/13及契约/类型/构建/重复迁移再次通过，副本自己的根CMD实窗完成选股→会话→行情→取消→关闭/重启历史，保存快照相同、无新运行、所属进程退出；证据research-trail-cmd-qa-iLAYLH。下载可复用本机缓存，不称空缓存/无工具机器验证。随后发布文档更新未改变运行代码。
- 验证边界：所有连接测试都是确定性假连接，离线保护下没有真实模型/行情/账户请求。Windows原生凭证测试只用临时唯一命名空间与自造占位值并清理；接口/日志/诊断不回显凭证，五类健康独立。用户亲自清单与练习、人工系统保存对话框点击/取消、真实Provider、安装包/无工具机器、其他OS、凭证跨机器迁移/全部极端崩溃点未验证。公开不包含运行库、账户数据、日志、缓存或敏感截图。

PR、远程Actions和合并结果以本轮实际Git/GitHub查询及最终回执为准，不由本机通过推定远程成功；只有最终head全部检查通过、没有未解决讨论或阻塞时才普通merge并fast-forward本地main。

发布分支创建 [PR #7](https://github.com/ydflow/research-trail/pull/7)，base main、非draft，初始head为98eb73ce8d924b1b953c424bdd6c4a110be8630d。已核对25文件与三个实际当前时间提交：Python新实现ae6b6461e4e01dac3edb023333ff15707016d694、Folio界面流程适配/桌面接入e785dd68d32e33dc4a15b8cc88babe4e2d0a184c、验收来源文档98eb73ce8d924b1b953c424bdd6c4a110be8630d；均为ydflow，不重写上游作者或导入历史。本次只补PR链接与查询记录，不改运行代码。

创建后push与pull_request两项Windows Actions已启动，尚在运行，不提前记作通过；最终检查以 [PR #7检查](https://github.com/ydflow/research-trail/pull/7/checks)的实际最新head为准。合并前重新读取head/base、全部检查、review及未解决讨论，并再次核对账号/目标；满足用户授权条件才普通merge保留提交，同步本地main。最终检查与合并SHA由Git/GitHub及发布回执核实，不在本文预写自己的合并结果。
## 24. 第9步：OpenAI兼容模型、受限只读工具循环与模拟协议验收（2026-10-05）

用户本轮只授权第9步开发：先读规则/现实现，Python支持Base URL/模型ID/API Key，接入现有Agent工具循环，默认8轮/整体120秒、取消、白名单参数校验与可定位错误；先模拟，本机配置后少量真实验证，无凭证则记录未执行，完成停止。开始时main干净，HEAD=f4c51f85fd468aa540feca0dc494caa4d993ce2b（第8步PR #7合并）。本轮不提交/上传，不实施第10步，不改现有标签/Release或定时付费评测。

### 实现与来源

- 新增Python openai_provider.py，通过已有httpx的AsyncClient实现非流式Chat Completions；原httpx 0.28.1从dev移到运行依赖，离线uv lock/sync通过，不新增版本或包。官方协议核对：[function calling](https://developers.openai.com/api/docs/guides/function-calling)、[Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)。wire函数名不带点，market_quote/market_kline显式映射内部market.quote/market.kline；保留assistant.tool_calls与按tool_call_id回传工具JSON的顺序。未导入Folio TS内核或新上游组件，现有UI出处/第三方声明和用户确认授权记录保持。
- AgentRunner统一messages→工具选择→整批校验→ToolRegistry.execute→tool_started/tool_result→tool消息→模型→回复。旧FakeModelProvider.plan/respond用RuleDialog封装，规则行为、fixture价格、原工具/事件/历史语义保持。真实openai_agent与fake_agent分别标识，缺配置/认证失败不回退规则模型。所有行情工具仍为模拟数据，不与真实模型身份混写。
- Python SettingsService在锁内取得一致配置/凭证/限制快照，Key仅内部ModelConfiguration（repr排除Key）；本机系统存储保存，不提供读回API、不用环境Key。新增0005_model_limits仅非敏感整数列，8次/120秒/30秒默认值；限制分别1—32、1—600、1—120。运行中改地址/模型/Key/限制不影响在途运行；配置编辑仍使假探针失效，五类记录独立。diagnostics.scope=connection-probes，false real_requests_sent仅指假连接探针，真实结果见会话RunDTO/事件。
- 工具仅注册只读market.quote/market.kline，校验唯一有界ID、JSON无重复字段、symbol及extra=forbid；整批校验后才执行，超额批次零执行。轮数和累计调用数都限制，默认最多8次执行、最多9次模型请求（最后一次可回复）；provider原始ID、非法参数原文和扩展元数据不写事件。内部call_id自造UUID，执行仍二次校验/类型与symbol匹配。
- RunManager继续后台工作线程、整体Timer、工具Timer、取消Event和Store唯一终态；真实运行整体默认120秒，原fake SCENARIOS保持15秒/受控模拟时序。HTTP请求等待中检查stop/deadline，取消task/关闭流，工具前后及模型返回后checkpoint防迟到写回；正常/硬退出仍中断恢复且不重执行。单次请求也有绝对时间限，慢分块不能仅靠活动read重置超时。
- 固定MODEL_AUTH_FAILED、MODEL_RATE_LIMIT、MODEL_HTTP_ERROR、MODEL_NETWORK_ERROR、MODEL_TIMEOUT/RUN_TIMEOUT、MODEL_RESPONSE_INVALID/LIMIT、UNKNOWN_TOOL、INVALID_ARGUMENT、TOOL_LIMIT等错误码。无重试/重定向/环境代理，远程HTTPS、本机可HTTP；请求上下文1MiB、响应256KiB、最终4000字符/输出1024 tokens。异常正文不入日志/事件，已知Key在合法最终内容中的反射替换为脱敏标记。
- 桌面原30项白名单保持，startAgentRun增加显式模型kind参数，默认fake；设置表单新增限制，真实模型选项说明会发送本次输入/工具结果与可能费用，不发送其他历史/资料。会话及中断/取消使用实际模型标签，不制造健康；假连接探针仍独立，不把一次真实运行当其他连接成功。
- 新增verify_live入口：只读日常SQLite配置与对应系统条目，不枚举凭证，在独立临时库使用同一Runner/Manager/Store、1轮/次、整体最多60秒、单次最多30秒，最多两次模型请求；必须completed且有一次成功tool_result才passed。默认只检查配置，--run显式执行；无配置not_executed，直接回复无工具不算通过，输出不包含Key/URL/模型ID/资料。

### 已执行验证与修正

新增Python模拟协议40项通过，覆盖多轮回传/共用事件/读历史不重请求、整批参数/额外字段/非法工具/重复JSON字段及ID、默认8次与批次不能绕过总数、各HTTP/网络错误、异常响应和空工具对象/false工具字段、凭证反射脱敏、远程HTTP/停用不发Key、单次/整体限时、取消与worker退出、在途配置快照、旧第8步配置/资料/会话迁移保持、少量验证入口两请求预算/只读日常库。MockTransport是模拟HTTP响应，不是外部LLM；另有真实loopback HTTP socket测试，取消后服务端观察连接关闭。

新增Electron实窗1项通过：未配置零请求失败→UI保存本机协议fixture与占位凭证/1次限制→模拟模型选择工具→Python真实执行→回传模型fixture→生成回复/模拟卡片→TOOL_LIMIT→取消本机HTTP流/服务端观察断开→假模型同工具链且无模型HTTP请求→关闭同库重启，完整快照相同、无新请求。临时命名空间Windows凭证清理，密码框清空、历史不含Key。所有模型响应来自本机确定性协议fixture，不写作真实模型通过。

Browser plugin not available，依frontend-testing-debugging使用项目已有Playwright Electron；dist/renderer/index.html、研迹标题、非空首屏、无Vite overlay/相关console warning/error/pageerror。1100×800与600×620已看首屏/设置/工具结果/取消/窄窗截图，无横向溢出，长内容纵向滚动。截图在C:\Users\38905\AppData\Local\Temp\research-trail-step9-qa，测试库在research-trail-model-qa-*，均在仓库外，不上传。

初次统一检查Python125/Node8通过，但Electron12/14通过、2项失败：本步改了既有“模拟工具时序”label，使旧生命周期/断流测试的exact定位失效。恢复原label、保持原断言，新增目标及两项旧回归共3项通过；没有放宽取消/续读/去重/不重执行断言。随后补验证入口与严格空tool_calls类型保护，模拟协议增至40项；最终完整统一结果将在本节追加，不把初次失败或单项通过冒充完整通过。

### 真实验证与停止边界

只读检查默认日常库：库存在，但没有model配置记录；没有读取账户/持仓/其他凭证。实际运行python -m research_trail.verify_live --run返回real_validation=not_executed、reason=MODEL_UNCONFIGURED、requests_started=0，未发真实模型/行情/账户请求。本轮只要求用户在本机配置并回复是否完成，不索要或展示Key；未配置不是认证成功。真实模型服务、外部TLS/DNS阻塞取消、兼容厂商扩展/Responses/模型流、真实行情/账户、安装包/无工具机器/其他OS/长时压力未验证；本步未重做干净安装或远程CI。普通Python字符串/系统凭证极端崩溃清理的第8步限制保持。

README/ROADMAP、tutorial C05、practice第9步及ACCEPTANCE-step9同步；一个非敏感限制修改练习和三道理解题保留待用户回答。不新增上游原样导入、交易功能或下一步数据适配，本轮完成后停止，HEAD不变，改动仅本地。

最终统一check.cmd实际退出0：完整Python130项（新增模拟协议40项）、Node8项、真实Electron14项（新增模型协议fixture1项）均通过、无跳过；契约逐字一致、TS、main/preload/Vite构建及隔离库两次upgrade/current/check通过，head=0005_model_limits、无新升级操作。仅原上游Starlette/TestClient httpx弃用提示1条，未升级依赖。最终隔离迁移证据research-trail-verify-rZInpU。先前127/8/14完整轮也通过，随后因发现空对象/false工具字段会被or []误作无工具而补严格类型拒绝和远程HTTP/停用零请求保护测试，最终完整130/8/14单独重新验证，不以重跑未修失败代替修复。之后只补文档，不改变已验证运行代码。

结论：第9步模拟协议和完整自动验收通过，真实模型验证未执行（MODEL_UNCONFIGURED、0请求）；用户亲自操作与学习待填写，不能宣称真实模型/实时行情已验收。来源/声明、现有假模型/fixture及原取消/快照/SSE严格回归保持。本轮所有改动在本地，HEAD/main仍f4c51f85fd468aa540feca0dc494caa4d993ce2b，未暂存/提交/推送，不执行第10步，交付后停止。


收尾审核：本段追加前99份候选均为文本、888653字节，24项Markdown本地链接/围栏及9项秘密/运行/账户/截图/依赖/构建忽略探针通过，常见密钥签名/运行产物无标记，git diff --check通过。实际26个已有文件修改、5个新增，共31个，仅第9步实现/配置/迁移/契约/回归与文档；工作流、AGENTS、.gitattributes、前端锁文件及已有声明不变。测试末未发现属于本项目的Electron/Python/Node/Bun残留；再次执行少量真实验证入口仍not_executed / MODEL_UNCONFIGURED / requests_started=0。暂存为空、HEAD不变，本轮未写Git/GitHub或日常库/账户数据；所有截图/协议fixture库/JSON只在仓库外。本机PROJECT_STATE最新进度已同步，历史验收与交接快照保留，完成停止。

## 25. 第9步发布复验与受限真实模型验证（2026-10-05）

用户另行授权仅发布已验收的第9步：真实改动分类提交、功能分支/PR，检查通过且没有未解决阻塞才普通合并并同步main。本节承接第24节开发快照，不抹去当时未配置/未执行的事实，不执行第10步，不打标签、创建Release或定时付费评测。

- 发布基线：main、远程main均f4c51f85fd468aa540feca0dc494caa4d993ce2b；实时gh api user为ydflow。现有ydflow/research-trail为本项目公开、非fork、非归档仓库，默认main，origin fetch/push均https://github.com/ydflow/research-trail.git，具有普通merge能力。开放PR为空，无同名feat/step-9-openai-agent远程分支；不切换账号、不覆盖无关仓库、不删除/强推。每次GitHub写入前再次核对账号/仓库/远程。
- 实际范围：26个已有文件修改、5个新增，共31个。Python新实现包含模型适配、共用受限循环、限制/迁移、契约、验证入口与回归；桌面接入/模型选择/设置及实窗协议fixture另提交；文档另提交。本步没有新的上游原样导入或独立修复改动，不制造对应提交。第24节开发中修复过的响应严格校验/旧标签回归按实际最终源码包含在本步实现与测试中，不伪造另一次历史。沿用ydflow/noreply与真实当前提交时间。
- 来源：第9—11节用户确认的原作者复用授权记录保留，未独立核验授权原文，不把全仓自行标MIT；既有Folio固定ZIP出处和第三方LICENSE/NOTICE未变。没有新增原TS内核/账户源码或依赖；httpx原锁定版本移为运行依赖。
- 发布本机完整检查：cmd.exe /d /c check.cmd实际退出0，Python130、Node8、真实Electron14项均通过且无跳过；契约逐字一致、类型/构建和隔离库重复upgrade/current/check通过，head=0005_model_limits；迁移证据research-trail-verify-xF4kxS。仅既有Starlette/TestClient httpx弃用提示1条，未升级依赖。
- 干净源码复验：bun run verify:clean实际退出0，99份源码文本导出至仓库外research-trail-clean-EHqwpe/clean source，不复制Git、依赖、构建和运行数据；按锁定清单新安装71个前端包、28个Python包并准备Electron。副本完整130/8/14、契约/类型/构建/迁移再次通过；自身根CMD完成选股→会话→行情→取消→关闭/重启历史，快照相同、无新运行、所属进程退出，证据research-trail-cmd-qa-RpUvr8。安装可复用缓存，不称无工具机器/空缓存验收。此后仅更新发布文档，未改变运行代码。
- 本机真实模型：只读配置检查返回CONFIGURED_REQUIRES_EXPLICIT_RUN、0请求，确认用户已在本机配置；没有打印Key/地址/模型ID或索要聊天凭证。按第9步“配置后用少量请求验证一次真实工具调用”原授权实际执行verify_live --run一次，返回passed、completed、requests_started=2、tool_results=1、event_count=8、market_source=fixture；同一Python适配器/AgentRunner/工具/事件链完成选择工具→执行→回传模型→回复。证据库在仓库外research-trail-live-qa-3o_7wqwl，日常库只读、不枚举账户/凭证，不上传临时库或回复。未重试或追加收费评测。成功仅覆盖当前本机配置的一次模型工具循环，不代表真实行情/账户。
- 发布候选审核（文档更新前）：99份文本889477字节，24项本地Markdown链接/围栏、9项秘密/运行/WAL/账户/截图/依赖/虚拟环境/构建忽略探针通过。常见密钥签名/二进制/运行产物无标记；实际本机已配置Key的字节未出现在候选源码或真实验证DB/WAL/SHM；声明与HEAD逐字相同，git diff --check通过。按明确路径提交，运行库、账户数据、日志、缓存及所有截图不上传。扫描是辅助审核，不等于完整安全认证。
- 未验证：外部真实认证失败/限流/超时/阻塞取消只模拟覆盖；所有兼容服务商/模型、费用账单、外部TLS/DNS阻塞取消、Responses/增量流、真实行情/账户、其他OS、安装包/无工具机器/空缓存、长时并发/全部极端崩溃未验证。用户亲自操作/练习保持待填。远程CI与PR/合并结果依据后续实际GitHub查询，不能用本机成功推定。

发布准备完成。仅在最终PR head全部检查通过、无未解决讨论与合并阻塞后，按本轮授权普通merge保留提交、fast-forward本地main；最终链接、SHA和CI由Git/GitHub及发布回执核实。

已创建 [第9步PR #8](https://github.com/ydflow/research-trail/pull/8)，base main、head feat/step-9-openai-agent、非draft。初始head=2fe844cf5552134d0826e951a3df720ee8969275；保留Python新实现0fa115348bf1dd1a6eaa616ee563151c9002c71e、桌面接入8bb3b21abdea236ee8f0f66874a3a261230106f7、来源与验收文档2fe844cf5552134d0826e951a3df720ee8969275，作者ydflow与实际提交时间2026-10-05 20:57:12 +08:00。推送/创建前均重新核验账号、目标与origin，无账号切换；本次只补PR链接与记录，不改运行代码。初次查询MERGEABLE、reviews及未解决讨论为空，push/pull_request两项Windows Actions仍运行，不提前记作CI通过。最终head检查见 [PR #8 checks](https://github.com/ydflow/research-trail/pull/8/checks)，最终合并与main同步由实际Git/GitHub及本轮回执确认，不在本文虚构自身合并SHA。


## 26. 第10步：Longbridge SDK、只读CLI缺口与Massive模拟验收（2026-10-05）

用户本轮只授权第10步开发，并回复“尚未配置，先完成模拟验收”。基线main/HEAD=e9c2350de2ed4973f45dd207ff9fa24104a8f74e（第9步PR #8普通合并），开始时工作区干净；仓库规则、路线/证据及实现已读取。开发默认不提交/上传；没有实施第11步、修改标签/Release或启用定时付费评测。本节不改写第9步此前未配置与后来少量真实模型验证的历史记录。

### 实现、来源与覆盖

- 固定Folio ba5dcdfd31b162f5edb8b908f7f099a560389326：读取providers/longbridge/adapter.ts 16项、broker.ts 5项、massive/adapter.ts 3项及longbridge-tools的参数/JSON正规化，逐项 [覆盖表](PROVIDER-COVERAGE-step10.md)记录当前SDK支持、缺口CLI、收窄参数及真实缺口。没有复制原TS业务内核、账户样本或作者历史。本步Python适配、设置、契约、迁移和测试为新实现；桌面是新增薄验收面板，不整体导入Folio页面。现有来源/版权/第三方声明及用户确认授权第9—11节保留，未独立核验原始授权，不宣称全仓MIT。
- 核对当前官方包已由longport改名longbridge，实际安装并锁定5.2.0，读取已安装openapi.pyi和运行时方法；仅新增此Python依赖，Bun/frontend锁文件未改。官方Python API现已支持FundamentalContext/ContentContext/MarketContext/CalendarContext，未把新SDK已有财报/新闻/状态错误地判作CLI缺口。保留依赖 [NOTICE](third-party/longbridge/NOTICE)及官方仓库main原样LICENSE-MIT/LICENSE-APACHE；wheel未附许可元数据/文件，记录分发核验边界，不上传SDK二进制或声明整个项目许可。
- 新provider_contracts/ProviderSettings/0006_data_providers：Longbridge行情、Longbridge只读账户和Massive独立非敏感配置、系统凭证UUID、修订号；三项SDK凭证一束/单项Massive Key只由Python WindowsCredentialVault保存。无读回KeyAPI、环境凭证或明文回退；先写新系统条目后提交UUID、失败清理。旧设置/资料/会话/运行/事件不改，已有旧库迁移与重复迁移检查通过。
- ProviderService按显式mode选自主模拟或真实，固定capability枚举，状态按provider/capability/revision独立，不扩散一次成功。默认真实行情延迟未知，自行声明时效保留user-declared依据，不证明实时权限。Provenance包含fixture/sdk/cli/http、mode、fetched_at/served_at/market_time、缓存与权限。成功只证明请求能力；模拟只能标simulated。
- SDK_METHODS为19种只读方法；TradeContext仅stock_positions/account_balance/cash_flow。SDK缺完整账户身份/组合，以及symbol日历过滤、独立financial分类、特定年份/季度report时，采用Python CLI参数数组，shell=False、longbridge.exe绝对路径、代码/日期/周期/count白名单与auth status前置检查。修正基线calendar实际分组list/infos，以及portfolio的overview.total_asset/market_cap/total_cash、market_accounts和holdings，不把错字段变成虚假零值；金融JSON仅投影必要数据。项目不执行CLI安装、登录、刷新或交易命令；外部CLI原有OAuth存储/内部续期不由研迹管理，真实兼容性未验证。
- Massive沿基线三能力，httpx请求固定api.massive.com REST，Key仅Authorization头；US股票、无重试/重定向/环境代理、无host或模型回退。LastTrade缺失不能用日线假充实时；K线检查时间/有限OHLC/量/重复时间。401/403/429、SDK已核对错误码、网络/超时/异常响应固定安全码，供应商正文/异常/stderr不入API/日志/诊断。
- SDK和Massive真实读取放在所属Python worker，凭证stdin、argv/env无Key、256KiB输出与1—60秒总时限；受控进程超时/取消回收，Windows Job Object绑定新子进程，后端异常结束也回收进程树，新增实际父进程强退回归通过。此为生命周期保护，不宣称OS网络隔离。CLI前置检查与查询共用总预算。
- 行情只有进程内≤128键、TTL≤300秒缓存；账户不缓存、不落库、不进诊断。配置/凭证变更、删除重建及系统凭证外部移除会清除旧状态/缓存；缺凭证先于缓存检查。命中保留获取时间，更新服务时间；过期真实请求失败不回退旧缓存或模拟。各能力状态重启后未验证，不伪称持久健康证明。
- Electron/preload扩为37项命名白名单，新增7个提供商设置/凭证/能力/只读查询操作；main验证来源及provider ID，只有只读query本机请求上限65秒以覆盖Python总时限，其他操作保持3秒上限。ProviderPanel默认模拟，保存/删除凭证后密码清空，切提供商/能力/mode后清除旧结果及过期响应；显示真实/延迟/历史/缓存/受限/未配置错误。现有Agent工具仍为原Fixture，不提前移植完整市场/组合工作台。
- verify_data默认只读日常库指定provider与对应系统条目，不枚举凭证；--run才执行一次quote/positions SDK或HTTP业务查询（SDK初始化另有握手），不运行CLI、不缓存/写库，不输出价格、账户、持仓、Key或URL，仅安全结果与查询数。三项只读配置检查均not_executed/PROVIDER_UNCONFIGURED/queries_started=0；没有真实供应商请求，也未使用已配置第9步模型Key。

### 实际验证与修正

新增Python95项模拟契约/生命周期通过：24提供商能力模拟、19 SDK调度与实际版本方法/枚举、日期历史参数、CLI只读argv/身份/组合/分组日历/报告JSON及未登录零业务查询、Massive3假HTTP/认证/权限/限流/超时/异常/大小/US边界、输入拒绝与密钥反射、系统凭证保存/删除/回滚/数据库非敏感、独立状态/行情缓存/账户无缓存、外部凭证移除先于缓存、所属进程超时/取消/溢出/父进程强退回收、只读验证入口0查询默认与1查询显式预算。MockTransport/Fake SDK context/CLI executor不是外部服务验收。

首次测试中修正市场状态的market_time分组不能当价格时间、SDK事件测试应使用无symbol的Report路径、HTTP头占位Key应使用ASCII，以及超大参数ID导致Windows临时路径异常；后续加强凭证前置缓存检查，删除配置后必须重新保存凭证才测试网络失败，不放宽正确缺凭证结果。最初桌面exact-label查询因select的隐式标签包含option文字而超时，补显式aria-label后通过；新增CLI实际基线JSON回归。早期失败没有记作最终通过，未修改固定价格来迎合预期。

最终代码完整check.cmd（离线guard、本机通信）退出0：Python225/Node8/真实Electron15全部通过、无跳过，契约一致性/类型/构建及0006_data_providers重复迁移/current/check通过。最后回执临时库research-trail-verify-3WY5oj；此前一轮research-trail-verify-TwSP0j通过后又补强凭证外部移除/删除重建回归并重跑，不以旧结果代替最终结果。仅既有Starlette/TestClient/httpx弃用提示1条，未为提示换依赖。

Electron新增流程：模拟quote成功且仅单项模拟通过→切真实未配置零外部请求→保存配置缺凭证→Windows临时占位凭证保存/清空/删除→换账户模拟持仓（assets未验证）→换Massive模拟；1100×800与600×680，标题研迹 · ResearchTrail、file:///.../apps/desktop/dist/renderer/index.html、非空/无overlay/无console warning或error/无横向溢出，交互及实际所属退出通过。Browser plugin not available，按已读取frontend-testing-debugging采用项目已有Playwright Electron；截图只在系统临时research-trail-step10-qa，已读取宽/窄图，无新增浏览器依赖，截图不进源码。

未验证：真实Longbridge/Massive请求/数据/权限/外部限流和异常、实际SDK网络握手与真实阻塞取消、CLI版本兼容及其原有OAuth存储/内部续期、完整分页/批量与所有报告参数；安装包/其他OS/干净无工具机器/本步干净源码新装、远程CI/长期负载、用户亲自清单/练习。用户无凭证不是权限受限；权限受限只在假响应中证明错误分支。交付 [第10步本机清单](ACCEPTANCE-step10.md) 与tutorial C06/practice练习后停止，不提前实施第11步。


最终范围检查：19个已有文件修改、21个新增文本文件，共40项，均属于本步SDK/CLI/Massive、设置/查询/契约/迁移/回归、来源和交付文档；此前上游组件、原Agent/Fixture、Bun锁文件、旧第三方声明无差异。本轮120份候选源码文本、34个本地Markdown链接、9项.env/运行库/WAL/账户/日志/私密截图/依赖/构建忽略探针检查无异常，密钥签名与二进制/账户产物未发现；签名扫描只是辅助审核。首次ignore探针的Windows文本stdin带CR造成路径引用问题，改NUL分隔精确检查全部9项通过，没有改忽略规则放宽标准。git diff --check通过，仅已有文档CRLF→LF提示；index为空、main/HEAD仍e9c2350de2ed4973f45dd207ff9fa24104a8f74e。Python/Electron项目进程读查无残留；测试Windows原生凭证全部占位值/独立命名空间并清理。截图、临时库/日志/缓存均在仓库外。ROADMAP记验收通过（模拟/本机自动），全部真实数据验证仍未执行；本轮无提交、GitHub写入、标签或Release，完成第10步后停止。

## 27. 第10步发布复验与PR交付（2026-10-05）

用户独立授权仅发布已验收第10步，真实改动分类提交功能分支/PR，全部检查通过且无未解决阻塞时普通merge保留提交并同步main。本节是发布轮次，第26节开发事实保留。不实施第11步，不打标签/创建Release/定时付费评测，不补写用户亲自操作或学习记录。

- 基线：本机main、origin/main和GitHub main均e9c2350de2ed4973f45dd207ff9fa24104a8f74e（第9步PR #8）。实时gh api user=ydflow；现有目标为公开/非fork/非归档ydflow/research-trail，默认main，origin fetch/push均https://github.com/ydflow/research-trail.git，项目历史一致。未发现开放PR或同名feat/step-10-data-providers远程分支；正常新建该功能分支，不覆盖/删除无关仓库、不强推。每次GitHub写入前重新核对身份/目标/remote。
- 差异：19个已有文件修改、21个新增，共40项；仅提供商/只读账户、配置/凭证/状态/缓存、生成契约/迁移/回归、桌面入口、来源和验收文档。旧Agent与Fixture、上游局部组件、Bun锁文件、旧第三方声明无差异。120份候选UTF-8文本/9项忽略探针及常见密钥签名/禁传产物审核通过，扫描仅为辅助检查。按明确路径暂存，系统凭证/日常库/账户/日志/缓存/截图/依赖二进制均未纳入。
- 来源与责任：沿用第9—11节用户确认的原作者复用授权记录，未独立取得授权原文，不宣称全仓MIT。固定Folio参考版本ba5dcdfd31b162f5edb8b908f7f099a560389326仅核对能力/CLI语义；没有新TS核心或账户数据导入。Longbridge上游两份许可与NOTICE单独提交（仅保留声明，不伪称源代码导入或wheel分发许可已确认）；Python新实现、桌面接入、文档分别提交。真实修正包含在相应实现中，没有编造独立修复提交、上游作者或开发时间；作者ydflow/noreply，使用实际当前时间。
- 发布轮完整check.cmd退出0：Python225、Node8、真实Electron15全部通过、无跳过，契约/TS/构建及临时库两次upgrade/current/check通过，head=0006_data_providers。临时迁移research-trail-verify-j0GkL2；仅既有TestClient/httpx弃用提示1条。新增95项Python/1项Electron及旧取消/恢复/工具链严格回归均保持。
- 干净源码verify:clean退出0：120份源文本导出至系统临时research-trail-clean-jIZSUY/clean source，不复制Git/依赖/构建/运行数据；锁定新装71前端/29Python包（longbridge 5.2.0）并准备Electron，完整225/8/15、契约/类型/构建/0006重复迁移再次通过，临时迁移research-trail-verify-n6m2Cp。根CMD实窗选股→会话→行情→取消→关闭/重启历史通过，保存快照一致、无新运行、所属进程退出；独立证据research-trail-cmd-qa-pNlKFg。下载可复用本机缓存，不称空缓存或无工具机器。之后仅追加发布文档，运行源码未变。
- 验证边界：所有供应商验收为模拟SDK/CLI/HTTP与本机通信，原生凭证测试仅临时唯一命名空间/自造占位值并清理，不使用已配置模型Key。真实Longbridge/Massive数据/权限/错误/SDK握手阻塞、CLI OAuth存储/续期与版本兼容、完整分页/批量报告参数、用户亲自操作/练习、安装包/其他OS/长期负载仍未验证。未配置不当作权限受限，单项成功不扩散到其他连接/能力；真实失败不回退模拟。公开不包含私人持仓/账户或敏感截图。

PR与Actions结果以本轮实时查询及最终回执为准。合并前核对最终head/base、全部检查、review与未解决讨论；只有没有阻塞且最终head通过才普通merge、fast-forward本地main。最终合并SHA不在本文预写自身结果。

发布分支已创建 [PR #9](https://github.com/ydflow/research-trail/pull/9)，base main、非draft、初始head e4b87c79dc20b41739d89873692d1ce5d1ec378c。40项差异与四个分类提交核对：上游依赖声明7ac8a323f955598522414be8ab3f843ce2fff02d、Python新实现fde2625b15a695b602d31ccec16ecc972c5b11bf、桌面接入218cde38bdb070c93300d9face0faf02ce10e5ec、验收文档e4b87c79dc20b41739d89873692d1ce5d1ec378c；实际作者ydflow/noreply、当前时间。本次另补PR记录提交，不改变运行源码。

创建后Windows Actions已启动，尚在运行，不提前记作通过；仅最终head的全部检查通过且无未解决阻塞才合并。最终Actions见 [PR #9检查](https://github.com/ydflow/research-trail/pull/9/checks)，最终提交/检查/合并与本地main同步由实时Git/GitHub及发布回执核实，不在本文预写自己的合并SHA。

## 28. 第11步：证券工作台与持久自选（2026-10-06）

按用户当前第11步指令先读规则、路线、来源及实现，业务根D:\folio\research-trail，初始main/HEAD ae1759229f477bb59103c6fd818cba1dd9c074be、工作区干净（第10步普通合并基线）。沿用用户此前“尚未配置，先完成模拟验收”选择；不读取已配置第9步模型Key、不请求真实行情/账户/模型。本节仅本机开发与自动验收，不做Git暂存/提交/远程写入、不扩展报告/组合/交易或第12步。

### 上游观察与逐页适配

只读Folio固定ZIP commit ba5dcdfd31b162f5edb8b908f7f099a560389326，来源https://github.com/helsome/folio，参考目录D:\folio\主分支和简历skill\folio-main；没有修改参考。沿用第9—11节用户确认的原作者复用授权，未独立取得授权原文，不把skills/LICENSE作为整仓MIT。新逐文件注释保留上游URL/版本/路径与适配责任，旧出处与第三方LICENSE/NOTICE不删除。以下是局部界面/信息流移植与重新适配，不是原样导入全部组件，也不移植TS client/atoms/业务内核。

| 固定上游路径（相对packages/ui/src/components） | 本项目路径（相对apps/desktop/src） | 适配与有意差异 |
| --- | --- | --- |
| workspace/FinanceWorkspace.tsx、SecurityHeader.tsx；stock/Watchlist.tsx | renderer/securities/SecurityWorkspace.tsx | 证券上下文、页签、自选增删行；Python持久化替代atoms/client；移除组合/研究入口 |
| workspace/OverviewView.tsx | renderer/securities/SecurityViews.tsx: OverviewView | 资料/估值指标卡，缺失—；不估算年内区间、不引入组合统计 |
| workspace/SecurityHeader.tsx；agent/structured/QuoteCard.tsx | 同上: QuoteView、MarketStatusView | 价格/统计、证券市场后缀；保留原始市场状态及时间，不推断权限或交易时段 |
| workspace/ChartView.tsx | 同上: ChartView；renderer/market/FinancialKLineChart.tsx | 复用此前带出处图表适配，增加period和来源标签；真正canvas loader依旧消费Python bars |
| workspace/FinancialsView.tsx | SecurityViews.tsx: FinancialsView | 财务表格/卡片扩为IS/BS/CF报告DTO，报告期/币种逐行保留；不补零、无跨币种合计 |
| workspace/NewsView.tsx | SecurityViews.tsx: NewsView | 原来源链接列表，缺时间/链接—；无当前时间/主页URL兜底、无HTML渲染 |
| stock/Watchlist.tsx | SecurityViews.tsx: WatchlistView | 单股票行情卡与选择入口，每组4只，各自来源与错误 |

未新增前端/后端依赖，Bun/uv锁定文件无差异。SDK仍锁定Longbridge5.2.0；代码核对发现NewsItem运行时存在而openapi.pyi遗漏声明，provider_normalize.sdk_fields补充id/title/description/url/published_at及三种计数的明确白名单，未开放__dict__、Config或异常。属性由本机运行时描述符及官方[Python引用](https://longbridge.github.io/openapi/python/reference_all/)、[内容类型源码](https://longbridge.github.io/openapi/cpp/types_8hpp_source.html)核对；契约测试注入假ContentContext，未执行SDK网络。

### Python新实现与桌面调用链

- 新workspace_contracts、WatchlistStore、SecurityWorkspace与workspace_normalize；Pydantic extra=forbid、证券代码/提供商/周期/页码白名单。0007_security_workspace只增watchlist与security_workspace，保留旧会话/profile/提供商配置。Python按BEGIN IMMEDIATE事务串行管理最多20只、有序/去重/一次种子/清空不复种/当前选择/revision，删当前回退第一只或空。名称来自原四股票catalog，其他代码不编公司身份。
- 页面→preload六个命名操作（共43）→main IPC来源校验→BackendManager带启动令牌→五个/workspace API→Python ProviderService。只有openNewsSource属于main显式HTTP(S)链接操作；页面不能访问文件/系统凭证/进程或任意本机URL。新闻校验禁止自定义协议、嵌入用户密码、空白控制字符/反斜线，保留合法原URL而非重新生成。
- 七视图复用Step10 SDK/只读CLI/Massive适配与配置/凭证/缓存/能力健康链；自选每页≤4独立quote、概览profile/valuation、其他单能力，最多4并发。无账户查询/写入、无新增Agent工具，旧规则/真实模型工具仍为原Fixture。Massive profile/quote/kline支持，其他明确UNSUPPORTED_CAPABILITY。NO_DATA→missing；部分成功保留独立失败，不扩散成功或真实失败回退模拟。
- DTO仅含显示字段，不返回供应商raw字典。缺数字/时间/报告期/币种为None/—，数值0保留；拒绝非有限数/非法OHLC/重复bar时间/错股票，未知整数交易状态显示代码及含义未知。市场状态元数据选对应市场时钟，不当作quote时间；缺发布时间不补现在，原新闻链接与来源保留。各块统一来源、mode/transport、时效及依据、缓存、市场/fetched/served时间。
- 桌面SecurityWorkspace持久状态仅从Python读取，UI mutation队列保持意图顺序；revision/generation/query key及回包身份阻止迟到跨股票/页/提供商数据。换上下文清除显示，真实模式只在按钮显式请求，重启默认模拟。模拟自造新闻与年度财报/固定日线均显著标注，不证明其他周期真实能力；missing/failure/delayed夹具仅offline启动注入，产品API无假成功开关。

### 实际验收、修正与限制

新增Python29项：7×3 API矩阵、持久/清空/重复/上限/并发、自选分页、真实未配置0执行/部分受限无模拟回退、Massive缺口、原URL/缺时间/非法响应、真实SDK运行时白名单、API鉴权与敏感输入不回显、旧0006库升级历史/profile/config不变。另新增Electron4项包含7×3 UI矩阵和上下文流程，原225项Python/15项Electron严格保留；此前仅迁移head预期更新到0007。

首次pytest从根误运行导致导入失败，改为后端cwd/离线环境；首个新测试错误假设NVDA/MSFT初始顺序，修正测试以保留原Fixture顺序。随后新增29+原Provider95共124通过；Step11定向实窗4通过。第一个完整check.cmd 254/8/19通过后实际截图发现“移除”继承158px全局宽度，将股票挤竖排；修正此局部按钮为44px并增加实际证券代码盒宽≥70/高<30断言，补窄窗口内容截图，没有降低断言或改数据迎合测试。

修正后的最终check.cmd退出0：Python254、Node8、真实Electron19全部通过无跳过；契约一致性、TS、构建、0007两次upgrade/current/check通过。最终临时迁移证据research-trail-verify-maZR87；上一完整轮research-trail-verify-0Gts1f为修正前，不代替最终结果。只有既有Starlette/TestClient/httpx弃用提示1条，不因此擅自升级依赖。

Electron实窗标题“研迹 · ResearchTrail”、URL file:///.../apps/desktop/dist/renderer/index.html，1100×800与600×680，非空、无overlay、无相关console warning/error/pageerror与横向溢出。实际交互：七视图/三态→画布实际代码收盘→新闻点击保留原URL（shell.openExternal桩、不外网导航）→延迟AAPL/选择NVDA不串数据→周线actual loadedPeriod→添加700.HK缺失→跨页/会话离开重入→Massive不支持→真实未配置→关窗/同库重启保持选择/自选→删除当前回退。所有所属测试进程退出。Browser plugin not available，采用已有Playwright Electron，未装新浏览器依赖。

截图在系统临时research-trail-step11-qa，宽概览/新闻/财报缺失/行情失败及窄新闻首区域和内容截图已读取复核，不入仓库。缺数据、失败与成功画面各有独立存档；不是用户亲自验收或真实数据截图。交付README/ROADMAP、[第11步清单](ACCEPTANCE-step11.md)、tutorial C06新展开与practice练习，用户回答保留。

未验证：真实供应商请求/数据/权限/时效/财报周期/新闻内容及外部错误，CLI实际兼容、完整分页/全部字段、长期缓存/并发负载、用户亲自操作与练习、干净源码重装、其他OS/安装包、远程CI。无凭证标未执行，不能标为权限受限；受限只用模拟响应分支证明。本步与现有模型是独立数据链路，不能称模型已能调用这些新增证券视图工具。交付完成后停止，第12—24步未开始。

最终范围复核：22项已跟踪修改、12份新增文本，共34项本步骤源码/契约/迁移/测试/交付文档；仓库外PROJECT_STATE仅增最新回执、保留历史。132份候选文件均UTF-8文本，本地Markdown链接无缺失，9项NUL分隔密钥/数据库WAL/账户/日志/私密截图/依赖/构建忽略探针通过，常见密钥签名/禁传产物扫描无异常（仅辅助审核）。git diff --check通过，Bun/uv锁文件、原Agent及Fixture文件、第三方声明无差异；main/HEAD仍ae1759229f477bb59103c6fd818cba1dd9c074be、index为空。项目Python/Electron/Node进程读查无残留。本轮没有安装依赖、提交、推送、PR、标签、Release或定时评测。

## 29. 第11步发布复验与PR交付（2026-10-06）

用户独立授权仅发布已验收第11步，真实改动分类提交、功能分支/PR，最终检查通过且无未解决阻塞时普通merge保留提交并同步main。本节是发布轮，第28节开发轮事实保留；未实施第12步，不打标签/创建Release/定时付费评测，不代填用户亲自清单或学习回答。

- 发布前实时核对gh api user=ydflow，现有目标公开/非fork/非归档ydflow/research-trail、默认main，origin fetch/push均https://github.com/ydflow/research-trail.git；本机main/HEAD、origin/main与GitHub main均ae1759229f477bb59103c6fd818cba1dd9c074be（第10步PR #9），属于本项目。开放PR为空，同名feat/step-11-security-workspace远程分支不存在；正常新建该功能分支，不覆盖/删除无关仓库、不强推，每次外部写入前重新核对账号/目标/remote。
- 实际34项差异（22修改/12新增）仅证券七视图/持久自选/Python投影、0007迁移、白名单通信/图表/新闻链接、契约/三态与上下文测试、来源/验收材料。132份UTF-8候选文本、42本地Markdown链接、9项NUL忽略探针、常见密钥签名与禁传产物审核无异常；git diff --check通过。签名扫描仅辅助，不读取系统真实凭证。日常库/WAL/账户/持仓/日志/缓存/截图/依赖/构建均不纳入。
- 来源沿用第9—11节用户确认原作者授权及本轮发布指令，固定Folio ba5dcdfd局部UI适配保留第28节映射及逐文件出处，旧LICENSE/NOTICE不删除；未独立取得授权原文，不宣称Folio全仓MIT。没有原样导入上游历史或伪造上游作者。009b2d8d316eff21639dc4486e508dcbeca22e29为既有SDK NewsItem投影修复；7456ef41b435d8fc349e494300954fed399e0aa3为Python新实现/迁移/契约/测试；cbca4929f7135e4f1e814f95eb635c0c7c9cbdd8为Folio局部界面适配/桌面接入/实窗回归。文档另提交，作者ydflow/noreply、实际当前时间，无Git作者或日期环境覆盖，不制造未发生的独立修复历史。
- 发布轮check.cmd退出0：Python254、Node8、真实Electron19无跳过，契约/TS/构建/临时0007两次upgrade/current/check通过，临时迁移research-trail-verify-DR4g2h。只有既有TestClient/httpx弃用提示1条；原225/8/15与新增29 Python/4 Electron保持严格回归。宽/窄截图在系统临时research-trail-step11-publication-qa并读取复核，不上传，标题/URL/非空/无overlay/console错误/横溢出与实际交互通过；新闻native open桩无外网导航。
- 干净源码verify:clean退出0：132份源码导出到系统临时research-trail-clean-fI6gJY/clean source，不带Git/依赖/构建/运行数据；锁定新装71前端/29Python包（SDK5.2.0）并准备Electron，完整254/8/19、契约/类型/构建/0007重复迁移再次通过，临时迁移research-trail-verify-8YDIP5。根CMD实窗选股→会话→行情→取消→关窗/同库重启历史通过，同快照/无新运行/所属进程退出，证据research-trail-cmd-qa-WoxUmi。下载可复用本机缓存，不称无工具机器或空缓存；之后只补发布文档，运行源码不变。
- 验证边界：均模拟响应或本机协议，未发送真实行情/账户/模型请求，未读取已配置模型Key；Windows原生凭证测试仅独立临时占位值并清理。真实供应商数据/权限/时效/外部错误/财报周期/新闻内容、CLI实际兼容、完整分页/长期负载、用户亲自操作/练习、其他OS/安装包仍未验证。未配置不称受限，真实失败不回退模拟，单项成功不扩散。

最终PR head/base、Actions、review与未解决讨论须合并前实时核对；只有最终head通过、没有阻塞才普通merge并fast-forward同步本地main。PR及最终合并结果由实时Git/GitHub与发布回执确认，不预写自身文档提交的合并SHA。


已创建[第11步PR #10](https://github.com/ydflow/research-trail/pull/10)，base main ae1759229f477bb59103c6fd818cba1dd9c074be、非draft，初始head f77dc799c562eb8f62af9a8f6303c634bd65133c。四个分类提交及34项差异已与远程核对；文档提交f77dc799c562eb8f62af9a8f6303c634bd65133c。创建后Windows push/PR Actions已启动，尚在运行，不能先记通过；本次仅补PR链接文档，不改运行源码。最终检查见[PR检查](https://github.com/ydflow/research-trail/pull/10/checks)，最终提交/检查/合并与本地同步以实时Git/GitHub和发布回执为准。

## 30. 第12步：Python组合、CSV与只读账户（2026-10-06）

用户本轮明确“继续做第12步”，接续的是原第12步范围；不是此前发布模板或第13步的实施授权。读取AGENTS、ROADMAP、EVIDENCE、当前源码及外部PROJECT_STATE，实查main/HEAD b52936a4241ab7a96f58f36389afb063e248ad20、工作区干净、已发布基线仅第11步；此前第12步只有读取/准备，不能当已实现或已验收。本轮交付未提交源码、index为空，无GitHub写入/标签/Release/定时评测，不实施风险或股票对比/研究/交易功能。

### 来源、适配与Python新实现

固定Folio ZIP来源ba5dcdfd31b162f5edb8b908f7f099a560389326，https://github.com/helsome/folio；只读参考D:\folio\主分支和简历skill\folio-main。延续EVIDENCE第9—11节的用户原作者复用授权确认；没有独立获得原始授权文件，未宣称全仓MIT，未删除已有版权/第三方声明。

| 参考源码 | 本步落点与修改 | 责任边界 |
| --- | --- | --- |
| packages/ui/src/components/portfolio/PortfolioCard.tsx、HoldingRow.tsx、ImportDraftReview.tsx | PortfolioPanel.tsx局部保留摘要→持仓→显式预览/确认结构，文件头保留URL/路径/版本；React/CSS按现有项目适配，不引入Jotai/i18n/lucide/Tailwind或原client | UI适配；没有移植研究按钮、饼图的跨币种合计、风险/截图导入或TS业务内核 |
| packages/shared/src/portfolio-import/parsers.ts；packages/core/src/account.ts、portfolio-import.ts | 只读参考领域/草稿边界；portfolio_contracts、portfolio_csv、portfolio_calculate、PortfolioService及0008三表为Python新实现 | 严格统一七列CSV，不宣称覆盖原全部格式/模糊代码清洗；数值不交给JS/LLM |
| 研迹Step10 ProviderService/account.positions/account.assets | 复用已有只读Python适配；显式并发两个真实模式查询、无缓存，无凭证/受限/失败不回退 | 假SDK契约验证，不证明真实账户权限与数据 |

无依赖或锁文件更改；必要组合组件按需加载。App/preload/main增加七个命名操作，总桥50项。CSV文件在页面按UTF-8读取文本，main仅接收受限文本/UUID和固定操作；renderer仍无Node/文件路径或任意后端URL权限。

### 确定性计算、状态与存储

- Decimal使用64位上下文，每持仓成本=数量×成本单价、市值=数量×估值单价、未实现盈亏=市值−成本；非零成本时计算百分比到6位小数，零成本百分比为None。输入数量/单价非负、现金可负；不支持空头、税费/已实现收益/时序收益率。输出十进制字符串，React只显示。
- 按币种独立计算现金/成本/市值/盈亏/资产，不提供FX或全币种总值。缺现金行不是0；缺任一持仓价格则完整市值/资产为None/—，保留已知市值小计与已估值数量。没有用账户net_assets倒推价格；提供商报告净资产单独展示。
- 初次创建CSV空组合、手算模拟和OpenAPI只读别名，各有独立账户ID与组合ID；最多20个组合。模拟手算初始2股×100成本、120估值、现金100，固定样例时钟2024-01-16T21:00Z。模拟组合导入CSV仍为模拟账户，但来源变CSV、市场时间为None；撤销至内置样例才恢复固定来源/时钟。CSV真实性未核验，保存时间与市场时间区分。
- UTF-8/BOM标准CSV、七列顺序可调但不能未知/重复列、≤128KiB/100条，符号/币种/普通十进制严格验证；非法/行内重复阻止整批确认。原文不进日志/诊断/数据库，解析后仅存规范化草稿到Python有界内存，≤8份/10分钟，同组合新草稿替代旧草稿。
- 指纹基于规范化、排序后的完整快照，识别行序/BOM/2.0与2的重复；确认核对归属、revision、有效期与已应用指纹。BEGIN IMMEDIATE内原子保存替换快照、前态/批次，並发仅一次成功；可撤销最新导入并沿批次链接逐次恢复，revision递增，旧预览不能确认。重启CSV/模拟持仓及撤销链保留，草稿不保留。
- 0008_portfolios增加portfolio_accounts/portfolios/portfolio_imports三表，保留旧会话/profile/提供商配置；运行库、导入文件均本机私有，.gitignore增加*.csv。真实只读持仓/余额仅内存，不落库；仅别名元数据入库。配置revision变化或重启后须重新主动查询。
- 只读账户在Python和UI均拒绝导入/确认/撤销；不自动刷新或猜测多账户身份。真实缺必需字段、负持仓、重复通道/现金币种或超限返回INVALID_RESPONSE，不混模拟。真实失败/未配置/受限明确显示。页面key+generation防旧组合回包覆盖；无新增Agent工具。

### 本轮实际验证与修正

新增Python35项，新增实窗Electron3项：手算/小数/0/缺失/现金/不同币种，14种非法行与CSV上限/表头/重复行、规范化重复导入、独立账户/只读拒绝、最新批次撤销/重启/有效期/revision、并发仅一次确认、模拟CSV来源与撤销时钟、假SDK真实账户链/受限/失败/配置失效/内存不落库、鉴权/输入不回显/诊断无持仓、旧0007迁移保留与模型一致性。实窗用内存自造CSV上传→预览不持久→确认→重复/非法禁止→多币种/缺价格→撤销，完整应用关闭/重启保持、只读未配置、独立组合与迟到响应。

第一次定向pytest调用未用python -m导致导入错误，改为仓库约定命令后34通过；类型检查发现生成契约的默认provenance可省略，按可选数组处理后通过。首轮完整pytest只有旧证券迁移测试仍期待0007，更新预期为0008，保留其旧会话/profile/config不变断言。第一完整统一轮288/8/22通过（临时migration research-trail-verify-iUXoUi）；随后审查模拟组合CSV来源与预览保存时间，修正为CSV来源/无市场时间，撤销回内置再恢复，预览不显示旧保存时间，新增第35项回归。

最终check.cmd退出0：Python289、Node8、真实Electron22全部通过、无跳过；OpenAPI/TS一致、前端类型/构建、0008两次upgrade/current/check通过。最终隔离迁移目录research-trail-verify-tQCrlF，位于Temp；测试不操作日常运行库或用户实际凭证。只有既有TestClient/httpx弃用提示及Vite主chunk略超500KiB构建提示，不隐藏警告或为此升级依赖，性能/负载未验证。

实窗1100×800与600×680，标题“研迹 · ResearchTrail”、file:///.../dist/renderer/index.html身份、非空、无框架overlay/相关console error/warn或横向溢出；实际截图已查看（入口、预览、确认摘要、窄窗多币种及只读未配置）。发现组合侧栏全部同色，修正当前选中样式后最终整轮复验。新闻/证券与旧事件链完整回归保持。Browser plugin not available，按frontend-testing-debugging技能使用已有Playwright/Electron，无新浏览器依赖。截图只在Temp/research-trail-step12-qa，不入源码。

文件/隐私审核：源码清单只含源码、测试、文档与已有锁文件；未复制CSV原文件、账户/凭证、运行库/WAL、日志、缓存/截图。忽略探针使用NUL输入避免Windows CRLF被Git当作文件名尾字符；最初换行探针失败是审核脚本输入问题，改NUL重核，不改忽略规则来掩盖问题。最终142份UTF-8文本、49个本地Markdown链接、8项NUL忽略探针、秘密签名/禁传产物及git diff --check全部通过；index保持空，项目所属服务无残留。

未验证：真实Longbridge账户/数据/权限/多通道实机兼容、行情/模型请求、任意券商CSV、长期大量导入/备份恢复、其他OS、安装包、干净源码新装与远程CI，用户亲自清单和练习仍待填写。未配置不等于权限受限。交付操作/边界见ACCEPTANCE-step12.md；C07及practice按真实代码展开，不代填答案。第13—24步未实施。

## 31. 第12步发布复验与公开范围（2026-10-06）

按用户本轮独立授权仅发布已验收第12步，不实施第13步。本轮读取ROADMAP/ACCEPTANCE-step12/EVIDENCE第30节与实际差异；基线main b52936a4241ab7a96f58f36389afb063e248ad20。实查GitHub账号ydflow、既有公开非fork非归档仓库ydflow/research-trail、默认main、origin fetch/push均https://github.com/ydflow/research-trail.git，远程main与本地基线一致，尚无重复开放PR。每次GitHub写入前再次实时核验，不切账号、删除、强推或绕过保护。

29项本步差异（19修改、10新增）审核通过，142份UTF-8源码、49个本地Markdown链接、8项NUL忽略探针、秘密签名/禁传产物和git diff --check通过。仅本步骤源码、契约、测试及文档；锁文件、既有Agent/Provider实现、第三方许可证和工作流无变化。未上传密钥、账户/持仓、CSV原文件、运行库/WAL、日志、缓存、依赖/构建或截图。固定Folio ba5dcdfd来源与第30节局部适配范围、用户原作者授权确认保持；没有独立取得授权原文，不将全仓改成MIT。

提交按真实改动区分，使用当前ydflow/noreply及正常时间，无作者/日期覆盖：
- 10a71f18d5cc0df89a40ccccdce854ba79e66776：隐私修复，忽略本机CSV文件。
- 9ea49694d3e95a35f1d11a349eb66d38a34f6088：Python新实现，组合Decimal计算、CSV/草稿/事务确认/撤销、0008与严格账户隔离。
- 02d219c5c95089cf8d2d4c9630d13dd948490b53：Folio必要UI局部适配及Python桌面桥/实窗验收，不伪装为上游原始作者或导入Git历史。
- 发布文档提交记录本轮验证；自身SHA及最终PR/merge由Git与发布回执核对，不在提交中循环引用。

发布check.cmd完整Python289、Node8、真实Electron22无跳过，契约/TS/构建、0008重复upgrade/current/check通过；隔离迁移证据research-trail-verify-Gkv3kb。干净源码research-trail-clean-MtGNY0/clean source导出142份源码、按锁新装71前端/29Python（Longbridge5.2.0）并准备Electron；完整289/8/22再次通过，迁移证据research-trail-verify-kGMkUG。根CMD选股→会话→行情→取消→关闭/重启历史通过，同一保存快照、无新运行、所属进程退出，证据research-trail-cmd-qa-adEElC。下载可复用本机缓存，不声称无工具/空缓存机器安装。只有既有TestClient弃用与Vite约500KiB主chunk构建提示，无检查失败，不擅自升级依赖或降低断言。

发布截图仅Temp/research-trail-step12-publication-qa和clean-publication-qa；已读1100×800/600×680实际图，页面身份/非空/无overlay/相关console错误或横溢出、预览/保存/撤销/重启/多币种/缺价格/独立账户链通过。原第11步三态与模型/事件/取消链完整回归，未调用真实模型/行情/账户，也未读取日常凭证。Browser未安装，沿用已有Playwright/Electron。

后续仅推送feat/step-12-portfolios、创建对应PR，实时检查最终head/base、全部远程检查、review和未解决讨论；通过无阻塞才按匹配head普通merge保留提交并同步main。此处为推送前文档，不把尚未执行的远程CI、合并或同步写成通过。已有v0.1.0标签object 3dd216557cdc81ac8fc35b14e0585dc43731be86、解析至第7步716543305ba5d74f57336c589c4b2dffaf6e3592；本轮不打标签/创建Release或定时付费评测。

未验证：真实Longbridge账户/权限/多通道和行情/模型、任意券商CSV、长期历史/负载与备份恢复、其他OS/安装包、用户亲自清单/练习。远程CI与最终PR/merge状态见实时GitHub及外部PROJECT_STATE发布回执。第13—24步未实施。

已创建[第12步PR #11](https://github.com/ydflow/research-trail/pull/11)，base main b52936a4241ab7a96f58f36389afb063e248ad20、非draft，初始head db534b001efe80886f7d93df4079c526c34dcdc9。四个真实分类提交与29项差异已推送核对，创建后push/PR Windows检查已启动、当时尚未完成。本次仅补PR链接，不改运行源码；最终head检查见[PR检查](https://github.com/ydflow/research-trail/pull/11/checks)。最终提交/CI/merge及本地同步以实时Git/GitHub及外部PROJECT_STATE发布回执核验，不虚构当前文档提交自身SHA。

### PR启动等待失败、修复与重新验证

head 48d442abf05cf000cb0cf6f106e64aaeb7de4029的[push检查](https://github.com/ydflow/research-trail/actions/runs/37451485093)通过，但[PR检查](https://github.com/ydflow/research-trail/actions/runs/37451490242)失败，未合并。失败日志确认Python289/Node8/契约/类型/构建/0008通过，Electron21通过、1失败：旧Step11提供商失败案例在等待“连接就绪”时用尽Playwright默认5秒，截图DOM仍为“正在连接/启动中”。第12步三项均通过；这不是业务失败被模拟替代。

BackendManager允许Python就绪15秒，再轮询健康接口5秒，单次健康请求上限2秒。测试修复5656c7a0cc0875105535db0535bef7db063a5bc1新增共享waitForBackend，仅启动/重试就绪断言限时25秒，保留健康标题的严格要求及失败DOM诊断；业务断言保留默认5秒，缺Python/迁移失败断言保持原样。没有改应用启动期限、自动重跑整套用例、跳过断言或新增下一步能力。

定向成功/缺失/失败三态3项通过。随后重新导出143份源码至Temp/research-trail-clean-00SmBR/clean source，按锁新装71前端/29Python并准备Electron；完整离线Python289、Node8、Electron22全部通过、无跳过，契约/类型/构建及0008重复upgrade/current/check通过。隔离迁移research-trail-verify-gLrUuQ；根CMD选股→会话→行情→取消→关闭/重启恢复通过，快照相同、无新运行、所属进程退出，证据research-trail-cmd-qa-jRrsKi。129份代码/配置/锁文件逐字节匹配本次干净源码，文档追加独立于运行源码；仅既有TestClient/Vite提示。

本步骤最终差异增加为31项，源码143份UTF-8，49个本地Markdown链接与8项忽略探针、秘密签名/禁传产物、空index及差异空白审核通过。新截图仍只在Temp，账户/密钥/CSV/运行库等未进入提交。修复后重新推送，让新head接受push/PR检查，不能沿用旧head的push成功抵消其PR失败；最终远程检查、普通merge与本地main同步以实时GitHub及外部发布回执确认。

## 32. 第13步风险与股票对比开发验收（2026-10-06）

用户当前单独授权开发第13步，完成后停止。先读AGENTS/ROADMAP/EVIDENCE/第12步清单与实际实现；仓库根D:\folio\research-trail、main/HEAD/origin/main 3359c38bb23ae44ae7edd36f8b44d7d969a2a43c，进入时工作区及index为空。此为第12步PR #11已普通合并的本机基线，历史第31节发布状态保留；本轮没有GitHub写入、提交/推送或发布，也不执行第14步。

### 来源、适配与Python新实现

只读参考Folio ba5dcdfd31b162f5edb8b908f7f099a560389326的packages/shared/src/portfolio-risk/service.ts与compare/service.ts、packages/core同名DTO，核对实际Top1/Top5/HHI、六类风险信号及13项对比指标。必要UI仅参考packages/ui/src/components/portfolio/PortfolioRiskPanel.tsx与components/compare/CompareTable.tsx的摘要/输入/缺口和表格结构，Python/React文件保留出处；新写AnalyticsPanel/Results适配现有桥和生成契约，未导入全套原UI/TS业务内核或AI摘要依赖。保持既有来源及第三方声明、用户原作者授权确认与未独立持有授权原文的边界，不自行改全仓MIT。

新增analytics_contracts/analytics_calculate/analytics.py：Decimal纯计算、分币种风险报告、严格日线样本/窗口、2—4证券固定13行对比、缺失/非法/权限/期间状态、25秒/4并行有界读取及30秒/32项内存快照。风险估值取组合输入，不用其他来源补价格；同币种缺任一估值不缩小分母，现金不进持仓权重。行业、事件、新闻和价格历史各有缺口；事件7天/新闻过去7天按模拟固定时点2024-01-16T21UTC或真实分析时点判断。组合波动明确当前权重每日再平衡/252日假设，不是账户历史业绩；20根峰值回撤不是最大回撤。不同币种无FX合计。

对比固定价/市值/PE/PB/营收增长/毛利率/ROE/股息率/1M/3M/1Y/评级/动量；财务直指标需指定Annual年度和币种，TTM分列，重复期间与不齐序列拒算；不从缺字段猜值/补零/评分。当前模拟仅10根日线，默认四证券partial、12/52已知；完整13行由固定260根协议数据验证。为1Y仅扩大kline count至260，其他count仍100，原序列化列表上限1000已足够；官方历史K线文档支持count上限1000（链接见ACCEPTANCE-step13）。SDK仍5.2.0，未改依赖/工作流/迁移（仍0008），未发真实请求。

HTTP /analytics/risk与/compare、portfolio.risk与stocks.compare共用app.state.analytics；ToolRegistry恰有四个注册只读工具，参数schema/返回kind/股票或组合身份均校验。FakeModel仅解析新意图并格式化Python摘要；OpenAI模拟响应沿同工具/事件链返回报告，系统提示明确模型不计算数值。页面与保存工具卡复用Results，30秒内相同输入/版本命中同snapshot_id和calculated_at；refresh/revision/提供商版本变化失效。工具事件保存当时完整报告，重放不调用模型/行情。主动真实模型分析会发送所请求组合工具事实，README与清单明确；不会上传真实组合至Git或诊断。

新增两项命名IPC，桥共52项，renderer只能请求固定业务接口；分析结果/组件按需加载，前端不计算第二份数值。输入/视图变化递增generation，迟到结果不覆盖新选择；分析只由按钮启动，默认模拟，风险页不自动刷新真实账户。未查询只读账户failed/unverified与空仓可区分；模拟账户用真实行情/真实账户用模拟行情明确SOURCE_MISMATCH且不发查询。

### 检查经过与最终结果

新增Python37项首先通过，后补7项严格阈值/Top5边界与1项HTTP多币种/缺估值/现金，共45项。手算600/400市值：0.6/0.4、Top1=0.6、Top5=1、HHI=0.52；固定100→110→99与100→90→99，单股日样本σ=0.14142136、组合日σ=0.02828427。覆盖空/0/NaN/Inf/布尔/非法代码/坏或重复日线/缺口/不齐日期、报告币种/期间/重复匹配、提供商失败/权限/未配置/预算，以及HTTP/Fake/OpenAI模拟同报告与保存重放。

初次统一检查7失败/319通过：5项旧假模型范围提示缺原NVDA K线示例、1项旧市场参数错误提示不含“股票参数”、1项OpenAI白名单预期仍只有两个工具。恢复旧示例/错误文案，白名单精确更新为四个已注册工具；保留非法/交易工具拒绝与原边界断言，61项Agent/模型定向回归通过。实窗新案例初次3项因测试调用不存在capture函数失败（迟到响应案例已通过），修正为项目已有screenshot函数；四项重新通过，没有降低业务断言。

最终check.cmd退出0：Python334（基线289+45）、Node8、实际Electron26（基线22+4），无跳过；OpenAPI/生成TS契约一致性、类型、main/preload与renderer构建、隔离库重复upgrade/current/check全部通过，0008_portfolios(head)、No new upgrade operations。证据Temp/research-trail-verify-dtA3Sg。只有既有TestClient弃用和Vite主chunk501.54KiB提示，分析页面/结果已分块，未为提示升级依赖或调高阈值掩盖。

最终差异复查发现公开列表上限本来为1000，开发时字典字段上限200→260的改动并不需要；恢复原200边界，provider_normalize最终无差异。其后analytics与providers定向140项通过，无跳过，包含260根列表、响应边界与原提供商回归；其余运行源码与完整检查时一致。文档同步纠正为仅扩大kline查询count，不把字典上限误写成数组上限。

四项实际Electron测试：自造CSV保存→风险手算→API/假模型工具同快照→共享结果卡、四股票/600×680窄窗/重复输入清旧结果；Python注入缺失响应；提供商NETWORK_ERROR失败；旧风险700ms/新对比10ms到达[1,0]后不串页。Windows已有Playwright/Electron，无Browser技能/插件或新增依赖。实际1100×800/600×680截图已查看：非空/无错误overlay/相关console异常/页面横溢出；缺指标为—，失败读状态与缺失输入区分，来源/方法可展开。截图在Temp/research-trail-step13-qa，CSV/数据库/截图不入Git。统一回归还验证第1—12步健康/设置/提供商/组合/SSE/取消/重启，均离线业务数据与假响应。

验收覆盖、公式/方法限制、来源和本机操作见[ACCEPTANCE-step13](ACCEPTANCE-step13.md)，真实源码调用链见tutorial C08；practice保留用户既有回答并补一个小改动与三题，亲自操作/学习记录待填。

最终源码/隐私审核：152份UTF-8文本、54个本地Markdown链接、8项NUL忽略探针、秘密签名/禁传产物和git diff --check通过；32项本步差异（23修改/9新增），index为空，项目所属Python/Electron/Node等进程读查无残留。仅源码、契约、测试、文档，CSV原文件、账户/凭证、运行数据库/WAL、日志、缓存/依赖/构建与截图未入Git。HEAD仍3359c38bb23ae44ae7edd36f8b44d7d969a2a43c，本步没有提交SHA。

未验证：真实Longbridge/Massive/CLI数据和权限、sector/财务直接字段/consensus/事件映射、真实模型风险/对比、本轮干净源码新装/远程CI、长期负载/其他OS/安装包。现有Agent单工具默认2秒可能先于分析25秒预算超时，保留TOOL_TIMEOUT；真实性能未验证。运行中的有界提供商线程沿已有超时退出，返回快照不纳入迟到数据。不把历史真实模型quote成绩当成本步真实验收。第13步仅本机开发交付，完成停止。

## 33. 第13步发布复验与公开范围（2026-10-06）

用户本轮独立授权仅发布已验收第13步，失败先修复，不实施第14步。读取第32节、ACCEPTANCE-step13、ROADMAP与实际32项差异；基线main 3359c38bb23ae44ae7edd36f8b44d7d969a2a43c。实时核验gh当前账号ydflow、既有公开非fork非归档ydflow/research-trail、默认main、origin fetch/push均https://github.com/ydflow/research-trail.git、远程main同基线且没有重复开放PR；仓库历史/文件与研迹一致。每次外部写入前再次核验，不切账号、删除、强推或绕过保护。

152份源码/文档UTF-8、54个本地Markdown链接、8项NUL忽略探针、秘密签名/禁传产物与git diff --check通过。32项仅本步源码、契约、测试、文档；不含密钥、真实账户/持仓、CSV原文件、运行库/WAL、日志、缓存、依赖/构建、截图。保留固定Folio来源和第32节局部适配范围、原作者授权确认及第三方声明，未独立取得授权原文，不宣称全仓MIT。提交将按真实差异区分Python新实现、Folio必要UI适配、修复及验收文档；当前ydflow/noreply与正常开发时间，不伪造上游导入历史或作者/日期。

### 发布审查发现阈值舍入问题并修复

发布前审查复现：单仓权重0.150000000001显示0.15后遗漏中风险，0.250000000001显示0.25后错误为中风险；回撤略高于0.2/0.35时同样漏报/降级。新回归4项在修复前失败。沿相同路径核对动量，略低于5%的收益先舍入为5导致误判强，微小负收益先舍入为0导致符号判断错误；追加2项回归，修复前均失败。未把该问题留待下一步或降低断言。

修复保留Decimal完整权重/回撤/价格收益用于分类，8位小数仅输出展示；抽出同一drawdown函数供数值与风险判断，动量使用对齐后原始收益，不从显示字符串反算。指标/阈值、业务范围与契约不变；新增6项回归后analytics51项全部通过。发布完整复验及新干净源码以修复后实际源码为准；修复前334/8/26检查只作为历史，不能代替新head验收。远程CI、PR/普通合并与同步状态将在对应操作实际完成后记录，当前不虚报。

### 修复后最终本机与干净源码验收

修复后check.cmd退出0，Python340（289基线+51本步）、Node8、实际Electron26全部通过，无跳过；OpenAPI/TS一致性、类型、main/preload/renderer构建、隔离0008重复upgrade/current/check通过，证据Temp/research-trail-verify-BfMwSd。干净源码Temp/research-trail-clean-9HMbWE/clean source导出152份源文件，按锁新装71前端/29Python（SDK5.2.0）并准备Electron；完整340/8/26再次通过，无跳过，迁移证据research-trail-verify-A2m1l7。根CMD股票→会话→行情→取消→关闭重启→历史恢复通过，同一保存快照、无新运行、所属进程退出，证据research-trail-cmd-qa-tHupNE。137份非Markdown运行源码/配置/锁文件逐字节匹配该干净源码；后续仅发布文档增补。下载可能复用本机缓存，不宣称无工具/空缓存机器验收。

发布截图仅Temp/research-trail-step13-publication-final-qa与clean-publication-final-qa；1100×800/600×680真实截图已查看，手算风险、Agent同快照/共享结果卡、四股票/重复输入清旧结果、缺失/NETWORK_ERROR和迟到风险不覆盖对比通过。没有blank、错误overlay、相关console异常或页面横溢出；缺失指标仍—。未使用真实模型/行情/账户、未读取日常凭证；Browser不可用，沿用已有Playwright/Electron。仅既有TestClient/Vite提示，无依赖/工作流/迁移或后续能力变化。

真实分类提交（当前ydflow/noreply、正常时间）：

- 082e55016b509b692a2133a5bc1733ffbd23dcfa：Python新实现、生成契约、注册工具和模拟协议测试。
- cf218184a19f3d069b84ca898f54b7d6ce30ef00：修复未舍入阈值/动量判断，6项先失败后通过的回归。
- 1a8e09d9753c2c608e87f3291026b5dbcd092f24：固定Folio必要UI局部适配、Python桥、共享结果卡和实际Electron验收，不伪装为上游原始提交/作者。
- 发布文档提交记录来源、方法限制、开发/修复/发布验证及未验证事项；自身SHA与最终PR/merge由实际Git与回执确认，不循环引用。

仅推送feat/step-13-analytics，创建对应PR后核验最终head/base、全部远程检查与review/未解决讨论，全部通过无阻塞才按匹配head普通merge并同步main。既有v0.1.0标签object仍3dd216557cdc81ac8fc35b14e0585dc43731be86，Release非draft/非prerelease、assets0；不打标签、创建Release或定时付费评测。

尚未验证真实Longbridge/Massive/CLI数据、权限及字段映射、真实模型风险/对比、长期负载、其他OS/安装包和用户亲自操作/练习。远程CI与合并由实际GitHub检查和外部PROJECT_STATE发布回执确认，不把本机检查当远程通过。第14—24步未实施。

已创建[第13步PR #12](https://github.com/ydflow/research-trail/pull/12)，base main 3359c38bb23ae44ae7edd36f8b44d7d969a2a43c，初始head 2a3e727ebd4baedd43064f9cfe450dc605a5ca1b，四个真实分类提交已推送。创建后远程检查当时尚未完成；本次仅补PR链接，不改运行源码，最终head全部检查与普通merge结果见[PR检查](https://github.com/ydflow/research-trail/pull/12/checks)及外部PROJECT_STATE发布回执。文档补充提交自身SHA由实际Git核对，不循环写自身SHA。


## 34. 第14步能力注册与技能目录本机验收（2026-10-06）

用户只授权执行第14步，交付后停止。起点D:\folio\research-trail、main/HEAD/origin/main 3198f106edaf81c19a93084e805e3c9888dabd85，工作区/index为空。先读取AGENTS、ROADMAP、第32—33节及已有工具/数据/模型/桥/设置/迁移。没有下一步、GitHub写入、提交/推送/发布；HEAD保持该基线。

Python新写CapabilityRegistry、SkillCatalog及安全frontmatter/资料读取，参考固定Folio ba5dcdfd31b162f5edb8b908f7f099a560389326的registry.ts、readiness.ts、SkillHub index.ts与capability-map.ts设计，不运行原TS业务内核。工具规范移入单一TOOL_SPECS，ToolRegistry仅作协议/执行适配；现有21数据ID/24提供商条目沿同SUPPORTED。应用启动只有同一个registry由tools、providers、skills引用，ProviderService原health/revision是唯一健康存储；资料启用偏好只新增0009_skills，不另存ready。

首批原字节导入skills/longbridge-technical和longbridge-market-data的29份Markdown，以及skills/LICENSE（MIT，Copyright 2026 Longbridge Inc.）。声明/原文保留，30份SHA256核对，依赖映射按固定capability-map.ts提取，记录其SHA256；来源见[SOURCES-step14](SOURCES-step14.json)及[技能说明](../skills/README.md)。不把局部许可说成全仓MIT，原作者授权确认与未独立取得授权原文的边界沿用第9—11节。

导入后的本地链接审查发现4个上游原始断链：quote.md的references/calc-index-fields.md，以及elliott-wave.md的references/fibonacci.md、wave-structure.md、market-environment.md。固定参考skills全目录未找到对应文件，未修改原文或补假文件。catalog按原相对路径记录optional-resources，来源清单列明4条；两技能显示partial，缺失按钮禁用，直接读取返回RESOURCE_MISSING。行情技能另有7项未实现可选能力，显示NOT_IMPLEMENTED；必要依赖缺失仍unavailable，不因partial伪装全方法可用。

SkillCatalog.list只解析SKILL.md并检查声明文件存在，参考正文按需读取；禁用/缺必需/文件消失在读取边界重查。路径拒绝../、绝对/UNC、反斜杠、ADS、尾点空格、符号链接/目录联接，Windows核对打开后的文件句柄实际路径；只读UTF-8、64KiB、最多64技能/40必要及40可选依赖/80资源，不执行脚本、CLI、交易或网络链接。四项新命名桥，总56项；前端类型从OpenAPI生成，SkillsPanel按需加载，generation防止迟到结果跨视图覆盖。

Agent显式技能/能力状态和资料读取由Python响应，不调用模型；禁用/缺依赖读取失败。可识别的不可用技能或声明能力ID请求直接返回不可用；普通模型系统消息带当前模式、必要/可选依赖和资料缺口。真实技能未配置或没有当前revision真实请求证据不就绪；旧market工具仍仅模拟，risk/compare的Python计算可调用不证明真实输入已齐全。原第8步技能假连接卡明确标为历史配置探针，不参与目录就绪。

测试覆盖注册表对象同一性、动态工具暴露/decode拒绝、开关重启保留、必要/可选缺能力、文件不存在/非法UTF-8/过大/未声明、Windows越界与真实目录联接、frontmatter重复/危险标签/未声明依赖、模式与提供商、配置revision/凭证/权限状态同源、Agent拒绝且零模型请求、模型上下文及移除工具后的规则提示。真实状态测试使用自造Vault/健康记录，未发真实服务请求。

初次完整检查366通过/4失败：四处旧升级测试仍预期0008，实际为新0009；只更新最新版本预期，保留历史/外键/模型一致性断言。修复后完整370/8/28通过。初次新桌面缺文件案例的响应注入误用了fetch，而业务使用node:http，因此未命中；改为项目既有命名IPC注入，未改业务断言，两项定向实窗通过。缺文件实际服务端由Python临时目录验证，页面注入不称为真实业务请求证据。

最终源码check.cmd退出0：Python370（基线340+新增30）、Node8、真实Electron28（基线26+新增2），无跳过；OpenAPI/TS契约一致、类型、main/preload/renderer构建、隔离0009重复upgrade/current/check及No new upgrade operations通过。最终日志C:\Users\38905\AppData\Local\Temp\research-trail-step14-acceptance.log；迁移隔离目录research-trail-verify-YMwwLw。仅既有TestClient弃用及Vite主chunk提示，未安装/更新依赖或工作流。真实窗口截图仅Temp/research-trail-step14-qa，1100×800/600×680；已查看资料宽窗与缺依赖窄窗，修复新增导航窄窗文字挤压（自然换行）及资料按钮间距。来源断链就绪修正后再次跑同一统一离线验收，不新增依赖或降低断言。

范围和CMD操作见[ACCEPTANCE-step14](ACCEPTANCE-step14.md)，实际调用链见tutorial C09，可撤销练习和三题见practice C09，用户答案保留。真实模型/行情/账户/权限与指标策略执行、长期负载/其他OS/源码新装/远程CI/安装包和用户亲自操作未验证；本轮完成后停止，不实施第15步。

最终文件审查：194份UTF-8、75个可访问本地Markdown链接、4个已登记且原样保留的上游断链、30份上游原字节SHA256、8个现有受保护路径忽略探针以及秘密签名/禁传产物通过。开发时git diff --check只覆盖已跟踪差异；发布阶段将新增资料纳入后发现10处上游原有行尾空格，保留原字节并登记于SOURCES-step14.json，第35节补全检查范围。截图3份最终已查看，窄窗导航自然换行、资料按钮有间距，无页面横溢出/错误overlay或pageerror。工作改动仅本步源码/契约/测试/资料/文档，index为空；HEAD仍3198f106edaf81c19a93084e805e3c9888dabd85，没有提交/发布或第15步。

## 35. 第14步发布复验与公开范围（2026-10-06）

用户独立授权发布已验收第14步，检查失败先修复，不实施第15步。读取第34节、验收清单、项目规则与实际差异；起点main 3198f106edaf81c19a93084e805e3c9888dabd85。实时核验gh账号ydflow、既有公开非fork非归档ydflow/research-trail、默认main、origin fetch/push均https://github.com/ydflow/research-trail.git，远程main同起点，无重复开放PR。每次外部写入前再次核验身份和目标，不切账号、删除、强推或绕过保护。

本轮仅本步骤源码、契约、测试、技能资料及文档。公开范围沿第9—11节用户原作者复用授权确认及本轮上传授权；没有独立取得授权原文，不声称整个Folio或研迹全仓MIT。首批资料29份Markdown及skills/LICENSE按固定上游原字节保留，MIT Copyright 2026 Longbridge Inc.原声明与30份SHA256保留；catalog依赖映射记录原路径/版本。4个上游断链保留并以partial/OPTIONAL_RESOURCE_MISSING呈现；未伪造指标或缺失资料。只使用当前ydflow/noreply作者及正常提交时间，不伪造上游作者、导入历史或开发时间。

### 发布审查修复

依赖列表的四空格缩进、两空格后夹四空格、空列表块可能漏读必要能力，列表中空行也使后面的options.chain被漏读；4个API/状态回归在修复前失败。现按安全frontmatter子集消费完整列表块，允许空行，不支持的缩进与空块返回invalid/INVALID_SKILL，空依赖须明确[]；正确列表中的未实现必要能力为unavailable，Agent无法读资料或称就绪。另以80项最长合法依赖复现直接状态回复7222字符，超过既有4000回复约束；第5个回归先失败，修复保留状态及真实性限制，截断明细并指向技能页完整列表。35项技能测试全部通过（开发30+发布修复5），无模型或真实业务请求。首次定向命令缺PYTHONPATH导致收集失败，补项目路径后再执行，未计作业务测试结果。

### 完整验收与隐私审查

修复后check.cmd退出0：Python375（原基线340+本步35）、Node8、真实Electron28，无跳过；OpenAPI/生成契约一致性、类型、main/preload/renderer构建、隔离库0009_skills重复upgrade/current/check及No new upgrade operations通过。日志Temp/research-trail-step14-publication-check.log，迁移目录research-trail-verify-Rg6LSp。仍有既有TestClient弃用和Vite主chunk提示，未改依赖、工作流或下一步。桌面两项Step14覆盖资料/禁用/Agent拒绝/重启偏好和缺文件/迟到资料；缺文件真实后端拒绝由Python临时目录验证，桌面该分支是命名IPC注入。

194份UTF-8源码/文档、75个可访问本地Markdown链接、4个已登记上游断链、30份工作文件及Git blob原字节SHA256、8项现有受保护路径忽略探针通过；秘密签名/禁传产物无发现。运行库/WAL、真实账户/CSV、密钥、日志、缓存、依赖/构建及截图未入Git。10处上游行尾空格在SOURCES-step14.json逐行登记保留；自写/适配文件diff检查及全部文件未登记空格审查通过，不能表述全量git diff --check无输出。

隔离源码新装bun run verify:clean退出0：导出194份可审文件至Temp/research-trail-clean-7jLQoa/clean source，无Git/依赖/构建/运行资料；按锁文件新建安装71项前端/29项Python依赖及Electron准备。安装准备可联网，业务验收仍由离线护栏限制loopback。同一完整375/8/28和契约/类型/构建/0009检查全部通过、无跳过，迁移目录research-trail-verify-CFrNP9；随后实际根CMD开窗、股票→会话→quote→取消→关闭重启/历史恢复通过，快照一致、无新增运行、自有进程全部退出。证据Temp/research-trail-step14-publication-clean.log及research-trail-cmd-qa-ykjoEE；截图只在Temp。141份运行源码/契约/测试/配置与该导出逐字节一致，导出后仅补文档。不将源码新装视作另一台干净机器或安装包验收。

### 真实分类提交

- dea2f02834d2e526671f32d5d7bccb63806aaa4a：原样导入固定Folio技能文本与许可。
- 8ac7df2aac2cb6fd6ca339c647f8d465da92cf41：Python能力注册/目录/API/迁移与生成契约、30项原开发测试；4处旧迁移测试只更新最新版本预期。
- 51a5c0951ce2d17128831c286d5c5e42a22c01db：Electron命名桥、技能页面与两项桌面回归。
- 896bd72baec5fd3abc5c0023ee564ae57faa6e69：本轮发布审查发现的依赖解析/状态回复修复与5项回归。
- 发布文档提交记录来源、验收和边界；自身SHA与最终PR/普通merge由实际Git和外部PROJECT_STATE回执确认，不循环写自身SHA。

尚未验证真实Longbridge/Massive/CLI数据、账户权限/字段映射、真实模型技能/风险/对比、实际指标和研究策略执行、任意自定义技能质量、长期负载、其他OS/安装包、用户亲自操作/练习。远程CI和合并必须按最终head的实际GitHub检查确认，不能由本机验收代替。第15—24步未实施；不新增标签、Release或定时付费评测。

## 36. 第15步Python研究策略与结构化采集（2026-10-07）

用户当前授权仅第15步，完成交付后停止。起点D:\folio\research-trail、main/HEAD
67fb0c2628ec2a8c2172aac582dbeff016e8d627（第14步PR #13合并），工作区及index为空，
origin为https://github.com/ydflow/research-trail.git。先读取项目规则、路线、第34—35节及
现有注册表、技能、提供商、存储、股票入口和白名单桥。本轮没有GitHub写入、提交、推送或发布，
不执行第16步。日期按用户客户端Asia/Shanghai记录，业务时间仍由实际查询/存储产生，不修改时钟。

### 来源与真实改动

Python新实现ResearchService、ResearchStore及契约/迁移0010_research；引用应用同一
CapabilityRegistry、SkillCatalog、ProviderService。采集直接调用现有ProviderService.query，
不复制SDK/CLI/HTTP/fixture或Agent数据访问代码，不运行原TS内核。
固定Folio ba5dcdfd31b162f5edb8b908f7f099a560389326的presets.ts八种策略技能/能力列表及顺序
逐项核对一致：全面16、价值4、成长3、技术面5、财报3、事件驱动4、风险复核4、稳健收益4。
策略/研究planner与runner供编排参考，ResearchPanel、StrategyPicker及其中进度/能力列表作必要UI适配，
中文名称来自zh-CN/research.ts；不导入原合成器、提示、状态atoms或业务service。
七份参考文件SHA256、适配目标和完整映射见[SOURCES-step15](SOURCES-step15.json)。

第14步技能及许可30份原字节保持一致，未扩大技能导入范围。固定映射引用的13个技能仅2项已导入，
其余11项为missing/SKILL_NOT_IMPORTED；既有技能禁用、依赖和上游断链继续如实显示，未伪装ready。
本步选择技能目录引用并保存状态，不执行或读取技能正文；独立可用数据能力仍能采集。
禁用技能不会删掉其他页面共享的数据能力，采集完成不证明技能指标、投资评分或分析报告实现。
原作者复用授权确认沿第9—11节，未独立取得授权原文；skills/LICENSE局部MIT及版权声明保留，
不把全仓声明为MIT。本轮没有新的原样技能资源导入或第三方依赖。

### 执行与存储证据

默认最多4项物理调用，API允许1—4，公开单项限时固定20秒；每个后端/数据库只接受一个活动研究。
计划保存股票、模式、提供商、策略、配置revision、技能/能力状态及ReadQuery。分发重查注册表和revision；
配置变化后的未启动项固定CONFIG_CHANGED，不将新配置混入计划。公共查询增加可选请求停止标记及预算，
原调用者行为保持；SDK/CLI/HTTP沿原适配器，单次真实运输预算至多20秒，配置原值不改。
取消只停止本研究，超时/关闭/重启和迟到返回有明确状态。非协作调用继续占槽，不无限替代；
已超时且占满槽位经过1秒清理宽限，排队项EXECUTOR_DRAINING，旧调用退出前拒绝新任务。
没有声称任意线程或真实HTTP调用瞬间退出。

research_runs原子保存计划，research_steps逐项保存执行状态/错误码/时间及成功ProviderSuccess。
仅协调器写研究结果，终态不覆盖；3成功/1失败为partial，零成功failed，全部成功collected；
取消为cancelled，关闭/重启未完成为interrupted，已有成功项不丢失。重新读取历史及成功数据零查询，
也不创建Agent run。元数据与按项数据读取分开，列表最近100项，沿公共256KiB结果限制。
取消/超时停止标记防止迟到返回更新公共健康；不设置ProviderService全局停止来影响其他页面。
启动清理未完成状态不等于续跑，没有检查点恢复、报告/证据综合、Research Diff、导出或调度。

研究页由Python提供策略列表，股票上下文来自现有证券入口；计划预览不写库、不查数据；
最多4项采集进度、逐项错误、取消、已保存任务和按需结果显示已接入。新增7项命名IPC，共63项；
参数白名单、股票/UUID/能力路径限制、后端令牌及发送者校验保留；无任意文件或URL接口。
前端OpenAPI类型生成，不维护第二份策略业务映射，视图清理和generation防迟到覆盖。

### 验收与修复记录

新增Python27项、Electron5项。首轮研究测试17通过/8失败：market.sentiment和market.status是地区查询，
原ReadQuery不接受股票参数；修正计划参数适配为symbol=None，未放宽查询契约或改fixture。
修正后当时25项研究测试全通过；再补2项假SDK预算/取消健康回归，最终全套包含27项新用例。
另一次从根目录手动pytest为401通过/1失败：原SDK子进程用受限环境，不继承该命令临时PYTHONPATH，
根cwd不能导入后端模块，导致既有缺凭证测试返回PROVIDER_ERROR。改用项目check.cmd既定backend cwd
与离线护栏后402项全通过；未改子进程环境隔离或降低测试断言。

Python覆盖8策略、对象同一、预览零执行、技能缺失/禁用、Massive缺能力与真实未配置、部分/全失败、
1/4实测并发、配置变化、单项/全部超时、物理槽位/新任务拒绝、取消/关闭/重启、鉴权与非法输入、
假SDK预算及公共健康隔离。超时缩短仅应用测试注入，产品不能传timeout_seconds。
Electron实际后端验证MSFT股票入口、16→4计划与8选项、保存来源及同库重启无新执行、3/1与0/4故障，
实际延迟fixture调用取消后3项成功保留、迟到结果不写回及槽位释放后可新建任务。
只有迟到计划分支通过命名IPC延迟实际Python计划响应验证页面竞争，不称为真实提供商证据。
离线故障fixture扩展仅OFFLINE=1启用，不增加产品场景切换。

最终check.cmd退出0：Python402（原375+新增27）、Node8、真实Electron33（原28+新增5），无跳过；
OpenAPI/生成契约一致、类型、main/preload/renderer构建、隔离0010重复upgrade/current/check及
No new upgrade operations通过。日志Temp/research-trail-step15-acceptance.log，迁移目录
research-trail-verify-eSu0N2。此前Step15定向5项实窗也通过。仅既有TestClient弃用与Vite主chunk提示，
没有更改依赖、锁文件或CI工作流。五份截图仅Temp/research-trail-step15-qa，1100×800/600×680均已查看；
无横向溢出、相关pageerror或错误overlay，失败与取消不显示采集成功。

最终来源/隐私/文件审查：207份UTF-8可审文件、85个可访问本地Markdown链接、8个受保护路径忽略探针通过；
固定八映射及七源SHA256、30份技能原字节及Git blob一致，
四处已登记上游断链和十处上游行尾空格保留；自写/适配文件无新增行尾空格、秘密签名或禁传产物。
运行库、日志、缓存、账户、凭证及截图仍忽略，未入index。范围/CMD操作见
[ACCEPTANCE-step15](ACCEPTANCE-step15.md)，真实链和可撤销练习/三题见tutorial/practice C10。
用户回答保留，操作/学习未代填；HEAD保持起点。本轮未执行真实模型/行情/账户/权限或真实超时取消、
长期负载、其他OS、源码新装、远程CI、安装包及用户亲自操作；第16—24步未开始，完成后停止。

## 37. 第15步发布复验与公开范围（2026-10-07）

用户独立授权仅发布已验收第15步，不实现第16步。读取规则、路线、第36节、验收清单及实际37份差异。
起点main 67fb0c2628ec2a8c2172aac582dbeff016e8d627。实时核验gh账号ydflow、公开非fork非归档
ydflow/research-trail、默认main及origin fetch/push均https://github.com/ydflow/research-trail.git；
远程main同基线，无同名分支或开放PR，不创建重复仓库、切账号、删除、强推或绕过保护。

公开范围按第9—11节原作者复用授权确认及本轮明确上传授权；未独立取得授权原文，不将全仓标MIT。
固定Folio ba5dcdfd七份参考源SHA256、八策略技能/能力ID及顺序再次核对一致，适配目标存在。
原技能29份Markdown及LICENSE、版权声明与30份SHA256/Git blob保持一致；本轮未新增原样资源导入。
207份UTF-8可审文件、85个本地Markdown链接、8个受保护忽略探针通过，秘密签名/禁传产物无发现；
4个上游断链和10处原行尾空格保留。待上传仅本步源码、生成契约、测试、来源/验收/课程文档。
密钥、真实账户/CSV、运行库/WAL、日志、缓存/依赖/构建及截图未纳入提交。

完整check.cmd退出0：Python402、Node8、实际Electron33，无跳过；OpenAPI/生成契约、类型、
main/preload/renderer构建及隔离0010_research重复upgrade/current/check和No new upgrade operations通过。
日志Temp/research-trail-step15-publication-check.log，迁移目录research-trail-verify-aLE5Th。
新增5项Step15均通过，旧功能回归保留。暂存检查发现两个新增Python文件末尾多余空行，规范后完整
本步提交差异git diff --check通过，bun run check再通过；业务逻辑未改，没有新增失败业务用例或单独修复提交。
既有市场温度/状态查询参数修正在第36节如实记录，包含于Python新实现，不伪造中间故障提交。

隔离源码bun run verify:clean退出0：207份文本导出至Temp/research-trail-clean-HavoCF/clean source，
无Git/依赖/构建或运行资料；按锁文件安装71项前端/29项Python及Electron准备。同一完整402/8/33、
契约/类型/构建/0010检查全部通过，无跳过，迁移目录research-trail-verify-mblhIt。实际根CMD
股票→会话→quote→取消→关闭重启→历史恢复通过，同一保存快照、无新运行、自有进程退出；
证据research-trail-cmd-qa-1uWVKi，日志Temp/research-trail-step15-publication-clean.log。
150份运行文件中148份与导出逐字节一致；另两份仅上述EOF空行规范，去除末尾换行后字节及Python
AST一致。导出后其他变动仅发布文档，不将缓存可复用的源码新装称为另一台空白机器或安装包验收。
本轮没有业务修复、依赖或工作流变更；既有TestClient弃用和Vite主chunk提示保留。
发布截图只在Temp/research-trail-step15-publication-qa及clean-publication-qa，宽窄布局与失败状态已查看，
无横向溢出、错误overlay或相关pageerror，0成功/4失败明确采集失败。

真实分类提交（当前ydflow/noreply、正常提交时间）：

- 17b89c267f8e0e746e37682b558a5ccfcec2a0fc：固定八种策略在Python中的必要适配、契约与来源清单，不称为原样上游导入或上游作者提交。
- 407051b13b4179d682849d550657ccc2b9b32217：Python有界执行器、公共查询取消/预算适配、存储/API/迁移、生成契约与27项测试；旧迁移测试仅更新最新版本预期。
- 9b46a4b765a2206cb6637565c109f705f2d03d75：固定Folio研究入口/选择/进度的必要桌面适配、白名单桥与5项实窗回归，不导入TS业务内核。
- 发布文档记录开发/复验、来源、格式修正及未验证边界；自身SHA与PR/merge由实际Git及最终回执确认，不循环引用自身SHA。

仅推送feat/step-15-research并创建对应PR；每次GitHub写入前再次核验账号、仓库和远程，最终head的
全部远程检查通过且没有未解决阻塞才普通merge并同步main，保留提交及功能分支。远程CI与合并须由
实际GitHub检查及发布回执确认，本机验收不能代替。原v0.1.0标签object仍
3dd216557cdc81ac8fc35b14e0585dc43731be86、Release非draft/非prerelease且assets0；不新增标签、
Release或定时付费评测。

尚未验证真实Longbridge/Massive/CLI数据、账户权限与字段、真实超时取消/模型、完整技能分析、长期负载、
其他OS、另一台干净机器、安装包及用户亲自操作/练习。缺11项技能、非协作线程槽位与采集不等于报告的
边界沿验收清单保留。第16—24步未实施，完成本步发布后停止。

## 38. 第16步结构化报告、执行证据与实际报告差异（2026-10-07）

用户当前仅授权第16步开发、固定合成器测试后单独验证真实LLM；完成交付后停止。
起点D:\folio\research-trail，main/HEAD/origin/main
`b4ef6312245850ad984af2156686a76779eef6c0`，工作区/index为空，origin为
https://github.com/ydflow/research-trail.git，第15步PR #14已在main。
已读项目规则、路线、第36—37节、现有研究/能力/技能/提供商/模型/存储/页面实现及固定参考。
本轮没有Git暂存、提交、推送、标签、Release或GitHub写入；不实施第17步。

### 真实实现与来源边界

新增Python ReportService/ReportStore/report_facts/report_synthesis/report_output/report_contracts及
0011_reports迁移；生成独立报告版本，不改写研究采集状态。
数据包来自同一ResearchStore的已保存成功结果，报告/evidence/export/diff零新数据查询；
复用现有SettingsService/OpenAIModelProvider，不新增模型或行情HTTP适配器。
事实绑定具体执行任务、能力、序号、JSON Pointer、原值、全结果hash、模式、提供商和获取时间；
回读核对原结果，异常拒收。失败、缺字段、未规划、缺技能和投影限制由Python产生可见缺口。
fact文字为空，数值只由实际绑定事实展示；分析与预测为定性且未核实的判断，
引用可追溯不证明论断正确。当前语言限制是保守格式校验，不是跨语言或投资语义证明。

ReportPanel复用研究入口和采集进度，通过7项白名单桥读取/生成/取消/回读/导出/比较，
桥总计70项，类型只引用Python生成OpenAPI。报告有摘要、章节、风险、条件式催化因素、
多空论点、旧版本、原始事实及缺口。Markdown由Python转义生成，main校验来源后只写
系统保存对话框所选路径；取消与写失败明确反馈。Research Diff比较两份已保存报告的
事实字段、缺口和分析内容，不调用模型、不从正文解析数值、不推断投资效果。
实际同数据版本可以无差异，原始数据变化可以由旧新执行记录分别回读。

6份固定参考文件及SHA256见[SOURCES-step16.json](SOURCES-step16.json)，覆盖core/research、
agent-synth、diff-service和ResearchReportView/EvidenceList/WhatChangedSection的必要模式。
Python字段/hash绑定、不可覆盖版本、严格验证、导出和差异算法为新实现；没有复制TS业务状态、
原合成失败回退、正文正则指标提取或检查点恢复。已有来源和声明、30份技能/许可原字节保持。
授权沿第9—11节用户确认，原授权文本未独立获取；仅skills/LICENSE已核实MIT、Copyright
2026 Longbridge Inc.，不扩展成全项目MIT授权或把上游成果记为个人原作。

报告运输仅增加有界输出预算和JSON对象模式，Agent默认1024 token及既有调用行为保留。
JSON模式不代替本机结构/来源/内容验证；不支持的兼容服务明确失败，不自动换协议重试。
协议依据[OpenAI Structured Outputs官方文档](https://developers.openai.com/api/docs/guides/structured-outputs)。
产品每报告最多一次模型请求、响应256KiB、输出8192 token、整体120秒，沿已保存单请求超时。
协调器独占写入；取消/超时迟到结果不写回，非协作旧调用退出前拒绝再开任务。

### 固定合成器、模拟协议与本机检查

先执行新增固定/模拟报告28项，全部通过，之后才发真实请求。
首轮check.cmd：430 Python / 8 Node / 36 Electron、契约、类型、构建和0011迁移重复/模型一致性通过。
普通非数量中文词归一化、中文“两”数量拒收、催化类型以及实际适配器取消/超时补充后，
报告测试33项通过；随后完整check.cmd为435 / 8 / 36。
报告专用JSON模式和运输改动后，报告33项＋既有OpenAI40项共73项重验通过，
最终第16步实窗3项重验通过。最终交付全套复验结果在本节末尾登记。

覆盖：引用回读和外部篡改检测、空字段/投影上限、实际数字与未知ID拒收、全部失败/无可用
事实拒绝生成、部分失败保留成功、不可覆盖版本/重启历史、迟到调用、固定错误码与凭证反射
脱敏、JSON重复字段/围栏/工具调用/结构拒收、真实协议取消和超时不固定回退。
桌面覆盖：两个实际新采集任务PE从20变25，仅一个事实差异，旧新原始记录可分别回读；
同数据两版本内容Diff为空；旧版本重启保留；Markdown实际文件可读，保存取消/错误各正确；
财报NETWORK_ERROR和bps空值可见；全部失败不生成，真实未配置不回退成功。
全套离线验收由既有网络护栏约束，不调用真实LLM/行情；无CI或安装包推断。
现有FastAPI TestClient弃用及Vite chunk大小警告仍存在，不改变为失败或声称已修复。

### 单独真实LLM验证：未通过，不计作就绪

使用既有verify_live.read_configuration以sqlite mode=ro读取日常模型连接及指定系统凭证，
不枚举凭证或读取私人研究/账户。verify_report每次在新的临时数据库采集AAPL.US价值策略
的4项模拟公开样例能力，报告mode为real但source_mode仍为simulated；没有真实行情/账户请求。
每次仅一个真实模型请求，无自动重试。以下为本轮不同改动后显式运行的五次独立验证，
不是同一任务的隐式重试。没有完成报告，也没有把拒收正文或模型回复当行情来源。

| 尝试 | 报告ID | 保存状态/错误码 | 请求数 | completed报告 |
| --- | --- | --- | --- | --- |
| 1 | a7408c0e-954f-4d30-b90e-2bbc227bbf53 | failed / UNSUPPORTED_NUMERIC_CLAIM | 1 | 0 |
| 2 | 42a25cba-4e9e-4b16-8d64-b5001695aa9a | failed / MODEL_RESPONSE_INVALID | 1 | 0 |
| 3 | 22a8c792-aea4-4651-b71c-70c217d747fe | failed / UNSUPPORTED_NUMERIC_CLAIM | 1 | 0 |
| 4 | a717155b-5dcf-4236-be76-c19f9faf9857 | failed / REPORT_SCHEMA_INVALID | 1 | 0 |
| 5 | c849a96a-2761-49a6-85ca-620a4ed59ec6 | failed / MODEL_TIMEOUT | 1 | 0 |

第3次协议finish_reason=stop且有正文，拒收定位risks[0].text；未保留早期完整回复，
不能据此断言具体词句或数值，也不能将第2次协议失败断言为截断。
为减少普通词误伤新增固定非数量词替换；保留真实数量拒收，补充相关回归。
后续启用原生JSON对象模式并扩大有界输出预算，最终一次仍超时。没有为验证修改日常
模型配置或关闭数字/来源/结构保护。停止继续付费尝试，不声称真实生成已经通过。
五份临时库只读核查均为4条成功模拟采集、1条failed报告、requests_started=1、document=NULL。

证据位于用户Temp的research-trail-report-live-qa-
m758xlmi、xy68wb3_、3verm07_、t1wl2m6c、okcnkquf目录，各有proof.json及独立validation.sqlite3。
临时库/私有拒收草稿/日志/截图不是公开源码，不纳入Git；不打印地址、模型ID或密钥。
真实LLM成功生成及其原始事实/Markdown展示仍未通过，不能以模拟协议代替。

### 交付状态与停止边界

第16步**代码完成/待验收**：固定合成器/模拟协议与本机功能验收通过，真实LLM生成未通过。
尚未验证真实行情/账户、任意语言语义真实性、投资效果、长期负载、其他OS、源码新装、
远程CI、安装包、用户亲自操作和学习回答。实际调用链见tutorial C11，可撤销练习及三题见
practice C11，用户答案保留。操作及来源见[验收清单](ACCEPTANCE-step16.md)。
完成交付后停止；不执行第17步或发布。

最终交付代码复验：check.cmd退出0，435 Python / 8 Node / 36实际Electron通过，无失败/取消/跳过；
OpenAPI/TypeScript一致、类型、构建、0011_reports两次upgrade/current/check与模型一致性通过。
最终日志为用户Temp/research-trail-step16-delivery-check.log，隔离迁移目录
research-trail-verify-weZIxB，不纳入源码。四份第16步截图仅位于Temp/research-trail-step16-qa，
均已查看，展示事实/引用、窄窗、部分失败缺口和实际20→25差异；页面无横向溢出或pageerror。
最终文件审查220份UTF-8、92个可访问本地Markdown链接、6份参考SHA256及30份既有资料
工作文件/Git blob hash一致；4个已登记上游断链、10处原行尾空格保留；8项保护忽略探针通过。
秘密签名/禁传产物发现0、新增13份文件EOF正确、git diff --check通过；工作差异36份仅本步相关，
index为空，main/HEAD未变，没有提交/发布。根PROJECT_STATE.md同步本步状态和真实验证缺口。

## 39. 第16步发布复验（2026-10-07）

用户另行授权仅发布当前第16步：按真实改动提交、推送功能分支、创建PR；检查通过且没有
未解决阻塞时普通合并并同步本地main。不实施第17步，不打标签/Release或定时付费评测。
读取AGENTS、进度、前节验收和实际差异，起点仍为main
`b4ef6312245850ad984af2156686a76779eef6c0`，36份本步差异、index为空。
GitHub读取实时确认ydflow、公开非fork非归档ydflow/research-trail，origin fetch/push均为
https://github.com/ydflow/research-trail.git，远程main同起点，无已有打开PR。

### 单独真实LLM结构、引用与保存验证通过

本轮在未修改运行代码或日常模型配置的情况下，显式运行verify_report --run一次。
请求数1、finish_reason=stop/content_present=true，报告
`84e714c6-1e2d-4bcb-a708-eae4902330cc`为completed，reason=null。
采集任务`963922dd-4272-4a7d-8e30-26a11068fec4`独立执行4项模拟能力；37条事实全部按
原执行结果、字段和hash回读验证，模型引用均来自这份实际采集。类型包含fact/analysis/prediction，
Markdown导出SHA256为`23d334fa2e08499e954f925c3964037e06229d322f8c8543516fa323c7002c11`。
临时目录research-trail-report-live-qa-vkyj0u3s保留proof.json、validation.sqlite3及Markdown，
均不上传；只读日常模型配置和指定系统凭证，无私人持仓或真实行情读取。

验证器沿旧只读助手上限，当前保存单请求30秒不被缩短，验证整体60秒（产品120秒）。
未通过加长用户请求时限或关闭结构/来源/数字保护取得通过，也没有自动重试或固定回退。
第38节五次失败作为开发历史原样保留；此处是另一次独立验证，不宣称失败已变成功。

**明确限制：**这份真实输出把原始模拟现金流值0描述为“经营现金流为负”。文字保存为analysis，
绑定实际证据而非市场字段，未改写事实0。检查和导出均明确“引用可追溯不等于论断正确”。
此例直接说明定性语义正确性尚未得到证明；本次通过仅限结构、证据绑定、状态、保存和导出，
不称模型分析可信、行情真实或投资正确。数字格式保护不是语义核验器。
后续仍需用户逐项亲自操作；学习回答不代填。

### 发布检查与公开范围

本机check.cmd退出0：435 Python / 8 Node / 36实际Electron，无失败/取消/跳过；
契约、类型、构建、0011_reports重复迁移及模型一致性通过。日志仅在用户Temp的
research-trail-step16-publication-check.log，迁移证据research-trail-verify-BvW8YN。
隔离源码verify:clean退出0：导出220份文本，没有Git、现成依赖、运行库或构建；
锁定新装71项前端/29项Python并准备Electron后，同样435/8/36通过，无跳过。
根CMD股票→会话→quote→取消→关闭重启/历史快照一致，无新运行，自有进程退出。
干净目录research-trail-clean-oAq8Cg/clean source，日志research-trail-step16-publication-clean.log，
CMD证据research-trail-cmd-qa-NEkggt，仅在Temp。163份运行源码与工作树/干净目录逐字节一致；
后续只修改验收和发布文档，不复写模型输出或改变运行代码。

发布清单仅36份本步文件。220份UTF-8、92个可访问本地Markdown链接、6份固定参考SHA256、
30份既有技能/许可工作文件及Git blob hash、8项保护忽略探针通过；秘密签名/禁传产物发现0。
额外对候选全文件检查当前指定模型凭证原文，出现0，不输出凭证值。
4处登记上游断链和10处原行尾空格继续保留，新增/适配文件及完整本步diff检查通过。
已有SDK/依赖/工作流不改，TestClient弃用和Vite体积提示仍存在，不冒充已修复。

提交区分：必要来源/契约适配8366eeba7cf381631e685a3527a2cdb972e7c82d，
Python新实现606d0dcf646a350132e4f966ee4df9f3945ff33c，
桌面接入a81aa126a49e760635f1f3ca2be78a9436b4609a，验收/发布文档另建真实提交。
本步无新增原样上游文件导入；概念适配不伪装为原文件导入或原作者提交。
作者使用当前ydflow/noreply，日期由当前Git正常记录，不伪造开发时间。
本轮没有运行代码修复；开发期间的数量保护/JSON运输改动包含于Python新实现，不虚构发布故障或修复提交。

推送、PR和普通合并依本轮独立授权，写入前再次核验ydflow、仓库及origin地址。
远程最终head检查尚待提交后执行；最终PR/CI/合并SHA和本地main同步状态以Git及根
PROJECT_STATE发布回执为准。检查未通过则修复并复验，不强推、不绕过未解决阻塞。
原v0.1.0标签object 3dd216557cdc81ac8fc35b14e0585dc43731be86及Release assets0保留；
不新增标签、Release、定时付费评测或第17步。

未验证真实Longbridge/Massive/CLI行情、账户权限/字段、真实数据报告和差异、模型定性语义正确性、
投资效果、长期负载、其他OS、另一台机器、安装包、用户亲自操作和学习回答。

## 40. 第17步研究检查点与显式恢复（2026-10-07）

仅执行用户本轮第17步。开工核对AGENTS、路线、第38—39节、已有采集/报告/注册表/
技能/提供商/设置/数据库/白名单桥及页面；根PROJECT_STATE第16步发布回执与实际Git一致。
业务目录D:\folio\research-trail，main/HEAD/origin/main基线
`a50fc0ea2092b83292f507f0a82ff50709ea78e1`，开工工作区/index为空。
本步没有Git暂存、提交、推送、PR、标签、Release、定时付费评测或GitHub写入；不实施第18步。

### 实现与真实调用链

Python既有ResearchStore/ReportStore/SQLite仍管理计划、执行证据、结果和版本。
新增0012_checkpoints只加列和审计/操作表；ResearchStore.begin/step/finish/resume与
research_checkpoints.save在同一write事务提交原业务行和检查点，计划/结果只保存摘要于快照，
不运行第二套状态内核、提供商或能力注册表。快照version=1，覆盖状态/时间/代次/父任务与证据hash。
启动把遗留fetching/generating标interrupted，保留成功数据和旧报告，无工具或模型重执行。
旧0011库一次legacy-migration快照不证明迁移前真实性；已有报告和来源字段不改写。

RecoveryPanel → preload四个命名操作 → main来源/UUID校验 → app.py启动令牌路由 →
ResearchRecovery.inspect/resume/restart/abandon → 既有研究执行器和存储。桥共74项；
OpenAPI为唯一类型来源。打开研究页识别采集或最新报告的中断任务；页面轮询只读元数据。
恢复保留原ID/计划、只继续中断或取消项；成功结果/时间/hash及原失败、超时、不可用项不重跑。
重启操作创建新ID、当前配置新计划、parent_run_id指向旧任务，并重新采集；旧数据/报告不删除。
放弃同事务标abandoned_at、停止未完成采集和生成、记操作；完成证据和报告可读，不能续采或新生成。

检查点校验和/版本、计划/步骤集合与原始成功结果/状态不符时阻止恢复与生成，不称已就绪；
损坏任务可以放弃，但后续快照valid=false，不能把损坏记录修成可信事实。
续采沿用同一CapabilityRegistry和ProviderService.query，核对配置revision及非敏感identity，
防删除重建同revision换配置或凭证引用。实际运行中的原快照查询结果仍保留；后续读取
CONFIG_CHANGED明确失败，不把原快照有效结果抹掉。外部本机凭证丢失前置拒绝，远端过期
须在实际查询中AUTH_FAILED；只读预检不发送探针。重启后健康需重核时有警告，仅允许原计划
曾可用的真实读取显式续采，不改变全局就绪状态，不给未实现能力放行。

恢复代次generation阻止旧协调器迟到回写，并识别同ID旧代次仍清理时需要启动新代次。
操作request_id持久去重/跨操作冲突；报告request_id唯一到原版本。
ReportStore.before_call先持久记录真实请求可能已发出，结果未知时request_uncertain保留；
已知成功/内容失败才清除标记。硬退出时已知requests_started=0不能证明外部服务未消费。
报告恢复不创建模型、不重发、不新增版本；显式生成新报告才走当前模型配置和凭证前置。
中断版本、失败版本、已完成报告不覆盖；迟到回复不能制造成功。
模型配置/凭证变化只警告历史恢复，新生成单独验证，不自动回退固定合成器。

### 来源与授权

只读固定Folio ba5dcdfd31b162f5edb8b908f7f099a560389326的
packages/shared/src/research/checkpoint.ts、service.ts提供概念参考；两文件实际SHA256登记
于SOURCES-step17.json。没有新原样资源导入、TS业务运行时或文件检查点权威状态。
同事务快照、配置身份、请求去重、恢复代次、放弃、模型不确定标记由本项目Python实现。
既有来源注释、30份技能/许可原字节及Copyright 2026 Longbridge Inc.保留。
授权沿EVIDENCE第9—11节用户原作者复用确认，未独立取得授权原文，不扩大全仓MIT结论。

### 验证与修正

定向研究/报告/恢复首轮59通过/1失败：新增配置结束后检查错误地丢弃了原配置快照的有效
在途结果，已有配置变化回归应保留四份成功。修正为只拦截后续调度/健康更新，复验72通过。
复查发现同revision重建测试用了无效transport字段，替换为有效region=cn并显式断言revision
与原值相同；补本机凭证外部丢失、模型身份变化和旧库实际记录迁移，定向75通过。
随后补旧代次仍清理时启动续采的真实协调器回归，共新增16项后端验收。

初次两项实际Electron验收未通过：一项过早读取空任务列表，另一项发现恢复/报告组件使用
相同React key造成重复面板。修正等待任务及唯一key，继续发现新任务按钮返回前误读原collected
任务的测试竞态，增加等待新ID；最终定向两项通过，不降低业务断言。
完整检查中的两个用例又验证报告中断页面自动识别原任务，无需手动历史选择。

实际采集阶段终止所属测试Python进程时三项成功、一项执行中；重开同库原ID/interrupted，
恢复后collected/generation=1，原三份逐项记录与原始结果完全相同，报告0份、任务1份。
放弃保留成功结果且新报告禁用，重新发起新ID/generation=0/parent_run_id，原任务仍保留。
实际报告阶段保留completed版本1，在生成固定版本2时终止所属Python；重开版本2
interrupted/document=null，原版本1完整相同。恢复及相同UUID并发重放仍只有两版本；
显式生成才追加completed版本3，版本1/2不变，无错误成功或自动模型调用。
离线fixture只在RESEARCH_TRAIL_OFFLINE=1下延迟采集/固定合成器；没有真实请求。
1100×800及600×680截图三份仅Temp/research-trail-step17-qa，已查看，窄窗无横向溢出。

完整check.cmd退出0：451 Python（435基线+16新增）/8 Node/38实际Electron（36基线+2新增）
通过，无失败/取消/跳过；契约/类型、main/preload/renderer构建、隔离0012重复迁移/current/check
及No new upgrade operations通过。后续最终类型/契约复验通过。日志仅Temp/
research-trail-step17-check.log；迁移临时目录research-trail-verify-lhoK0a。既有TestClient弃用
和Vite主chunk提示保留；未安装依赖、变更工作流或降低检查。

### 边界与交付

检查点hash校验当前记录一致性，不证明论断正确或防管理员同时改数据和hash。
成功数据不重复获取；尚未提交的中断只读调用在显式恢复时可能重执行，外部恰好一次未承诺。
非协作在途线程仍占原物理槽，恢复可报EXECUTOR_DRAINING；不承诺强杀任意Python线程。
报告HTTP请求不能从未保存回复续传，未知外部结果必须保留interrupted/不确定并等待用户新尝试。

本步SDK/CLI执行器、凭证库及模型HTTP均为fake/MockTransport；未发送真实行情、账户或LLM请求。
第16步真实结构成功和定性文字错误仍保留，不转作本步真实恢复或分析正确性证明。
真实SDK/CLI远端凭证失效、真实LLM硬退出/消费账单、长期负载、其他OS、安装包、远程CI与
用户亲自操作/学习答案未验证。CMD、操作语义与用例见ACCEPTANCE-step17，实际调用链见
tutorial C11，可撤销练习与三题见practice C11；用户答案保留。交付后停止，不执行第18步或发布。

最终产物审查227份UTF-8、97个可访问本地Markdown链接，两份固定参考SHA256和30份既有
技能/许可工作文件及HEAD blob原字节通过；8项保护忽略探针通过，秘密签名/禁传发现0。
原4处资料断链与10处上游行尾空格保留；git diff --check通过。运行库/账户/凭证/日志/
缓存/构建与三份截图不入Git。实际差异42份仅本步相关，index为空，HEAD/main未改变。
审查仅Temp/research-trail-step17-audit.json；根PROJECT_STATE新增本步开发回执，旧发布记录保留。

## 41. 第17步发布复验（2026-10-07）

用户本轮独立授权仅发布已验收第17步，检查失败先修复、无未解决阻塞才普通合并并同步main。
不实现第18步，不打标签、不创建Release、不启用定时付费评测。读取AGENTS、ROADMAP、
第40节、ACCEPTANCE-step17、根PROJECT_STATE回执及42份实际差异；main基线
`a50fc0ea2092b83292f507f0a82ff50709ea78e1`，index为空。

实时确认gh账号ydflow、既有公开非fork非归档ydflow/research-trail、默认main、origin
fetch/push均https://github.com/ydflow/research-trail.git，远程main同基线，无重复开放PR。
历史main及项目来源一致；既有仓库描述仍写第1步，本轮不修改无关仓库元数据。
初次只读GraphQL仓库查询EOF，随后REST读取成功，不将错误当成仓库不存在或创建替代仓库。
每次外部写入前重新核验账号和目标，不切换账号、不删除、不强推、不绕过阻塞。

公开候选仅227份源码/测试/文档/锁文件中的42份本步差异。来源概念记录1份，Python新实现/
生成契约/迁移/测试24份，桌面白名单/页面/实际中断测试11份，验收与学习文档6份。
没有新增原样上游导入；来源记录明确固定Folio概念适配，既有30份技能/许可原字节和版权保留。
授权沿第9—11节用户原作者复用确认及本轮上传授权；原授权文本未独立取得，不扩大全仓MIT。
秘密签名/禁传发现0，本机已配置凭证原文额外扫描候选源码出现0；读取只限定本应用已保存引用，
不枚举系统凭证、不输出原文、不修改运行库。运行数据库/WAL、账户/CSV、日志、缓存、构建
和截图不上传。原4处资料断链及10处上游行尾空格保留，本步git diff --check通过。

本机check.cmd退出0：451 Python / 8 Node / 38实际Electron，无失败/取消/跳过；
契约/类型/构建、隔离0012重复迁移/current/check与No new upgrade operations通过，
两项实际进程中断验收通过。日志仅Temp/research-trail-step17-publication-check.log，
迁移目录research-trail-verify-HiGUnq。第一份隔离源码新装同样451/8/38通过，根CMD启动、
关闭重开、保存快照一致及所属进程退出通过；锁定安装71项前端/29项Python，源码目录
research-trail-clean-MMmfva/clean source，迁移research-trail-verify-NAzxy2，CMD证据
research-trail-cmd-qa-yed8Fh。发布后续修复使此结果成为修复前历史，最终源码另行复验。
本轮没有真实行情/账户/模型请求、自动重试或付费评测，未把第16步历史真实结构验证
转作第17步真实恢复证明。当前接受范围仍为fixture/fakeSDK/MockTransport和本机实际进程中断。

提交按真实差异分为固定来源记录、Python新实现、桌面接入、验收/发布文档；作者沿用当前
ydflow/noreply，Git记录实际时间。不重建原作者历史，不制造故障提交。开发时在途配置回归
和恢复代次/唯一组件key修正包含于对应新实现。发布复查新增一个实际复现的页面竞态，
修复与回归单独提交，不归入原Python实现或伪造上游导入。

固定来源记录705a76062a21cd0ea87560dd44dcd3127d093870；
Python新实现d787c3b2d93d137d531032b2aedae43b6cc342e8；
桌面接入2f293cbcf47658a63c13c92f7b2d51f73bbda6d6。验收/发布文档及实际PR链接另建文档提交，
自身SHA由Git及回执核对，不循环写入自身SHA或伪造未来提交。

新增回归将真实abandon路由结果通过命名IPC延迟2秒，同时让原报告轮询观察cancelled。
修复前定向1失败：数据库及检查点已abandoned，但元数据刷新使操作回执generation失效，
ResearchPanel未取得abandoned_at。RecoveryPanel新增独立操作回执代次，仅页面可用性/
任务身份/卸载使其失效；检查点刷新只取消旧读取，不丢掉已提交操作结果。后端状态不改，
仍拒绝过期页面回写。修复后契约/类型/构建通过，三项Step17实窗通过，无跳过；
延迟回执用例核对页面放弃标记、新报告禁用、同一原ID和数据库记录/报告cancelled一致。
复现及复验日志仅Temp/research-trail-step17-publication-race-before.log、race-after.log。
修复提交fd3a8dcd79f961bc9ce6af7118756f91f92d25c1；此前38项是修复前历史。
最终隔离源码再次锁定新装71项前端/29项Python、准备Electron，通过同一完整离线流程：
451 Python / 8 Node / 39实际Electron，无失败/取消/跳过；契约/类型/构建、0012重复迁移/
外键/模型一致性和根CMD关闭重启/历史快照相同通过，所属进程全部退出。
日志仅Temp/research-trail-step17-publication-clean-final.log；源码research-trail-clean-ziw8Mw/
clean source，迁移research-trail-verify-89y1Ww，CMD证据research-trail-cmd-qa-rUHg11。
163份运行/构建/测试源码在本机工作文件、修复提交Git blob及最终隔离副本逐字节一致。
未新增依赖、工作流或放宽业务断言；实际修复只保护页面操作回执，不改变采集/报告业务状态。

已创建[第17步PR #16](https://github.com/ydflow/research-trail/pull/16)，base main
a50fc0ea2092b83292f507f0a82ff50709ea78e1，初始head
1710b179cde08c44a2d7bd64e0e0fadf3ce5b70a。此head为验收文档提交，另四个来源/实现/修复
提交如上。创建后push/PR CI正在运行，尚不称成功。此后补实际PR链接为独立文档提交，
不改运行代码/测试，最终head检查与普通merge以GitHub实查及根PROJECT_STATE发布回执为准。
原v0.1.0标签object 3dd216557cdc81ac8fc35b14e0585dc43731be86与Release assets0保留。
真实SDK/CLI服务凭证过期、真实模型硬退出/消费账单、投资分析正确性、长期负载、其他OS、
另一台机器、安装包、用户亲自操作和学习答案未验证。完成发布后停止。

## 42. 第18步投资论点与显式复审（2026-10-07）

用户当前仅授权开发第18步。先读取AGENTS、ROADMAP、原第40—41节、ACCEPTANCE-step17及
当前模型、报告/原始事实/差异/研究/桥接/页面和只读固定Folio论点源码。main/HEAD
f365d122544c119134afba4726d6f10c0b81720e，开工工作区/index干净，已含第17步PR #16。
第17步发布中断后遗留main CI已只读核实attempt 2 completed/success，451/8/39及0012一致；
首次原SSE用例5秒轮询失败保留，单独复验1项通过，不称修复SSE长期时序。
根PROJECT_STATE已核验补齐发布回执；本轮没有新的GitHub写入、提交/推送、标签或Release。

### Python实现与实际链

ThesisService复用ReportService.completed、原ResearchStore.validate_checkpoint、
report_facts.original与report_output.diff，同一Database.write/SQLite，未新增提供商访问、
模型调用或第二套能力注册表。0013新增investment_theses/thesis_versions/thesis_reviews；
头记录只有当前指针，历史版本和评估/判断记录持久追加，含分析内容、变化理由、时间、
新旧报告及对应执行证据快照。原研究、报告、证据不覆盖，0012迁移记录和历史报告保留。

create从已完成且证据可验证的报告形成版本1，原分析/预测仍标明来源；事实引用原值保存在
完整ReportJob快照和执行记录，不从合成文字抽取行情或新数字。同一报告不重复建论点。
edit核对expected_version，在同一事务追加内容/理由/旧对应数据快照；UUID+输入hash持久
去重，跨操作/内容复用拒绝，重复操作或并发不产生重复版本或覆盖原版本。

evaluate要求同证券/数据模式/提供商的较新独立采集报告，并核对新字段覆盖原论点对应事实、
非缓存和较新fetched_at。复用原Diff保存真实变化和缺口，字段变化为changed，字段未变仅
为可比较数据unchanged，不推断投资增强/减弱/失效。不存在新报告、未完成报告、旧采集、
缺事实、来源不兼容、缓存/陈旧时间或证据丢失记录unable/code、comparison/judgment空；
仍保存已取得的新旧快照、缺失字段和尝试报告ID，不抹掉成功数据。

judge接收用户明确的strengthened/weakened/invalidated/unchanged/needs_revision判断、
content和reason，重新核对评估所基于版本及数据完整性，同事务追加新版本与关联judgment。
旧ready评估和旧版本不修改，不将自动字段变化当作已证明的投资结论。用户判断允许改变
分析方向，页面标记人工来源；这是显式复审流程，不是Agent自动影响评估或收益测算。

7条路由/8项HTTP操作沿启动令牌和严格Pydantic边界，8个命名IPC接入，桥总82项。
ThesisPanel懒加载，独立当前编辑草稿与历史只读展示；获取身份切换/卸载代次阻止迟到版本
污染当前页面。报告页增加转换入口，论点页新报告选择、评估/缺口/比较/旧新事实回读和
复审历史可见。摘要列表最近100条标明上限，完整旧版本仍保留并可按版本号读取。

### 来源与验证

固定Folio ba5dcdfd的core/thesis.ts、thesis/converter.ts及evaluator-local.ts提供概念参考，
三份实际SHA256见SOURCES-step18.json。没有新增原样导入、TS业务内核或依赖；原本地
evaluator缺数据标unchanged和新闻/价格推断影响的启发式不移入本项目，改为unable和
显式用户判断。原30份技能/许可字节与版权/来源声明保留；授权沿第9—11节用户确认，
原授权文本未独立取得，只确认skills/LICENSE MIT，不扩大全仓MIT。

后端首轮12通过/2失败为测试夹具问题：试图将success结果置NULL被原CHECK拒绝；改为
真正删除对应执行记录模拟缺证据。认证测试误用Authorization，改为现有X-ResearchTrail-Token。
没有放宽数据库或业务断言，复验14通过，补缓存/陈旧获取时间、评估重放/版本冲突及未知
报告请求追踪后18通过。每项均为模拟/固定合成器，未调用真实模型或提供商。

两项实际Electron定向通过（原39+2）：从原研究入口模拟价值采集与保存固定报告，报告
直接形成论点，双击编辑只追加一次，版本1完整保留；重新采集实际估值20→25，再保存
用户减弱判断/中性方向为新版本，旧新报告/事实和原评估未变。缺新报告unable且复审按钮
禁用；关闭重开同库保存视图完全相同，仅2份报告/2个研究，没有隐式采集或模型。
第二项延迟真实theses:version IPC结果再切换证券，旧结果不能污染新论点或草稿。
截图1100×800/600×680仅Temp/research-trail-step18-qa，均已查看，自动无横向溢出。
契约/类型与构建通过；结构比较旧OpenAPI全部已有paths/schemas无改变，只新增7路径/11模型。
定向日志仅Temp/research-trail-step18-theses-tests{-2,-3}.log、step18-desktop-focus.log。
完整check.cmd退出0：469 Python（451基线+18新增）/8 Node/41实际Electron（39基线+2新增）
全部通过，无失败/取消/跳过；契约/类型、main/preload/renderer构建、0013隔离重复迁移/
current/check与No new upgrade operations通过。原SSE用例本轮完整也通过。日志仅Temp/
research-trail-step18-check.log，迁移目录research-trail-verify-0LQpjf。没有新增依赖、改变
工作流、跳过测试或放宽检查。另隔离库以真实论点页直接转换入口验证生成版本1、按钮可用，
编辑页1100宽/600×680截图均已查看，无横向溢出；视觉日志step18-visual.log、visual.json
及两份editor截图只在Temp，不进Git。

最终审查236份UTF-8、101个本地Markdown链接、3份固定来源SHA256、原30份技能/许可
工作文件和HEAD blob原字节、8项保护忽略探针通过，秘密/禁传发现0；原4处资料断链与
10处上游行尾空格保留。git diff --check通过，index为空，main/HEAD仍开工基线。运行库、
账户、密钥、日志、缓存、构建及截图不上传；本步差异仅论点、桥接、生成契约、0013最新
迁移断言与验收/学习材料。审查仅Temp/research-trail-step18-audit.json。

### 边界

新报告是显式新采集的证据，不保证完整资料、市场实际新事件或分析正确。数据一致性hash
不是数字签名或防管理员修改；用户投资影响判断不保证正确。来源数据、字段差异、
合成器/用户分析和投资效果保持独立。未实现LLM自动复审、监控、提醒、筛选、收益窗口、
权重校准或其他未来阶段。真实行情/账户论点、真实模型分析正确性、长期负载、其他OS、
安装包、远程CI与用户亲自操作/学习答案未验证。本步没有真实服务/付费评测请求。
范围与CMD见ACCEPTANCE-step18，实际调用链与可撤销练习/三题见tutorial/practice C12，
用户笔记和答案保留。不提交、推送或发布，完成后停止，不执行第19步。

## 43. 第18步独立发布复验与公开范围（2026-10-07）

第42节开发交付后，用户单独授权只发布第18步：功能分支/对应PR，检查通过且无未解决
阻塞时普通合并保留提交并同步本地main。不实施第19步，不打标签、创建Release或付费评测。
开工main/origin/main/GitHub main一致为f365d122544c119134afba4726d6f10c0b81720e，
index为空。读取规则、进度、验收和实际差异，29份文件均属本步：1份来源清单、12份Python/
迁移/测试及生成契约、10份桌面/实窗测试、6份验收/进度/学习文档。依赖和工作流未改。

### 来源与隐私

固定Folio三份参考SHA256再次核对，只有概念参考，无本步原样导入或TS业务内核；保留
原30份技能/许可文件及Git blob字节。授权按第9—11节用户确认，原授权文本未独立取得，
只确认skills/LICENSE为MIT，不扩大全仓MIT。使用真实时间和现有ydflow/noreply作者配置，
不改写上游或作者历史。236份候选UTF-8、101个本地Markdown链接、8项忽略保护探针及
git diff --check通过，原4处上游断链和10处行尾空格保留，无新违规。
常见密钥特征/禁传产物为0；只读核对运行配置引用的1项系统凭证，源码内已配置秘密
出现0，不输出秘密、不枚举其他账户、不改变凭证。数据库、账户数据、日志、缓存、
构建及截图不纳入Git，审查和验证材料仅Temp。

### 修复与复验

修复前独立完整check.cmd退出0：469 Python / 8 Node / 41实际Electron，无失败/取消/
跳过；契约/类型/构建、0013隔离重复迁移/current/check及模型一致性通过。
日志research-trail-step18-publication-check.log，迁移目录research-trail-verify-1GhwXT。
这只证明原覆盖路径通过，额外复核发现验收未覆盖的空列表编辑问题。

实际窗口清空风险列表后，页面把空字符串作为条目提交，被Python严格边界拒绝，版本
不前进；同接口提交合法空列表可以保存。新增实窗断言修复前失败（期望版本2，实际1）。
ThesisPanel.mutation仅提交时trim和过滤空行，草稿仍允许输入换行，不截断有效条目或
放宽Python条目/长度/版本保护、测试断言或超时。修复后两项Step18实窗通过，空风险列表
及去掉空白行的催化条目保存为版本2，版本1保留；仍通过复审/重启和迟到读取隔离。
日志仅Temp/research-trail-step18-empty-list-regression-{before,after}.log；修复单独提交。

本地提交：88510a90d04a39b27fa3944f5b217153cf63e6f3记录固定来源，
6ead1b2f9d26c9926a5faf07fa8995b24b57aaee为Python新实现/生成契约，
c4f98c79eb67867f2403a6f47e6b2051b613d36a为桌面接入/实窗验证，
65a834a49e0db4d8af987057b5d89f60e95b70fe为已复现的空列表保存修复。
170份运行/测试/配置源文件工作字节与Git blob一致。修复后最终完整check.cmd退出0，
469 Python / 8 Node / 41实际Electron全部通过，无失败/取消/跳过；0013迁移和全部检查
通过。日志research-trail-step18-publication-check-final.log，迁移research-trail-verify-BhhUxF。
独立干净源码verify:clean退出0：236份源码导出，不复制Git、依赖、构建或运行数据；
锁定新装71份前端/29份Python依赖和Electron，完整469/8/41及0013全部通过，无失败/
取消/跳过。根CMD实际启动、关闭、重开及保存历史完全一致，无额外运行或遗留所属进程。
170份运行/测试/配置源文件在工作文件、Git和干净导出逐字节一致；原paths/schemas不变，
契约仅增加7路径/11模型。日志research-trail-step18-publication-clean.log，干净导出
research-trail-clean-R3p1bN/clean source，迁移research-trail-verify-6xWmE2，根CMD证据
research-trail-cmd-qa-NTqcIi，均仅Temp。文档提交据实际结果完成，不虚构自身SHA或远程成功。

### 远程与未验证边界

只读核验账号ydflow，目标ydflow/research-trail为本项目公开仓库，非fork/非归档、默认
main、允许merge commit；origin fetch/push均为该仓库HTTPS。当前无开放PR，main无保护/
规则集。每次GitHub写入仍现场核对账号、目标和main，任何不符即停，不切换账号、不
删除、不强推或绕过。现有v0.1.0标签对象3dd216557cdc81ac8fc35b14e0585dc43731be86和
Release（id403094537，非draft/非prerelease、assets0）未改。PR/CI/合并尚未执行，最终
按实际GitHub和根发布回执确认。

全部本步验收使用固定合成器/模拟数据、假SDK/CLI/MockTransport及本机实际HTTP/桌面，
没有真实提供商或模型请求。真实行情/账户论点、真实模型分析正确性、投资效果、长期
负载、其他OS/机器、安装包及用户亲自操作/学习仍未验证；第16步历史真实结构验证不能
证明本步投资判断正确。没有增加监控、筛选、自动调度、收益校准或后续阶段。

### PR及合并前检查状态

重新现场核验ydflow、目标公开仓库、两个origin地址和原main后，已推送feat/step-18-theses
并创建[PR #17](https://github.com/ydflow/research-trail/pull/17)。首次head
b0253726029b8748e3d5a84c0e2d057baa7c0383，base仍f365d122；29份文件/五个提交。
上文“PR/CI/合并尚未执行”为外部写入前状态，现PR已存在，push/PR离线Windows检查
启动，合并尚未执行。此补充只更新PR链接和检查状态，不改变已验收的170份运行源码。
文档推送后以新最终head逐项核对CI，不把早期head取消或本地通过记为最终远程成功。
合并前将再次核对文件blob、完整提交/作者、审查请求和未解决讨论；检查通过且无阻塞才
按用户授权普通merge，不squash/rebase/admin或删分支。合并、最终main CI与本地同步结果
按实际GitHub和根PROJECT_STATE发布回执确认，不在此预写成功。

## 44. 第19步：固定17任务、有界池筛选与机会发现（2026-10-07）

用户本轮只授权第19步开发。开工核对main/HEAD c4e1679b4463835530c3648c3f698fdaa9f0a766、
index/worktree干净，第18步PR #17已普通合并，最终push/PR/main CI均成功，回执见根PROJECT_STATE。
本步没有提交、推送、PR、标签或Release操作，没有实施第20步或定时评测。

### 来源与新实现

只读固定Folio ba5dcdfd的core screening契约、shared strategies/service及策略测试、DiscoverView，
路径/SHA256记录SOURCES-step19.json。没有原样导入新资源或运行上游TS业务内核。
Python新实现17项Decimal规则、单一注册表/原ProviderService采集编排、逐股票决策和证据，
新增0014_screening表保存本次股票池/计划/规则/时间/实际结果/失败/指标输入/sha256；
Electron只接入六项命名桥和发现页，复用自选、对比、研究入口。现有配置、凭证、健康和数据
适配器继续由原服务管理，没有第二套行情访问或状态。具体阈值与差异见ACCEPTANCE-step19.md。

原上游来源/声明与30份既有技能/许可原字节保留。本次概念/规则参考沿第9—11节用户确认的
原作者复用授权；原授权文本未独立取得，只确认skills/LICENSE的MIT及Copyright 2026 Longbridge Inc.，
不把全仓标成MIT或伪装上游作者、开发时间。本轮只有本机开发，不扩张公开授权边界。

股票池显式1—40，不静默扩大/截断；缺省是持久自选，空自选明确记录四只示例目录。
与基线一致默认4物理并发/15秒/90日K请求，超时槽位保留、排空前拒绝新任务，取消和应用中断
保留已保存数据。保存参考时钟，原结果hash回读；重启不隐式重扫。同request_id同输入复用，
不同输入冲突。合法零候选与全失败分开，部分成功不会被其他股票或能力失败抹掉。

17任务逐项使用三股票固定输入验证满足边界、边界外、指标缺失；复合阈值补充单独验证。
指标/理由关联实际读取和JSON Pointer，财报按明确年度/相邻年份，K线不丢坏柱或补量；
事件明确股票归属，除息日不替支付日；新闻去重且排除未来。当前buy评级和目标价空间只是
基线观察规则，不表示已证明评级变化或投资正确。明确空列表/非买入评级是正常排除；缺必要
字段、失败、受限或未实现能力不给假候选。引用及hash是一致性证据，不是事实正确性签名。

本步没有模型请求，模型spy零调用，LLM没有扫描、打分、补数字或生成理由。未来若实现候选解释，
只能使用已取得候选事实，当前没有此功能。默认模拟数据仍缺ROE等，页面如实显示，不扩充样例
伪装真实数据。真实数据/协议能力覆盖不能借模拟形状测试声称通过。

### 本机验证与修复记录

定向33项Python及2项实际Electron通过。桌面显示17任务、切规则、TSLA.US候选及来源，
自选持久、对比/研究入口实际代码及模拟模式、重启同记录且无新任务；缺指标/不支持/真实未就绪
无候选，越界ID和额外IPC字段拒绝。实际窗口宽屏/600px无横向溢出，截图仅Temp。
初轮桌面隐式select标签包含选项文本，严格定位失败；补明确aria-label后重新验证通过。
对比页用实际combobox角色验证模式，未更改原分析规则或伪造第二只股票。

完整check.cmd首轮5失败/496通过：四个旧迁移head断言仍期待0013，实际新迁移0014；
一个取消测试只睡40毫秒便假定第一条结果已保存，负载下取消发生在保存之前。
更新四个head断言；取消测试先观察成功执行已提交再取消，继续检查保留成功结果。
不放宽原历史/外键断言，不加产品超时、跳过测试或修改数据制造通过。首次日志保留Temp
research-trail-step19-check.log；最终重跑research-trail-step19-check-final.log退出0，
502 Python/8 Node/43实际Electron零失败/取消/跳过，契约/类型/构建、0014重复迁移/current/check
及No new upgrade operations detected通过。隔离迁移库research-trail-verify-m0JDIE在Temp。

原OpenAPI全部路径/模型逐项深比较无变化，新增5路径/10模型、共6命名操作，桥白名单88项；
契约、TypeScript及构建通过，无新增依赖/工作流，保留TestClient弃用及Vite大chunk提示。
Git diff检查通过；246份UTF-8源码、102个本地链接、5份固定参考SHA256、30份既有技能/许可工作字节及Git blob一致，8项忽略探针通过。常见密钥模式与禁传文件0；原4处上游资料断链、10处上游空白保留。未读出或打印私密凭证。
真实Longbridge/Massive/CLI、真实筛选行情、模型解释、安装包、用户亲自验收、CI、提交/发布未执行。
路线、教程和练习只展开第19步主链；用户原笔记/答案保留，完成后停止。

## 45. 第19步独立发布复核（2026-10-07）

用户单独授权发布当前已验收第19步，允许功能分支/PR、检查通过且无阻塞后普通合并、同步main。
第44节的未提交/发布及502/8/43是开发轮历史；本节记录发布轮，不实现第20步。

现场gh api user返回ydflow；origin fetch/push均https://github.com/ydflow/research-trail.git，
公开非fork非归档仓库属于本项目，默认main及远程基线均c4e1679b。不存在同名功能分支或打开的PR。
当前32份改动全部属于第19步，沿第9—11节实际授权确认保留来源，不声称全仓MIT。
246份UTF-8源码/102个链接、5份固定参考哈希、30份既有技能/许可工作字节及Git blob、8项忽略探针通过；
常见密钥/禁传文件0，只读复核本项目配置引用的1项凭证，秘密原文源码出现0，未输出秘密。
数据库、账户数据、日志、缓存、构建及截图不在本次提交列表。

复核补测发现两个实际边界：调度器被阻塞时，读取在超时后已返回，原逻辑先看done会将其作为成功；
除息记录若明确标注另一股票，原规则仍用该日期筛选当前股票。新增两项回归修复前2失败/33未选，
修复后完整35项筛选Python通过。现在记录物理完成时刻后判断截止，正常截止前完成不会因调度延迟误判；
除息记录明确不同symbol拒绝，不把其他股票来源作为当前股票候选。保留现有15秒默认超时和槽位约束，
不放宽断言，不改模拟数据制造通过。日志仅Temp/step19-regression-{before,after}.log。

正常本机作者ydflow/noreply及真实时间。按来源概念记录、Python新实现、桌面接入、实际修复分开提交；
没有本轮上游原样资源导入，不能把Python实现提交伪装为上游作者历史。功能分支feat/step-19-screening。
最终本机check.cmd及独立干净源码verify:clean均退出0，504 Python/8 Node/43实际Electron，
零失败/取消/跳过；契约/类型/构建、0014重复迁移/current/check及No new upgrade operations通过。
干净导出246份源码后锁定新装依赖与Electron，根CMD实际启动、关闭/重开与相同历史、无新运行、所属进程退出通过。
178份运行/测试/配置与干净导出逐字节一致，按Git clean-filter规范化后与HEAD blob一致（Windows换行不冒称原字节一致）。
日志仅Temp/research-trail-step19-publication-{check,clean}.log；独立源码research-trail-clean-lViLFl/clean source，
隔离迁移库research-trail-verify-yRin3A、research-trail-verify-Wij7qc，根CMD证据research-trail-cmd-qa-4fgjX4均在Temp。
已正常推送feat/step-19-screening并创建[PR #18](https://github.com/ydflow/research-trail/pull/18)，CI正在执行，尚未合并。
最终head、远程检查和合并回执由根PROJECT_STATE与PR记录，不能将本机通过冒称远程通过。
真实行情/账户、模型解释、安装包、用户逐项亲自操作仍未执行；既有TestClient/Vite提示保留。
