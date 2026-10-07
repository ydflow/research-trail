# 研迹：源码学习大纲

## 阅读边界与版本

本项目用途是Python AI投资研究工作台。第0步只有文档与Git；第1步已新增桌面健康调用链，见C01。下列参考路径和符号来自只读Folio，后续逐步对照研迹的实际实现，不混作同一项目成果。

- 参考根：`D:\folio\主分支和简历skill\folio-main`。
- 参考来源：ZIP commit `ba5dcdfd31b162f5edb8b908f7f099a560389326`；本地无Git，不能保证逐文件无本地变化。
- 新项目根：`D:\folio\research-trail`，当前有第1—6步业务、第7步验收脚本/离线CI文件、第8步设置/凭证/假连接/诊断。v0.1.0源码发布只包含第1—7步，第8步已通过PR #7交付，第9步实现模型适配/受限工具循环；发布轮一次真实模型工具验证通过（2次请求、1次工具），真实行情未接入。
- 本次覆盖：入口、界面/客户端、模型与数据、持久化/事件、组合、技能、研究、监控、评测与打包的阅读路线。
- C01—C05已展开第1—6步流程，C04包含取消/超时、中断及快照/流续读；C06已展开第8步设置/凭证/假健康，C05已补第9步模型协议/工具循环；一次真实模型工具验证通过（模拟行情），第10步数据与只读账户适配及第11步证券工作台已展开，真实行情查询未执行，第12步C07已展开组合CSV与账户计算，第13步C08已展开风险/对比同源计算；C09—C17仍待后续。完整业务、真实服务、性能测量与安装包未覆盖；用户练习与掌握程度尚未确认。
- 前置知识：Python函数/类与异步、HTTP/JSON、TypeScript接口、React状态、进程与IPC、SQLite基本操作；按课程需要补，不要求先学完全部框架。

主链先建立整体印象：

```text
参考窗口 → React界面 → 客户端/preload → 主进程kernelHost
  → 会话/运行 → Runtime → 工具/数据Provider
  → 事件与结果 → 界面
```

研迹已实现界面→Electron桥→Python健康/行情/会话API→SQLite，以及规则Agent→Python工具→数据Provider→持久事件/卡片。

## 第7步：怎样证明首版能工作，而不是只会构建？

这是第1—6步的验收调用链，没有新增业务。先阅读README的CMD准备命令，再读`check.cmd`→`scripts/verify.mjs`：入口只运行检查，不安装依赖，失败立即返回非零。

1. 契约检查调用`research_trail.export_openapi`，从Pydantic导出本机JSON，再与生成TS逐字比较。类型检查仅证明静态契约能编译，不证明真实窗口和接口可用。
2. pytest用临时数据库：改变fixture影响工具回答、未知代码失败、取消和超时竞争、硬退出重启中断、快照和持久事件先存后发。网络策略由`scripts/offline/sitecustomize.py`经PYTHONPATH继承到真实Python子进程；只允许本机地址。
3. Node测试验证`scripts/offline/network.cjs`阻止外部TCP/DNS、允许本机、子进程继承，以及完整帧水位/续读去重。Playwright会删除Electron的NODE_OPTIONS，因此`tests/desktop.test.cjs`在离线模式用`-r scripts/offline/electron.cjs`加载同一策略及桌面资源保护，并检查策略实际生效。普通CMD启动也用该离线分支；Electron接口在其模块加载器就绪后才访问，不能在NODE_OPTIONS的过早阶段require。
4. 构建后运行真实Electron集成，观察页面/按钮/画布/消息/连接和进程退出。构建与实窗是两条证据；错误、取消、刷新和重启均要看实际DOM/持久记录，不能只看退出码。
5. `scripts/verify-clean.mjs`只读git清单，将源码导出到仓库外带空格目录，重新安装锁定依赖，并通过`prepare-electron.mjs`在允许下载的准备阶段显式准备二进制。离线验收先检查该文件存在，缺失即失败，不让首次require触发补装。重复同一离线检查，再由副本自己的`tests/clean-start.cjs`真正调用根CMD启动器。两次打开共用一个独立数据库：重启前后完整快照必须相同，已保存获取时间不变，原运行不能被自动重执行。
6. GitHub Actions先获取工具/依赖，再调用同一个check.cmd。准备阶段需要网络；验收阶段不联网调用真实服务，FakeModelProvider只是本机规则函数。工作流静态检查、本机通过、远程CI通过是不同记录，第7步开发轮与发布轮分别见EVIDENCE第20、21节。

“干净源码”表示没有拷贝现成node_modules/.venv/dist/runtime；本机已有Node/Bun/uv/Python下载缓存仍可复用。它不证明没有这些工具的机器或安装包能运行。首版可发布仅限假模型和模拟行情源码，不能写成真实LLM/实时行情或投资效果成绩。用户操作与练习仍由用户本人记录。

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
3. `apps/desktop/src/main/index.ts`等待Electron就绪，创建沙箱窗口、注册白名单通道、加载preload和页面，然后显示窗口并调用 `BackendManager.retry()`。第1步最初只有健康相关通道；截至第6步桥共19个命名操作，后续行情/会话/运行见C03—C05。
4. `main/backend.ts`生成随机令牌，直接启动 `services/backend/.venv/Scripts/python.exe -m research_trail`。Python在 `research_trail/__main__.py`绑定127.0.0.1的端口0：0表示让操作系统分配端口。它把同一socket交给Uvicorn，避免“先找空端口、再抢占端口”的竞态。
5. Python用stdout发一行就绪JSON，只有端口，没有令牌。Electron收到后请求 `/health`，在请求头携令牌。`research_trail/app.py`的 `create_app()`用常量时间比较检查令牌，正确才返回服务名和Python版本。
6. Electron将健康结果转换为桌面状态。`preload/index.ts`通过命名接口访问健康信息；React的 `App.tsx`订阅状态，更新标题、状态行和检查时间。第1步最初四个接口，第8步起30项白名单见bridge.ts；页面没有后端端口或令牌，也不能随意指定URL、读文件或调用进程。诊断导出经命名接口及主进程系统保存对话框，不开放任意文件写入。
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

状态：第2步已展开，用户练习待完成；完整行情工作台仍属步骤11。

- 主链：选择股票 → 客户端行情请求 → 数据能力 → Quote/Kline → 卡片与图表。
- 必读1：`packages/ui/src/client.tsx` / `FinagentClient.market`：输入symbol/KlineRequest，定义UI可消费结果。
- 必读2：`packages/core/src/index.ts` / `Quote`、`Kline`：字段和时间约定；随后看`packages/shared/src/capabilities/manifests/market-quote.ts`、`market-kline.ts`的能力声明。
- 必读3：`packages/shared/src/agent/demo-market-data.ts` / `withDemoDataFallback`：参考示例来源；它包含当前时间与未知股票回退，研迹不沿用这两种行为。
- 验证选读：`packages/ui/src/components/workspace/ChartView.tsx`、`packages/shared/src/kernel/quote-provenance-acceptance.test.ts`。
- 暂缓：真实Provider由C06；Agent调用该工具由C05。

