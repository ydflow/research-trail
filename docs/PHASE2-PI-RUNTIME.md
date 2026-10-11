# P2-04：pi 内部 RunManager 集成与生命周期

日期：2026-10-11（Asia/Shanghai）。开发轮仅完成内部实验入口；随后用户单独授权最终审查、复验、提交/推送独立 Draft PR。禁止合并、发布安装包或执行 P2-05。
状态：验收通过（本机离线内部集成范围）；开发证据见本页及 EVIDENCE 第68节，发布审查复验827 Python/51 Node/58实际Electron共936项通过，见第69节。远程 CI 以发布回执为准。

## 1. 实际基线与职责

本轮从干净 main `80beeb7591332ffea0ea3265d6be6825ac4c722b` 创建
`feat/phase2-pi-runtime-integration`。这是 PR #31 的 Merge Commit，已在
[main CI](https://github.com/ydflow/research-trail/actions/runs/38131350004) 成功。
用户提示的 `c197b244…` 是 P2-03 合并提交，其旧 Step21 CI 失败已由 PR #31 修复。
实际起点为 783 Python / 51 Node / 58 Electron（892 项）；43 Node 是修复前计数。

已从源码确认：RunManager 原先就支持 `runner=`；Store.begin_agent/finish、事件序号、
取消、删除、shutdown、recover_interrupted 和 SSE 历史读取均已存在。P2-03 也已有
显式覆盖的 Store 测试。本轮复用这些能力，只补按运行创建、业务身份、快照与边界。

正式路径仍为 `SessionPanel → Electron → FastAPI → RunManager → AgentRunner`。
app.py 不导入 PiRuntime，没有新增 API、StartRun.kind、RunDTO 字段、环境开关或 UI。
PiRuntime 的 OpenAI 模式要求显式 httpx.MockTransport，Fake 模式每次创建新 FakeModelProvider。
它不是已开放给正式用户的引擎选择入口。

## 2. 内部调用链与文件

```text
显式 Python 内部调用 PiRuntime.start(manager, session_id, text)
  → RunManager.start(..., runner_factory=PiRuntime.create, kind=既有模型类型)
  → Store.begin_agent 创建业务 run_id / 用户和助手消息 / 两个初始事件
  → factory(run_id) 同步冻结配置，创建独立模型和 PiModelBridge
  → 原 Manager 工作线程 execute，传 stop/deadline/before_tool/after_tool
  → Popen Node Worker(argv: 业务 run_id, 独立 attempt_id)
  → 真 pi Agent / streamFn → model_request → Python 模型 → model_response
  → 原 Python 整批校验/许可 → 原 ToolRegistry 顺序执行 → tool_result
  → 第二次模型请求 → pi 最终消息 → AgentOutcome
  → Manager.settle → Store.finish → 持久化唯一终态 → 原 SSE 只读展示
```

| 文件 | 本轮职责 |
| --- | --- |
| services/backend/research_trail/pi_runtime.py | 冻结内部策略、限定 Fake/Mock、创建运行专属模型与桥、显式启动 |
| services/backend/research_trail/lifecycle.py | 最小 runner_factory 扩展、创建失败结算、计时器身份、意外停止兜底 |
| services/backend/research_trail/pi_bridge.py | 可观察的独立 attempt_id、管道部分启动失败清理；复用全部原协议/工具逻辑 |
| services/backend/tests/test_pi_runtime.py | 真实 pi/Store/模型生命周期专项；故障输运和计时器单元明确标注 |

Store 的业务 run_id 是 Worker argv 与所有 JSONL run_id，没有第二套桥 run_id。
attempt_id 每个桥实例生成一次，只用于本次进程协议；不成为新的业务运行类型。
工具业务 call_id 仍由 Python 生成，模型 tool_call_id 仍用于模型上下文。
JSONL sequence 不等同 Store/SSE sequence，Node 观察事件不直接写入 Store。

## 3. 配置与并发隔离

Factory 在 Store 生成 ID 后、工作线程启动前调用配置函数一次，验证 ModelConfiguration
的标量字段及有限正请求超时，用 dataclasses.replace 形成新的 frozen 对象。
每次创建新 OpenAIModelProvider（传固定对象，不传延迟配置函数）；第一次 complete
的原有 _snapshot 缓存因此只会引用该运行的对象。Fake 同样每运行一个实例。
配置、API Key、Authorization、模型地址/名称留在 Python，不进入 Worker 配置、argv 或协议。
内部 factory 仅做本地快照/构造；不得执行模型、工具、网络或阻塞操作。它是可信内部接口，
不是不可信插件执行器，也不承诺强杀一个阻塞的配置回调。

每运行独立拥有 Work/stop/deadline/计时器、模型计数、桥 history/pending、attempt_id、
Node 进程和管道序号/队列。原 ToolRegistry/业务服务可以共享，权限与业务执行仍归 Python。
同 Session 的活动运行约束仍由 Store 事务拒绝；不会为被拒绝的启动再创建模型或 Worker。
不同 Session 可以并发；取消旧运行不能影响另一运行。配置改动只影响之后的新运行。

## 4. 超时、失败与终态

默认内部测试预算：整体 15 秒、单模型 2 秒、单工具 2 秒、Node RPC/握手 3 秒。
内部策略要求模型 < RPC、工具 ≤ RPC×0.8、整体 0–120 秒且为正；整体可早于子预算，
Python 的同一个 Work.deadline 始终是最终上界。工具时限覆盖 before_tool 的延迟。
原 OpenAI HTTP request_timeout 可以更短，实际使用原 complete/_request 与 bridge deadline
的更早限制。没有放宽 P2-02/P2-03 原测试、默认预算或生产配置。

Manager 与桥可能同时发现整体/工具超时，但分别使用相同 RUN_TIMEOUT/TOOL_TIMEOUT；
stop 与锁先决定赢家，Store.finish 事务只允许一次 running → terminal。模型超时仍保留
原 MODEL_TIMEOUT；RPC 无响应为 PI_RESPONSE_TIMEOUT。不会把认证、限流或网络错误写成成功。

| 情况 | 行为 |
| --- | --- |
| 完成 | 原 settle/finish，completed |
| Runner 配置/创建失败 | 已开始记录变 failed / RUNNER_CREATE_FAILED，不启模型或工具 |
| Manager 工作线程启动失败 | 原 WORKER_START_FAILED，清理 timers/Work |
| Node 或管道线程构造/启动失败 | failed / PI_WORKER_START；部分管道启动也关闭已创建的子进程 |
| Worker 崩溃 | failed / PI_WORKER_EXIT，无自动回退或重试 |
| 取消 | 原 cancel → cancelled；待决 HTTP 协作取消，迟到结果不进入 Store/后续 RPC |
| 删除 Session | 先 cancelled 再删除；迟到结果不能重建会话 |
| 后端 shutdown | interrupted / BACKEND_INTERRUPTED；关闭 Worker，拒绝新启动 |
| 强制结束 Python 后重启 | Worker stdin EOF 退出；原 recover_interrupted 结算一次，不重执行 |
| Runner 独立 RunStopped | 没有 Manager stop 时 failed / RUN_STOPPED，防止无 Work 的永久 running |

另修复一个源码可见的计时器竞争：cancel 后已经进入回调的旧工具 timer，可能在下一工具
计时开始后获得锁。现在回调携带 timer 身份，只允许当前 tool_timer 结算；确定性测试
直接模拟该回调次序，不靠延长测试时间。

完整工具批次仍由原 admit 校验所有名称、参数、ID、权限和预算，然后授予一次性许可。
混合非法批次的 Python 执行数必须为 0。顺序执行/消费后不重试规则、只读白名单、大小
边界均保持；没有扩大到投资计算、研究报告或恢复。只读历史/SSE不重新进入引擎。

## 5. 验收分类与结果

- 新增专项覆盖 Fake/Mock 双轮、业务身份/工具关联、并发 Fake 与 Mock 快照隔离、同 Session
  拒绝、取消/完成竞争、取消前启动、模型/整体/工具超时、模型失败后无重试、Worker 崩溃/
  不响应/启动失败、工厂与线程失败、删除、shutdown/真实强杀和重启、终态唯一、游标重连/
  历史只读、配置变更及错误快照。没有假 Agent 循环。
- hang 输运桩只验证父桥的故障处理；手动旧计时器回调只验证竞态保护，均不是实际 pi 成功证据。
- 新 SSE 测试验证实际 API 的已消费游标恢复及只读重放；真实网络断线/重连由原 SSE/真实
  Electron 测试复用，不把 TestClient 的缓冲响应当真实断网。
- 复用 P2-02/P2-03 原 87 项桥/模型测试和原生命周期测试；默认 API/UI 由完整旧套件复验。
- 已执行先期专项 132 passed（81.86 秒）；当时新增32项。之后新增的实际父进程强杀测试
  1 passed（4.80 秒），新增36项专项 36 passed（29.97 秒）。最终新旧专项140 passed（89.19秒，新增40项/原100项），失败/跳过0；完整 `bun.cmd run verify` 退出0：823 Python（317.32秒）/24 pi Node+27原Node=51 Node/58实际Electron（410.64秒），合计932项，失败/取消/跳过/todo 0。原892项全部保留，新增40项Python。两个pi CLI、12工程案例/30原创历史观测、契约/类型、native/pi许可审计、0020重复迁移/模型一致性与三端构建全部通过。保留1项既有Starlette/httpx弃用和Vite510.24kB chunk警告。日志 `%TEMP%\research-trail-p2-04-final-special.log` / `%TEMP%\research-trail-p2-04-verify.log` 在仓库外。git diff --check通过。

原始失败：首轮24 passed/2 failed，新测试错误使用全局 HTTP 请求数选择后续运行的回复，
以及假设 SSE 有 limit 参数；改为看真实 tool 上下文，并按实际已消费游标重连，保留双轮
与全部关联断言。另单项实际复现 Runner 独立 RunStopped 后 Work 已删除但 Store 仍 running，
修复 Manager 意外停止结算，回归通过。未删除旧断言、跳过失败或放宽旧超时。

发布审查新增4项回归：管道线程构造失败、第二/第三线程启动失败，以及工厂返回缺少
模型标签的 Runner。修复前实际为2 failed/2 passed：构造失败后 Node 仍存活，缺少标签的
Runner 被放行执行。现在管道构造也进入清理保护；factory 必须提供 callable run 和非空
字符串 model.label，才能进入工作线程。修复后4 passed（4.30秒）；失败回归保留，测试
自身也在 finally 清理旧实现遗留的子进程。最终新旧专项144 passed（98.81秒），完整
`bun.cmd run verify` 退出0：827 Python（335.92秒）/51 Node/58实际Electron（425.07秒），
共936项，失败/取消/跳过/todo 0；保留同样两类既有警告。详见 EVIDENCE 第69节。

## 6. 尚未验证与启用前提

本机离线内部验收不等同正式 pi API/UI、真实模型/行情/账户、生产超时/大上下文/token统计、
Node 分发、PyInstaller/ASAR、新 Windows 安装包或远程 CI。没有逐 Token 模型输出；
底层 complete 仍非流式，JSONL/SSE 只是进程/业务事件输运。

任意不协作同步 provider 的线程无法被强杀，已开始的读取不能撤销，只能隔离迟到结果。
本轮强杀证明当前单 Node 子进程的 stdin EOF 清理，不证明 Windows Job Object/一般多代
进程树或 OS 权限沙箱。测试护栏不是恶意第三方代码的权限隔离。
proxy-agent-negotiate@1.1.0 完整版权声明缺口仍阻塞未来分发；没有更新依赖或做安装包。
正式启用需要单独授权、真实模型与生产预算验收、完整隔离/资源分发/许可证方案；不自动
回退一个已经执行过工具的失败运行。下一阶段未执行。

## 7. Windows CMD 复核

```bat
cd /d "<你的研迹目录>"
git branch --show-current
git status --short
git diff --check
node --require .\scripts\offline\network.cjs scripts\build-pi-worker.mjs
cd services\backend
set PYTHONUTF8=1
set RESEARCH_TRAIL_OFFLINE=1
set PYTHONPATH=..\..\scripts\offline
.venv\Scripts\python.exe -m pytest tests\test_pi_runtime.py tests\test_run_lifecycle.py tests\test_pi_bridge.py tests\test_pi_model_bridge.py -q
cd /d "<你的研迹目录>"
bun.cmd run verify
```

小练习：只运行 `pytest tests/test_pi_runtime.py -q -k snapshot`，再读 factory 在
Store.begin_agent 之后的位置，解释为何改配置不会改变当前运行。
理解题：① run_id 和 attempt_id 各由谁负责？② 为什么旧工具 timer 必须检查身份？
③ 取消非协作读取后，为什么仍不能允许迟到结果进入 Store？
