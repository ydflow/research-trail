# P2-09：稳定性、长期会话与性能

日期：2026-10-15（Asia/Shanghai）。状态：代码完成/待验收（用户已认可实际 Electron 截图；首次 PR CI 失败经诊断作最小测试同步修正，本机完整 1159 项通过，新 Head 双 CI 以 PR checks 另核对；旧 respond CI 根因仍未定位）。

## Draft 首次 CI 失败与修正

首个 Head `16d11a056f9f310645c14ea0a9c89203ba99db32` 已普通推送并创建
[Draft PR #37](https://github.com/ydflow/research-trail/pull/37)，目标 main，未合并。
[Push 38678287325](https://github.com/ydflow/research-trail/actions/runs/38678287325)
首次完整通过 998 Python（479.39 秒）/68 Node/92 Electron（605.67 秒），共 1158。
[PR 38678309838](https://github.com/ydflow/research-trail/actions/runs/38678309838)
首次在 Python 为 997 passed/1 failed（606.22 秒），失败是旧
`test_timeout_layers_keep_correct_error_and_discard_late_results[run]`，后续 Node/Electron
未运行；前置 Pi Node 24 项通过。不是旧 respond 用例，没有触发 CI 重跑。
两次原始 ZIP 和完整日志在 qa/wrapup/ci/*-attempt-1，保留失败，不用 Push 成功抹去 PR 失败。

失败断言为 `gate.aborted.wait(1)`。原测试先 `gate.release.set()` 放行响应，再要求
它一定通过 CancelledError 取消；这是两个竞争结果，已经正常返回的 exchange 不能
保证再出现 aborted。新确定性回归只延后 HTTP watchdog 的观察，真实 exchange 任务
继续运行，原终态/事件/超时断言全部复用。修前在同一行失败，轨迹中 stop=true、
响应先释放、HTTP 正常返回且 aborted=false；同时 RUN_TIMEOUT 终态、Provider 调用 0、
工具执行 0、Work 0。首次探针在请求进入前耗尽原预算，未作为该交错证明，日志也保留。

最小修正仅调整测试先后：先以原 `aborted.wait(1)` 确认协作取消，再释放响应；
工具场景仍先释放工具 gate、以原 finished.wait(1) 检查结束。保留原 1.5 秒 Run、
2 秒 model/0.2 秒 model/0.15 秒 tool 层次、所有终态/事件/零调用断言及 finally 清理。
不修改生产 OpenAI/Pi/Manager/Worker、不增加 sleep 或扩大既有时限。
新增回归用 Event 解除受控 watchdog；其 5 秒只是调度探针失败护栏，原取消断言仍仅
1 秒，不借它延长通过条件。修前 `pi-regression-before.log` 为 1 failed；修后同交错
HTTP aborted=true 后才释放响应，独立探针 1 passed（2.91 秒），Pi/runtime/稳定性组合
53 passed（34.18 秒），原日志与纳秒轨迹均在 qa/wrapup。

此交错确定性证明原测试同步前提错误，与新 PR CI 的失败断言一致；CI 没有保存 HTTP
调度轨迹，不能逐纳秒还原当次，也不能拿它解释 P2-08 respond 的旧失败。
旧 Pi Run 超时正常/轻量干扰各 20/20；受控回归初版 19/20，第 7 次没有进入 HTTP，
不是原 aborted 断言失败。该次没有完整启动时间线，不确定具体启动耗时；请求前可
合法耗尽整体预算，不能要求所有超时都进入 HTTP。初版日志与汇总全部保留。
新回归只对自己的四个模块 deadline 时钟做局部冻结，停放测试 Timer；真实 HTTP
进入后精确推进 1.6 秒跨过原 1.5 秒预算，经原 Manager.timeout 结算。原三个层次
超时用例仍用原真实时限，没有改动；新回归仍保留原 entered.wait(3)/aborted.wait(1)。
新时钟回归在旧释放顺序下仍同断言失败（pi-clock-regression-before.log），修正顺序
后与原三个场景 4 passed（7.45 秒），独立 20/20 通过。完整初版曾到 999 Python
（327.06 秒）/68 Node，通过后为固定新回归停止自有 PID12184 和 9 个子进程，
Electron 未完成；日志 wrapup-pi-fixed-verify.log 与中止回执保留，不算完整通过。
最终冻结 33 个
源码/测试/契约/脚本、累计 36 个变更文件（3 文档），重新执行完整 verify 后才提交
修正并普通推送，重新等待新 Head 的两路 CI。前次 1158 本机/Push 成功均仅对应首个 Head。

最终本机完整 `bun.cmd run verify` 退出 0（wrapup-pi-clock-verify.log）：999 Python
（310.86 秒）+68 Node（24+44）+92 实际 Electron（569.14 秒）= **1159 项通过**，
失败/取消/跳过/todo 0，原 1127 与新增 32 保留。契约/生成 TS、离线真实 Pi 往返、
工程/历史样例、迁移/一致性及构建全部通过；200/102 消息专项再次通过。
33 个冻结文件前后 SHA256 一致，累计 36 文件（3 文档），旧测试函数名缺失 0；
本次相对首个 Head 仅测试/文档变动，生产/API/UI/Worker/依赖/schema/容量不变。
验收后按项目路径检索 Python/Electron/Pi Node 无残留；资源结论仍限已测路径。
qa/wrapup/P2-09-pi-fixed-acceptance.json 登记本轮源码、实际截图、重复结果、首次 CI
ZIP/log、修前失败和中止日志哈希，初版 19/20 与最终受控 20/20 分开保存。
新 Head 的 Push/PR CI 另以 PR checks 和 qa/wrapup/pr-delivery.json 核验；本轮没有
点击 CI 重跑，不自动合并，停止于最终代码审核，P2-10 未执行。

## 本轮最终收尾与 Draft 授权

用户已审核长期会话分页及现有 UI 的实际 Electron 截图。本轮单独授权：最终诊断、
差异/敏感文件检查及完整 `bun.cmd run verify` 通过，且没有已知阻塞性生产稳定性
问题后，提交实际改动、普通推送当前 feature、创建指向 main 的独立 Draft PR，
等待当前 Head 的 Push/PR CI。下文“仅本地/不提交/待视觉审核”为上一轮历史，
以本段的新授权为准。不合并、不执行 P2-10、不接真实模型/行情，不切正式 Pi、
不放宽容量、不创建 Release/安装包。

### 旧 Agent 时序风险的最后专项

新增可复用 `scripts/diagnose-agent-timing.py`，在独立子进程运行原 respond pytest，
只在诊断进程包裹真实 Runner/Manager/Store/Database/Thread，记录 perf_counter_ns、
线程名称/ID、实际事务提交返回点和事件日志；默认 verify 不加载该探针。
Windows 11 26100 / Python 3.12.14 / 32 逻辑 CPU，正常、四个主动让出的计算线程
干扰、受控 SQLite 写锁各 **20/20**；原 5 秒 join 及全部状态/事件断言保持。
原 240 次重复不覆盖或删除，新增 60 次后共保存 300 次独立进程结果；不计入套件数量。

受控锁在 Store.finish 入口用另一 SQLite 连接持有 BEGIN IMMEDIATE，等待真实
worker 发起终态写事务，让另一线程通过 WAL 读取，再释放锁；用 Event 同步，
没有增加 sleep、测试 timeout 或修改业务预算。20 次均观察到：

`Runner 返回 failed → 终态写锁等待 → 读到 running → 锁释放 → Store.finish 实际提交返回 → execute 清理 → worker join 返回 → GET failed`。

一个完整样本（从探针启动计时，ms）：Runner 返回 803.690、锁持有 816.340、
WAL 读取 running 818.544、释放 818.620、终态提交返回 836.987、execute 返回
837.018、join 返回 837.046、读取 failed 838.909。全部 60 个正式样本中，
Runner 返回至终态提交正常为 2.737–3.446ms、干扰为 2.710–4.511ms、
受控锁为 19.112–42.745ms；最终唯一 run_completed、事件序号连续，
worker/Timer 存活数、Manager.work 保留数、连接 checkedout 均为 0。
原始 timeline.json/pytest.log/summary.json 与逐项顺序复核 wrapup-audit.json
保存在仓库外 qa/wrapup/diagnostic-*。首次探针 cwd 错误日志保留，修正后才计数。

**结论边界**：提交前读取 running 是可复现的合法状态；这不是旧 CI 根因证明。
P2-08 attempt 1 的两项失败及 attempt 2 同 Head 成功日志继续保留。Agent 首次 CI
没有锁等待/线程轨迹，确切根因仍未定位，不能写“永久修复”。已明确修复的两条
生产 deadline 缺陷见 2.2；目前已测路径没有已知的阻塞性生产稳定性缺陷。
该判断以最终完整回归和当前 Head CI 为条件，并非无限负载或任意第三方 Provider 保证。

### 同批测量的三种读取工作量

本轮 `bench --large` 另存 qa/wrapup/three-reading-paths/performance.json，原始前后
数据均保留。固定 ID/时间/内容，独立 SQLite/WAL、零网络/模型/Provider；各规模
全量快照先预热两次，随后全量、首页、完整分页各测七次，tracemalloc 均开启。
分页沿已预热数据库测量，没有单独再预热两次；执行期间另有诊断进程，属于本机
基线，不是隔离实验室对照。下表均为 ms，中位数 [min–max]；全量读取不含响应
序列化，分页读取包含每页容量检查，响应序列化另列，不混作端到端 HTTP 耗时。

| Run | 全量历史读取 | 全量响应序列化，中位 | 首分页读取含大小检查 | 完整分页数 | 完整分页累计读取含大小检查 | 完整分页响应序列化，中位 |
| --- | --- | ---: | --- | ---: | --- | ---: |
| 1 | 2.63 [2.56–3.08] | 0.21 | 4.42 [4.30–9.55] | 1 | 4.15 [3.97–4.35] | 0.19 |
| 10 | 5.60 [5.09–36.73] | 1.47 | 8.51 [8.25–14.68] | 1 | 8.15 [7.79–8.22] | 1.42 |
| 25 | 9.49 [9.22–11.24] | 3.64 | 8.13 [7.93–12.04] | 3 | 22.58 [22.38–24.32] | 3.54 |
| 50 | 19.15 [18.19–21.88] | 7.41 | 8.70 [8.25–12.92] | 5 | 42.49 [41.64–73.34] | 7.03 |
| 100 | 48.03 [44.39–86.70] | 17.75 | 14.70 [9.01–18.21] | 10 | 104.11 [93.07–131.65] | 15.11 |
| 1000 | 663.90 [509.75–673.24] | 208.53 | 16.26 [15.28–20.74] | 100 | 2074.50 [1676.84–2176.66] | 187.63 |

1000 Run 全量 2000 消息/7000 事件，首页 20 消息/70 事件；完整分页逐页校验 ID
集合与全量完全相同、没有重复/遗漏。完整分页累计读取更慢，分页收益是首读有界、
满足旧传输上限及可达全部历史，不能宣称全量历史读取提速。累计分页内存测量只保留
当前页与核验 ID 列表，不等于 UI 加载全部页的内存或进程 RSS。

本轮构建实际文件主 chunk `index-C9i8y_cD.js` 为 **317250 字节**，独立
`FinancialKLineChart-CEaBXCwb.js` 为 229629 字节，SHA256 见 qa/wrapup/build-artifacts.json。
Vite 报告分别 317.25kB/gzip97.33kB、229.62kB/gzip60.33kB；gzip 引用 Vite 自身口径，
不与其他运行时/压缩级别的独立 gzip 字节数混用。默认行情仍加载图表，非总下载量等比下降。

### 最终复查范围与交接

逐项核对 token、IPC sender、UUID、session 过滤、严格十进制/未知/重复参数、
1..10 limit、安全整数游标、完整 Run 缩页与原 UTF-16 上限；旧 OpenAPI 路径/模型
变化 0，只增已批准的 history/SessionHistoryPage。没有 schema/依赖/容量常量变化。
BEGIN/WAL 固定页内消息/Run/事件水位；首消息 sequence 游标不被后续新 Run 位移。
头页/旧页/SSE 合并与切换代次保护继续使用 Python 事实，读取链不进入 Agent/Provider。

资源证据按实际覆盖表述：60 次诊断实际观察 worker/Timer/Work/借出连接均归零；
分页事务关闭连接；实际 SSE 断线/切换测试检查订阅释放及请求归零；反复挂载测试
检查主进程 runs:subscribe 监听数量恒定，preload unsubscribe 对称移除 runs:changed
由源码复核。React effect 的 active/mounted/代次保护和 unsubscribe、图表
ResizeObserver.disconnect/dispose 及画布清理均复查。前轮长报告/聊天实窗与截图
继续保留；不能把这些局部证据写为所有进程长期零泄漏。非协作 Provider 的有界 join
与迟到写入防护仍是边界。实际 Electron 完整聊天负载为 200 条，交错恢复为 102 条；
1000 Run 是后端基准，不是全 2000 条 DOM 的 UI 性能或长时间堆内存趋稳证明。
P2-10 接手独立 Windows 安装/卸载/签名、Pi/原生依赖许可
与进程树、真实数据授权；本轮没有实施这些事项。

本轮冻结 32 个源码/测试/契约/诊断脚本，35 个变更文件（含 3 文档）。完整
`bun.cmd run verify` 退出 0，qa/wrapup-verify.log 末行 PASS：998 Python（364.12 秒）
+ 68 Node（24 Pi + 44 其他）+ 92 实际 Electron（663.78 秒）= **1158 项通过**，
失败/取消/跳过/todo 均 0，原 1127 与新增 31 保留。契约/生成 TypeScript、两条真实
离线 Pi CLI、工程/历史评测、重复迁移/一致性和全部构建通过；旧弃用及 Pi 许可边界保持。
32 个冻结文件验收前后 SHA256 一致；实际 200/102 消息用例再次通过，产品/UI 源码
与用户认可截图时一致。结束后按项目路径检索 Python/Electron 进程无残留；不是所有
第三方进程树的保证。qa/wrapup/P2-09-wrapup-acceptance.json 哈希登记 344 份证据，
包括本轮全量截图/日志、原 CI 两次 ZIP/日志、60 个轨迹和旧截图/压力/性能结果。

本机门禁已满足，按本轮授权进行独立 Draft 交付；提交后另核对当前 Head 的 Push/PR
CI，最终远程回执记录于 PR checks 与仓库外 qa/wrapup/pr-delivery.json，不用旧 Head
或本机通过代替。没有触发无诊断的 CI 重跑；不合并、不开始 P2-10。

## 1. 授权与真实起点

从干净 main `ad228980816a5add6232c8ae158fba7a6c1d62bc` 创建
`feat/phase2-stability-performance`。本地 main、origin/main、远程 main 一致。
保留所有旧分支，不提交、推送、创建 PR、合并、打包或发布，不执行 P2-10。
P2-08 基线为 977 Python + 61 Node + 89 Electron = 1127。
Python/SQLite 仍是业务事实权威，默认 Python AgentRunner 和 Pi 内部边界保留。

已重新读取 AGENTS、路线、证据、P2-08/Pi 技术说明、仓库外交接和 PROJECT_STATE。
CI 第一次失败与第二次成功的原始日志分别保存在仓库外
`research-trail-p2-09-qa/attempt-1/`、`attempt-2/`，ZIP 一并保留。
同一 Head 的重跑成功不作为永久修复证明。

## 2. 两项旧 CI 失败与确定性竞态

- Agent respond：原日志仅证明 5 秒 GET 轮询结束时仍 running，没有线程栈或
  SQL 锁等待信息；尚不能区分调度、慢提交或真正竞态，不推断永久修复。
- Report timeout：0.15 秒总预算在 coordinator 开始后计时，包含 before_call
  提交、线程启动、JSON 准备；OpenAI 在创建 exchange task 后先检查 deadline。
  预算耗尽可以在进入 MockTransport 前合法停止。原测试同时要求 HTTP 必须进入，
  需要事件/受控时钟分别验证“请求前超时”和“请求中超时”，不能放宽业务时限。
- 重复命令：`scripts/stability-performance.py repeat --output <仓库外目录>`；
  默认每个旧用例分别启动独立 pytest 20 次，`--pressure` 添加四个 CPU 调度线程。

### 2.1 复现频率、同步条件与结论边界

[第一次 CI](https://github.com/ydflow/research-trail/actions/runs/38600321966/attempts/1)
为 975 通过 / 2 失败（665.73 秒），[第二次](https://github.com/ydflow/research-trail/actions/runs/38600321966/attempts/2)
为同一 Head 977 通过（567.48 秒）；后续 Node/Electron 的首次运行未执行。
没有删除或改写失败日志，也没有触发新远程 CI。

| 独立子进程重复 | Agent respond | Report timeout | 结果位置 |
| --- | --- | --- | --- |
| 修改前，正常负载 | 20/20 | 20/20 | before-normal |
| 修改前，轻量调度干扰 | 20/20 | 20/20 | before-pressure |
| 最终代码，正常负载 | 20/20 | 20/20 | final-normal |
| 最终代码，轻量调度干扰 | 20/20 | 20/20 | final-pressure |

每次独立 pytest、隔离临时库、原时限/断言；压力是四个计算/主动让出线程，
不是 32 核宿主饱和证明。中间版本 after-normal/after-pressure 另各 40 次通过，
共保存 240 次进程结果，不把重复次数加进完整套件测试数量。

- Agent 测试改为对本次拥有的 worker 执行 `join(5)`，随后仍经真实 GET 检查
  非 running、failed/MODEL_ERROR、成功工具结果及唯一有序终态。线程退出发生于
  Store 终态事务提交、取消计时器和移除 Work 之后；获取 Work 使用一次字典读取，
  不等待可能处于提交中的 Manager 锁，不用 GET 轮询与 worker 争用线程池/SQLite。
  没有增加原 5 秒等待界限或删除旧状态/事件断言。
- Report 的原 0.15 秒预算改用两个模块的局部受控单调时钟；先以原 `entered.wait(1)`
  确认真正进入 MockTransport，再精确推进 0.16 秒。仍断言 failed、单次请求、
  无 document、HTTP 协作取消、线程退出及旧终态不被覆盖。另有请求准备/提交期间
  预算耗尽的确定性测试，证明允许 0 请求且不进入 transport，不把这条合法路径
  错认为 HTTP 未启动的业务失败。原真实取消仍经过 AsyncClient/task/finally。
- WAL 并发测试实际在读事务内暂停、另一线程提交 text_delta，验证页内仍保持旧
  文本/水位，随后从该水位只读续得新事件；读连接归还为 0。它证明快照机制，
  **不能倒推旧 CI 当时没有数据库竞争**。

Agent 首次 CI 的确切调度/锁等待原因仍**未定位**；报告已有可复现的错误测试
前提，但 CI 没有保存当时的请求计数/线程栈，不能确定它当次正走请求前超时。
目前不声称两项 CI 间歇失败已永久消除；没有真实 CI 机器复现证据。

### 2.2 实际生产修复

`test_stability.py` 用局部受控时钟证明两条生产边界：

1. Agent runner 迟到返回、整体 Timer 尚未获得调度，旧 Manager 会保存 completed。
   现在 checkpoint 在事件/最终提交边界使用同一绝对 deadline，过期通过原 timeout /
   Store.finish 结算 timed_out/RUN_TIMEOUT；不依赖计时器先获调度。
2. 报告合成在截止前返回，校验/来源读取在截止后结束，旧服务仍发布 completed。
   现在最终成功提交前重查原 deadline，过期保存 failed/REPORT_TIMEOUT，无 document。

修复前确定性证据为 `races-before-corrected-fixture.log`：2 failed / 5 passed；
修复后与旧 Agent/报告组合为 61 passed。首次新增终态测试漏传必须的 error，
导致 5 failed / 2 passed，属于测试准备错误，原 `races-before.log` 仍保留。
四类终态后迟到成功均不得改变快照，run_completed 恰好一个、序号连续。
这两条缺陷可单独确认和修复，不冒充旧 CI 根因。

## 3. 长期会话分页：用户已明确批准并实现

使用固定 ID/时间/内容、隔离 SQLite、零模型/Provider 的 1/10/25/50/100 次
fixture 通信历史，每次 2 条消息/7 个事件，预热 2 次、测量 7 次。
脚本记录快照读取、序列化、UTF-8/UTF-16、Python tracemalloc、连接归还和库体积；
原始数据位于仓库外 `before/performance.json`。渲染与进程 RSS 另测，不能混称。

实测 100 次 fixture 历史：200 消息/700 事件，完整快照 339491 UTF-16 单元、
500903 UTF-8 字节，超过既有 Electron 262144 传输限制。
全量 snapshot 的大小随历史增长；仅优化渲染不能修复这项读取限制。

本轮先提交下列最小方案，收到用户逐项明确批准后才实施。批准仅覆盖此公开契约扩展，
没有推定其他架构变更获批：

1. 保留旧 snapshot、messages、runs、event-log、SSE 和所有容量常量的语义。
   新增只读 `GET /sessions/{id}/history?before_sequence=<可选>&limit=10`。
2. 新增独立 `SessionHistoryPage`，内容为一个事务读取的 SessionSnapshot 子集、
   `has_more` 和 `next_before_sequence`；按完整 run 的两条消息分组向前读取，
   页内带对应 RunDTO 和有序事件，按实际 JSON/UTF-16 限制单页大小在旧传输上限内。
   不截断单条消息/工具结果；单运行异常过大时明确返回容量错误。
3. 增加对应具名 IPC `sessions:history` 与 preload 方法，沿用令牌/UUID/整数校验。
   SessionPanel 首读最新一页，用户显式“加载更早历史”；保留按 ID/sequence 去重、
   只订阅活动 Run、SQLite 水位接续和切换取消。前端仍只维护显示缓存。
4. 报告绑定的 131072 全会话门禁与 98304 预留保持；分页不允许绕过准入条件。
   大历史可以只读，达到门槛时仍提示显式新建会话。
5. 不增加依赖或 schema，不改 Pi/Agent 工具、金融数据或真实服务；补充跨页、
   snapshot/SSE、切换、恢复、容量和 Electron 回归。

实现先按 session 过滤、按每个 Run 的首消息序号稳定倒序选择至多 10 组；
`before_sequence` 使用返回的最早首消息序号，后续新 Run 不改变旧页的位置。
页内消息升序、事件按 run_id/sequence 排序，所有 DTO 在同一显式 BEGIN 的 WAL
快照读取；终态与水位仍来自 SQLite。Token、UUID、1..10 limit、正安全整数游标、
未知/重复/非十进制参数均检查。传输大小按 FastAPI 同样的 compact JSON/UTF-16
计数，超预算逐个排除最早完整 Run；单 Run 异常过大返回明确容量错误，绝不截断。

初版逐 Run 查询/累计序列化测得 100 Run 首页中位 52.44ms（45.18–54.75），
因此改成批量三类读取、正常路径一次预算序列化；不是无测量增加缓存。
UI 初读最新页，显式加载旧页；按消息 ID / Run ID / event run_id+sequence 去重。
旧页不会覆盖活动消息和水位；连续的头部刷新保留已加载旧历史，切换后的迟到页用身份/
代次丢弃。SSE 仍只接活动 Run，最终状态仍重新读取 Python 事实，不引入第二状态源。

最终静态复核另外发现：断线期间新增超过一页，直接拼接旧尾部会产生中间缺口，
并可能把旧 has_more=false 带回，导致中段失去加载入口。新增 Node 确定性回归修前失败
（head-gap-before.log）；现在头部与旧缓存的消息序号不相邻时重建最新页/游标，
让所有中段仍可向前读取。连续刷新继续保留已加载历史及用户选中的旧 Run。
新增实际 Electron 经真实后端补写25 Run，验证52条消息全部可达/唯一、旧Run选择
及其7事件在刷新后保持。第一次完整verify在Python阶段发现此问题后主动停止自身
PID及子进程，日志保留为verify-interrupted-for-gap-audit.log，明确不算通过；修后重跑全量。

同一回归进一步补强旧页在头刷新后才返回的交错：不连续的旧页不能拼接新链，
当前游标保持；可重叠或相邻的页才合并。Node修前失败保存在concurrent-page-before.log，
最终实际Electron在头刷新前挂起旧页、再经后端新增25 Run，释放迟到旧页后仍仅20条
最新消息，随后102条消息均可达且唯一；concurrent-page-electron.log单项通过。
为纳入这项并发保护第二次主动停止自有verify树，保留verify-interrupted-for-concurrent-page.log：
其中998 Python/68 Node已经通过，Electron尚未完成，仍不作为完整验收。最终重新冻结源码全量重跑。

OpenAPI 逐模型/路径与起始 Head 比较：旧 schema/paths 变化均 0；只增加
SessionHistoryPage 和 `/sessions/{session_id}/history`，对应 IPC 为 `sessions:history`。
回执 `contract-compatibility.json`。没有迁移、依赖或容量常量变化。

实际读取链是 `SessionPanel → preload.sessionHistory → main sessions:history →
BackendManager 的受令牌保护本机 GET → FastAPI → Store.history → SQLite/WAL →
SessionHistoryPage → 界面显示缓存`；活动 Run 再沿原 subscribeRun/SSE 从页内水位续读。
加载旧页不会进入 AgentRunner、ReportService.start 或 ProviderService.query。

## 4. SSE、资源与最小前端优化

- RunSubscription 原先持续有缺口/失败可无限重连；现在连续 8 次无事件进展后
  显示失败并 stop、释放请求/重连 Timer/订阅槽，用户可更新记录重新同步。
  只有接收新的连续事件才重置失败次数；原序号、身份、重复去重和退避保持。
  新 Node 实际本机 HTTP 测试验证缺口续读、去掉重复序号、取消终态关闭，以及
  持续缺口恰好 8 次结束（测试使用虚拟退避计时，不在 CI 空等十余秒）。
- applySessionEvent 已验证身份/下一序号后直接追加；不再每个事件重建并排序全历史 Map。
  跨页合并仍按唯一键去重，不改事件与消息的业务事实。
- 将现有 KLineCharts 图表经 React.lazy/Suspense 按需加载，共用原组件；周期文字/
  类型移入轻量模块，避免单独读取周期标签又把整个引擎带回主 chunk。
  原六周期、MA/VOL、光标、缩放、恢复和 ResizeObserver/dispose 仍由原专项验收。
  没有删功能、增加依赖或提高 Vite 告警阈值。
- Store/分页专项检查连接 checkedout=0；Agent worker join、HTTP stopped finally、
  旧终态不被迟到结果覆盖、Electron 关闭自有 Python PID、切换后实际 SSE request=0、
  组件反复挂载卸载 IPC 监听数量恒定均已验证。图表卸载断开 observer/清空原生画布。
  Pi 仍是原内部实验，完整 verify 继续跑真实离线 Worker/取消/强杀/恢复旧测试。
- 未发现上述已测路径的持续资源泄漏。ReportService 只保留一个 Generation / 最近结果，
  属于有界保留；任意不协作同步 Provider 线程不能被 Python 强杀，关闭只保证阻断迟到
  写入并作有界 join，不声称能清理任意第三方进程树或无限阻塞代码。

## 5. 性能环境、方法与实测

Windows 11 家庭版 10.0.26100，AMD Ryzen 9 7945HX / 32 逻辑处理器；
Python 3.12、Node 24.19.0、Bun 1.4.2、锁定 Electron 44.5.1。
固定内容/ID/时间，独立文件 SQLite/WAL，本机 SSD；没有模型/Provider/外部网络。
后端每规模预热 2 次，7 次 perf_counter 测量，开启 tracemalloc；记录中位数和 min–max。
tracemalloc 是该阶段 Python 分配，不能当操作系统 RSS；UI 用 CDP Runtime.getHeapUsage
并在取样前 collectGarbage，也不是完整 Electron/Python 进程内存。

| Run/消息/事件 | 原全量 UTF-16 | 原快照读取 ms，中位[min–max] | 原序列化 ms，中位 | 新首分页 UTF-16 | 首分页读取含大小检查 ms，中位[min–max] |
| --- | ---: | --- | ---: | ---: | --- |
| 1/2/7 | 3587 | 2.98 [2.80–3.13] | 0.21 | 3632 | 4.09 [4.04–8.79] |
| 10/20/70 | 34109 | 5.78 [5.14–36.88] | 1.55 | 34154 | 8.70 [8.34–12.52] |
| 25/50/175 | 84989 | 10.67 [10.33–11.04] | 3.77 | 34160 | 8.82 [8.55–12.43] |
| 50/100/350 | 169791 | 19.66 [17.70–59.14] | 7.55 | 34162 | 8.82 [8.55–13.56] |
| 100/200/700 | 339491 | 45.00 [42.63–80.23] | 16.80 | 34182 | 11.86 [10.90–16.60] |
| 1000/2000/7000 | 3395093 | 717.03 [598.48–774.60] | 242.22 | 34204 | 18.81 [17.23–24.73] |

前五行原始 before 与 after-batched，1000 行为单次 large 实验的全量/分页对照。
比较的是“原 UI 首次全量读取”与“新 UI 最新一页”；**旧 snapshot 本身没有提速**。
小会话分页检查有额外成本；它主要解决历史增长时的读取上限及初始化开销。
100 Run 全量 tracemalloc 峰值约 6.74MB、首分页约 0.71MB；1000 Run 分别约
67.44MB / 0.72MB，库文件约 8.98MB；每次连接归还 0。

真实 Electron 使用同一 50 Run 库，在空会话和历史会话间切换 7 次，测点击到两帧
后的耗时（包含 IPC/React/绘制，不能独称 React render）：原 100 条 DOM 消息，
中位 67.52ms [62.94–168.29]；新首读 20 条，62.51ms [35.66–119.61]。
波动区间重叠，不宣称稳定的百分比提速。单次 IPC 样本为 14.9 / 7.2ms，不能作分布证明。
GC 后 JS usedSize 样本约 6.42 / 5.97MB、embedder 3.53 / 2.29MB，非长期泄漏判据。
原始 renderer-before-corrected.log、before-renderer.json、after-final-renderer.json 保留；
最初测量脚本创建会话后未刷新 UI 列表而等待超时，renderer-before.log 也保留。

另用真实全面策略（16个离线Fixture采集步骤）生成122事实的固定报告，展开全部索引、
读取末条原始事实、三尺寸滚动无横向溢出/脚本异常；前后 ResearchRun 深度相等，模型
请求0，查看历史没有重采。7次滚动到上下边界后等待两帧，测得中位5.0ms、范围4.1–7.4ms，
scrollHeight=12036 CSS px。此项在Python回归并行时执行，仅作既有长报告的可操作基线，
没有宣称优化收益。report-scroll.json/.log和report-scroll-1440/1000/600.png保留；
最初脚本未把索引参数传入浏览器evaluate的错误另存report-scroll-script-initial.log。

Vite 实际 minified 主 chunk 从 545.35kB（gzip156.55）到 317.25kB（gzip97.33）；
独立 FinancialKLineChart chunk 229.62kB（gzip60.33）。默认行情页仍需要加载图表，
不是声称首屏总下载量或总产物等比例减少。build-before.log / build-final.log 有原始记录。

## 6. 测试、截图与完整验收

新增 7 Python 确定性竞态、14 Python 分页/参数/水位、7 Node IPC/SSE/合并/有界缓存、
3 实际 Electron 长历史/容量/重启/迟到页/断线多页缺口/挂载清理测试；旧 1127 项保留。
长负载与重复测试是独立命令，没有加入默认 CI 的长压力预算。

相关 Python 组合 `lifecycle-regression.log`：170 passed（94.00 秒）。
实际 Electron 图表/分页/旧快照迟到/真实断线续读组合 `electron-focused-final.log`：
11 passed（79.26 秒），失败/取消/跳过/todo 0。Browser plugin not available，
使用既有 Playwright `_electron`、实际 main/preload/Python 与隔离数据库。
没有依赖安装。旧两个界面测试仅把读取操作的观测点迁至已批准的 history，仍保留
先读再订阅、切换丢弃迟到消息和全部旧断言；桥白名单只精确追加 sessionHistory。

首轮 Electron 3 passed / 1 failed 的原因是新断线测试的 URL 判断用 startsWith 相对
路径，实际记录为完整本机 URL；修正为 includes 精确 session/history 路径后 11 项通过，
原 `electron-initial.log` 保留。单次契约比较脚本忘指定 UTF-8，读取中文 JSON 失败；
明确 UTF-8 后逐项一致，未修改契约来绕过检查。

实窗使用 native setContentSize(1440×900 / 1000×700 / 600×700)，断言 innerWidth/Height，
P2-09 测试图用 Playwright scale=css（宿主 DPI=1.5），1000/600 CSS实窗可因取整得到
宽高相差1px的PNG（例如999×700或599×699）；原图与实际尺寸完整保留，不冒充精确尺寸。
另在相同冻结构建/独立100 Run库
经原生BrowserWindow设置并断言三个inner尺寸，使用浏览器原生CDP截图的明确clip/scale，
得到精确1440×900、1000×700、600×700的p2-09-native-*.png，PNG头逐项核对，
native-capture.json记录DPI与viewport/PNG尺寸；没有后期修改图片。200 条消息全部加载，
消息 ID 200/200 唯一，滚动到尾部；
容量提示时 Run 数仍 100，重启后最新页深度相等，历史没有新 Agent/model/金融工具执行。
截图/JSON/原始日志在仓库外 qa，完整 verify 另保存 verify-electron，不提交运行数据。

最终完整 `bun.cmd run verify` 已退出0，`verify-final.log`末行PASS：
998 Python（388.70秒）+ 68 Node（24 Pi + 44其余）+ 92实际Electron（712.03秒）
= **1158项通过**；失败/取消/跳过/todo均0，原1127 + 新增31完整保留。
契约/类型、两条离线Pi CLI、12工程样例/30历史观测、native/Pi审计、0020临时库
重复升级/模型一致性和三端构建通过。保留既有Starlette/httpx弃用及Pi分发阻塞；
主chunk已低于500kB，没有提高告警阈值。

验收前后31个源码/测试/契约SHA256完全一致；仓库总34文件（含3文档），
旧测试函数名缺失0，暂存区空，main/origin/main/远程main仍为起始Merge SHA。
最终清单`P2-09-delivery.json`含代码/截图/CI原始ZIP和日志哈希、240次独立重复结果、
全量实际计数。精确三尺寸图为qa根目录p2-09-native-1440/1000/600.png，
额外长报告图report-scroll-*.png，verify-electron保留全套真实窗口证据。
所有运行数据、原始失败与中止日志均在仓库外，没有提交/推送/PR或发布。

页面身份/非空/无Vite错误覆盖层、目标交互、页面异常、三尺寸和历史只读已实际核验；
Browser插件未提供，使用既有Playwright的真实Electron。需要更方便的内嵌浏览验收时，
可另行选择安装Browser插件，本轮没有安装或依赖变动。

## 7. Windows CMD 复核

```bat
cd /d D:\folio\research-trail
set RESEARCH_TRAIL_OFFLINE=1
set PYTHONUTF8=1
set PYTHONPATH=D:\folio\research-trail\scripts\offline
services\backend\.venv\Scripts\python.exe scripts\stability-performance.py repeat --output D:\folio\research-trail-p2-09-qa\my-normal
services\backend\.venv\Scripts\python.exe scripts\stability-performance.py repeat --pressure --output D:\folio\research-trail-p2-09-qa\my-pressure
services\backend\.venv\Scripts\python.exe scripts\diagnose-agent-timing.py --mode normal --output D:\folio\research-trail-p2-09-qa\my-diagnostic-normal
services\backend\.venv\Scripts\python.exe scripts\diagnose-agent-timing.py --mode pressure --output D:\folio\research-trail-p2-09-qa\my-diagnostic-pressure
services\backend\.venv\Scripts\python.exe scripts\diagnose-agent-timing.py --mode commit-contention --output D:\folio\research-trail-p2-09-qa\my-diagnostic-lock
services\backend\.venv\Scripts\python.exe scripts\stability-performance.py bench --large --output D:\folio\research-trail-p2-09-qa\my-benchmark
set RESEARCH_TRAIL_QA_DIR=D:\folio\research-trail-p2-09-qa\my-verify
bun.cmd run verify
```

每次基准使用新的输出目录，避免重复固定 ID；默认 verify 不下载、不调用真实服务。
小练习：比较 10/100/1000 Run 的 full snapshot 与 initial_page 大小，解释分页为何
不改变旧 snapshot；理解题：① worker 退出与模型返回哪个能证明已提交？② 为什么
请求前超时不能要求 entered 为真？③ 游标为何用首消息序号而不使用 offset？

## 8. 分发边界与交付状态

P2-10 未执行。已有 Pi `proxy-agent-negotiate@1.1.0` 完整版权声明缺口、
Node/Python 原生依赖分发、真实金融数据地域/展示/再分发授权、干净 Windows
安装与卸载、签名和一般进程树清理仍需独立验证。本轮不生成新安装包或 Release。

没有尚待批准的本轮公开契约：分页已经单独批准；除此没有新增 API/DTO/迁移/依赖、
容量或 Pi 正式切换。旧 CI 精确根因尚未定位，本阶段不宣布永久稳定或直接验收通过；
最终保持代码完成/待用户审核，并交付全部诊断事实。没有提交、推送、PR 或发布。