### 研迹的真实流程：点击 NVDA.US 后发生什么？

1. `renderer/market/Watchlist.tsx`把选择传给 `MarketPanel`。页面清空旧快照，调用 `window.researchTrail.marketSnapshot('NVDA.US')`，只管理显示状态。
2. preload只将这项命名操作转成IPC。main核对来源，`BackendManager.marketSnapshot`检查代码格式、连接状态，再携启动令牌请求Python的 `/market/snapshot/NVDA.US`；页面不能指定任意URL或获得令牌。
3. `research_trail/app.py`的授权依赖先验证令牌，随后调用独立 `FixtureMarketProvider.snapshot`。价格表只含四股票，未知代码抛 `UnknownSymbolError`，接口返回404和 `MarketError`，没有随机价格或实时回退。
4. `market.py`构造 `Quote`、`Kline`、`MarketSnapshot`。Pydantic验证有限数值、OHLC范围、时间带时区、K线有序，以及最新收盘与卡片价格一致。固定市场时间是2024-01-16 21:00 UTC；`fetched_at`用本次UTC获取时刻。示例价格是编写的功能测试数据。
5. 一个快照同时驱动 `QuoteCard`和 `FinancialKLineChart`，避免分开查询串股票。React effect的取消标记忽略已过期响应；后端连接变化也隐藏旧快照。未知错误显示在页面并移除卡片与图表。
6. 图表适配自Folio的生命周期与loader：init、秒转毫秒、setSymbol/setPeriod、resetData、ResizeObserver、dispose。本步只用日线，无指标UI。图表使用UTC；固定示例自动适配视区。

类型生成另有一条开发链：`market.py` Pydantic → `create_app().openapi()`离线导出 → `scripts/contracts.mjs`调用openapi-typescript → `packages/contracts/openapi.json`与`generated.ts` → `src/market-types.ts`引用类型 → 页面和桥。导出不会启动监听服务，也不读取运行令牌；运行时 `/openapi.json`仍关闭。`bun run check`比对生成文件，契约变动后需重新生成，不能手工修改generated.ts。

“重新查询”会再走HTTP，但它读取同一固定示例，只有获取时间变化。行情Provider不调用模型，也不依赖未来的Agent；模型回答不是价格来源。小练习与三题见practice.md第2步。

## C03：创建会话和消息如何保存？

状态：第3步已展开，用户练习待完成。

- 主链：创建会话/读消息 → 客户端 → kernelHost → SessionManager → repository → 返回元数据/历史。
- 必读1：`packages/ui/src/atoms/sessionAtoms.ts`：创建和水合入口，读写视图状态。
- 必读2：`apps/electron/src/main/kernelHost.ts`：追客户端操作到内核绑定；不要以接口声明替代实际注册。
- 必读3：`packages/shared/src/kernel/session-manager.ts` / `SessionManager.createSession`、`listMessages`：输入标题或会话ID，调用注入的仓库后返回记录；沿构造绑定核对实际repo。
- 验证选读：`packages/shared/src/kernel/agent-kernel.test.ts`；研迹未来用SQLite，而非直接照搬参考存储。
- 暂缓：一次运行的异步事件由C04。

### 研迹的真实流程：关闭窗口后消息为何还在？

1. `SessionPanel`创建会话，经preload的 `createSession`、main来源校验和 `BackendManager.createSession`发送带令牌POST `/sessions`。Pydantic `CreateSession`校验标题，`Store.create_session`分配UUID并提交SQLAlchemy事务，提交后才返回DTO。
2. `database.py`在后端lifespan打开SQLite、启用外键/WAL并迁移。`__main__.py`组合该lifespan，迁移失败时不发送就绪。离线OpenAPI只构造app，不打开数据库。默认路径是根runtime目录，可用RESEARCH_TRAIL_DB_PATH选择临时库。
3. `models.py`描述四张业务表，`migrations/versions/0001_conversation.py`明确建表，Alembic记录版本。再次upgrade head不会重建表或清空历史；没有调用create_all代替迁移。
4. 消息按会话内sequence排序，不以Windows可能同刻的时间或随机UUID排序。事件则按各运行自己的sequence排序。外键的run_id/session_id组合禁止跨会话关联；删会话级联删除其三类子记录。
5. 切换会话调用getSession、sessionMessages和sessionRuns。React effect取消旧请求的展示更新，只保留当前会话缓存；关闭窗口丢失缓存，数据库记录仍在。重启后重新查询Python，不从localStorage重建业务状态。

DTO来自 `conversation.py` → 离线OpenAPI → generated.ts → conversation-types.ts。参考Folio字段采用camelCase/毫秒，研迹使用snake_case/UTC ISO；`session-adapter.ts`仅在前端将消息时间转换为显示所需毫秒与文案，未增加第二套后端兼容接口。

## C04：运行如何流式更新、取消并重放？

状态：第3—6步固定事件、规则运行、取消和流重连已展开；第9步模型传输与限制见C05。关联步骤3/5/6。

- 主链：startRun → RunManager驱动Runtime → 持久化/广播事件 → KernelBridge更新UI；取消在执行中进入终态。
- 必读1：`packages/shared/src/kernel/run-manager.ts` / `RunManager.startRun`、`cancelRun`：区分请求返回和后台事件完成。
- 必读2：`packages/core/src/stream-events.ts` / `StreamEventEnvelope`：版本、runId、sequence；再看`packages/shared/src/kernel/stream-event-log.ts`的事件记录。
- 必读3：`packages/ui/src/components/kernel/KernelBridge.tsx` / `KernelBridge`：旧AgentEvent与StreamEvent的两个订阅，不视为两个独立模型运行。
- 验证选读：`packages/shared/src/kernel/run-manager.test.ts`、`stream-replay.e2e.test.ts`。
- 暂缓：真实Runtime传输由C05；研究恢复由C11。

### 研迹的真实流程：启动固定测试后读取七个事件

`startRun`经POST `/sessions/{id}/runs`调用 `Store.start_fixture`。BEGIN IMMEDIATE串行分配消息序号，在同一事务写用户消息、固定响应、completed运行及七个事件；全部提交后才返回。运行kind为fixture，只有实际实现的completed状态，未假装后台Agent正在运行。

七个事件是run_started、message_started、status、两次text_delta、message_completed、run_completed。Pydantic按type辨别payload；每个事件含protocol_version、session_id、run_id、sequence、timestamp。只有消息事件带message_id；时间供展示，运行ID＋序号供身份/排序。

`runEvents`在main用带令牌HTTP读取 `/events?after_sequence=N` 的有限SSE，每帧包含id、event、JSON data。Python先从已提交事件表读取，main校验run/session/type/连续序号，再交给页面。HTTP还接受当前run_id:sequence格式的Last-Event-ID；JSON event-log接口支持游标和有界分页，并将事件联合类型纳入OpenAPI。超过末尾的游标报错，跨会话访问404。

固定测试一次读取在末尾关闭SSE，main收集有限响应后交给页面；这个fixture入口没有后台任务。第6步“重新读取事件”改读完整会话快照，不调用start_fixture，消息数不变。规则工具见C05，运行生命周期及快照/实时订阅见下文；第9步模型协议见C05；一次真实模型工具验证见EVIDENCE第25节。

