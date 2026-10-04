# 研迹：源码学习大纲

## 阅读边界与版本

本项目用途是Python AI投资研究工作台。第0步只有文档与Git；第1步已新增桌面健康调用链，见C01。下列参考路径和符号来自只读Folio，后续逐步对照研迹的实际实现，不混作同一项目成果。

- 参考根：`D:\folio\主分支和简历skill\folio-main`。
- 参考来源：ZIP commit `ba5dcdfd31b162f5edb8b908f7f099a560389326`；本地无Git，不能保证逐文件无本地变化。
- 新项目根：`D:\folio\research-trail`，当前仅有第1步桌面与健康服务源码。
- 本次覆盖：入口、界面/客户端、模型与数据、持久化/事件、组合、技能、研究、监控、评测与打包的阅读路线。
- C01已展开第1步真实流程，C02—C17仍为大纲。完整业务、真实服务、性能测量与安装包未覆盖；用户练习与掌握程度尚未确认。
- 前置知识：Python函数/类与异步、HTTP/JSON、TypeScript接口、React状态、进程与IPC、SQLite基本操作；按课程需要补，不要求先学完全部框架。

主链先建立整体印象：

```text
参考窗口 → React界面 → 客户端/preload → 主进程kernelHost
  → 会话/运行 → Runtime → 工具/数据Provider
  → 事件与结果 → 界面
```

研迹第1步已实现界面→Electron桥→Python健康API。后续事件、业务与SQLite仍是计划。

## C01：窗口为何能打开，页面从哪里来？

状态：第1步已展开，用户练习待完成。关联步骤1。

- 主链：Electron就绪 → 创建窗口 → 装载页面与preload → React渲染。
- 必读1：`apps/electron/src/main/index.ts` / `createWindow`：输入开发/生产环境，选择URL或文件并绑定窗口生命周期。
- 必读2：`apps/electron/src/preload/index.ts` / `ElectronAPI`：IPC操作与订阅桥，不给renderer直接Node权限。
- 必读3：`apps/electron/src/renderer/main.tsx`：渲染入口；随后看`App.tsx`与`finagentClient.ts`接入客户端。
- 验证选读：`apps/electron/vite.config.ts`、根`package.json`，检查dev实际只开Vite；不据此称桌面已启动。
- 暂缓：运行和持久化由C03/C04；打包由C17。

### 研迹的真实流程：从启动到关闭

场景：你在CMD运行 `start-dev.cmd`，窗口显示“连接就绪”。这句话来自真正的本机Python健康响应。它还不能证明行情或Agent存在。

1. `start-dev.cmd`把工作目录切到项目根，按bun.lock和uv.lock同步依赖，再运行 `scripts/dev.mjs`。uv创建Python3.12虚拟环境，真正的服务由Electron启动，避免让uv包装进程成为无法定位的后端。
2. 开发启动器先执行 `scripts/build.mjs`，把main/preload编译成两个CJS文件，然后在本机启动随机端口的Vite。它启动Electron并传入开发页面地址。React改动支持热更新；主进程和Python修改后重启。
3. `apps/desktop/src/main/index.ts`等待Electron就绪，创建沙箱窗口、注册三个请求通道、加载preload和页面，然后显示窗口并调用 `BackendManager.retry()`。
4. `main/backend.ts`生成随机令牌，直接启动 `services/backend/.venv/Scripts/python.exe -m research_trail`。Python在 `research_trail/__main__.py`绑定127.0.0.1的端口0：0表示让操作系统分配端口。它把同一socket交给Uvicorn，避免“先找空端口、再抢占端口”的竞态。
5. Python用stdout发一行就绪JSON，只有端口，没有令牌。Electron收到后请求 `/health`，在请求头携令牌。`research_trail/app.py`的 `create_app()`用常量时间比较检查令牌，正确才返回服务名和Python版本。
6. Electron将健康结果转换为桌面状态。`preload/index.ts`仅提供四个命名接口；React的 `App.tsx`订阅状态，更新标题、状态行和检查时间。页面没有后端端口或令牌，也不能随意指定URL、读文件或调用进程。
7. 健康时按钮调用checkHealth；失败时调用retryBackend。重试先关闭旧子进程，再使用新令牌启动新服务。重复点击由前端禁用和后端复用同一重试Promise共同处理。
8. 关窗触发before-quit，先写stdin的shutdown通知，等Python结束；超时才结束持有的Python子进程。Electron崩溃时管道EOF也会让Python退出。随后dev启动器关闭Vite。没有按python.exe或electron.exe名称批量结束进程。

