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