### 第5步：取消、超时和完成为什么只能赢一次？

1. `RunManager.start`经`Store.begin_agent`先事务写入running、两条消息（响应为空占位）和开始事件，再启动Python工作线程。同会话再启动返回409；不同会话独立。后台调用FakeModelProvider和工具，`Store.append_running`每次先验证仍是running再写事件，序号仍只由Python分配。
2. `lifecycle.py`的SCENARIOS提供受控假延迟：正常0秒/工具2秒限时、延迟3秒/5秒限时、超时演示2秒/0.6秒限时。工作线程用Event.wait等待，取消可以直接唤醒。独立Timer触发超时，整体运行另有15秒界限；这些是假模型验收配置，不是外部服务性能成绩。
3. 取消按钮→preload.cancelRun→main校验→POST /sessions/{id}/runs/{run_id}/cancel→RunManager.cancel→Store.finish。`BEGIN IMMEDIATE`和status==running检查决定谁先取得终态；后续取消/完成/超时只返回已有记录，不能写第二个run_completed或再加成功结果。每次运行固定响应消息ID，finish更新这条消息，不新增重复最终消息。
4. `AgentRunner`在工具前/后进行停止检查；非协作工具即使晚返回，其tool_result和回复也被拒绝。已经在取消之前提交的文本/工具结果保留。Python线程不能强制杀死任意第三方阻塞调用；当前fixture工具与假延迟可协作退出，未来真实Provider仍需自身超时/取消支持。
5. 删除入口持有同一管理锁，先取消该会话活动运行，再级联删除。启动与删除不能交错产生孤儿运行；迟到线程不能重新建立被删记录。数据库索引进一步限制每会话一个running、每运行每角色一消息。
6. 启动先取得`DatabaseLease`再迁移和`Store.recover_interrupted`。同库仍被活后端占用时明确拒绝启动；系统会在进程硬退出后释放持有锁。正常关闭主动标记interrupted，硬退出留下的running在下次启动标记中断，补唯一终态并保留历史。这里只允许手动重新发起，不重调旧模型/工具。
7. `0003_lifecycle`把completed_at改为可空，保留原历史、复合外键与last_sequence检查。SQLite父表重建只在专用迁移连接临时关闭外键，检查完整性后提交并再开启；业务连接保持外键开启。降级被明确拒绝，备份恢复未验证。
8. 第5步原界面每200ms读取状态与有限SSE。第6步已替换为数据库快照→持续订阅→终态快照；后台运行及唯一终态机制继续使用第5步实现，前端不推断终态或重发请求。

阅读顺序：`conversation.py`→`store.py`的begin_agent/append_running/finish→`lifecycle.py`→`app.py`→主进程/preload→SessionPanel。对照参考`packages/shared/src/kernel/run-manager.ts`的cancelRun/consumeRuntime和`packages/core/src/stream-events.ts`的cancelled.partial、stopReason语义；不运行原TS内核。本项目以error和明确stop_reason区分超时/中断，不照搬上游预算/多轮功能。

### 第6步：为什么快照之后还要从水位续读？

1. `Store.snapshot`显式BEGIN读事务固定同一个SQLite WAL版本，查询会话、消息、运行、所有事件；每运行last_sequence与已显示文字一致。只读，不经过AgentRunner。`SessionSnapshot`经OpenAPI生成TypeScript，preload.sessionSnapshot只请求这个命名接口。
2. `SessionPanel`收到快照才调用subscribeRun，传入活动运行的last_sequence。快照之后、订阅之前写入的新事件通过Python `/events?follow=true`重放；不能直接订阅“最新”，否则间隙会丢事件。默认follow=false仍保留第3步有限重放语义。
3. `RunSubscription`在main持有带令牌的本机HTTP请求。FrameDecoder跨块保存半帧，decodeEvent校验session/run/type/id和序号。只有完整连续事件才推进游标，重复帧忽略；中断从该游标及同值Last-Event-ID退避重连。Python只从已提交事件读取，结束头/末事件明确正常EOF；已读到终态末尾不空转重连。
4. preload以独立订阅ID过滤IPC，解除函数移除监听并关闭main请求。SessionPanel effect退出先失效旧回调，再解除订阅；main额外在页面导航/销毁、后端关闭清理请求/重连定时器。旧快照晚到或旧流晚到不能写入新会话。
5. `applySessionEvent`只更新本会话已知运行、连续未见序号和原message_id；快照里已有文本不会再追加，不另消费旧消息渠道。收到run_completed后重新读取Python快照决定终态；接收事件只更新显示缓存，不管理数据库业务。
6. `toolViews`是前端适配层，把tool_started/tool_result与Python终态投影成工具状态。局部移植ToolActivity折叠/耗时显示，沿用已有结果卡；没有引入完整Folio侧栏、旧TS类型、Jotai、Markdown或研究/组合页面。

从快照读取历史、SSE续读或切回会话，始终只GET，不能自动执行原工具。模拟行情的获取时间因此保持原值；重新发起是用户明确POST产生一个新运行。参考streamAtoms按运行+序号幂等思路，但其旧渠道与新协议不同时接入；侧栏和输入保留研迹现有组件。

## C05：规则Agent与真实LLM的区别是什么？

状态：第4步规则链与第9步OpenAI兼容协议/循环已展开，用户练习待完成；模拟协议与一次真实模型工具验证通过；工具数据仍为模拟。

- 主链：用户文本 → 意图/模型决策 → 工具请求 → 数据结果 → 回答与运行事件。
- 必读1：`packages/shared/src/agent/intent-router.ts` / `routeFinanceIntent`：关键词和symbol决定意图，不是LLM。
- 必读2：`packages/shared/src/agent/local-finance-agent-backend.ts` / `LocalFinanceAgentBackend.send`：输入请求，执行registry工具再组合回答。
- 必读3：`packages/shared/src/agent/pi-runtime-adapter.ts` / `PiRuntimeAdapter` 与 `pi-rpc-client.ts` / `PiRpcClient`：追真实进程传输和事件适配；研迹计划自己实现Python Runtime，不直接运行TS内核。
- 验证选读：`packages/shared/src/agent/agent.test.ts`、`workspace-local.test.ts`。
- 暂缓：模型凭证与数据权限不能混为同一连接，数据路由由C06。

### 研迹的真实流程：一句“查询AAPL.US行情”如何调用Python工具？

