# 研迹：路线、功能对照与当前进度

更新时间：2026-10-04（Asia/Shanghai）。本文件记录计划与阶段状态，不代表未来步骤已经获得执行或发布授权。

## 当前执行边界

- 第 0 步：验收通过，七份材料与本地 Git 已核对，证据见 EVIDENCE.md。
- 第 1 步：代码完成/待验收；类型、构建、后端与实窗自动化已通过，用户手动验收未完成。
- 第 2—24 步：未开始；没有用户具体指令不继续。
- 默认分支 `main`；用户已授权首次公开第0步资料与第1步源码，提交历史和远程状态以Git为准，上传检查见EVIDENCE第7节。
- 状态取值：未开始 / 进行中 / 代码完成/待验收 / 验收通过 / 受阻。
- 来源：固定 ZIP commit `ba5dcdfd31b162f5edb8b908f7f099a560389326`，本地只读路径 `D:\folio\主分支和简历skill\folio-main`。

## 步骤与完成标准

| 步骤 | 本步范围 | 前置步骤 | 验收标准 | 状态 |
| --- | --- | --- | --- | --- |
| 0 | 本地 Git、约定、路线、证据、课程与忽略规则 | 无 | 七份文件一致；main 无提交/远程；无业务和上游写入 | 验收通过 |
| 1 | 桌面与 Python 服务生命周期 | 0 | CMD 一条命令打开；本机随机端口/令牌；失败反馈和退出清理 | 代码完成/待验收 |
| 2 | 固定模拟行情与 K 线、股票界面、类型契约 | 1 | 四股票切换、卡片图表一致、未知代码报错、固定市场时间 | 未开始 |
| 3 | SQLite/SQLAlchemy/Alembic，会话/消息/运行/事件与 SSE | 2 | 两会话隔离；重启历史；先存后发；按序事件；重复迁移 | 未开始 |
| 4 | 假模型 Agent、Python 工具注册与结果卡片 | 3 | 调用数据工具；fixture 改变结果；假模型标签；错误不伪装成功 | 未开始 |
| 5 | 取消/超时竞争、删会话、重启中断 | 4 | 唯一终态，无永久 running；保留部分结果，不自动重调用 | 未开始 |
| 6 | 对话界面、快照恢复、事件重连和去重 | 5 | 会话不串消息；运行 ID+序号去重；历史不重执行 | 未开始 |
| 7 | 首版验收、离线 CI、干净源码启动、说明 | 6 | 相关检查通过；桌面人工另验；仅准备 v0.1.0，不自动发布 | 未开始 |
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

以下相对路径都相对于 **只读参考 Folio**。研迹第 1 步的桌面健康链已实现，其余业务功能未开始；参考源码存在仅能证明有可阅读的实现，不能证明本机运行或生产正确。

| 功能组 | 参考源码位置 | 研迹计划承担方 / 步骤 | 研迹实现 / 验证 |
| --- | --- | --- | --- |
| Electron 窗口与通信 | `apps/electron/src/main/index.ts`；`src/preload/index.ts` | Electron 管桌面/Python 进程，步骤1 | 健康链已实现 / 本机实窗自动化通过；用户手动待验 |
| 前端客户端与类型 | `packages/ui/src/client.tsx`；`packages/core/src/index.ts` | Python/OpenAPI + TS 适配，步骤2/3 | 未实现 / 未执行 |
| 行情、K线、模拟来源 | `packages/shared/src/agent/demo-market-data.ts`；`packages/ui/src/components/workspace` | Python Provider + 页面，步骤2/11 | 未实现 / 未执行 |
| 会话、运行、取消和事件 | `packages/shared/src/kernel/session-manager.ts`、`run-manager.ts`、`stream-event-log.ts`；`packages/core/src/stream-events.ts` | Python 内核/SQLite/SSE，步骤3—6 | 未实现 / 未执行 |
| 本地规则与真实模型 | `packages/shared/src/agent/intent-router.ts`、`local-finance-agent-backend.ts`、`pi-runtime-adapter.ts` | 独立 FakeModel/OpenAI 兼容 Python Runtime，步骤4/9 | 未实现 / 未执行 |
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

- v0.1.0：步骤1—7，假模型 + 模拟行情 + 持久化；桌面人工验收另外记录，只准备源码交付。
- v1.0.0：步骤8—24完成对应功能对照和实际交付检查；权限受限、真实服务未验收、干净安装未验收均列缺口，不自动宣称完整发布。
- “代码实现”“模拟验收”“真实验收”“权限受限”按功能分开，未配置外部服务不得伪造成功。
- 提交、PR、合并、标签和Release分别依据用户当前上传/发布指令；本路线不是外部写入授权。

## 本地操作和下一条提示词

当前可通过根目录 `start-dev.cmd` 运行第 1 步。用户手动验收、练习与回答待完成；本轮停止，不自动执行第 2 步或上传。下面保留第 1 步原始范围供对照，不是重复执行指令。

```text
在D:\folio\research-trail执行第1步。先读取AGENTS.md、docs/ROADMAP.md、docs/EVIDENCE.md和已有文件。
建立最小Electron/React桌面窗口与Python3.12/FastAPI服务。
Electron管理Python子进程；后端本机随机端口及启动令牌；preload白名单，renderer不开Node。
显示研迹、健康状态、启动失败原因和重试入口。根目录提供start-dev.cmd，一条CMD命令启动。
退出只清理本次子进程，不影响其他程序。不搬入完整Folio、不实现行情或Agent。
验收窗口、健康连通、失败反馈和退出清理。更新进度/证据/学习材料，给CMD命令、小练习和三道理解题。
不提交、推送或发布，完成停止。
```