```text
CMD → dev启动器 → Electron main → Python子进程 → FastAPI /health
                         ↑                ↓ 带令牌响应
React ← preload白名单 ← 状态/事件 ← 主进程健康检查
```

失败分支：找不到Python会显示可解释原因；就绪前退出会显示失败；15秒内无就绪或5秒内健康不通会清理本次子进程并失败；运行中每3秒检查一次，检测到中断后允许手动重试。健康HTTP每次限制2秒，不能长期挂住按钮。

这里有两个不同的随机端口：Vite给开发页面使用，FastAPI给主进程使用。两者都在本机，职责不同。端口随机不会替代令牌；令牌也不代表页面拥有所有后端能力。

当前真实文件和符号可直接搜索：`BackendManager.retry/check/dispose`、`create_app`、`main`、`App`。本节不声称已有会话、数据库、模型或投资功能。小改动和三道理解题见practice.md的第1步。

## C02：股票查询如何变成行情卡片？

状态：大纲。关联步骤2/11。

- 主链：选择股票 → 客户端行情请求 → 数据能力 → Quote/Kline → 卡片与图表。
- 必读1：`packages/ui/src/client.tsx` / `FinagentClient.market`：输入symbol/KlineRequest，定义UI可消费结果。
- 必读2：`packages/core/src/index.ts` / `Quote`、`Kline`：字段和时间约定；随后看`packages/shared/src/capabilities/manifests/market-quote.ts`、`market-kline.ts`的能力声明。
- 必读3：`packages/shared/src/agent/demo-market-data.ts` / `withDemoDataFallback`：模拟来源与固定数据，不是LLM生成的行情。
- 验证选读：`packages/ui/src/components/workspace/ChartView.tsx`、`packages/shared/src/kernel/quote-provenance-acceptance.test.ts`。
- 暂缓：真实Provider由C06；Agent调用该工具由C05。

## C03：创建会话和消息如何保存？

状态：大纲。关联步骤3。

- 主链：创建会话/读消息 → 客户端 → kernelHost → SessionManager → repository → 返回元数据/历史。
- 必读1：`packages/ui/src/atoms/sessionAtoms.ts`：创建和水合入口，读写视图状态。
- 必读2：`apps/electron/src/main/kernelHost.ts`：追客户端操作到内核绑定；不要以接口声明替代实际注册。
- 必读3：`packages/shared/src/kernel/session-manager.ts` / `SessionManager.createSession`、`listMessages`：输入标题或会话ID，调用注入的仓库后返回记录；沿构造绑定核对实际repo。
- 验证选读：`packages/shared/src/kernel/agent-kernel.test.ts`；研迹未来用SQLite，而非直接照搬参考存储。
- 暂缓：一次运行的异步事件由C04。

## C04：运行如何流式更新、取消并重放？

状态：大纲。关联步骤3/5/6。

- 主链：startRun → RunManager驱动Runtime → 持久化/广播事件 → KernelBridge更新UI；取消在执行中进入终态。
- 必读1：`packages/shared/src/kernel/run-manager.ts` / `RunManager.startRun`、`cancelRun`：区分请求返回和后台事件完成。
- 必读2：`packages/core/src/stream-events.ts` / `StreamEventEnvelope`：版本、runId、sequence；再看`packages/shared/src/kernel/stream-event-log.ts`的事件记录。
- 必读3：`packages/ui/src/components/kernel/KernelBridge.tsx` / `KernelBridge`：旧AgentEvent与StreamEvent的两个订阅，不视为两个独立模型运行。
- 验证选读：`packages/shared/src/kernel/run-manager.test.ts`、`stream-replay.e2e.test.ts`。
- 暂缓：真实Runtime传输由C05；研究恢复由C11。