1. `SessionPanel`主按钮调用preload.startAgentRun，经IPC runs:agent和 `BackendManager.startAgentRun`发送POST /sessions/{id}/runs，body为input及kind=fake_agent。第3步startRun/fixture入口继续保留；renderer不能指定URL或执行工具。
2. `app.py`分别注入 `MarketProvider` 与 `ModelProvider`，默认是FixtureMarketProvider和FakeModelProvider。行情HTTP与Agent工具用同一数据Provider；假模型模块不导入fixture价格表，也不访问数据库或网络。
3. 第5步起由`RunManager.start`先创建持久运行，再在工作线程调用`AgentRunner.run`。FakeModelProvider.plan用整句规则匹配“查询/查看＋一个US代码＋行情/K线”；输出ToolCall，未知/含多个标的的意图返回支持范围，不暗选股票或调用工具。
4. `AgentRunner`先记录tool_started（call_id/name/input），再执行 `ToolRegistry.execute`。Registry只接受注册名称及Pydantic参数，market.quote/market.kline实际调用 `MarketProvider.snapshot`，重新验证第2步MarketSnapshot，再投影为带模拟来源、固定市场时间和获取时间的工具数据。
5. 成功后记录同call_id的tool_result.ok=true。FakeModelProvider.respond只用返回的报价/最后K线/根数组织文字；修改market.py的示例数据，Agent不用改，回答和卡片就跟着变。失败则记录ok=false、error事件、解释回复、RunDTO.status=failed、run_completed.stop_reason=error，没有成功数据卡片。模型回复失败时，已成功的真实工具结果仍保存，运行失败。
6. 第4步原为整批结束后提交；第5步起过程逐事件提交、终态统一提交。0001/0002/0003迁移保留，第6步没有新迁移；会话一致快照和活动SSE续读见C04。
7. main校验事件身份/顺序，`ToolResultCards`按生成契约渲染行情卡片或K线图，继承第2步已有组件和来源声明。重读只展示当时保存的结果，获取时间不刷新；运行错误独立显示，不能把tool_result返回当成整次运行成功。

这是一次规则决策、最多一个只读Python工具调用，无LLM推理、完整多轮循环或投资建议。协议新增tool_started、tool_result、error，保留运行ID＋序号与消息ID各自语义。Python测试用记录调用的Provider核对调用次数、名称/参数/call_id、持久结果和回复值，并在同一个模型上改fixture；桌面测试核对真实桥、卡片、画布、错误、重读与重启。

### 第9步：同一AgentRunner怎样在模型与工具之间循环？

1. SessionPanel的运行模型默认fake_agent；显式openai_agent经过同一个startAgentRun/IPC白名单接口。app.py在SettingsService锁内取限制与ModelConfiguration快照，系统存储读取Key但不序列化。运行中改设置只影响下次运行，不把新地址/Key混入当前请求。无配置也保存带真实模型标签的失败记录，不回退规则。
2. RunManager仍负责begin_agent、整体Timer、取消Event、工具Timer和唯一终态。真实运行用配置的120秒默认限时；原假模型SCENARIOS的15秒/受控延迟保持。每次模型返回及工具前后检查stop/deadline，取消/超时后迟到数据不能写回。正常退出与硬退出沿用中断恢复，不自动重调。
3. AgentRunner把旧plan/respond包成RuleDialog；真实模型使用OpenAIModelProvider.complete。两者共用messages→工具选择→ToolRegistry→tool_started/tool_result→tool消息→最终回复的循环和Store/SSE。假模型仍固定最多一次工具，价格仍来自工具。
4. ToolRegistry.definitions只枚举已注册的market.quote、market.kline。协议wire名称market_quote、market_kline不带点，decode按注册表映射回内部名称。整批验证ID唯一、JSON无重复字段、symbol匹配US且无额外字段后才执行，原ToolArguments与execute二次校验保持；非法批次零执行。内部事件call_id自造UUID，不保存provider原始ID或参数错误原文。
5. 默认最多8轮且累计8次工具调用，批量请求不能绕过计数。第8次结果回传后仍可请求最终回复；若继续要工具则TOOL_LIMIT、零超额执行，所以模型请求最多9次。模型先返回assistant.tool_calls，再按tool_call_id追加tool结果；不会把工具数据当系统指令。
6. OpenAIModelProvider通过httpx.AsyncClient进行有界非流式Chat Completions。禁代理/重定向/重试，检测认证401/403、限流429、其他HTTP、网络、单次/整体超时、异常JSON/finish_reason/消息。等待HTTP时轮询stop并取消请求task，真实本机socket关闭已验证；不是用假回复盖住失败。API Key只用于请求头，异常固定错误码，最终文本反射已知Key时脱敏。
7. verify_live只读本机配置/系统凭证，在临时库以1轮/次、整体最多60秒与最多两次请求执行同一AgentRunner/RunManager/Store。无凭证返回not_executed；直接回复而无一次成功tool_result也不能记passed。测试中的MockTransport/本机协议fixture均是模拟响应，开发轮真实验证未执行；发布轮本机配置后2次请求、1次成功工具回传、completed通过，详情见EVIDENCE第25节。

官方协议依据：[OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling)、[Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)。实现/验收见openai_provider.py、agent.py、tests/test_openai.py和 [第9步清单](docs/ACCEPTANCE-step9.md)。第10步行情/账户适配走独立只读验收入口，此Agent循环仍使用模拟行情。

## C06：真实行情、账户和连接怎样路由？

状态：第8步设置/凭证/假连接已展开；第9步模型选路见C05，第10步提供商适配已实现并通过模拟验收，第11步七个证券视图与持久自选已实现并通过模拟/实窗验收，用户练习待完成。

- 主链：配置/健康 → 能力请求 → 路由选择Provider → 规范化数据与来源 → UI/Agent。
- 必读1：`packages/core/src/provider.ts`：LLM、financial-data、broker-account不同契约和状态。
- 必读2：`packages/shared/src/providers/router.ts` / `ProviderRouter.execute`：输入能力与参数，选择和执行提供商。
- 必读3：`packages/shared/src/providers/longbridge/adapter.ts`、`broker.ts`、`massive/adapter.ts`，及`connection.ts` / `ConnectionStore`：核对SDK/CLI实际字段到规范结果的映射。
- 验证选读：`packages/shared/src/providers/providers.test.ts`；不能据此替代真实凭证调用。
- 暂缓：组合导入由C07，风险计算由C08。

### 研迹第8步：为什么模型成功不能带着行情成功？

场景：在“模型设置”保存demo-model，点击“测试假连接”；模型显示假成功，行情、账户、技能、运行时仍未配置。

