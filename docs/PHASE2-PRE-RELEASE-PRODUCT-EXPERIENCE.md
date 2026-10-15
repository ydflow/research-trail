# P2-09.6 产品体验修复：本地交付与验收

日期：2026-10-15（Asia/Shanghai）。状态：代码完成/待用户审核（完整本地1166项通过）。仅本地分支 `fix/pre-release-product-experience`；不提交、推送、创建 PR、合并、发布或执行 P2-10。

## 最终本地验收回执（2026-10-15）

完整 `bun.cmd run verify` 退出0：999 Python + 70 Node（24+46）+ 97实际Electron = **1166通过**，失败/取消/跳过/todo均0。原1159项保留，新增2 Node/5 Electron共7项；14个源码/测试/验收脚本哈希前后一致。完整日志 `D:\folio\research-trail-p2-09.6-qa\verify-delivery.log`，机器可读清单 `delivery-manifest.json`，最终截图 `verify-delivery/`。没有将之前的失败或中止记为通过。

首次显式概览6次受控SDK/CLI执行；跨页面、证券页签、概览/新闻、模拟/真实切回新增0；失败刷新新增6，恢复刷新新增6，总18。异步返回及配置失效用例各自也验证没有补发读取。此为真实Electron→preload→Python ProviderService的离线替身计数，外部金融API请求0，不是实际Longbridge行情覆盖证明。

1440×900、1000×700、600×700原生content size与PNG尺寸一致，无整页横向溢出；紧凑卡片、气泡/图标、完整会话宽屏、历史200条/断线恢复、运行中布局切换与取消、报告工具证据均通过。最终主JS 323115 bytes，比main317250增加5865 bytes（1.85%）；没有新增依赖。显示缓存内存随查询上下文增加，无自动过期；旧快照有明确标识，显式刷新更新。没有新增长期RSS/堆压力证明。

中断的verify-accepted.log里两个旧失败标记没有断言详情，精确原因仍未知；resume-focused.log原断言两项通过，本次完整门禁也通过，不能据此宣称永久修复。旧5项布局失败的完整verify-final.log、专项修复和主动中止日志均保留。

无新公开契约、迁移、IPC或依赖，**不需要额外契约审批**。当前状态为代码完成/待用户最终审核；未暂存、提交、推送、PR、合并、发布或执行P2-10。旧段落中的“运行中”是过程记录，最终结果以本回执为准。

## 起点与证据位置