## C05：规则Agent与真实LLM的区别是什么？

状态：大纲。关联步骤4/9。

- 主链：用户文本 → 意图/模型决策 → 工具请求 → 数据结果 → 回答与运行事件。
- 必读1：`packages/shared/src/agent/intent-router.ts` / `routeFinanceIntent`：关键词和symbol决定意图，不是LLM。
- 必读2：`packages/shared/src/agent/local-finance-agent-backend.ts` / `LocalFinanceAgentBackend.send`：输入请求，执行registry工具再组合回答。
- 必读3：`packages/shared/src/agent/pi-runtime-adapter.ts` / `PiRuntimeAdapter` 与 `pi-rpc-client.ts` / `PiRpcClient`：追真实进程传输和事件适配；研迹计划自己实现Python Runtime，不直接运行TS内核。
- 验证选读：`packages/shared/src/agent/agent.test.ts`、`workspace-local.test.ts`。
- 暂缓：模型凭证与数据权限不能混为同一连接，数据路由由C06。

## C06：真实行情、账户和连接怎样路由？

状态：大纲。关联步骤8/10/11。

- 主链：配置/健康 → 能力请求 → 路由选择Provider → 规范化数据与来源 → UI/Agent。
- 必读1：`packages/core/src/provider.ts`：LLM、financial-data、broker-account不同契约和状态。
- 必读2：`packages/shared/src/providers/router.ts` / `ProviderRouter.execute`：输入能力与参数，选择和执行提供商。
- 必读3：`packages/shared/src/providers/longbridge/adapter.ts`、`broker.ts`、`massive/adapter.ts`，及`connection.ts` / `ConnectionStore`：核对SDK/CLI实际字段到规范结果的映射。
- 验证选读：`packages/shared/src/providers/providers.test.ts`；不能据此替代真实凭证调用。
- 暂缓：组合导入由C07，风险计算由C08。

## C07：导入持仓怎样校验而不污染账户？

状态：大纲。关联步骤12。

- 主链：CSV/粘贴输入 → 解析/标准化 → 草稿校验 → 确认导入 → 组合记录。
- 必读1：`packages/shared/src/portfolio-import/parsers.ts` / `parseImportText`、`parseCsv`、`flagDuplicates`：输入文本到标准化行/重复标志。
- 必读2：`packages/shared/src/portfolio-import/draft.ts` 与 `repository.ts`：从草稿到存储，追调用绑定。
- 必读3：`packages/core/src/account.ts` 与 `portfolio-import.ts`：账户与导入领域，不把来源不同的数据相加。
- 验证选读：`packages/shared/src/portfolio-import/parsers.test.ts`、`repository.test.ts`。
- 暂缓：风险/对比由C08。

## C08：风险和股票对比的数字如何产生？

状态：大纲。关联步骤13。

- 主链：组合或股票列表 → 获取规范数据 → 确定性计算 → 报告/对比表 → 页面或工具。
- 必读1：`packages/shared/src/portfolio-risk/service.ts` / `PortfolioRiskService.analyze`：持仓、行情、缺口到风险结果。
- 必读2：`packages/shared/src/compare/service.ts` / `buildComparison`：多标的指标与缺失结果。
- 必读3：`packages/core/src/portfolio-risk.ts`、`compare.ts`：统一结果契约，核对币种/期间和证据。
- 验证选读：`packages/shared/src/compare/compare.test.ts`，风险同目录测试。
- 暂缓：文字综合是模型工作，不替代上述数值；后续研究由C10/C11。

## C09：技能为何显示就绪、部分就绪或禁用？

状态：大纲。关联步骤14。