1. `App`打开`settings/SettingsPanel.tsx`。页面并行读取`connections`和`profile`，只维护表单及显示缓存；关闭页面/后端变化时丢弃过期结果。四个分区参考Folio设置/连接/资料/诊断的信息流，本步没有导入原client或TS后端。
2. `ConnectionCard`提交非敏感`ConnectionInput`；`preload`只调用`settings:save`，main验证IPC来源及五类kind白名单，`BackendManager`携本机启动令牌PUT `/settings/connections/{kind}`。页面中的endpoint只是配置值，主进程不会把它当请求目标。
3. Python `SettingsService.save`只写SQLite `connections`对应kind的记录。首次保存为untested；已有配置重新保存后旧测试invalid、checked_at清空。`0004_settings`只增加connections/profile两张表；不改变消息、运行或事件历史。
4. “保存凭证”单独调用`/credential`，`CredentialInput`使用SecretStr和字节上限。Python `WindowsCredentialVault`调用CredWriteW把UTF-8原文存于系统凭证管理器，数据库只存UUID引用；先创建新系统条目、再提交引用，提交失败清理新条目并保留旧引用，成功后清理旧条目。接口没有读回密钥操作，只返回credential_present。密码框在提交时立即清空，不写sessionStorage。
5. “测试假连接”POST `/test`。`SettingsService.test`与编辑操作通过同一锁串行，只更新此kind的状态：success→ready、failure→failed、invalid→invalid；没有HTTP、模型SDK或行情SDK。未配置/停用不成功，缺所需凭证invalid、系统存储不可用failed。模型与行情的记录/凭证引用互不共用。
6. 修改模型名、地址或凭证会使旧成功失效；删除凭证或在系统管理器外部移除凭证后，GET重新检查是否存在，不能凭旧成功显示就绪。“重新读取状态”直接从Python刷新，重启后同库保留状态/测试时间/资料，不重新测试，不改变规则Agent或fixture数据。
7. `SettingsService.diagnostics`显式投影白名单字段，不包含endpoint、model、资料、引用、本机路径、环境或异常原文。`/settings`验证错误不返回原始输入，存储异常也用固定消息，避免默认422回显凭证。“导出脱敏诊断”由main读取此报告，系统保存对话框选择路径后写JSON；renderer不指定路径或任意内容。

Windows系统存储不可用时拒绝保存，无明文后备。凭证命名空间按数据库绝对路径隔离；复制数据库不复制系统凭证，迁移路径需重新配置。极端崩溃/系统清理失败可能留孤立系统条目，普通Python字符串不承诺彻底擦除内存。上述真实系统存储读写与状态流程验证，并不证明真实LLM/行情连接健康。

理解题和亲自操作见practice第8步及 [第8步验收](docs/ACCEPTANCE-step8.md)。

### 研迹第11步：切换页面时，股票和来源如何保持正确？

场景：选NVDA.US，依次切概览→财报→新闻；AAPL早发的迟到响应不能覆盖NVDA，关窗再打开仍选NVDA。缺报表不是0，模拟成功不是实时权限。

1. `renderer/securities/SecurityWorkspace.tsx`只维护页面、表单与结果显示缓存。进入时调用`workspaceState`读Python，`mutate`队列串行add/remove/select；不把自选或当前证券存在localStorage。显示仅接受不落后revision的持久状态。
2. 页面组合view/provider/mode/symbol/period/kind/report/offset及revision为请求key。`load`捕获key和generation；回包必须同时匹配当前key、序号、股票、提供商、模式和视图。切页/切来源/卸载先使旧回包失效，真实模式等待显式查询。
3. preload命名`securityPage`→主进程IPC来源校验→`BackendManager.securityPage`→带令牌POST `/workspace/page`→Python `SecurityQuery`拒绝非法代码、额外字段、组合等未开放视图。React不能指定本机端点或执行CLI。
4. `WatchlistStore`经`Database.write`事务保存有序自选和活动代码；迁移`0007_security_workspace`只增加两表。只首次种四股票，清空不复种；重复加入不重复，最多20只，删除当前选择回退第一只或空。并发写用数据库事务串行保护。
5. `SecurityWorkspace.page/_block`调用同一个`ProviderService.query`：自选四个独立quote、概览profile/valuation、其他一项只读能力。最多4并发，不请求账户或模型；NO_DATA映射missing，认证/受限/不支持/网络等保留固定码，部分失败不丢成功块，无模拟回退。
6. `workspace_normalize`仅投影明确字段。数字null/占位符→None，0保留；时间缺失不补现在；报表币种/报告期保留，未知整数交易状态显示代码与含义未知。新闻不补标题/时间/URL，合法原链接保持全文；SDK NewsItem由显式属性白名单公开，不用__dict__兜底。
7. `SecurityViews.tsx`用生成DTO显示指标卡、图表、报表、新闻和市场状态；每块统一`Source`显示来源/缓存/时效/时间。`FinancialKLineChart`消费实际bars及period；新闻点击→`openNewsSource`→main HTTP(S)校验→shell.openExternal，渲染端不开Node或任意协议。
8. `tests/test_workspace.py`和`tests/desktop.test.cjs`分别覆盖七视图三态、旧库升级、串行持久化与迟到上下文。假响应也经过ProviderService和相同能力健康记录路径，不能把DOM通过当真实数据验证。具体[第11步清单](docs/ACCEPTANCE-step11.md)与练习见practice。

用户笔记：待填写。

## C07：导入持仓怎样校验而不污染账户？

状态：第12步已实现，模拟/假SDK与本机验收单独记录；用户练习待完成。关联步骤12。

- 主链：CSV/粘贴输入 → 解析/标准化 → 草稿校验 → 确认导入 → 组合记录。
- 必读1：`packages/shared/src/portfolio-import/parsers.ts` / `parseImportText`、`parseCsv`、`flagDuplicates`：输入文本到标准化行/重复标志。
- 必读2：`packages/shared/src/portfolio-import/draft.ts` 与 `repository.ts`：从草稿到存储，追调用绑定。
- 必读3：`packages/core/src/account.ts` 与 `portfolio-import.ts`：账户与导入领域，不把来源不同的数据相加。
- 验证选读：`packages/shared/src/portfolio-import/parsers.test.ts`、`repository.test.ts`。
- 暂缓：风险/对比由C08。

### 研迹第12步真实调用链

1. `apps/desktop/src/renderer/portfolio/PortfolioPanel.tsx`保留Folio组合卡、持仓和显式草稿确认的必要展示结构，不使用原TS业务内核。文件输入由页面读取UTF-8文本，不将文件路径交给main；Python才做领域校验和计算。
2. `bridge.ts`/preload的portfolioList、createPortfolio、portfolioView、previewPortfolio、confirmPortfolio、undoPortfolio、refreshPortfolio七个命名操作，经main来源验证、UUID/大小检查和随机启动令牌转发到固定`/portfolios`接口。总桥50项，不暴露任意文件/URL。
3. `portfolio_contracts.py`约束独立账户/组合ID、数据来源、十进制字符串和缺失值；`portfolio_csv.parse_csv`校验七列表头、记录类型、代码/币种/十进制/非法行/重复行。`fingerprint`对规范化内容排序，不因BOM、行序或2.0与2差异重复导入。
4. `PortfolioService.preview`只保存有效草稿到有界内存，返回Python估值，不改变SQLite。整批非法则没有可确认draft_id。确认检查归属/期限/revision/重复，然后在`Database.write`的BEGIN IMMEDIATE事务里保存整个快照、前态和批次链接。
5. `portfolio_calculate.calculate`以Decimal逐持仓算成本/市值/盈亏，再按币种归并；现金未知不会冒充0，缺一份价格则完整资产为—。输出全部计算值，React只显示字符串，LLM不参与数值计算。
6. `PortfolioService.undo`只恢复最新导入的before_snapshot及previous_batch；revision继续递增，旧草稿失效。`0008_portfolios`新增三张本机表并保留旧会话/设置；真实余额/持仓仅内存，不入这三张表。CSV/运行库均被Git忽略。
7. 真实只读刷新主动调用既有ProviderService的account.positions和account.assets，两个独立请求并发；无凭证/受限/失败不返回模拟数据。提供商报告净资产单列，SDK缺单价则保持缺失。页面key和generation让迟到的旧组合响应不能覆盖新账户。
8. 模拟账户CSV导入后，账户性质仍“模拟”，数据来源变为“CSV快照”、市场时间为—；撤销至内置样例后恢复固定来源/时间。来源、账户性质和是否已保存不能混为一个标记。

