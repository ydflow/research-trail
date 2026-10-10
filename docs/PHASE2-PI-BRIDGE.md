# P2-02：真实 pi 核心与 Python/Node 安全桥

日期：2026-10-10（Asia/Shanghai）。仅本机开发、确定性假模型和模拟行情。
状态：验收通过（本机离线开发桥范围）；最终结果在下方验收表与 EVIDENCE 第61节记录。
P2-01 两份文档是历史基线，原文保留。本页记录P2-02历史验收；后续模型桥见 [P2-03](PHASE2-PI-MODEL-BRIDGE.md)。

## 1. 执行前状态与交付边界

- 实际 cwd/Git 根：`<repo>`；main；HEAD `7d12da5204d7119dbd71818bbeaa8207b6aeb731`。
- 起始未提交：ROADMAP、EVIDENCE、PHASE2-BASELINE、PHASE2-PI-ARCHITECTURE；索引空。保护此前内容，本轮只追加进度/证据。
- 读取 AGENTS、两份 P2-01 文档、路线/证据，以及 AgentRunner、ToolRegistry、RunManager、Store、模型适配器、Electron 启动/打包及相关测试。
- 用户明确授权安装必要的固定项目依赖。执行 `bun.cmd install --ignore-scripts`，没有全局安装、升级桌面/Python/Bun、执行 pi CLI 或启用真实连接。
- 本轮没有修改 app.py、agent.py、tools.py、lifecycle.py、store.py、已有模型提供商、投资公式、迁移、生成契约、React 或 Electron 业务代码。
- 公开 StartRun kind 没有新增 pi；没有环境开关、UI、聊天路由或研究/恢复挂接。缺 Node/pi 必须明确失败，不自动安装或偷偷切换引擎。

## 2. 已从源码及安装产物确认的 pi 行为

