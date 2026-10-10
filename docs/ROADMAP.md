# 研迹：路线、功能对照与当前进度

更新时间：2026-10-10（Asia/Shanghai）。本文件记录计划与阶段状态，不代表未来步骤已经获得执行或发布授权。

## 当前执行边界

- 第二阶段 P2-01：验收通过（本机离线工程基线与架构文档范围）。main `7d12da5204d7119dbd71818bbeaa8207b6aeb731`，当轮696 Python / 19 Node / 58实际Electron通过；见 [工程基线](PHASE2-BASELINE.md)、[pi架构决策](PHASE2-PI-ARCHITECTURE.md) 与 EVIDENCE 第60节。公开审查仅移除新文档中的本机目录，保留历史检查与架构结论。
- 第二阶段 P2-02：验收通过（本机离线开发桥范围）。真实固定 pi-agent-core/ai 1.1.0、独立Node Worker、Python整批许可/顺序工具桥已实现；开发轮736 Python/34 Node/58实际Electron通过，详见 [PI-BRIDGE](PHASE2-PI-BRIDGE.md)、EVIDENCE第61节。默认Python AgentRunner/正式API/UI/业务数据库不切换；Windows新安装包、真实模型均未执行。P2-03未开始。
- P2-01/P2-02 合并阶段记录（在 main 上随 [PR #29](https://github.com/ydflow/research-trail/pull/29) 普通 Merge Commit 合并后生效）：两阶段已合并。审查验收736 Python/35 Node/58实际Electron通过，失败/跳过0；默认Python AgentRunner未切换。真实模型桥接、Node运行时分发、Windows新安装包均未验收；proxy-agent-negotiate@1.1.0 完整版权声明缺口仍是分发阻塞。合并核对与回执见 EVIDENCE 第63节；P2-03未开始，不创建Release。
- 第 0 步：验收通过，七份材料与本地 Git 已核对，证据见 EVIDENCE.md。
- 第 1 步：代码完成/待验收；类型、构建、后端与实窗自动化已通过，用户手动验收未完成。
- 第2步：验收通过；固定模拟行情、契约生成和局部组件适配已实现，自动化复验通过，用户本轮明确按已验收步骤发布；逐项手动记录和练习待补。
- 第2步发布：以 [PR #1](https://github.com/ydflow/research-trail/pull/1) 交付并保留提交；用户补充原作者复用授权确认后，公开范围阻塞已解除。过程记录见EVIDENCE第9—11节，最终状态以GitHub与发布回执为准。
- 第3步：验收通过；SQLite四类记录、会话操作、固定测试运行和有限SSE已实现，Python29项、Electron8项、重复迁移与模型一致性复验通过，用户本轮明确按已验收步骤发布；逐项手动及练习记录待补。交付为 [PR #2](https://github.com/ydflow/research-trail/pull/2)，发布记录见EVIDENCE第13节。
- 第4步：验收通过；Python命名工具、FakeModelProvider、最小Agent运行、工具事件和结果卡片已实现，fixture变化/调用证据/错误终态/旧库升级自动化通过；发布复验Python54项、Electron9项通过，用户本轮明确按已验收步骤发布。逐项手动和练习记录待补；交付为 [PR #3](https://github.com/ydflow/research-trail/pull/3)，发布记录见EVIDENCE第15节。
- 第5步：验收通过；后台规则运行、主动取消、工具/整体超时、唯一终态、先取消后删除及重启中断已实现；发布复验Python67项、Electron实窗10项、类型/构建及重复迁移通过，用户本轮明确按已验收步骤发布。逐项手动及练习记录待补；交付为 [PR #4](https://github.com/ydflow/research-trail/pull/4)，发布证据见EVIDENCE第17节。
- 第6步：验收通过；数据库一致快照、活动SSE订阅、断流续读和去重、刷新/会话切换清理、工具状态与历史显示已实现。发布复验Python72项、传输/适配5项、Electron实窗12项、契约/类型/构建及重复迁移通过，用户本轮明确按已验收步骤发布；交付为 [PR #5](https://github.com/ydflow/research-trail/pull/5)，逐项手动及学习待填，证据见EVIDENCE第18—19节。
- 第7步：验收通过；完整pytest73项、Node离线/传输8项、Electron12项、契约/类型/构建、重复迁移、干净源码锁定安装与根CMD真实启动/重启历史通过。v0.1.0源码可发布，仅假模型＋模拟数据；用户亲自清单待填。开发轮未提交或上传；本轮以 [PR #6](https://github.com/ydflow/research-trail/pull/6)交付，仅发布第7步，远程CI及发布复验单独见EVIDENCE第21节，开发验收见ACCEPTANCE-v0.1.0.md及第20节。
- 第8步：验收通过（本机自动验收，用户亲自/学习记录待填）；设置/连接/个人资料/诊断已接入Python，五类独立配置与健康、Windows系统凭证存储、配置变更/缺凭证失效、假连接测试及脱敏导出。Python90/Node8/Electron13项统一验收通过，最终界面针对性复验通过；开发与发布复验见EVIDENCE第22—23节，按本步独立授权通过 [PR #7](https://github.com/ydflow/research-trail/pull/7)交付；最终合并状态以GitHub与发布回执为准。
- 第9步：验收通过（模拟协议与本机完整自动验收，一次真实模型工具验证通过）；Python OpenAI兼容适配、共用工具循环、参数白名单、8轮/次及120秒默认限制、取消与固定错误码已实现。模拟协议40项与完整Python130/Node8/Electron14均通过；开发轮未配置模型；发布轮本机配置后2次模型请求、1次工具回传、8个事件、completed通过，行情仍为模拟。证据见EVIDENCE第24—25节。
- 第10步：验收通过（模拟与本机自动验收）；官方Longbridge 5.2.0 SDK、缺口只读CLI、Massive REST、独立配置/凭证/能力状态、来源/时效/缓存标记及本机查询入口已实现。完整Python225/Node8/Electron15通过；本轮无凭证，三个真实验证均未执行/0业务查询。范围见PROVIDER-COVERAGE-step10.md，开发证据见EVIDENCE第26节，独立发布复验与 [PR #9](https://github.com/ydflow/research-trail/pull/9)交付见第27节。
- 第11步：验收通过（模拟与本机自动实窗）；持久自选及七个证券视图接入Python，七视图各成功/缺失/失败案例、股票上下文/迟到响应/重启保持通过。完整Python254/Node8/Electron19通过，证据见EVIDENCE第28节及ACCEPTANCE-step11.md。开发轮无真实行情请求或提交/发布；独立发布轮复验及[PR #10](https://github.com/ydflow/research-trail/pull/10)交付记录见EVIDENCE第29节。
- 第12步：验收通过（自造CSV、模拟/假SDK与本机实窗）；Python Decimal组合计算、CSV预览/非法与重复检查/事务确认/撤销、账户隔离、0008持久化及组合页面已实现。最终Python289/Node8/Electron22与契约/类型/构建/重复迁移通过，见ACCEPTANCE-step12.md及EVIDENCE第30节；真实账户未验证、用户亲自记录待填写。开发轮未提交/发布；本次独立发布复验通过，[PR #11](https://github.com/ydflow/research-trail/pull/11)及最终合并见EVIDENCE第31节和实际GitHub回执。
- 第13步：验收通过（自造组合、固定行情/模拟协议及本机实窗）；Python风险与13项股票对比、分币种/期间/缺失处理、同源HTTP/Agent快照和结果组件已实现。开发334/8/26见第32节；独立发布审查修复舍入边界，修复后Python340/Node8/Electron26及契约/类型/构建/0008重复迁移和干净源码/CMD重启通过，见ACCEPTANCE-step13.md及EVIDENCE第33节；通过[PR #12](https://github.com/ydflow/research-trail/pull/12)交付，真实数据和用户亲自记录未验证，最终远程CI/合并以GitHub与回执为准。
- 第14步：验收通过（模拟/本机自动）；Python同一能力注册表、技能目录/开关/依赖/按需安全资料读取和技能页已实现，首批两项基线资源保留来源。完整结果见ACCEPTANCE-step14.md与EVIDENCE第34节，独立发布复验见第35节；真实服务和用户亲自记录未验证，最终发布状态以对应PR与发布回执为准。
- 第15步：验收通过（模拟/本机自动）；Python固定8策略与结构化采集、4并发/20秒、整体取消、部分失败/全失败及计划/逐项记录/结果保存已实现。清单见ACCEPTANCE-step15.md，证据见EVIDENCE第36节；开发轮未提交/发布；独立发布复验见EVIDENCE第37节，最终PR/合并以实际Git与回执为准；真实服务和用户亲自记录未验证。
- 第16步：本机功能验收通过；结构化报告、执行证据/原始事实、不可覆盖版本、Markdown和实际两报告Diff已实现。固定合成器/模拟协议/本机桌面通过，发布复验一次真实LLM请求完成、37条模拟事实可追溯；此前五次失败保留。真实调用证明结构和保存，不证明分析正确或真实行情就绪；见ACCEPTANCE-step16.md与EVIDENCE第38—39节，发布状态以Git/PR回执为准。
- 第17步：验收通过（模拟/协议/本机自动）；Python事务检查点、显式恢复/重新发起/放弃已实现，发布复验修复延迟放弃回执竞态，最终隔离完整451 Python / 8 Node / 39实际Electron及0012迁移通过。报告恢复零自动模型请求；来源及验收见ACCEPTANCE-step17.md、SOURCES-step17.json与EVIDENCE第40—41节。[PR #16](https://github.com/ydflow/research-trail/pull/16)已普通合并；main CI首次SSE超时及第二次通过均保留，最终回执见根PROJECT_STATE。
- 第18步：验收通过（模拟/本机自动）；论点转换、追加版本编辑、显式数据评估与用户复审已实现，18项Python及2项Electron定向通过，完整469 Python/8 Node/41实际Electron及0013迁移通过。来源见SOURCES-step18.json，范围见ACCEPTANCE-step18.md；发布轮修复空列表提交，复验及公开范围见EVIDENCE第43节，[PR #17](https://github.com/ydflow/research-trail/pull/17)已普通合并至c4e1679b，最终main CI回执见根PROJECT_STATE。
- 第19步：验收通过（模拟/本机自动）；17个固定筛选任务、有界股票池和机会发现页已实现，定向33项Python及2项实际Electron通过，完整502 Python/8 Node/43实际Electron、契约/类型/构建和0014重复迁移检查通过。来源SOURCES-step19.json，范围ACCEPTANCE-step19.md及EVIDENCE第44节。开发轮未提交/发布；本次独立发布复核新增两项回归并修复，筛选35项通过，最终本机/独立干净源码504/8/43及根CMD重启历史通过，已创建[PR #18](https://github.com/ydflow/research-trail/pull/18)；CI/合并按EVIDENCE第45节、PR与根发布回执实际记录。
- 第20步：验收通过（固定模拟/本机自动）；Python财报/宏观/央行固定日历、来源时间/时区/精度、稳定去重、不可变快照及事件研究上下文已实现。开发28 Python/3实际Electron及完整532/8/46见EVIDENCE第46节；独立发布复核修复溢出及超时边界，日历31项、发布首轮本机/干净源码535 Python/8 Node/46实际Electron、0015重复迁移及根CMD重启通过，来源SOURCES-step20.json，范围ACCEPTANCE-step20.md；已创建[PR #19](https://github.com/ydflow/research-trail/pull/19)，远程CI的采集等待阻塞已有真实修复、定向5项通过；新535/8/47全套与合并按EVIDENCE第47节、PR/根回执。真实来源/LLM与用户亲自记录未验证。
- 第21步：验收通过（固定数据/本机自动）；八类提醒、五类固定自动化、来源简报及Today已接入Python持久状态和Electron通知；本机与独立干净源码577 Python/12 Node/50实际Electron、0016迁移及根CMD重启通过，另有原生通知show回执。范围见ACCEPTANCE-step21.md与EVIDENCE第48节；真实来源/用户亲自记录未验证。开发轮已停止；本次另获第21步发布授权，复核见EVIDENCE第49节，已创建[PR #20](https://github.com/ydflow/research-trail/pull/20)；最终CI/合并按PR及根PROJECT_STATE实际回执；第21步发布轮未实施22—24，第22步执行记录保留，第23步见当前记录。
- 第22步：验收通过（确定性离线/本机自动）；12原创案例、实验/基线/轨迹/反馈、无效实验无分数、0017持久化及18命名桥已实现；46项Python定向、2项新增实窗、最终独立干净源码623 Python/12 Node/52实际Electron、原创案例CLI、迁移/契约/类型/构建及根CMD重启历史通过，见ACCEPTANCE-step22.md与EVIDENCE第50节。真实追踪连接未执行；开发轮已停止，本次另获第22步发布授权并创建[PR #21](https://github.com/ydflow/research-trail/pull/21)，复核见EVIDENCE第51节，最终CI/合并按PR及根PROJECT_STATE回执。
- 第23步：验收通过（确定性历史样例／本机自动）；Python结果追踪／表现／有界参考权重／版本回滚及投资结果页已实现。本机与独立干净源码均672 Python／12 Node／55实际Electron、历史CLI、0018重复迁移、契约／类型／构建及根CMD重启历史通过；真实历史行情及概率校准／盈利未验证。见ACCEPTANCE-step23.md与EVIDENCE第52节；开发轮已停止，本次另获发布授权，复核见第53节，最终状态按PR及根回执。
- 第24步：验收通过（已执行的源码/本机安装交付范围）。PR #24及发布补齐PR #25已普通合并；v1.0.0已发布安装包及SHA256。696 Python/15 Node/58实际Electron和15本机NSIS阶段通过；独立干净Windows按用户要求跳过／未验证，未签名。真实14成功2失败，最终两模型结构/引用通过但尚未人工质量评审；其他外部能力与投资表现仍未验证。完整边界见ACCEPTANCE-v1.0.0。
- 默认分支 `main`；第0/1步首次上传检查见EVIDENCE第7节，第2步发布检查见第9—10节，提交历史和远程状态以Git为准。
- 状态取值：未开始 / 进行中 / 代码完成/待验收 / 验收通过 / 受阻。
- 来源：固定 ZIP commit `ba5dcdfd31b162f5edb8b908f7f099a560389326`，本地只读路径 `D:\folio\主分支和简历skill\folio-main`。

## 步骤与完成标准

| 步骤 | 本步范围 | 前置步骤 | 验收标准 | 状态 |
| --- | --- | --- | --- | --- |
| 0 | 本地 Git、约定、路线、证据、课程与忽略规则 | 无 | 七份文件一致；main 无提交/远程；无业务和上游写入 | 验收通过 |
| 1 | 桌面与 Python 服务生命周期 | 0 | CMD 一条命令打开；本机随机端口/令牌；失败反馈和退出清理 | 验收通过（模拟/本机自动） |
| 2 | 固定模拟行情与 K 线、股票界面、类型契约 | 1 | 四股票切换、卡片图表一致、未知代码报错、固定市场时间 | 验收通过 |
| 3 | SQLite/SQLAlchemy/Alembic，会话/消息/运行/事件与 SSE | 2 | 两会话隔离；重启历史；先存后发；按序事件；重复迁移 | 验收通过 |
| 4 | 假模型 Agent、Python 工具注册与结果卡片 | 3 | 调用数据工具；fixture 改变结果；假模型标签；错误不伪装成功 | 验收通过 |
| 5 | 取消/超时竞争、删会话、重启中断 | 4 | 唯一终态，无永久 running；保留部分结果，不自动重调用 | 验收通过 |
| 6 | 对话界面、快照恢复、事件重连和去重 | 5 | 会话不串消息；运行 ID+序号去重；历史不重执行 | 验收通过 |
| 7 | 首版验收、离线 CI、干净源码启动、说明 | 6 | 相关检查通过；桌面人工另验；仅准备 v0.1.0，不自动发布 | 验收通过 |
| 8 | 模型/行情/账户设置、凭证、个人资料、诊断 | 7 | 独立健康状态；系统凭证存储；日志/接口不返密钥；先假连接 | 验收通过 |
| 9 | OpenAI 兼容模型与工具循环 | 8 | 默认 8 轮工具/整体 120 秒；只读参数校验；可取消；真实验证另记 | 验收通过 |
| 10 | Longbridge、Massive 与只读账户适配 | 9 | 能力覆盖表；权限/缓存/延迟标识；真实失败不静默回退模拟 | 验收通过（模拟；真实未验证） |
| 11 | 自选、概览、行情、K线、财报、新闻、市场状态 | 10 | 股票上下文正确，来源时间可见，缺指标为 —，视图故障案例 | 验收通过（模拟/本机自动） |
| 12 | 组合 CSV 导入、现金/持仓和资产计算 | 11 | 预览、重复/非法检查、撤销；模拟账户隔离；多币种不直接加 | 验收通过（模拟/本机自动） |
| 13 | 组合风险与 2—4 股票对比 | 12 | 确定性数值可手算，页面/Agent同源，空组合/缺指标可解释 | 验收通过（模拟/本机自动） |
| 14 | 单一能力注册、技能目录、依赖与按需加载 | 13 | 工具/UI/技能同状态，启用禁用准确，拒绝路径越界 | 验收通过（模拟/本机自动） |
| 15 | 8 种研究策略和结构化能力采集 | 14 | 默认并发 4、单项 20 秒；取消/部分失败；全失败不标成功 | 验收通过（模拟/本机自动） |
| 16 | 结构报告、证据、导出、Research Diff | 15 | 数据包驱动；事实/分析/预测分开；证据可追；两报告真实差异 | 验收通过（本机功能及单次真实LLM结构验证） |
| 17 | 研究检查点、显式恢复/重启/放弃 | 16 | 已采集复用；配置变化/缺证据有反馈；不自动消费模型或重复报告 | 验收通过（模拟/本机自动） |
| 18 | 投资论点、版本、复审和重评 | 17 | 报告转论点，历史不覆盖，缺新数据不编判断 | 验收通过（模拟/本机自动） |
| 19 | 17 个筛选任务与机会发现 | 18 | 有界池、确定性筛选、来源记录；候选可入自选/对比/研究 | 验收通过（模拟/本机自动） |
| 20 | 财报/宏观/央行事件日历 | 19 | 固定事件先验，时区跨日正确，去重与事件上下文研究 | 验收通过（固定模拟/本机自动） |
| 21 | 提醒/自动化/简报/Today 聚合 | 20 | 固定时钟触发/冷却/重启/去重；仅应用运行时调度 | 验收通过（固定数据/本机自动） |
| 22 | Agent 评测、本地 trace、反馈、外部追踪 | 21 | 离线 CI；未执行/取消/错误/差质量分开；追踪默认关闭与脱敏 | 验收通过 |
| 23 | 研究结果、表现、置信度校准和权重 | 22 | 无未来数据；不足样本与窗口未到不假评分；版本可回滚 | 验收通过（固定历史／本机自动；真实概率缺失） |
| 24 | 完整功能对照、Windows 打包和交付验收 | 23 | PyInstaller+Electron Builder；SHA256及验证边界，独立OS验收按用户要求跳过 | 验收通过（源码/本机交付；独立OS未验证） |

步骤按用户逐条发送的顺序推进；后续实现不能反过来被记为前置步骤已经验收。

## 功能对照与来源索引

以下相对路径都相对于 **只读参考 Folio**。研迹第1—6步健康、固定行情、持久化、规则Agent、运行生命周期及会话快照/事件恢复、第8步设置/凭证/假连接/诊断、第9步模型适配/受限工具循环及第10步数据/只读账户适配、第11步七个证券视图、第12步组合导入/计算及第13步风险/股票对比、第14步能力/技能目录与第15步研究采集已实现；第16步报告本机功能和一次真实LLM结构验证通过，第17步检查点和显式恢复、第18步论点版本与显式复审、第19步有界筛选、第20步固定事件日历和第21步应用运行时提醒/自动化/Today已实现，第22步见当前记录，第23步见当前记录，第24步源码/本机交付验收通过，独立OS按用户要求跳过、外部边界保留，具体见发布验收；参考源码存在仅能证明有可阅读的实现，不能证明本机运行或生产正确。

| 功能组 | 参考源码位置 | 研迹计划承担方 / 步骤 | 研迹实现 / 验证 |
| --- | --- | --- | --- |
| Electron 窗口与通信 | `apps/electron/src/main/index.ts`；`src/preload/index.ts` | Electron 管桌面/Python 进程，步骤1 | 健康链已实现 / 本机实窗自动化通过；用户手动待验 |
| 前端客户端与类型 | `packages/ui/src/client.tsx`；`packages/core/src/index.ts` | Python/OpenAPI + TS 适配，步骤2/3 | 行情、会话/消息/运行/事件契约生成已实现 / 一致性与类型检查通过 |
| 行情、K线、模拟来源 | `packages/shared/src/agent/demo-market-data.ts`；`packages/ui/src/components/workspace` | Python Provider + 页面，步骤2/11 | 四股票固定Fixture与局部界面已实现 / 后端、实窗自动化通过；第11步七视图与持久自选已实现/模拟及实窗通过，真实数据验证未执行 |
| 会话、运行、取消和事件 | `packages/shared/src/kernel/session-manager.ts`、`run-manager.ts`、`stream-event-log.ts`；`packages/core/src/stream-events.ts`；UI的`atoms/streamAtoms.ts`、`components/agent/ToolActivity.tsx` | Python 内核/SQLite/SSE及前端适配，步骤3—6 | 四类持久化、生命周期、一致快照及活动SSE续读已实现 / 隔离、唯一终态、刷新、重连去重、切换解除及迁移自动化见证据；仅显示恢复，不恢复执行 |
| 本地规则与真实模型 | `packages/shared/src/agent/intent-router.ts`、`local-finance-agent-backend.ts`、`pi-runtime-adapter.ts` | 独立 FakeModel/OpenAI 兼容 Python Runtime，步骤4/9 | Python规则/假模型、行情/K线工具及持久结果卡片已实现 / fixture变化、调用证据、错误终态自动化通过；OpenAI兼容模型与受限循环已实现，模拟协议通过；一次真实模型工具验证通过（2次请求、1次工具，模拟行情） |
| 设置、凭证、诊断 | `packages/ui/src/components/settings`；`packages/ui/src/components/profile/ProfileSecurityView.tsx` | Python 健康/系统凭证 + 页面，步骤8 | 五类独立配置/假健康、Windows系统凭证、资料和脱敏JSON导出已实现 / 自动验收通过；真实连接未验证 |
| 行情/账户提供商 | `packages/shared/src/providers/router.ts`、`longbridge`、`massive` | Python SDK/只读CLI适配，步骤10 | 24提供商能力条目、SDK/缺口CLI/Massive已实现；模拟验收通过；真实未验证，见覆盖表 |
| 组合导入与计算 | `packages/shared/src/portfolio-import/parsers.ts`；`packages/core/src/account.ts` | Python 校验/SQLite/计算，步骤12 | 已实现 / 模拟和本机自动验收通过；真实账户未验证 |
| 风险与股票对比 | `packages/shared/src/portfolio-risk/service.ts`；`compare/service.ts` | Python 确定性计算，步骤13 | 已实现 / 手算、模拟协议与本机实窗通过；真实数据未验证，见第13步覆盖表 |
| 能力与技能 | `packages/shared/src/capabilities`；`packages/skill-hub/src/index.ts`；`skills` | Python 注册/读取 + 技能页，步骤14 | 已实现 / 验收结果见第14步清单；真实服务未验证 |
| 研究策略与采集 | `packages/core/src/strategy.ts`；`packages/shared/src/research/planner.ts`、`runner.ts` | Python 编排，步骤15 | 8策略/已有能力采集、默认4并发/20秒、取消及部分失败保存已实现 / 模拟与本机实窗通过；真实行情/账户未验证；报告另见步骤16 |
| 研究报告与证据 | `packages/core/src/research.ts`；`packages/shared/src/research/agent-synth.ts`；`claim-verifier.ts` | Python 数据包/报告/证据，步骤16 | 固定/模拟协议/本机报告、证据、版本、Markdown与实际两报告Diff通过；发布复验一次真实LLM结构/引用通过、此前五次失败保留；分析正确性未通过证明 |
| 研究恢复 | `packages/shared/src/research/service.ts`、`checkpoint.ts`、`repository.ts` | Python 检查点/显式恢复，步骤17 | 已实现 / 同一SQLite事务、成功证据复用、显式新任务/放弃、报告零隐式模型；模拟/协议/本机自动验收通过 |
| 投资论点 | `packages/shared/src/thesis/service.ts`、`repository.ts` | Python 版本/复审，步骤18 | 已实现 / 报告转换、追加版本、可追溯新数据比较与显式用户复审；模拟/本机自动验收通过，真实数据和用户亲自操作未验证 |
| 发现与筛选 | `packages/core/src/screening.ts`；`packages/shared/src/screening/service.ts`、`strategies.ts` | Python 17任务，步骤19 | 已实现 / 模拟小池边界、实窗操作及完整回归通过；真实数据未验证 |
| 事件与催化日历 | `packages/ui/src/components/events/EventsView.tsx`；`packages/core/src/market-data.ts` | Python 事件源 + 页面，步骤20 | 固定三类事件、来源时区/精度/发生状态、去重/原始事实/快照、带事件研究/报告已实现；定向及完整本机通过；真实央行未实现，其他真实覆盖未验证 |
| 提醒/自动化/简报/Today | `packages/shared/src/alerts/engine.ts`；`automation/scheduler.ts`、`brief.ts`；`packages/ui/src/components/today` | Python 调度 + Electron 通知，步骤21 | 已实现 / 固定时钟、本机/干净源码与实窗验收通过；只在运行时执行，关闭漏计划不补跑；默认关闭的财报自动采集不调用模型报告 |
| Agent 评测与追踪 | `packages/shared/src/evaluation/experiment-service.ts`、`evaluators`、`langfuse`；`docs/EVALUATION.md` | Python 本地评测/追踪适配，步骤22 | 已实现 / 12原创离线案例、协议桩/本机与干净源码实窗通过；真实外部连接未执行，见第22步清单 |
| 研究结果与校准 | `packages/shared/src/outcome/service.ts`；`performance/service.ts`；`calibration/compute.ts` | Python 结果窗口/统计，步骤23 | 验收通过（固定历史／本机自动）；实际行情／概率校准未验证 |
| 打包与发布 | `apps/electron/package.json`；`scripts/release-package.mjs` | Windows Python 打包/安装，步骤24 | 已实现 / v1.0.0安装包及SHA256发布，15本机阶段通过；独立OS跳过、未签名 |

参考课程详细路径见 [tutorial](../tutorial.md)。个别同目录短写路径按前一目录解析。

### 固定策略与筛选范围

参考 8 种策略：comprehensive、value、growth、technical、earnings、event-driven、risk-review、income。

参考 17 个筛选任务：top-gainers、top-losers、high-volume、unusual-movement、low-valuation、high-roe、revenue-growth、high-dividend、quality-growth、strong-momentum、breakout、oversold、trend-reversal、upcoming-earnings、rating-changes、news-surge、dividend-events。

八种研究策略在第15步实现；第19步实现上述17个筛选任务，由同一Python能力/提供商链采集，有界池规则与8种研究计划分别保存。筛选不消费模型，能力/指标缺失不会生成候选；真实全市场扫描未实施。

## 发布与完整验收

- v0.1.0：步骤1—7的本机完整检查与干净源码实窗验收通过，标为“源码可发布（假模型＋模拟数据）”；第7步按用户独立授权交付PR，本轮不打标签或建Release。用户亲自操作清单另记，远程CI见EVIDENCE第21节；真实服务及安装包不在首版验收范围。
- v1.0.0：步骤8—24完成对应功能对照和实际交付检查；权限受限、真实服务未验收、干净安装未验收均列缺口，不自动宣称完整发布。
- “代码实现”“模拟验收”“真实验收”“权限受限”按功能分开，未配置外部服务不得伪造成功。
- 提交、PR、合并、标签和Release分别依据用户当前上传/发布指令；本路线不是外部写入授权。

## 本地操作和下一条提示词

当前可通过根目录 `start-dev.cmd` 运行第1—6步业务、第8步设置、第9步模型适配和第10步提供商验收入口、第11步证券工作台、第12步组合工作台、第13步风险/对比页面与第14步能力/技能页。统一检查为`check.cmd`，干净源码检查为`bun run verify:clean`；用户逐项手动记录、练习与回答待补。第8步PR #7已合并；第9步按用户独立授权通过 [PR #8](https://github.com/ydflow/research-trail/pull/8)交付，开发与发布证据见EVIDENCE第24—25节；最终合并状态以GitHub与发布回执为准，该发布轮未执行第10步；第10步开发模拟验收另见EVIDENCE第26节，发布复验及PR交付见第27节。下面保留第1步原始范围供历史对照，不是重复执行指令。

```text
在D:\folio\research-trail执行第1步。先读取AGENTS.md、docs/ROADMAP.md、docs/EVIDENCE.md和已有文件。
建立最小Electron/React桌面窗口与Python3.12/FastAPI服务。
Electron管理Python子进程；后端本机随机端口及启动令牌；preload白名单，renderer不开Node。
显示研迹、健康状态、启动失败原因和重试入口。根目录提供start-dev.cmd，一条CMD命令启动。
退出只清理本次子进程，不影响其他程序。不搬入完整Folio、不实现行情或Agent。
验收窗口、健康连通、失败反馈和退出清理。更新进度/证据/学习材料，给CMD命令、小练习和三道理解题。
不提交、推送或发布，完成停止。
```

## 当前v1.0.0发布补验

第24步源码已在PR #24合并，main起点24b9bff。本轮只处理该版本发布缺口：概率/置信度Diff/样本保护、冻结真实A/B及完整人工量表、SDK worker与许可声明。当前代码/本机及真实生成证据见ACCEPTANCE-v1.0.0；质量未人工评审、独立干净Windows按用户要求跳过，新安装包/干净源码/远程CI仍需真实回执。表中早期未实现记录保留为历史，不自动继承上游验收。

## 当前发布回执

v1.0.0已发布：[https://github.com/ydflow/research-trail/releases/tag/v1.0.0](https://github.com/ydflow/research-trail/releases/tag/v1.0.0)，标签提交`6e2025437588e3e26748496ca324262e59296b10`；CI 37910204557通过。该发布轮只交付本版本及产品README。上方旧步骤的真实未验/发布状态按对应历史保留，版本验证以ACCEPTANCE-v1.0.0和FEATURE-AUDIT-step24当前表为准；当前第二阶段执行边界见顶部与PHASE2文档，新Worker不属于v1.0.0安装包。