- 主链：扫描技能 → 解析元信息/依赖 → 能力注册状态 → readiness → UI或按需资料读取。
- 必读1：`packages/shared/src/capabilities/registry.ts` / `createCapabilityRegistry` 与 `readiness.ts`：注册和依赖状态。
- 必读2：`packages/skill-hub/src/index.ts` / `SkillHub.loadSkills`、`setEnabled`、`parseSkillMarkdown`：输入目录/文本到技能元信息。
- 必读3：`packages/skill-hub/src/capability-map.ts` 与 `packages/ui/src/components/settings/SkillsView.tsx`：状态映射到页面，追参考读取的路径检查。
- 验证选读：`packages/skill-hub/src/index.v2.test.ts`、`packages/shared/src/capabilities/readiness.test.ts`。
- 暂缓：研究策略使用技能但不复制技能提示，由C10。

## C10：研究策略怎样驱动有界数据采集？

状态：大纲。关联步骤15。

- 主链：选标的/策略 → planForStrategy → 构建能力输入 → ResearchRunner采集 → outcomes/部分失败。
- 必读1：`packages/core/src/strategy.ts` / `STRATEGY_IDS`，`packages/shared/src/research/planner.ts` / `planForStrategy`、`buildCapabilityInput`：策略到能力计划。
- 必读2：`packages/shared/src/research/runner.ts` / `ResearchRunner.run`：异步采集、取消、结果和缺口。
- 必读3：`packages/core/src/research.ts` / `ResearchRunSummary`：界面消费的状态，追service中启动和存储绑定。
- 验证选读：`packages/shared/src/research/planner.test.ts`、`runner.test.ts`。
- 暂缓：报告和恢复由C11，筛选任务不是研究策略，由C13。

## C11：证据报告怎样生成、比较并恢复？

状态：大纲。关联步骤16/17。

- 主链：已采集数据包 → synthesizer → 带EvidenceRef报告 → 存储/显示/差异；中断经checkpoint显式恢复。
- 必读1：`packages/core/src/research.ts` / `ResearchReport`、`EvidenceRef`；`packages/shared/src/research/agent-synth.ts`：输入事实到结构输出，追注入合成器。
- 必读2：`packages/shared/src/research/service.ts` / `ResearchService.resume` 与 `checkpoint.ts` / `validateCheckpoint`：身份配置、状态和已完成采集复用。
- 必读3：`packages/ui/src/components/research/ResearchReportView.tsx`、`WhatChangedSection.tsx`：结果显示；`claim-verifier.ts`独立实现需另查调用，不能假定已接入。
- 验证选读：`packages/shared/src/research/recovery.test.ts`、`hard-kill.test.ts`、`claim-verifier.test.ts`。
- 暂缓：报告转论点由C12；性能与真实正确性未测，不下结论。

## C12：研究结论如何变成可复审的论点？

状态：大纲。关联步骤18。

- 主链：报告 → saveFromReport → 论点/版本 → 新数据评估 → impact记录。
- 必读1：`packages/shared/src/thesis/service.ts` / `ThesisService.saveFromReport`：报告到论点，追converter。
- 必读2：`packages/shared/src/thesis/converter.ts`、`repository.ts`：结构转换和历史存储。
- 必读3：`packages/shared/src/thesis/evaluator-local.ts`、`agent-eval.ts`：核对本地和模型评估目标及绑定。
- 验证选读：`packages/shared/src/thesis/service.test.ts`、`converter.test.ts`。
- 暂缓：提醒触发由C14，收益窗口由C16。

## C13：发现候选与事件如何进入研究？

状态：大纲。关联步骤19/20。

- 主链：用户筛选任务/事件 → 有界筛选或事件列表 → 带依据候选 → 自选/对比/研究上下文。
- 必读1：`packages/core/src/screening.ts`，`packages/shared/src/screening/service.ts` / `ScreeningService.runScreening`：任务/有界池到候选。
- 必读2：`packages/shared/src/screening/strategies.ts`：确定性评分；`packages/ui/src/components/discover/DiscoverView.tsx`：追跳转动作。
- 必读3：`packages/ui/src/components/events/EventsView.tsx` 与 `packages/core/src/market-data.ts`：核对事件加载、时区和研究上下文，不把不同任务强拼成一次调用。
- 验证选读：`packages/shared/src/screening/service.test.ts`、`strategies.test.ts`。
- 暂缓：自动提醒不是发现结果本身，由C14。