用[第12步清单](docs/ACCEPTANCE-step12.md)的2股样例手算340，再沿上述链核对预览/保存/重启/撤销。[Python案例](services/backend/tests/test_portfolio.py)和[实窗案例](tests/desktop.test.cjs)是本项目自造模拟证据，不代表真实账户或用户掌握。

## C08：风险和股票对比的数字如何产生？

前置：第12步组合输入与确定性计算已在C07实现。本课第13步已实现并通过模拟和本机自动验收，真实数据与用户练习未验证。

状态：第13步已展开。关联步骤13。

- 主链：组合或股票列表 → 获取规范数据 → 确定性计算 → 报告/对比表 → 页面或工具。
- 必读1：`packages/shared/src/portfolio-risk/service.ts` / `PortfolioRiskService.analyze`：持仓、行情、缺口到风险结果。
- 必读2：`packages/shared/src/compare/service.ts` / `buildComparison`：多标的指标与缺失结果。
- 必读3：`packages/core/src/portfolio-risk.ts`、`compare.ts`：统一结果契约，核对币种/期间和证据。
- 验证选读：`packages/shared/src/compare/compare.test.ts`，风险同目录测试。
- 暂缓：文字综合是模型工作，不替代上述数值；后续研究由C10/C11。

### 研迹第13步真实调用链

1. `renderer/analytics/AnalyticsPanel.tsx`选择组合或2—4代码、提供商、模式、币种和年度，只有点击分析/刷新才请求。默认模拟；切换输入递增generation，迟到响应不能写入新视图。`App.tsx`按需加载页面。
2. preload的`portfolioRisk`/`compareStocks`→main命名IPC与来源检查→`BackendManager.business`→带令牌的POST `/analytics/risk`或`/analytics/compare`。`analytics_contracts.py`拒绝额外字段、重复代码、非法数量/币种/年度；前端类型来自生成契约。
3. `AnalyticsService.risk`读取`PortfolioService.view`的账户/组合/revision及估值输入，不自动刷新真实账户；`.compare`只接收股票查询。`_reads`复用`ProviderService.query`，最多4并行和25秒预算，逐项保留真实/模拟、缓存、时间和失败码，不用模拟替代真实失败。
4. `analytics_calculate.py`用Decimal计算同币种持仓权重、Top1/Top5/HHI，现金不进入分母；缺一项估值则全部权重为null。日线必须有效且日期唯一，缺口超过7天拒算；`volatility`用样本标准差，组合采用当前市值权重与严格相同日期的收益。`AnalyticsService._risk`补行业、财报7天/新闻7天信号及明确缺口。
5. `_compare`构建固定13行，金额需币种一致，财务直接指标需指定Annual年度，收益用21/63/252个交易日且已知序列同窗。缺失、不支持、期间重复或错位保留null/reason，没有零填充、排名或汇率猜测。
6. `_cached`按查询、完整组合快照和提供商配置版本保存最多32份内存结果，复用最长30秒；主动refresh创建新snapshot_id。结果由`renderer/analytics/Results.tsx`展示数值、输入、时段、来源和限制，不做第二遍数值计算。
7. Agent的`ToolRegistry`仅新增`portfolio.risk`与`stocks.compare`，参数按各自DTO校验，调用同一`app.state.analytics`。假模型识别“分析组合<UUID>风险”“对比AAPL.US MSFT.US”；OpenAI通过同一工具定义/事件链。工具结果完整保存为当时快照，`ToolResultCards`复用同一Results组件，重放不重新分析。真实模型仅文字综合，主动请求的组合事实会作为工具结果发给模型。

读链：`analytics_contracts.py`→`analytics_calculate.py`→`analytics.py`→`tools.py`/`app.py`→`analytics/Results.tsx`。用[手算案例与覆盖表](docs/ACCEPTANCE-step13.md)核对0.6/0.4、HHI0.52及组合日波动0.02828427，再看`test_analytics.py`与实窗测试的同snapshot断言。现有10根模拟日线不足1M/3M/1Y，显示—是正确结果。

## C09：技能为何显示就绪、部分就绪或禁用？

状态：第14步已实现；模拟/本机验收结果见清单。关联步骤14。

- 主链：扫描技能 → 解析元信息/依赖 → 能力注册状态 → readiness → UI或按需资料读取。
- 必读1：`packages/shared/src/capabilities/registry.ts` / `createCapabilityRegistry` 与 `readiness.ts`：注册和依赖状态。
- 必读2：`packages/skill-hub/src/index.ts` / `SkillHub.loadSkills`、`setEnabled`、`parseSkillMarkdown`：输入目录/文本到技能元信息。
- 必读3：`packages/skill-hub/src/capability-map.ts` 与 `packages/ui/src/components/settings/SkillsView.tsx`：状态映射到页面，追参考读取的路径检查。
- 验证选读：`packages/skill-hub/src/index.v2.test.ts`、`packages/shared/src/capabilities/readiness.test.ts`。
- 暂缓：研究策略使用技能但不复制技能提示，由C10。

### 研迹第14步真实调用链

1. 桌面“能力与技能”按需加载SkillsPanel；同时读取命名IPC capabilities:list、skills:list。主进程校验mode/provider/id/path，携启动令牌请求Python；TS类型来自OpenAPI。
2. create_app启动时将同一个CapabilityRegistry交给ToolRegistry、ProviderService、SkillCatalog。TOOL_SPECS保存工具参数/返回类型；SUPPORTED引用既有数据能力目录。没有第二份健康存储。
3. /capabilities按模式/提供商计算状态，/providers/capabilities仍读取ProviderService原health及配置revision。真实状态没有当前版本请求成功证据就不可用，配置/凭证变更会失效；Python计算能力不等于其真实数据已齐全。
4. SkillCatalog.list只读取SKILL.md元信息/声明依赖并检查参考文件存在，调用同registry.state；未知能力NOT_IMPLEMENTED、必需缺失unavailable、可选缺失partial、禁用disabled、坏文件invalid。缺参考资料RESOURCE_MISSING。
5. 首批上游文件按原字节保留；catalog.json来自固定capability-map.ts，仅为原SKILL.md补依赖，不缓存健康状态。自定义技能使用required-capabilities/optional-capabilities。启用偏好存于0009_skills表，不复制可用性。
6. 点击资料→skills:resource→POST /skills/{id}/resource→SkillCatalog.read；重新检查启用/依赖/资料声明，拒绝../、绝对路径、ADS、链接/联接；Windows还验证打开后的实际文件句柄路径。只读UTF-8、64KiB上限，不执行文本或访问其链接。迟到结果不能写入新视图。
7. Agent沿同一个tools.skills查询。输入“技能 longbridge-technical 状态”“能力 options.chain 状态”或“读取技能 longbridge-technical references/technical.md”由Python直接响应；加入“真实状态”或“读取真实技能”则检查真实依赖。不可用资料拒绝且不发模型请求。普通模型调用收到当前声明状态，四个原只读工具由注册表筛选/校验。