官方仓库：[earendil-works/pi](https://github.com/earendil-works/pi)。固定提交
[`abe508e1b89912adde45528136c3221eb69acdd7`](https://github.com/earendil-works/pi/tree/abe508e1b89912adde45528136c3221eb69acdd7)。
直接依赖：`@earendil-works/pi-agent-core@1.1.0`、`@earendil-works/pi-ai@1.1.0`。
ai 是构造真实 AssistantMessageEventStream 的必要直接依赖，避免 core 的 `^1.1.0` 随解析漂移。typebox/telemetry 为锁文件内传递依赖，没有安装 coding-agent。

安装前读取 registry manifest 与固定 LICENSE，并下载 core tgz 到临时目录，独立 SHA-512 校验通过：

```text
sha512-aX1KZomNCPmwYnXa3OivF3VYLJ+WPUkIJlEIZTgwdOZdY/+oToWTQ334WYpQeOz9POpiYFNMJLPwIhXQ4e48kg==
```

安装后 `agent.js.map`、`agent-loop.js.map`、`types.js.map` 的 sourcesContent 与 P2-01 下载的固定提交源码逐字符相同。
对应 SHA-256 保存于 `packages/pi-worker/dependency-audit.json.core_sources`。registry 无 gitHead，不能单靠版本号声明产物来自该提交；这里另核对了实际使用的三个核心源码。

关键源码：[agent.ts](https://github.com/earendil-works/pi/blob/abe508e1b89912adde45528136c3221eb69acdd7/packages/agent/src/agent.ts)、
[agent-loop.ts](https://github.com/earendil-works/pi/blob/abe508e1b89912adde45528136c3221eb69acdd7/packages/agent/src/agent-loop.ts)。

1. Agent `processEvents` 按注册顺序 `await listener(event, signal)`。
2. `streamAssistantResponse` 在返回完整 assistant 消息前 `await emit(message_end)`。
3. `runLoop` 获得该消息后才 `executeToolCalls`。
4. `tool_execution_start` 发生在 pi 的准备/参数验证之前，不能表示 Python 已批准，也不能直接转换成业务 tool_started。
5. 默认工具模式为 parallel，本 Worker 明确设置 `toolExecution: 'sequential'`，每个代理工具也设 sequential/replay never。
6. 自定义 streamFn 覆盖默认模型传输；没有传入 getApiKey/apiKey、CredentialStore 或默认 provider 的调用。导出 auth helper 的存在不等于调用；Worker 没有发现用户配置/凭证的入口。

`worker.test.mjs` 直接使用安装后的真实 Agent，挂起完整 assistant message_end 的异步回调：释放许可前工具执行日志为空；释放后严格为 approved/start/first/start/second。这是固定版本运行证据，升级版本必须重验。

## 3. 真实调用链与职责

正式路径保持：

```text
SessionPanel → preload → Electron BackendManager → FastAPI app.py
→ RunManager → Python AgentRunner → ModelProvider / ToolRegistry
→ Store（唯一持久化和业务 sequence/终态）→ SSE → React
```

独立测试路径：

```text
python -m research_trail.verify_pi --node <绝对路径>
→ PiOfflineBridge（无数据库的显式验证入口）
→ Python Popen [node, --require offline/network.cjs, worker.mjs, run_id, attempt_id]
→ stdin/stdout JSONL → 真实 pi Agent + 确定性 streamFn
→ assistant message_end 等待 Python 整批许可
→ pi 代理 execute → tool_request → 原 ToolRegistry.decode/execute
→ Python ToolSuccess → tool_result → pi toolResult 上下文
→ 第二次 streamFn → pi 最终 assistant 回复 → Python AgentOutcome
```

Python 是工具准入、业务工具、数据来源、业务事件和运行状态的唯一管理方。pi 仅拥有本次引擎的临时 transcript/循环，不开库、不保存第二套会话。Node 的 streamFn 仅把明确的测试批次作为假模型输出；不执行金融计算，不调用外部模型，也不消耗模型 Token。

`verify_pi` 不保存会话。专项测试通过已有 RunManager.start 的内部 runner 显式覆盖，验证 Store 唯一终态和重放；没有在 app 路由中接入。管道 run_id 是本次桥接运行身份，attempt_id 是一次子进程身份；内部 RunManager 测试中的业务 Store run_id 仍由原 Manager 创建，两者通过调用所属 runner 关联。未来正式路径必须在适配入口绑定业务 run_id，不可把这个测试挂接称为正式接入。

关键本地文件：

| 文件 | 职责 |
| --- | --- |
| services/backend/research_trail/pi_bridge.py | 受限启动环境、管道校验、批次准入、一次性许可、原注册表调用、超时/取消/清理 |
| services/backend/research_trail/verify_pi.py | 必须明确给绝对 Node 路径的独立离线入口；fixture provider，无个人库 |
| packages/pi-worker/worker.mjs | 真 Agent、假 streamFn、message_end 屏障、代理工具、协议 stdout |
| packages/pi-worker/protocol.mjs | 重复字段/深度/大小/身份/序号严格校验 |
| services/backend/tests/test_pi_bridge.py | Python 桥单元、真 pi 集成、已有 Store/Manager 显式覆盖测试 |
| packages/pi-worker/worker.test.mjs | 真 pi 屏障与 Worker 输入安全、Node 协议单元 |
| scripts/pi-audit.mjs / packages/pi-worker/dependency-audit.json | 离线完整依赖/许可/源码哈希审计 |
| scripts/verify.mjs | 原离线验收增加上述审计、Node 专项及真实 pi CLI；Python 新测试自动纳入 |

## 4. JSONL Schema 与边界

每条消息 UTF-8，以 LF 结束，允许 JSON 尾部 CRLF；禁止重复字段、NaN/Infinity、多余 envelope 字段。
版本及 sequence 必须是整数；request_id/run_id/attempt_id 字符串匹配 `[A-Za-z0-9_-]{1,128}`。

```json
{
  "version": 1,
  "request_id": "request-uuid",
  "run_id": "bridge-run-uuid",
  "attempt_id": "process-attempt-uuid",
  "sequence": 1,
  "type": "ready",
  "payload": {}
}
```

双方独立的 sequence 从1连续递增；不等同于 Store/SSE sequence。每方向 request_id 不可复用。
响应引用对应请求 ID，但每个方向仍只出现一次；请求/响应绑定 run_id+attempt_id+type。

| 方向 / type | payload（必需字段；不允许额外字段） |
| --- | --- |
| Node → ready | package、version、agent、tool_execution；必须等于 core/1.1.0/Agent/sequential |
| Python → start | tools（name/description/parameters）、batches（离线假模型批次）、rpc_timeout_ms、run_timeout_ms |
| Node → observation | event；只允许 agent_start/assistant_batches/tool_execution_start/tool_execution_end/agent_end，永不透传 SSE |
| Node → tool_batch | calls：每项 id/name/arguments（原始 JSON 字符串） |
| Python → batch_permit | token；随机单批一次性许可，关联 tool_batch 的 request_id |
| Node → tool_request | token、ordinal、call_id、name；禁止再传可替换的参数 |
| Python → tool_result | result：原 ToolSuccess（ok/data），关联该 tool_request 的 request_id |
| Node → engine_end | ok、answer、stats；检查最终文本、统计结构与已执行结果计数 |
| Python → cancel/shutdown；Node → stopped | 空对象；终止本次进程，不恢复或重试 |

| 限制 | 值 / 实现 |
| --- | --- |
| 单帧（含换行） | 131072 bytes；Python readline(MAX+1)，Node 分块累积/逐帧校验 |
| 原始单工具参数 | Python 4096 UTF-8 bytes；JSON 对象 + Pydantic 契约，禁止重复字段 |
| JSON 深度 | 32；frame/队列大小也有界 |
| 每方向消息 | 最多256，严格连续；重复 request ID、未知操作、跨 run/attempt 拒绝 |
| 工具总预算/轮数 | 每次桥1–8，默认8；整批预检，无预算时该批零新增执行 |
| 假模型脚本硬界 | Worker最多9批，每批16个请求；超过 Python 预算仍先整批拒绝；这些上限不是权限 |
| 注册表暴露 | 本阶段只 market_quote / market_kline；Python 与 Node 都固定白名单，decode 再检查实际注册和 capability |
| Python 读/写队列 | 16 / 8 帧；3个专用管道线程；stderr持续小块丢弃 |
| 响应/启动时限 | 默认3秒，配置只能0.05–10秒；总 deadline 默认15秒；Worker总时限最大120秒 |
| 单 Python 工具时限 | min(2秒, 响应时限×0.8)，先于 Node RPC 超时；已有 Manager 的更早 stop/deadline 同样生效 |
| 退出清理 | shutdown最多0.25秒，然后terminate最多0.25秒，再kill/wait最多1秒；管道线程有界 join |

stdout 只协议；stderr 只固定错误码。Python 不把任意子进程 stderr、非法原始 JSON、模型 ID/参数错误文本或 provider 原始异常复制到业务事件。status/error 是固定公共文本；工具事件仅包含原契约验证后的允许参数/结果。

## 5. 整批原子准入与零重复执行

Python 在 tool_batch 上先检查运行仍活动、总次数/轮数、所有调用 ID/重复 ID、工具白名单/注册权限、参数大小、JSON 重复字段、Pydantic 参数。不在校验过程中执行任何 handler。
全部通过才提交 used IDs、预留批次预算并发 batch_permit。Node 的 message_end 回调在获得许可前不返回。

许可绑定当前批次、顺序、原 ID/名称和 Python 解码后的对象。每个 tool_request 必须匹配 token+ordinal+ID+name；Python 先消耗 ordinal，再调 handler；不采用 Node 可能经过 TypeBox 转换的参数，不缓存后重放工具调用。
注册表 execute 在执行边界再次验证。每次开始/结束及发结果前检查 stop/deadline；重复请求、批次未完成时的下一批、迟到消息均不能产生新执行。

**实际测试证据**：

- 真 pi 两工具合法批：AAPL.US → NVDA.US，事件严格 started/result/started/result。
- 真 pi 非法参数、重复 JSON 字段、坏 JSON、额外 real 参数、未注册工具、非法 ID、参数超限：该批 execution_count=0，provider.calls=[]，pi tool_execution_start=0。
- 真 pi 合法+非法、合法+未知、同批重复 ID：全部零执行，不能先执行第一个合法工具。
- 第二批预算溢出/跨批重复 ID：首批已执行1次；第二批零新增，保留首批记录。
- 恶意输运 stub 发重复 tool_request：只执行原工具1次，然后 PI_PROTOCOL，绝不重跑。stub 用例明确属于桥单元，不能作为真 pi 证据。

这保证的是整个批次的准入原子性，不是多个只读 handler 的执行事务或失败回滚。顺序执行与原子准入是两个独立约束。

## 6. 取消、失败与默认回退

桥实例只允许调用 run 一次。启动失败、握手异常、坏协议、Worker异常退出/不响应、工具失败分别返回明确 ErrorPayload；整体/工具/响应超时返回 timed_out；取消抛原 RunStopped 交给已有 RunManager/Store 决定业务终态。不会根据失败再调用默认 Agent。

Worker Agent.abort 与待响应 Promise 清理同步进行；父进程在 finally 关闭/等待子进程及管道，不保留跨运行 pending 请求。观察事件与结果计数仅属诊断，不能驱动业务状态恢复。

正在执行的非协作 Python 只读 handler 无法强行杀死线程：本次结果不再发回 Node 或写 Store；后续完成被丢弃，不能取消一个已经发生的读取。用受控阻塞 handler 覆盖 cancel/run deadline/tool timeout/kill Worker 四种情况，释放后事件完全不变。这是实际验证的限制，未来真实网络工具仍应使用原 provider 自身 timeout/取消接口。

已有 Store.finish 的事务与 RunManager 锁继续提供唯一终态；显式覆盖测试验证 completed/cancelled/timed_out/failed 四种结果各只有一对 message_completed/run_completed、业务 sequence 连续。重复取消、SSE两次重放与 event-log 读取不会增加 model/tool 调用。

默认路径本身就是回退路径：没有生产 pi 开关，环境变量 RESEARCH_TRAIL_PI=1 也不改变 create_app 的 AgentRunner。未来只能在**新运行**明确选择旧引擎；已执行工具的失败运行不能静默重试或转引擎。

## 7. 安全、依赖与许可证

子进程只继承 SYSTEMROOT/WINDIR/SYSTEMDRIVE/COMSPEC/TEMP/TMP；无 PATH/USERPROFILE/APPDATA、模型 key、启动 token、DB路径、代理或 NODE_OPTIONS。必须传现有绝对 Node 可执行路径，shell=False、Windows隐藏窗口，cwd固定Worker目录。测试在父环境放置秘密哨兵，捕获实际 Popen env 并核对结果/协议公开输出不含哨兵。

每次 Node 启动明确加载既有离线网络护栏。该护栏阻断外部 socket/DNS/UDP，允许loopback，是回归护栏，不是操作系统沙箱。Worker 源码没有 shell/fs写入/net/fetch/database 工具，也不加载 pi coding-agent 的资源/扩展。恶意第三方依赖仍具有 Node 进程能力；当前不能声称完整 OS 隔离。

`bun.lock` 对76个新增外部版本锁定精确版本/完整性，459个原有外部版本及 SRI 全部保留（部分同名代理包旧版本被移动到嵌套 key，非升级）。直接包 core/ai 固定1.1.0；telemetry1.1.0、typebox1.3.27由锁文件固定。

完整安装图含87个版本（包含11个共享旧依赖与 peer），总文件70789644 bytes，约67.51 MiB；这是去重依赖图的已安装文件和，不是净安装增加、更不是安装器增量。core/ai依赖含 Anthropic/OpenAI/Google/AWS SDK，但假 streamFn 不调用它们。ai 的本地传递 bin 不代表安装/执行全局 pi CLI。

SPDX 元数据：MIT40、Apache-2.0 34、BSD-3-Clause11、0BSD1、Unlicense1。逐包边、版本、SRI、license标签与可得 LICENSE/NOTICE 文件 SHA-256 全部保存于 dependency-audit.json；离线检查不查 registry。
9包缺独立声明文件，其中 pi 三包已保留固定上游 MIT（Copyright 2025 Mario Zechner）于 THIRD-PARTY-NOTICES.md；其余6包完整版权/NOTICE仍是未来分发前提。SPDX 元数据通过不等于这些分发义务全部完成；未做在线漏洞扫描或完整供应链安全审计。

## 8. Windows 打包：尚未验证 / 不属于本轮

- 已从源码确认：现有 package-windows.mjs 只打入桌面dist、PyInstaller backend、skills/notices，不包括 Worker/Node/npm依赖。当前桥 ROOT 指向源码树，是开发路径，不能声称 frozen backend 可直接使用。
- Node引擎门槛≥22.19.0，本机Node24.19.0已运行；Electron44.5.1内置Node24.21.0不等于存在独立 node.exe，也不自动证明可用 ELECTRON_RUN_AS_NODE 安全启动Worker。
- 未来需明确分发独立 Node 或经验证的 Electron utilityProcess方案，审核Node二进制及其第三方许可、ABI/架构、ESM依赖闭包、ASAR解包/资源定位、签名/哈希、安装体积及离线升级回滚。
- PyInstaller需显式传资源路径，不能继续用源码parents定位；Windows Job Object/进程树退出、应用关闭/强杀、无系统Node、中文/空格/长路径、独立干净Windows需专门验收。
- 本轮已验证实际含空格Node路径，以及中文/空格临时Worker测试路径；只有当前受控单Node子进程清理证据，没有通用多代进程树或安装器证据。
- 未运行 package-backend.py/package-windows.mjs/新安装器/verify:clean；没有新远程CI、安装包或发布。已有离线CI准备阶段的 frozen-lockfile安装会解析新workspace；本轮只本机回归，不声称远程通过。

## 9. 实际验收记录

| 类型 | 结果 |
| --- | --- |
| Python专项 | 40 passed；真实pi集成与显式Store测试、恶意输运单元在测试名/注释区分；1项既有Starlette/httpx弃用警告 |
| Node专项 | 15 passed；真实Agent屏障1、严格JSON/Channel单元7、实际Worker非法输入7；无跳过 |
| 真pi CLI | completed；AAPL.US 189.43 USD / fixture / 模拟数据 / 固定market_time 2024-01-16T21:00:00Z；执行1次；stream_calls=2，results_seen=1，真实pi start/end各1 |
| 完整离线 verify | `bun.cmd run verify`退出0；736 Python（239.44秒）、15新增Node（4.65秒）+19旧Node（1.58秒）、58实际Electron（431.93秒）；失败/取消/跳过0；共新增55测试，旧773测试均保留通过；日志 `%TEMP%\research-trail-p2-02-verify.log` |
| 其余离线门槛 | 12原创工程案例、30原创历史样例CLI、契约/类型/既有native声明/87包pi声明图、临时库重复迁移head0020/模型一致性、主进程/preload/renderer构建全部通过；Vite510.24kB chunk警告和1项Starlette/httpx弃用警告保留 |
| 正式运行链路 | 本机旧Agent及58项真实Electron回归通过；pi没有接入正式API/UI，这不是正式pi链路验收 |
| 补充实际pi断言 | NVDA.US market_kline completed、results_seen=1、工具执行1次；合法GOOG.US market_quote实际执行1次后UNKNOWN_SYMBOL失败，无重试；独立临时Python脚本退出0，非新增pytest计数 |
| 安装包/真实模型/真实行情 | 未执行；本轮禁止范围 |

原始失败如实保留：首次从仓库根调用pytest未正确设置Python导入路径，ModuleNotFoundError；改为仓库既有 backend cwd。首轮测试读取不存在的app.state.runs，且未启动lifespan，改用TestClient和app.state.manager；没有改业务代码来迎合测试。Windows Worker崩溃后BufferedWriter.close出现EINVAL，修复为先结束进程/join管道再关闭句柄，并对已断管道的关闭错误处理；崩溃用例实际复验通过。UTF-8源码map核对首次默认GBK读失败，指定UTF-8后3份固定源码均相同；不是产品功能失败。没有删旧断言、跳过用例或放宽旧超时。

## 10. 独立 PR 审查补充

以上章节保留 P2-02 开发轮证据；随后的独立发布审查授权整理功能分支与 Draft PR。
新增严格 JSON 的溢出数值（1e999）拒绝测试，使 Node 专项由15项增为16项。
六项缺失许可中，5项官方版本匹配文本已保留于 `packages/pi-worker/notices/`，
来源/哈希见 `upstream-notices.json`；proxy-agent-negotiate@1.1.0 的完整版权声明
仍未解决，不替用同仓其他包的版权。依赖审计会明确输出此安装器分发阻塞。
公开文档中的本机绝对目录已换为占位路径，未改历史功能和验收事实。
最终功能分支复验、提交与 CI 证据见 EVIDENCE 第62节；这不授权正式模型或安装器。

## 11. P2-03 历史建议（P2-02交付时尚未授权/实施）

以下是P2-02时的建议；2026-10-11用户单独授权的实现/验收记录见 [P2-03模型桥](PHASE2-PI-MODEL-BRIDGE.md)，不把历史建议当已验证生产能力。

建议首先做模型传输桥，仍保持独立显式试验路径：Node streamFn 发送有界 model_request（规范化消息、tool schema、response ID）；Python复用 OpenAIModelProvider/现有凭证与配置 snapshot，返回 assistant 事件/结果。pi不接触API key；当前OpenAI complete是非流式，不能把已有SSE当模型Token流。先用离线录制/确定性provider验证全部状态，不在本轮或默认路径请求真实模型。

正式连接前需完成：业务run_id绑定、Python公共批次校验共用策略（不改变旧Agent行为）、ToolFailure结束语义、上下文/Token/响应大小预算、模型超时/取消与批次屏障协同、凭证脱敏/无重试、历史仅重放不执行、真实/模拟工具分离。不要借模型桥启用risk/compare/研究/恢复或UI。

验收：固定pi真实调用链及本轮非法批次零执行全部复验；模型消息与toolResult映射无损、原OpenAI传输的headers/凭证只能在Python出现；失败/取消/超时/重复/迟到响应唯一终态，无新增工具或静默回退；默认AgentRunner及完整离线回归仍通过。真实模型费用/账户验证和Windows打包需用户另行明确授权。

## 12. CMD复核与学习

```bat
cd /d "<你的研迹目录>"
git status --short
git diff --check
node scripts\pi-audit.mjs
node --require .\scripts\offline\network.cjs --test packages\pi-worker\worker.test.mjs
cd /d "<你的研迹目录>\services\backend"
set PYTHONUTF8=1
.venv\Scripts\python.exe -m research_trail.verify_pi --node "<node.exe 的绝对路径>"
.venv\Scripts\python.exe -m pytest tests\test_pi_bridge.py -q
cd /d "<你的研迹目录>"
bun.cmd run verify
```

Node路径以本机实际 `where node` 的现有绝对路径为准；不得将复核变成安装/下载。专项是fixture确定性入口，完整verify额外配置全部现有离线护栏和临时库，不调用真实模型/行情。

小练习：运行CLI，找出ready、两个stream_calls、一个results_seen和一对tool_started/tool_result；然后只运行 `pytest tests\test_pi_bridge.py -q -k mixed_batch`，对照源码解释为何合法的第一个工具也没有执行。不修改默认聊天或自己的数据库。

理解题：① pi tool_execution_start为何不能表示Python已执行工具？② sequential与整个批次准入分别阻止哪一种问题？③ 为什么取消后正在读取的Python线程可能返回，却不能把迟到结果写回Store或重试该工具？