## C14：提醒与简报何时触发？

状态：大纲。关联步骤21。

- 主链：规则/固定时钟 → 触发计算 → 执行记录/通知 → buildBrief → Today聚合。
- 必读1：`packages/shared/src/alerts/engine.ts` / `AlertEngine` 与 `evaluators.ts`：规则和事实到触发状态。
- 必读2：`packages/shared/src/automation/scheduler.ts` / `runDue`、`nextRunAt`，`runner.ts`：计算到期与执行分别追踪。
- 必读3：`packages/shared/src/automation/brief.ts` / `buildBrief` 与 `packages/ui/src/components/today/TodayView.tsx`：聚合输入和页面输出。
- 验证选读：`packages/shared/src/automation/scheduler.test.ts`、`brief.test.ts`、`alerts/engine.test.ts`。
- 暂缓：研迹仅计划应用运行时调度，后台常驻未实现；评测由C15。

## C15：Agent实验怎样被判定有效？

状态：大纲。关联步骤22。

- 主链：案例/配置 → ExperimentService.runExperiment → 执行trace/评估 → 有效性和结果 → 基线/页面。
- 必读1：`packages/shared/src/evaluation/experiment-service.ts` / `ExperimentService.runExperiment`：任务是否实际执行。
- 必读2：`packages/shared/src/evaluation/evaluators/deterministic.ts`、`packages/shared/src/evaluation/aggregate.ts`：指标和聚合，区分跳过与失败。
- 必读3：`packages/shared/src/evaluation/redactor.ts`、`langfuse/backend.ts`及`docs/EVALUATION-CI.md`：隐私和本地/外部后端绑定。
- 验证选读：`packages/shared/src/evaluation/experiment-service.test.ts`、`redactor.test.ts`。
- 暂缓：投资结果与工程分数不是同一件事，由C16。

## C16：研究表现与置信度如何校准？

状态：大纲。关联步骤23。

- 主链：研究时点判断 → 到期窗口与历史行情 → outcome → performance聚合 → calibration版本。
- 必读1：`packages/shared/src/outcome/service.ts` / `OutcomeService.createOpinionFromReport`、`evaluateDue`：输入判断与窗口，何时可计算。
- 必读2：`packages/shared/src/performance/service.ts` / `PerformanceService`、`aggregate.ts`：从历史结果到技能/策略表现。
- 必读3：`packages/shared/src/calibration/compute.ts` / `computeSkillCalibrations`、`computeStrategyCalibrations`：样本与权重输出。
- 验证选读：`packages/shared/src/outcome/engine.test.ts`、`performance/aggregate.test.ts`、`calibration/compute.test.ts`。
- 暂缓：真实样本是否足够未验证，不能承诺盈利；发行由C17。

## C17：开发窗口与Windows安装包为什么要分别验收？

状态：大纲。关联步骤24。

- 主链：源码构建 → 打包资源与运行时 → 安装/启动 → 迁移/退出/卸载验收。
- 必读1：`apps/electron/package.json` / `build`配置：参考mac目标、资源位置、主进程产物。
- 必读2：`scripts/release-package.mjs`、`scripts/release-check.mjs`：实际发布脚本与门槛，核对平台假设。
- 必读3：`docs/release-gates.zh-CN.md`：与脚本交叉检查，不把文档声称当运行证据。
- 验证选读：`apps/electron/e2e/package-smoke.mjs`。参考mac硬编码不能直接作为Windows验收。
- 暂缓：研迹PyInstaller/Electron Builder路径、无Python干净机和升级行为留到步骤24，尚无对应源码。

## 学习记录维护

每次只展开当前步骤相关课程，保留其他章节及用户笔记。完成后增加实际研迹调用链、文件/符号、失败分支和一个复述任务。未讲内容不生成“课后题”，大纲阶段对应阅读引导见 [practice](practice.md)。