读链：services/backend/research_trail/capabilities.py → skills.py → app.py/agent.py → apps/desktop/src/renderer/skills/SkillsPanel.tsx。完整范围和边界见[第14步验收清单](docs/ACCEPTANCE-step14.md)。就绪表示声明依赖可调用，不表示真实服务、技术指标或研究策略已完成；第15步仅实现数据采集（见C10），不执行技能指标或报告。


## C10：研究策略怎样驱动有界数据采集？

状态：已按第15步真实实现展开；本机自动验收通过，用户学习待填写。

场景：证券工作台选MSFT.US，点击“采集此股票研究数据”，由全面16项切为价值4项。
ResearchPanel从Python读取8种策略；只读预览不创建任务、不查行情。开始后页面接收已保存任务，
轮询元数据并显示RunProgressCard，结果按能力点击读取，不让LLM编报告。

真实链：SecurityWorkspace入口 → ResearchPanel/StrategyPicker → preload.startResearch →
main BackendClient.startResearch → POST /research/runs → ResearchService.start/plan →
同一CapabilityRegistry.state与SkillCatalog.list → ResearchStore.begin原子保存计划 →
execute/advance最多4项 → ProviderService.query及已有适配器 → ResearchStore.step/finish →
SQLite研究记录 → researchRun/researchData → 页面显示已保存状态和来源。

- 必读1：services/backend/research_trail/research_strategies.py、research_contracts.py、research.py：固定映射、默认4/20、技能目录引用、分发时状态/revision重查；前端没有另一份策略映射。
- 必读2：provider_service.py的query：请求专属停止标记与服务停止共同检查，沿既有SDK/CLI/HTTP数据访问；禁用技能不会删掉其他页面的共享数据能力。
- 必读3：research_store.py、models.py和0010_research.py：逐项状态/结果、原子终态、部分成功与零成功，以及关闭/重启中断后保留成功数据。
- 界面：renderer/research/ResearchPanel.tsx、StrategyPicker.tsx、RunProgressCard.tsx：预览防迟到覆盖、取消、保存任务和按需数据读取；元数据不携带大结果。
- 验证：tests/test_research.py及tests/desktop.test.cjs的Step15案例；固定源版本及SHA见[SOURCES-step15](docs/SOURCES-step15.json)，范围见[验收清单](docs/ACCEPTANCE-step15.md)。

超时不是任意第三方线程已瞬间退出的证明；迟到调用继续占物理槽位，清理期结束时排队项明确失败，
旧调用退出前拒绝新任务。只有协调器写研究记录，取消和终态保护阻止迟到数据复活任务。
技能正文未执行、缺11项基线技能仍明确missing；这不阻止独立可用数据能力的只读采集。
报告与显式续跑由后续步骤，本步未实施。

## C11：证据报告怎样生成、比较并恢复？

状态：第16步已按实际代码展开，固定/模拟与本机验收通过，发布复验一次真实LLM结构、引用和保存通过；原五次失败保留。真实报告的数据仍为模拟，定性分析可能与事实不符，引用不证明正确，见EVIDENCE第39节；第17步检查点/显式恢复已实现，模拟/协议与本机自动验收通过，本步没有真实LLM请求。

研迹真实调用链：

1. 研究页面选择策略并经 ResearchService 采集；终态后 ReportPanel 显式选择 fixed/real，
   preload命名桥 → main来源/UUID校验 → BackendManager → `/research/runs/{id}/reports`。
2. `reports.ReportService.start` → `report_facts.packet` → 既有 ResearchStore.get/data。
   每个事实绑定能力执行序号、原始JSON Pointer、值及完整结果hash；缺失数据形成gap。
   模型只收到有界已采集投影，不接收凭证、不直接查行情。
3. 固定合成器用于离线验收。`LiveReportSynthesizer`经既有OpenAIModelProvider发送单次请求，
   严格JSON → `report_synthesis.validate`校验证据ID/类型/禁编数字 → ReportDocument。
   fact文字为空，事实值由Python引用；分析/预测的来源关联不证明判断正确。
4. ReportStore在0011_reports保存版本。协调器独占写入，终态不覆盖；失败不固定回退，
   取消/超时后的迟到结果不能保存。关闭或重启仅记录interrupted，不续跑。
5. ReportPanel读取报告并分类型展示；原始事实桥 → ReportService.evidence →
   `report_facts.original`校验执行记录、hash和字段值，按需返回完整原结果。
6. `report_output.markdown`转义正文并附事实索引 → main系统保存对话框写用户选择路径。
   `report_output.diff`读取两份真实保存的ReportJob，比较字段值/缺口/分析内容，零模型请求。

读链：report_contracts → report_facts → report_synthesis → reports/report_store →
report_output → app → report-types/bridge → ReportPanel；[验收清单](docs/ACCEPTANCE-step16.md)。
第17步恢复真实调用链：

1. `ResearchStore.begin/step/finish`调用`research_checkpoints.save`，与原计划、执行状态和
   原始结果在同一事务提交。检查点记录计划hash、结果hash、状态、代次和时间；它是审计
   快照，原业务行仍是唯一执行状态。0012迁移为旧库生成一次legacy-migration快照。
2. Python启动`ResearchStore.recover`与`ReportStore.recover`，只把活动状态标为interrupted。
   打开研究页会识别采集或最新报告的中断任务，读取检查点；启动和查看均零业务重执行。
3. `RecoveryPanel` → preload的`researchCheckpoint/resumeResearch/restartResearch/abandonResearch`
   → main来源/UUID校验 → `app.py`受启动令牌保护的四条路由 → `ResearchRecovery`。
4. `inspect`在单一读事务核对校验和、版本、计划、成功结果与数据库。待续采再核对原配置
   revision及identity、同一能力注册表与本机凭证。配置变化或缺证据阻止恢复；模型变化
   只给警告，因为恢复不创建模型。远端凭证过期只能在实际只读查询时得知并保存失败。
5. `resume`保留原ID、原计划和已完成结果，只重置中断/取消的工作；既有有界执行器续采，
   不复制提供商代码。恢复代次阻止旧协调器回写；操作UUID入库去重，重复请求返回原任务。
6. 报告阶段恢复只读取旧版本，不继续HTTP请求或自动生成。发送前持久标记可能已消费，
   硬退出后无法知道服务端结果时显示不确定。只有另点“生成新报告”才新增版本和显式调用；
   同一报告请求UUID返回同一版本，迟到输出不能覆盖终态或制造成功。
7. `restart`按旧研究输入、当前配置创建新ID/新计划并重新采集，parent_run_id指向原任务。
   `abandon`同一事务标记原任务放弃、取消未完成采集/报告并记录操作；旧成功证据/报告保留。
   放弃后禁止续采与新报告，可以只读历史或重新发起；不会把已完成采集伪改为失败。