- 开发前读取 AGENTS、仓库外 PROJECT_STATE、ROADMAP、EVIDENCE。
- 本地 main、origin/main、`git ls-remote` 远程 main 一致：`1f26d5a4a2090a72a9f841d4798327829375c7e0`；工作区/暂存区干净后创建独立分支。
- [合并后 main CI 38712234097](https://github.com/ydflow/research-trail/actions/runs/38712234097)：completed/success，event=push，精确对应此 Merge SHA。现场只读查询，未重跑远程 CI。
- QA 目录：`D:\folio\research-trail-p2-09.6-qa`，图片、原始失败、完整日志与测试临时数据均不提交到 Git。
- Browser plugin not available。按用户要求使用仓库现有 Playwright `_electron`，实际 Electron + preload + Python + 隔离 SQLite；1440×900、1000×700、600×700 使用原生窗口 content size 并核对实际 innerWidth/innerHeight。
- 证券“真实模式”回归在测试进程注入受控 SDK/CLI executor，保留实际 ProviderService、参数校验、请求身份、SecurityWorkspace 和 IPC 链。它验证 real 分支与调用次数，**不是外部 Longbridge 数据验证**。外部网络被离线护栏禁止，无私人凭证写入。

## 四类根因、复现与修复

| 问题 | 实际复现 / 根因 | 最小修复 |
| --- | --- | --- |
| 真实查询跨页丢失 | App 的条件分支/资产 key 卸载证券页；组件本地 result、模式及概览 data 丢失。Overview effect 每次挂载重新组合读取。Provider 短 TTL 缓存不能保存界面快照。修前返回模式为 simulated，实际6次 Provider 受控执行。 | App 级内存 SecuritySnapshots 保存显示快照与控制项；统一完整查询身份；Overview 改为纯展示，所有读取由 Workspace 控制；返回只读已有快照。 |
| 财报、新闻、资料过长 | 120行受控财报全部进入 DOM，实测卡片约5109.6px；20条长新闻直接展开。 | 总览财报默认4行、新闻默认3条、资料默认4项；查看全部/展开详情可达完整字段；摘要折叠保留原始链接，表格独立滚动，首页卡片上限540px。 |
| 助手历史/滚动/层次 | 历史用横向 flex 列表，缺少顶部历史/轨迹入口；多个容器参与滚动；无“是否处于底部”的跟随控制。 | 顶部新会话/历史记录/执行轨迹；历史抽屉；气泡及研迹图标；消息区独立滚动，输入区为独立 flex 区；距底部48px内才跟随，翻旧页保留锚点；ResizeObserver 处理流式/延迟排版并清理。 |
| 完整会话空右栏 | sessions 中央挂完整 SessionPanel，右栏仍占第三列显示提示。切换时两处 SessionPanel 卸载重建。 | 同一个常驻 SessionPanel 用 compact 属性切换，切换时只读刷新会话列表/历史以同步外部新增会话；sessions 变为两列网格，原宿主使用中央剩余宽度，无“常驻研究助手”重复栏；其他14导航仍显示侧边助手。 |

修复前证据：`before/baseline.json`、`before/p2-09.6-security-1440.png`、`before/p2-09.6-sessions-before.png`、`baseline-5.log`（实际 Electron 复现通过）。基线构建来自已验证 main。前四次复现脚本准备失败分别为 Python 导入路径、漏计 CLI executor、并发计数文件写入、报表显示字段断言，日志 baseline.log / baseline-2～4.log 均保留；没有修改业务来伪造复现。

## 快照生命周期与失效

1. 生命周期是当前 App 渲染会话；页面/证券页签切换保留。刷新整个窗口、程序退出或后端离线后清空。没有 localStorage / sessionStorage 金融响应、明文凭证或新 SQLite 持久缓存。现有 sessionStorage 仍仅保存导航/会话 ID 等旧轻量信息。
2. key 包括 symbol、provider、mode、view、period、kind、report、offset、Provider 公开 revision/configured/credential_present；自选列表还包含完整自选证券序列。选择证券引起的 watchlist revision 不用于普通证券数据 key，避免仅选择后无法复用原证券快照。
3. 配置/凭证保存、删除成功时立即通过 ProviderPanel 回调失效该 Provider 快照；重挂证券页再读取原有公开 Profile 校验版本。额外回归覆盖“删除再创建 revision 又为1”的碰撞。任何实际密钥不进入 key。
4. 同 key 并发读去重。generation/key/mounted 保护当前 UI；服务 epoch / Provider 独立 generation 阻止配置变化或服务离线前启动的迟到结果写回。不同证券/模式只保存各自身份，不能用模拟结果填真实模式。
5. 成功快照没有自动 TTL 过期、不做后台真实刷新，也不因页面挂载调用真实 API。缺少快照显示“等待显式查询”。用户点击查询才获取新真实数据；证券 Workspace 的既有 ReadQuery 使用 use_cache=False，避免显式刷新仍取 Provider 短 TTL 旧响应，其他 Provider 调用入口不变。
6. 失败按 block 保留旧成功内容及其原始 provenance，记录同 key 刷新失败；成功重试清除失败。原始来源、市场/获取/服务时间保留；界面显式“上次查询快照/非实时”，不改写原始获取时间冒充最新。
7. 为满足运行期间可返回的要求，不按时间或条数驱逐成功快照；内存随不同查询身份累积，退出/离线/配置失效时释放。过期风险由快照标识和显式刷新处理；未声称极端长期堆内存/RSS稳定性。

## 会话、证据与真实性

- 未修改默认 Python AgentRunner、Pi、会话数据库 schema、HTTP/IPC 名称、金融计算或 Provider 授权逻辑。
- 复用原 SQLite SessionHistoryPage、分页/SSE水位、取消及迟到保护；没有第二套会话事实源，也不因布局切换执行 Agent。
- 执行轨迹显示保存的 run_started/status/tool_started/tool_result/text_delta/error/cancelled/run_completed 等实际已有事件，工具轨迹、结果卡片、research.report.read 的身份与来源继续可达。可展开完整事件 JSON（完整工具参数/结果及来源）；无自造推理步骤/Token统计。
- 未改变131072/98304/262144及分页容量限制。完整记录/证据不从业务数据库删除。

## 验收与失败记录

最终专项 `focused-final.log`：6 passed，含两个原保护用例与4个新增 Electron 用例。此后审查发现未完成查询跨页返回依赖3秒健康通知的偶然重绘；首个专项 pending-before.log 因此通过，但不能证明独立缓存通知。屏蔽 backend:changed 后 pending-before-controlled.log 确定失败；useSyncExternalStore 订阅修复后，focused-subscription.log 的5个新增Electron全部通过，node-final.log 为9通过。完整 verify 以最终冻结源码重新验收。

- 新增5个 Electron：real模式跨页/页签/模拟隔离/刷新失败恢复/三尺寸；聊天底部跟随与上翻不抢滚动/同组件/同库只读；真实迟到与配置变化；Provider删除重建同revision失效；屏蔽健康状态通知后，返回未完成请求仍由缓存订阅立即重绘且不补发请求。
- 新增2个 Node：完整缓存身份及配置变化中的并发读；逐块失败保留/错误作用域/显式恢复。
- 保留旧测试；导航用例仅适配完整会话宿主，原分页跨会话用例仅增加打开历史抽屉。未删断言、放宽时限或跳过旧项。
- `focused-1～6.log` 保留迭代失败：空自选提示、旧测试未打开历史、测试先保存配置后才读取版本、原生窗口与 DevTools metrics 冲突、滚动容器约束等；均按具体原因修正，没有用增加 timeout 掩盖。
- 首次完整验收在Python阶段主动中止以修复上述缓存订阅问题：verify-interrupted-snapshot-subscription.log / verify-exit.txt=1，不能计为通过。第二次完整 `bun.cmd run verify`（verify-final.log）结束：999 Python、70 Node、97 Electron 中92通过/5失败；全量门禁未通过。失败为摘要首屏位置、Markdown代码局部横滚、常驻组件外部新会话列表未刷新（2例）及固定图标触发旧消息安全断言。保留原断言/时限，分别修正快照提示行占高、JSON样式范围、布局切换只读刷新和固定背景图标。修复后 regressions.log 为13 passed；regressions-active.log 再验执行中布局切换/取消为1 passed。代码以 frozen-source-accepted.json 再次冻结，verify-accepted.log 完整门禁运行中，结果结束后回填；不能把专项通过视为全量通过。

## 调用次数、性能与视觉差异

Provider计数来自测试进程实际 SDK/CLI executor，不是 React mock 或仅 IPC 数。主用例首次显式概览读取6次（资料/估值/报价/K线/财报/新闻）；跨页面、证券标签、概览/新闻、模拟/真实返回增量0；失败刷新新增6、恢复刷新新增6，总18。配置失效和无快照等待增量0。原始逐笔记录在 `accepted/p2-09.6-provider-counts.json`，完整 verify 将独立重复。

默认财报 DOM 120→4行、新闻20→3条，完整数据保留展开/独立滚动；返回快照没有金融网络读取/重复概览组合，前一轮构建主chunk323106 bytes，相对main的317250增加5856 bytes（约1.85%）；最终构建及源码冻结哈希以最终回执核验。内存增加为当前会话的显示 DTO；单个 SessionPanel 避免切换完整页产生第二实例；Observer 在布局变化/卸载时清理。没有进行新的长期RSS基准或外部服务延迟测量。返回证券页增加一次并行的既有Provider Profile只读元数据校验，不调用金融Provider；显式概览的5个既有视图并行（资料/估值两项加其余四项，最多6项能力读取），总读取数量未增加，但真实SDK的瞬时并发和速率限制未做在线验证。

参考图方向采用紧凑卡片、留白、三栏层次、聊天气泡和顶部入口。保留当前真实K线组件、原始时间/币种/缺失说明及证据，未复制概念图的行情、财务或AI数字；小窗口采用纵向页面/独立会话滚动，导航仍全部可达。截图中的 real-mode 数值来自明确的离线测试替身，不是市场行情。

## 修改文件与审批

业务源码：App.tsx、ProviderPanel.tsx、SessionPanel.tsx、main.tsx、securities/SecurityWorkspace.tsx、SecurityOverview.tsx、SecurityViews.tsx、新增security-snapshots.ts、新增ui/product-experience.css；Python仅security_workspace.py既有查询增加use_cache=False。

测试：tests/desktop.test.cjs、tests/stability.test.cjs、新增tests/product-experience-fixture.py（仅测试进程导入，不从生产入口加载）。文档：本说明、ROADMAP、EVIDENCE及仓库外PROJECT_STATE。

无新公开契约/数据库/IPC/依赖/真实API端点；本轮不需要额外契约审批。跨重启缓存、数据库迁移、新契约及P2-10继续不在授权范围。用户视觉与最终代码审核仍待完成。

## 参考图与实际截图对照

| 用户参考 | 实际 Electron 证据（QA目录下，最终verify-delivery/） | 采用与保留 |
| --- | --- | --- |
| 问题图1、概念图5 | verify-delivery/p2-09.6-compact-cards-1440.png；security-1000/600.png | 紧凑摘要、独立滚动、可展开全文；实际来源/缺失值/币种保留，K线不替换。 |
| 问题图3、概念图5 | verify-delivery/p2-09.6-assistant-1440/1000/600.png | 顶部操作、轻量历史、气泡及图标；过程只显示真实持久化事件，不复刻图中的“分析思考”步骤。 |
| 问题图4 | verify-delivery/p2-09.6-full-chat-1440/1000/600.png | 完整会话用剩余宽度，历史与消息/工具/输入分层；窄窗纵向可操作，没有整页横向溢出。 |

### 本地复核命令

```cmd
cd /d "D:\folio\research-trail"
call bun.cmd run verify
```

可选小改动练习：只调整 product-experience.css 中新闻摘要入口字号，重新截图比较，不改请求链。理解核对：为什么 mode 必须进入缓存身份；为什么界面快照不能标成实时；为什么布局切换不应创建或重新执行 Agent Run。

### 逐文件职责

| 文件（仓库相对路径） | 修改目的 |
| --- | --- |
| apps/desktop/src/renderer/App.tsx | App内存缓存生命周期；只挂载一套会话组件；完整会话网格。 |
| apps/desktop/src/renderer/ProviderPanel.tsx | 成功修改配置/凭证时立即失效相关显示缓存。 |
| apps/desktop/src/renderer/SessionPanel.tsx | 顶部入口、历史抽屉、底部跟随、旧页锚点、持久化轨迹展开；布局切换只读刷新。 |
| apps/desktop/src/renderer/main.tsx | 在基础样式后加载本轮作用域样式。 |
| apps/desktop/src/renderer/securities/SecurityWorkspace.tsx | 完整查询身份、显式刷新、内存订阅及跨页控制项保留。 |
| apps/desktop/src/renderer/securities/SecurityOverview.tsx | 去除挂载时请求；仅组合显示现有缓存DTO。 |
| apps/desktop/src/renderer/securities/SecurityViews.tsx | 紧凑摘要/完整展开；原始来源与获取记录措辞。 |
| apps/desktop/src/renderer/securities/security-snapshots.ts（新增） | 运行期间内存显示快照、同身份去重、配置代次、失败保留、订阅通知。 |
| apps/desktop/src/renderer/ui/product-experience.css（新增） | 紧凑卡片、历史抽屉、消息气泡、独立滚动与宽屏会话。 |
| services/backend/research_trail/security_workspace.py | 证券页既有查询use_cache=False，保证显式刷新读取新数据。 |
| tests/desktop.test.cjs | 新增5个实际Electron回归；原导航/历史操作适配入口，无旧断言删除或时限放宽。 |
| tests/stability.test.cjs | 新增2个缓存身份、并发、失效及失败恢复回归。 |
| tests/product-experience-fixture.py（新增） | 仅测试子进程SDK/CLI受控替身及线程安全计数，保留真实Python业务链。 |
| scripts/verify.mjs | Electron门禁使用TAP即时记录失败详情，测试/时限不变。 |
| docs/PHASE2-PRE-RELEASE-PRODUCT-EXPERIENCE.md（新增） | 本轮设计、根因、回执、视觉及风险边界。 |
| docs/ROADMAP.md | 本轮本地阶段与待用户审核状态。 |
| docs/EVIDENCE.md | 本轮实际证据及验收记录。 |

仓库外PROJECT_STATE会追加本轮交接，原历史字节保留；不修改其他任务文件。

## 中断后继续（2026-10-15）

用户中断后明确“继续工作”。恢复时后台进程已停止，verify-accepted.log 没有终态/退出回执；源码13文件与冻结哈希一致。该中断日志留下Step21自动采集和Step17采集中断两个失败标记，但尚无断言详情，不把它们归因为中断或宣称已修复。相同离线环境、原断言/原时限的resume-focused.log两项通过，仅证明独立重测通过。

为避免验收中断时再次丢失具体错误，scripts/verify.mjs仅为Electron增加--test-reporter=tap，逐项即时输出断言详情；没有改变测试集合、断言、时限、执行顺序或产品代码。重新完整bun.cmd run verify使用verify-complete.log及verify-complete/截图目录，结果以结束后的正式回执为准。

### TAP诊断发现测试编辑重复（已还原旧用例）

verify-complete.log为999 Python/70 Node通过、97 Electron中96通过/1失败；唯一失败是旧P2-09长会话用例意外重复插入本轮执行中切换片段，触发nav is not defined。它是本轮测试编辑错误，不归因为产品故障；旧长会话用例已逐字还原main正文，新增场景只保留在新P2-09.6用例。证明restored-long-history-proof.txt，完整diff在desktop-final.diff，原失败日志不覆盖。最终全量使用verify-delivery.log，以其实际终态为准。


## 最终实际Electron截图（离线受控数据）

| 页面 | 1440×900 | 1000×700 | 600×700 |
| --- | --- | --- | --- |
| 证券工作台 | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-security-1440.png) | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-security-1000.png) | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-security-600.png) |
| 完整会话 | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-full-chat-1440.png) | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-full-chat-1000.png) | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-full-chat-600.png) |
| 侧边助手 | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-assistant-1440.png) | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-assistant-1000.png) | [查看](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-assistant-600.png) |

[紧凑卡片](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-compact-cards-1440.png) · [聊天气泡与真实保存回复](D:/folio/research-trail-p2-09.6-qa/verify-delivery/p2-09.6-chat-bubbles-1440.png)。截图尺寸及SHA256逐一登记在delivery-manifest.json；用户概念图和问题截图原样保存在QA的references/。
