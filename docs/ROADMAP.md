# 研迹：路线、功能对照与当前进度

更新时间：2026-10-04（Asia/Shanghai）。本文件记录计划与阶段状态，不代表未来步骤已经获得执行或发布授权。

## 当前执行边界

- 第 0 步：验收通过，七份材料与本地 Git 已核对，证据见 EVIDENCE.md。
- 第 1 步：代码完成/待验收；类型、构建、后端与实窗自动化已通过，用户手动验收未完成。
- 第2步：验收通过；固定模拟行情、契约生成和局部组件适配已实现，自动化复验通过，用户本轮明确按已验收步骤发布；逐项手动记录和练习待补。
- 第2步发布：以 [PR #1](https://github.com/ydflow/research-trail/pull/1) 交付并保留提交；用户补充原作者复用授权确认后，公开范围阻塞已解除。过程记录见EVIDENCE第9—11节，最终状态以GitHub与发布回执为准。
- 第3步：验收通过；SQLite四类记录、会话操作、固定测试运行和有限SSE已实现，Python29项、Electron8项、重复迁移与模型一致性复验通过，用户本轮明确按已验收步骤发布；逐项手动及练习记录待补。交付为 [PR #2](https://github.com/ydflow/research-trail/pull/2)，发布记录见EVIDENCE第13节。
- 第4步：验收通过；Python命名工具、FakeModelProvider、最小Agent运行、工具事件和结果卡片已实现，fixture变化/调用证据/错误终态/旧库升级自动化通过；发布复验Python54项、Electron9项通过，用户本轮明确按已验收步骤发布。逐项手动和练习记录待补；交付为 [PR #3](https://github.com/ydflow/research-trail/pull/3)，发布记录见EVIDENCE第15节。
- 第5步：验收通过；后台规则运行、主动取消、工具/整体超时、唯一终态、先取消后删除及重启中断已实现；发布复验Python67项、Electron实窗10项、类型/构建及重复迁移通过，用户本轮明确按已验收步骤发布。逐项手动及练习记录待补；交付为 [PR #4](https://github.com/ydflow/research-trail/pull/4)，发布证据见EVIDENCE第17节。
- 第6步：验收通过；数据库一致快照、活动SSE订阅、断流续读和去重、刷新/会话切换清理、工具状态与历史显示已实现。发布复验Python72项、传输/适配5项、Electron实窗12项、契约/类型/构建及重复迁移通过，用户本轮明确按已验收步骤发布；交付为 [PR #5](https://github.com/ydflow/research-trail/pull/5)，逐项手动及学习待填，证据见EVIDENCE第18—19节。
- 第7步：验收通过；完整pytest73项、Node离线/传输8项、Electron12项、契约/类型/构建、重复迁移、干净源码锁定安装与根CMD真实启动/重启历史通过。v0.1.0源码可发布，仅假模型＋模拟数据；用户亲自清单待填。开发轮未提交或上传；本轮以 [PR #6](https://github.com/ydflow/research-trail/pull/6)交付，仅发布第7步，远程CI及发布复验单独见EVIDENCE第21节，开发验收见ACCEPTANCE-v0.1.0.md及第20节。
- 第8—24步：未开始；没有用户具体指令不继续。
- 默认分支 `main`；第0/1步首次上传检查见EVIDENCE第7节，第2步发布检查见第9—10节，提交历史和远程状态以Git为准。
- 状态取值：未开始 / 进行中 / 代码完成/待验收 / 验收通过 / 受阻。
- 来源：固定 ZIP commit `ba5dcdfd31b162f5edb8b908f7f099a560389326`，本地只读路径 `D:\folio\主分支和简历skill\folio-main`。

## 步骤与完成标准

| 步骤 | 本步范围 | 前置步骤 | 验收标准 | 状态 |
| --- | --- | --- | --- | --- |
| 0 | 本地 Git、约定、路线、证据、课程与忽略规则 | 无 | 七份文件一致；main 无提交/远程；无业务和上游写入 | 验收通过 |
| 1 | 桌面与 Python 服务生命周期 | 0 | CMD 一条命令打开；本机随机端口/令牌；失败反馈和退出清理 | 代码完成/待验收 |
| 2 | 固定模拟行情与 K 线、股票界面、类型契约 | 1 | 四股票切换、卡片图表一致、未知代码报错、固定市场时间 | 验收通过 |
| 3 | SQLite/SQLAlchemy/Alembic，会话/消息/运行/事件与 SSE | 2 | 两会话隔离；重启历史；先存后发；按序事件；重复迁移 | 验收通过 |
| 4 | 假模型 Agent、Python 工具注册与结果卡片 | 3 | 调用数据工具；fixture 改变结果；假模型标签；错误不伪装成功 | 验收通过 |
| 5 | 取消/超时竞争、删会话、重启中断 | 4 | 唯一终态，无永久 running；保留部分结果，不自动重调用 | 验收通过 |
| 6 | 对话界面、快照恢复、事件重连和去重 | 5 | 会话不串消息；运行 ID+序号去重；历史不重执行 | 验收通过 |
| 7 | 首版验收、离线 CI、干净源码启动、说明 | 6 | 相关检查通过；桌面人工另验；仅准备 v0.1.0，不自动发布 | 验收通过 |
| 8 | 模型/行情/账户设置、凭证、个人资料、诊断 | 7 | 独立健康状态；系统凭证存储；日志/接口不返密钥；先假连接 | 未开始 |
| 9 | OpenAI 兼容模型与工具循环 | 8 | 默认 8 轮工具/整体 120 秒；只读参数校验；可取消；真实验证另记 | 未开始 |
| 10 | Longbridge、Massive 与只读账户适配 | 9 | 能力覆盖表；权限/缓存/延迟标识；真实失败不静默回退模拟 | 未开始 |
| 11 | 自选、概览、财报、新闻、市场状态 | 10 | 股票上下文正确，来源时间可见，缺指标为 —，视图故障案例 | 未开始 |
| 12 | 组合 CSV 导入、现金/持仓和资产计算 | 11 | 预览、重复/非法检查、撤销；模拟账户隔离；多币种不直接加 | 未开始 |
| 13 | 组合风险与 2—4 股票对比 | 12 | 确定性数值可手算，页面/Agent同源，空组合/缺指标可解释 | 未开始 |
| 14 | 单一能力注册、技能目录、依赖与按需加载 | 13 | 工具/UI/技能同状态，启用禁用准确，拒绝路径越界 | 未开始 |
| 15 | 8 种研究策略和结构化能力采集 | 14 | 默认并发 4、单项 20 秒；取消/部分失败；全失败不标成功 | 未开始 |
| 16 | 结构报告、证据、导出、Research Diff | 15 | 数据包驱动；事实/分析/预测分开；证据可追；两报告真实差异 | 未开始 |
| 17 | 研究检查点、显式恢复/重启/放弃 | 16 | 已采集复用；配置变化/缺证据有反馈；不自动消费模型或重复报告 | 未开始 |
| 18 | 投资论点、版本、复审和重评 | 17 | 报告转论点，历史不覆盖，缺新数据不编判断 | 未开始 |
| 19 | 17 个筛选任务与机会发现 | 18 | 有界池、确定性筛选、来源记录；候选可入自选/对比/研究 | 未开始 |
| 20 | 财报/宏观/央行事件日历 | 19 | 固定事件先验，时区跨日正确，去重与事件上下文研究 | 未开始 |
| 21 | 提醒/自动化/简报/Today 聚合 | 20 | 固定时钟触发/冷却/重启/去重；仅应用运行时调度 | 未开始 |
| 22 | Agent 评测、本地 trace、反馈、外部追踪 | 21 | 离线 CI；未执行/取消/错误/差质量分开；追踪默认关闭与脱敏 | 未开始 |
| 23 | 研究结果、表现、置信度校准和权重 | 22 | 无未来数据；不足样本与窗口未到不假评分；版本可回滚 | 未开始 |
| 24 | 完整功能对照、Windows 打包和交付验收 | 23 | PyInstaller+Electron Builder；干净 Windows 独立验；SHA256与缺口 | 未开始 |

步骤按用户逐条发送的顺序推进；后续实现不能反过来被记为前置步骤已经验收。

## 功能对照与来源索引

以下相对路径都相对于 **只读参考 Folio**。研迹第1—6步健康、固定行情、持久化、规则Agent、运行生命周期及会话快照/事件恢复已实现，其余业务未开始；参考源码存在仅能证明有可阅读的实现，不能证明本机运行或生产正确。

| 功能组 | 参考源码位置 | 研迹计划承担方 / 步骤 | 研迹实现 / 验证 |
| --- | --- | --- | --- |
| Electron 窗口与通信 | `apps/electron/src/main/index.ts`；`src/preload/index.ts` | Electron 管桌面/Python 进程，步骤1 | 健康链已实现 / 本机实窗自动化通过；用户手动待验 |
| 前端客户端与类型 | `packages/ui/src/client.tsx`；`packages/core/src/index.ts` | Python/OpenAPI + TS 适配，步骤2/3 | 行情、会话/消息/运行/事件契约生成已实现 / 一致性与类型检查通过 |
| 行情、K线、模拟来源 | `packages/shared/src/agent/demo-market-data.ts`；`packages/ui/src/components/workspace` | Python Provider + 页面，步骤2/11 | 四股票固定Fixture与局部界面已实现 / 后端、实窗自动化通过；完整市场页与真实数据未开始 |
| 会话、运行、取消和事件 | `packages/shared/src/kernel/session-manager.ts`、`run-manager.ts`、`stream-event-log.ts`；`packages/core/src/stream-events.ts`；UI的`atoms/streamAtoms.ts`、`components/agent/ToolActivity.tsx` | Python 内核/SQLite/SSE及前端适配，步骤3—6 | 四类持久化、生命周期、一致快照及活动SSE续读已实现 / 隔离、唯一终态、刷新、重连去重、切换解除及迁移自动化见证据；仅显示恢复，不恢复执行 |
| 本地规则与真实模型 | `packages/shared/src/agent/intent-router.ts`、`local-finance-agent-backend.ts`、`pi-runtime-adapter.ts` | 独立 FakeModel/OpenAI 兼容 Python Runtime，步骤4/9 | Python规则/假模型、行情/K线工具及持久结果卡片已实现 / fixture变化、调用证据、错误终态自动化通过；真实LLM和完整工具循环未开始 |
| 设置、凭证、诊断 | `packages/ui/src/components/settings`；`apps/electron/src/main/kernelHost.ts` | Python 健康/系统凭证 + 页面，步骤8 | 未实现 / 未执行 |
| 行情/账户提供商 | `packages/shared/src/providers/router.ts`、`longbridge`、`massive` | Python SDK/只读CLI适配，步骤10 | 未实现 / 未执行 |
| 组合导入与计算 | `packages/shared/src/portfolio-import/parsers.ts`；`packages/core/src/account.ts` | Python 校验/SQLite/计算，步骤12 | 未实现 / 未执行 |
| 风险与股票对比 | `packages/shared/src/portfolio-risk/service.ts`；`compare/service.ts` | Python 确定性计算，步骤13 | 未实现 / 未执行 |
| 能力与技能 | `packages/shared/src/capabilities`；`packages/skill-hub/src/index.ts`；`skills` | Python 注册/读取 + 技能页，步骤14 | 未实现 / 未执行 |
| 研究策略与采集 | `packages/core/src/strategy.ts`；`packages/shared/src/research/planner.ts`、`runner.ts` | Python 编排，步骤15 | 未实现 / 未执行 |
| 研究报告与证据 | `packages/core/src/research.ts`；`packages/shared/src/research/agent-synth.ts`；`claim-verifier.ts` | Python 数据包/报告/证据，步骤16 | 未实现 / 未执行 |
| 研究恢复 | `packages/shared/src/research/service.ts`、`checkpoint.ts`、`repository.ts` | Python 检查点/显式恢复，步骤17 | 未实现 / 未执行 |
| 投资论点 | `packages/shared/src/thesis/service.ts`、`repository.ts` | Python 版本/复审，步骤18 | 未实现 / 未执行 |
| 发现与筛选 | `packages/core/src/screening.ts`；`packages/shared/src/screening/service.ts`、`strategies.ts` | Python 17任务，步骤19 | 未实现 / 未执行 |
| 事件与催化日历 | `packages/ui/src/components/events/EventsView.tsx`；`packages/core/src/market-data.ts` | Python 事件源 + 页面，步骤20 | 未实现 / 未执行 |
| 提醒/自动化/简报/Today | `packages/shared/src/alerts/engine.ts`；`automation/scheduler.ts`、`brief.ts`；`packages/ui/src/components/today` | Python 调度 + Electron 通知，步骤21 | 未实现 / 未执行 |
| Agent 评测与追踪 | `packages/shared/src/evaluation/experiment-service.ts`、`evaluators`、`langfuse`；`docs/EVALUATION.md` | Python 本地评测/追踪适配，步骤22 | 未实现 / 未执行 |
| 研究结果与校准 | `packages/shared/src/outcome/service.ts`；`performance/service.ts`；`calibration/compute.ts` | Python 结果窗口/统计，步骤23 | 未实现 / 未执行 |
| 打包与发布 | `apps/electron/package.json`；`scripts/release-package.mjs` | Windows Python 打包/安装，步骤24 | 未实现 / 未执行 |

参考课程详细路径见 [tutorial](../tutorial.md)。个别同目录短写路径按前一目录解析。

### 固定策略与筛选范围

参考 8 种策略：comprehensive、value、growth、technical、earnings、event-driven、risk-review、income。

参考 17 个筛选任务：top-gainers、top-losers、high-volume、unusual-movement、low-valuation、high-roe、revenue-growth、high-dividend、quality-growth、strong-momentum、breakout、oversold、trend-reversal、upcoming-earnings、rating-changes、news-surge、dividend-events。

这些是步骤15/19的范围清单，尚无研迹实现或自写案例成绩。

## 发布与完整验收

- v0.1.0：步骤1—7的本机完整检查与干净源码实窗验收通过，标为“源码可发布（假模型＋模拟数据）”；第7步按用户独立授权交付PR，本轮不打标签或建Release。用户亲自操作清单另记，远程CI见EVIDENCE第21节；真实服务及安装包不在首版验收范围。
- v1.0.0：步骤8—24完成对应功能对照和实际交付检查；权限受限、真实服务未验收、干净安装未验收均列缺口，不自动宣称完整发布。
- “代码实现”“模拟验收”“真实验收”“权限受限”按功能分开，未配置外部服务不得伪造成功。
- 提交、PR、合并、标签和Release分别依据用户当前上传/发布指令；本路线不是外部写入授权。

## 本地操作和下一条提示词

当前可通过根目录 `start-dev.cmd` 运行第1—6步。第7步只复验首版并准备发布，统一检查为`check.cmd`，干净源码检查为`bun run verify:clean`；用户逐项手动记录、练习与回答待补，本轮仅提交/PR交付第7步，不执行第8步。下面保留第1步原始范围供历史对照，不是重复执行指令。

```text
在D:\folio\research-trail执行第1步。先读取AGENTS.md、docs/ROADMAP.md、docs/EVIDENCE.md和已有文件。
建立最小Electron/React桌面窗口与Python3.12/FastAPI服务。
Electron管理Python子进程；后端本机随机端口及启动令牌；preload白名单，renderer不开Node。
显示研迹、健康状态、启动失败原因和重试入口。根目录提供start-dev.cmd，一条CMD命令启动。
退出只清理本次子进程，不影响其他程序。不搬入完整Folio、不实现行情或Agent。
验收窗口、健康连通、失败反馈和退出清理。更新进度/证据/学习材料，给CMD命令、小练习和三道理解题。
不提交、推送或发布，完成停止。
```