检查点hash证明当前记录间一致，不证明投资分析正确，也不是防数据库管理员伪造的签名。
已完成采集不会重复查询；中断且未提交的只读调用可能在显式续采时再执行，不能承诺外部
请求恰好一次。已经确定失败/超时/不可用的项保留缺口，不通过恢复偷偷重试。
读链：research_checkpoints → research_store/research → research_recovery → reports/report_store →
app/bridge/RecoveryPanel；实际中断用例见test_recovery.py、tests/desktop.test.cjs与
[第17步清单](docs/ACCEPTANCE-step17.md)。

- 主链：已采集数据包 → synthesizer → 带EvidenceRef报告 → 存储/显示/差异；中断经checkpoint显式恢复。
- 必读1：`packages/core/src/research.ts` / `ResearchReport`、`EvidenceRef`；`packages/shared/src/research/agent-synth.ts`：输入事实到结构输出，追注入合成器。
- 必读2：`packages/shared/src/research/service.ts` / `ResearchService.resume` 与 `checkpoint.ts` / `validateCheckpoint`：身份配置、状态和已完成采集复用。
- 必读3：`packages/ui/src/components/research/ResearchReportView.tsx`、`WhatChangedSection.tsx`：结果显示；`claim-verifier.ts`独立实现需另查调用，不能假定已接入。
- 验证选读：`packages/shared/src/research/recovery.test.ts`、`hard-kill.test.ts`、`claim-verifier.test.ts`。
- 暂缓：报告转论点由C12；性能与真实正确性未测，不下结论。

## C12：研究结论如何变成可复审的论点？

状态：第18步调用链已展开，用户学习记录待填写。下列packages路径仍指只读固定Folio，研迹Python链另见下方。

- 主链：报告 → saveFromReport → 论点/版本 → 新数据评估 → impact记录。
- 必读1：`packages/shared/src/thesis/service.ts` / `ThesisService.saveFromReport`：报告到论点，追converter。
- 必读2：`packages/shared/src/thesis/converter.ts`、`repository.ts`：结构转换和历史存储。
- 必读3：`packages/shared/src/thesis/evaluator-local.ts`、`agent-eval.ts`：核对本地和模型评估目标及绑定。
- 验证选读：`packages/shared/src/thesis/service.test.ts`、`converter.test.ts`。
- 暂缓：提醒触发由C14，收益窗口由C16。

### 研迹第18步实际调用链

1. 已保存报告的“将报告形成投资论点”或论点页报告选择 → preload八项theses命名操作 → main assertSender/ID/字段白名单 → BackendManager带启动令牌请求/theses。renderer不采集、不保存业务状态；thesis-types仅引用Python生成契约。
2. ThesisService.create → checked → 原ReportService.completed、ResearchStore.validate_checkpoint及report_facts.original：验证每条真实执行引用/hash。convert_content只转换分析/预测，事实引用仍在ReportJob快照；0013追加version1，原报告不变。同来源报告幂等，UUID内容hash拒绝跨操作复用。
3. edit在Database.write的BEGIN IMMEDIATE内核对expected_version，追加ThesisVersionRecord及理由，再递增当前指针。旧版本含对应完整报告快照。没有新采集时编辑不会假装拿到新数据。
4. evaluate核对较新独立采集、同证券/数据模式/提供商，检查新事实覆盖旧字段、缓存及fetched_at，再调用原report_output.diff比较两份实际报告。保存ThesisReviewRecord和base_content/新旧快照/差异/缺口。无法评估保存unable+code，comparison/judgment为空，不自动增强/失效。
5. judge明确接收用户判断、content及reason，重查评估base_version与新证据，追加版本及关联judgment记录同事务；旧评估仍ready，旧版本不改。前端显示自动字段比较与用户投资判断的来源区别。
6. ThesisPanel当前草稿和历史只读展示分离；身份/卸载代次丢弃迟到历史读取。两个实窗验收使用实际Python采集20→25、保存/重开及真实IPC延迟，不用页面假状态代替数据库证据。

缺失报告、相同/更早采集、缓存、缺字段或证据失效不能标为完成判断；可比较字段unchanged不证明论点正确。复述任务：解释“用户编辑没有新数据”与“用户基于新报告保存复审”各自如何保留对应数据和历史。

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


### 研迹第10步：相同查询为何会有模拟、真实、缓存与受限结果？

场景：在“数据与只读账户”查询AAPL.US，先不配置凭证。模拟成功只标market.quote模拟通过；切到真实模式得到PROVIDER_UNCONFIGURED，不带模拟价格。保存配置但没有凭证时SDK返回CREDENTIAL_MISSING，不影响其他能力。

1. `renderer/ProviderPanel.tsx`显式选择provider/mode/capability，清除旧结果，默认simulated；`provider-types.ts`只引用Python生成类型。preload七个命名操作→main来源/提供商白名单→BackendManager→带启动令牌的本机API，渲染端不执行SDK或CLI。
2. `provider_contracts.ReadQuery`拒绝未知能力、额外字段、非法代码/日期/布尔count；`app.py`只读查询入口→`ProviderService.query`。simulated调用`authored_data`，真实路径取得`ProviderSettings.snapshot`的一致配置/凭证引用，只读行情与账户独立。
3. Python读取对应Windows系统凭证，不枚举、不打印；`provider_process.sdk_process`把快照通过stdin交给所属worker，argv/env不含密钥。`provider_sdk.execute_sdk`静态映射当前官方SDK只读方法；Massive使用固定HTTPS路径、Authorization请求头。子进程输出/时间有界，Windows所属Job在父进程异常结束后回收孩子。
4. 缺口进入`provider_cli.arguments/execute_cli`：限定longbridge.exe绝对路径、argv数组、已验证参数与auth status前置检查；账户身份/组合及部分日历/报告走CLI原有会话。CLI认证存储不是研迹管理的SDK三项凭证，真实兼容性仍待本机验证。
5. `provider_normalize.public_json`仅公开SDK类型注解/JSON字段，转换有限数值和UTC时间，移除敏感字段与已知密钥反射；账户保留币种，缺市价/市值null，不补成零。CLI按固定基线实际overview/market_accounts/holdings或分组list/infos投影，不返回auth/debug。
6. ProviderResult成功携mode/transport/时效依据/获取与市场时间，失败携固定状态/码，无真实失败回退Fixture。默认延迟未知，用户时效声明不证明权限。当前进程按provider/capability/revision记录最近状态；一次quote成功不能把account.assets或其他提供商设为成功。
7. 行情内存缓存有TTL、版本和容量；命中保留原fetched_at、更新served_at。换配置/凭证、删除重建立即失效；过期请求失败不复用陈旧成功。账户不缓存、不落数据库、不进诊断；面板离开就丢显示结果。
8. `verify_data`默认只读检查配置；显式--run才允许一次SDK/HTTP业务查询，仅打印安全验收摘要。本轮用户无凭证，三类均未执行/0查询。学习读链：provider_contracts→provider_settings→provider_service→provider_sdk/provider_cli/provider_massive→provider_normalize→tests/test_providers.py；完整 [覆盖表](docs/PROVIDER-COVERAGE-step10.md)与 [验收清单](docs/ACCEPTANCE-step10.md)。
