# P2-03：pi 模型传输与工具循环

日期：2026-10-11（Asia/Shanghai）。范围：独立显式离线试验入口；不切换默认聊天，不调用付费模型/真实金融服务，不打包安装器。状态：验收通过（本机离线试验范围）。开发轮没有提交；随后用户单独授权提交独立 Draft PR，发布审查见 EVIDENCE 第65节，开发验收见本页第6节及第64节。PR不等于已合并或安装包验收。

## 1. 已从源码确认的调用链

```text
verify_pi_model / 测试显式构造 PiModelBridge
  → 复用 PiOfflineBridge.run / 独立 Node 子进程 / Pipe
  → 真正 pi-agent-core@1.1.0 Agent.prompt
  → 自定义异步 streamFn / ModelMessages.request
  → JSONL model_request
  → Python 对比本次权威 history、工具声明、call_index 和预算
  → RuleDialog(FakeModelProvider.plan/respond)
     或现有 OpenAIModelProvider.complete（本次仅 httpx.MockTransport）
  → 严格 assistant_response → model_response
  → ModelMessages.response → AssistantMessageEventStream → 真正 pi Agent
  → 完整 assistant message_end 的异步订阅屏障
  → tool_batch 与 Python 刚返回的原始批次逐项比较
  → 原 P2-02 admit：全批工具名/原始参数/ID/权限/预算校验
  → batch_permit → pi 顺序 execute → tool_request
  → 原 ToolRegistry.decode/execute → fixture → tool_result
  → pi toolResult → 下一轮 model_request → 最终回复
  → Python 核对 final_answer/无未决批次/统计 → AgentOutcome
```

主文件：`services/backend/research_trail/pi_model_bridge.py`（模型预算、权威上下文、错误和薄适配）、`pi_bridge.py`（复用原进程/整批工具执行，仅新增扩展钩子）、`packages/pi-worker/worker.mjs`（真实 Agent/streamFn）、`model-messages.mjs`（消息转换）。验证入口：`services/backend/research_trail/verify_pi_model.py`。

完整复验暴露已有源码Worker的启动预算问题，使用已有esbuild 0.28.2增加`scripts/build-pi-worker.mjs`开发构建：从真实固定包和相同Worker源码进行tree shaking，输出忽略的`packages/pi-worker/dist/worker.mjs`及manifest（459252字节、705输入SHA256）。不改Agent循环，不新增依赖、不分发Node/安装器。Python默认试验Worker优先采用已验证构建；manifest≤512KiB，核对全部输入/输出哈希及路径范围，源码/依赖或产物变化则拒绝并提示重建，不偷偷使用旧产物。从未构建时仍可使用原源码入口（普通3秒RPC预算）；verify在测试前明确离线构建。显式自定义测试Worker路径保持原行为。这不是正式Agent选择开关或失败后重试。

正式 `SessionPanel → Electron → FastAPI → RunManager → AgentRunner → 模型/ToolRegistry → Store/SSE` 没有切换。没有新增 API、环境开关、UI 或生产配置。测试中的 RunManager runner override 是既有内部接口；不代表正式 pi 路由已验收。

固定 pi 1.1.0 的实际接口与旧版示例不同：Agent 构造系统消息，其 `toolsAdded` 携带声明；streamAssistantResponse 将 transcript 传给 streamFn，不能假设 context.systemPrompt/tools 存在。已读取安装产物 `agent.js`、`agent-loop.js`、pi-ai `types.d.ts` 和 `utils/transcript.js`；固定源码身份/许可证仍沿用 [P2-02](PHASE2-PI-BRIDGE.md) 的锁定及审计。异步 `subscribe(message_end)` 仍先于 executeToolCalls；真实 Agent 屏障测试再次通过。没有自写 Agent 循环。

## 2. 协议与消息转换（已实现）

仍使用 P2-02 version=1 的独立 JSONL envelope：

```json
{"version":1,"request_id":"当前RPC的ID","run_id":"当前运行","attempt_id":"当前尝试","sequence":1,"type":"model_request","payload":{}}
```

双向 sequence 各自连续；request_id 每方向唯一，响应必须匹配当前 pending RPC；运行/尝试不匹配、重复 ID/序号、未知类型、非法 UTF-8/JSON/重复键/非有限数值/深度越界均拒绝。sequence 是私有输运计数，不能写作 SSE sequence。

| 消息 | 严格 payload / 行为 |
| --- | --- |
| start（新增模型模式） | `{mode:"python-model",tools:[{name,description,parameters}],system,text,max_model_calls,rpc_timeout_ms,run_timeout_ms}`；本次输入+受限只读声明，没有凭证、模型服务地址/名称、配置和历史 |
| model_request | `{messages:[Chat消息],tools:[原注册表Chat工具声明],call_index:整数}`；Python与本次权威 history/declarations 比较后，只把自己的副本交给模型 |
| model_response | `{message:{role:"assistant",content:字符串或null,tool_calls:[{id,type:"function",function:{name,arguments:原始字符串}}]}}`；原适配器的其他字段不能进入 Worker |
| tool_batch / permit / request / result | P2-02 Schema 保持；新增批次必须与刚返回的模型调用完全匹配，再由原 admit 全批检查；不承认 Node 自报的额外批次 |
| engine_end | 原 `{ok,answer,stats}`；Python额外要求答案与自己最终模型回复相同、无未决结果、stream_calls等于已准入模型请求数 |
| 模型失败 | Python保留原 ModelError 的 code/message/retryable，返回失败/超时；不发伪成功 model_response，关闭 Worker、取消待决 stream。无模型/工具自动重试或 Python 代跑回退 |

| pi / Chat Completions | 转换规则 |
| --- | --- |
| system / user | pi 字符串或纯 text blocks → Chat 字符串；工具从 leading system.toolsAdded 转为原注册表 function/strict 声明；禁图像、thinking、工具动态替换和额外 system 消息 |
| assistant | Python严格文本+tool_calls → pi text/toolCall；stopReason=toolUse或stop；保留原 content=null/文本及 raw arguments，后续上下文经关联缓存还原，不重新 JSON.stringify 参数而丢掉重复键/空白 |
| toolResult | pi toolCallId → Chat tool_call_id；text 中完整 ToolSuccess JSON → content；Python对比严格解码后的已执行事实，兼容数值/Unicode/空白序列化差异 |
| 工具执行ID | 模型ID负责上下文和RPC关联；Python仍创建独立业务call_id用于tool_started/result事件，不能混用 |

模型响应先转为 complete message，再通过 AssistantMessageEventStream 交给 pi。**仍是非流式模型完成请求，不是逐 Token 输出**。pi usage 的零值仅满足类型要求；Python complete未提供 token/cost 统计，不能据此声称零费用实测或真实 usage 已实现。

### 大小和预算

- 保持 P2-02：JSONL 帧128KiB（含envelope/LF）、原始工具参数4KiB UTF-8、JSON深度32、每方向最多256消息、有界读写队列、工具仅 market_quote/market_kline、最多8工具轮/8总调用、最终回复4000字符。
- 模型 payload 单独限96KiB UTF-8，低于帧预算；文本输入与模型文本4000字符。Python完成结果也先做有界/严格JSON与字段校验；工具参数语义必须继续整批校验。
- 默认最多9次模型请求；可以显式收紧。首个超预算请求由Python返回 MODEL_CALL_LIMIT，不调用适配器，不新增工具。tools/mapping与权威history不一致的请求不调用模型。
- 默认每次模型2秒（显式试验范围），必须小于Worker RPC时限，后者默认3秒/最大10秒；总运行默认15秒，受传入 deadline 控制，Worker独立上限120秒。工具时限沿用P2-02，不放宽旧断言/旧超时。
- 96KiB实验上下文是本轮收紧的桥边界，不改变原 OpenAI complete 的1MiB请求/256KiB响应限制。更大业务上下文、token预算和生产超时配置需要后续专门评估。

## 3. 安全与生命周期（已实现、测试边界）

Python拥有配置snapshot、API key/Authorization、工具权限与执行、模型预算、业务事件和终态。Node只有本次用户文本、系统指令、只读工具声明、模型的允许字段和模拟工具事实。无新的HTTP客户端，OpenAI传输仍是原 complete/_request，trust_env=False、无重定向/重试，状态码与取消逻辑不变。

Worker环境沿用系统变量白名单，不继承 key/token/proxy/NODE_OPTIONS/用户配置目录/数据库路径；argv也无凭证。原 OpenAI complete 对文本中的已知API key脱敏；桥额外拒绝工具ID/名称/raw参数（含JSON转义后的值）中的已知key。只检查已知当前模型key，不能泛化为任意用户文本/工具事实都不含私密资料；不得把含私密内容的请求当OS隔离证明。

取消/总体deadline/单次模型deadline/Worker退出均在Python等待期间检测。每个complete有私有返回队列和model_stop；离开等待就stop，迟到完成不能写history/事件、满足新RPC或再次执行工具。OpenAI的协作取消实际取消MockTransport async exchange。任意忽略stop的同步自定义provider线程不能被强杀，结果被隔离；这是未解决的通用线程终止边界，不承诺全进程树OS隔离。

model_request不可重试；同一bridge实例只运行一次。tool_batch严格比较模型返回批次并继承原批次全查、顺序执行与消费后不重试。失败后已执行工具保持原结果；不把401/429/超时/网络错误变最终成功答复。历史 event-log/SSE读取不启动Worker/不调模型/工具；独立Store测试验证。

stdout仅协议，stderr不输出原输入/模型/错误栈，Python持续丢弃有界诊断。现有离线network.cjs护栏是测试tripwire，不是WindowsOS沙箱。

## 4. 两个真实离线场景

独立CLI均使用输入“查询AAPL.US行情”：

- FakeModelProvider：没有complete方法；桥调用现有RuleDialog.complete → Fake.plan产生market_quote → 原ToolRegistry一次模拟查询 → Fake.respond产生最终“189.43 USD，模拟数据，固定市场时间”回复。
- OpenAIModelProvider：真实调用原complete/_request两次，httpx.MockTransport只在Python拦截HTTP；第一轮返回tool_calls，第二轮检查assistant原ID/raw参数及完整ToolSuccess，再返回“189.43 USD；fixture 模拟数据”。使用离线占位key、offline.invalid，不读取用户凭证、不发网络请求。

两者ready均证明实际Agent/1.1.0/sequential；model_calls=2、stream_calls=2、results_seen=1、tool_executions=1。P2-02 fixture模式的batches入口仍保留，但模型模式没有batches字段，结果来自Python适配器。

## 5. 测试分类

`services/backend/tests/test_pi_model_bridge.py`新增47项：真实pi + Fake/RuleDialog、MockTransport complete及多工具/ID/原参数回传；5类混合非法批次零执行；预算/重复ID；7类非法模型输出；6类既有模型错误且无重试；取消/deadline/单次超时/crash/迟到响应；协作HTTP取消；4类凭证echo保护（含非法JSON中的转义key）；7类明确标记的恶意输运桩；显式Store唯一终态和历史不执行；模型第二轮401/工具失败无重试；3项开发产物哈希/路径单元测试（不执行伪Worker）。

`packages/pi-worker/model-messages.test.mjs`新增8项：消息转换/重复raw参数/不支持输入与大小；实际Worker收到非法model_response、错RPC ID、重复响应、取消后迟到响应。P2-02原16项真实Agent屏障/协议测试不删改，全部复验。恶意输运桩只能证明桥防御，不能拿它证明运行pi。

正式默认AgentRunner/API/UI由原完整Python/Node/Electron套件验收。开发轮没有正式pi UI/API验收、安装包验收、真实模型/行情/账户验证或新的远程CI；后续独立PR发布复验与CI回执见 EVIDENCE 第65节及该PR检查页面。

## 6. 实际执行结果

已执行：最终Python新旧专项87 passed（原40+新增47，77.41秒）/1项既有Starlette弃用警告；此前新增44项40.12秒通过、43项36.21秒通过，开发首轮新旧专项80 passed（当时新增40项，56.75秒）；Node24 passed（原16+新增8，最终专项3.92秒），失败/取消/跳过0；双场景verify_pi_model完成；git diff --check与离线pi许可审计通过。

最终开发构建版 `bun.cmd run verify`退出0：783 Python（329.23秒）、24 pi Node（3.76秒）+19原Node（1.69秒）、58实际Electron（501.01秒），共884项；失败/取消/跳过0，原829项保留，新增55项（47 Python/8 Node）。原12工程案例、30历史样例、契约/类型/native及pi许可审计、0020临时库重复迁移/模型一致性、main/preload/renderer构建、两个新模型CLI及原verify_pi全部通过。保留1项既有Starlette/httpx弃用和Vite510.24kB chunk警告。上述为开发轮本机结果；发布复验见 EVIDENCE 第65节，安装器仍未验收。

原始执行记录：首轮已收集版本779 Python（295.94秒）/43 Node/58 Electron（494.27秒）全部通过；安全复核补上非法JSON内转义key与1用例。第二轮与首轮Electron并行时，旧`test_real_pi_pending_tool_late_result_cannot_emit[deadline]`的entered.wait(1.5)失败（总体预算0.8秒）；779 passed/1 failed（342.10秒），后续步骤未执行。原用例单独1 passed（4.20秒）后，串行全套仍同处779 passed/1 failed（349.75秒），推翻“只因并行”假设。

进一步导出main原Worker（仅import定位到同一已安装固定包/协议）对照：当前/基线各3次均在同一原断言失败；实测ready当前1.063秒、基线0.922秒，已超过0.8秒。使用已有esbuild编译相同真实Worker后，同一旧用例/断言/时限连续3次通过，最终新旧专项87项通过。修复为减少模块加载开销，不放宽超时/删断言/跳过；源码入口的极短启动预算仍属边界。四份仓库外日志为`%TEMP%\research-trail-p2-03-{verify,final-verify,serial-verify,built-verify}.log`，最终以built-verify为准。

本轮未安装依赖，package.json/bun.lock不变。许可审计仍为87锁定包、70789644已安装bytes，5项声明已收集；proxy-agent-negotiate@1.1.0完整版权声明仍缺，阻塞未来Worker安装器分发。

## 7. 尚未验证与下一步建议

开发轮尚未执行：真实付费模型、真实行情/账户、正式pi API/UI、Node运行时分发、ASAR/PyInstaller闭包、新Windows安装包/独立干净Windows、OS权限隔离、一般同步provider强制终止、真实模型usage/token流/大型上下文、远程CI。发布轮CI按独立PR的实际回执单独核验，其余边界不变。新worker不属于v1.0.0已发布安装包。

P2-04仅建议：明确Python内部engine接口与配置snapshot生命周期、受控显式试验的RunManager集成/业务ID绑定、模型错误/工具失败/SSE唯一终态及历史重放验收、配置变更与无静默回退；仍默认AgentRunner。验收应覆盖Store取消/超时/失败状态矩阵、跨run隔离、原API/UI回归、无额外模型/工具执行。真实模型验证和任何默认切换/打包必须另行授权；许可证分发缺口先解决。本轮不执行这些任务。

## 8. CMD复核与学习

```bat
cd /d "<你的研迹目录>"
git branch --show-current
git status --short
git diff --check
node scripts\pi-audit.mjs
node --require .\scripts\offline\network.cjs scripts\build-pi-worker.mjs
node --require .\scripts\offline\network.cjs --test packages\pi-worker\worker.test.mjs packages\pi-worker\model-messages.test.mjs
where node
cd /d "<你的研迹目录>\services\backend"
set PYTHONUTF8=1
.venv\Scripts\python.exe -m research_trail.verify_pi --node "<where node得到的绝对node.exe路径>"
.venv\Scripts\python.exe -m research_trail.verify_pi_model --node "<where node得到的绝对node.exe路径>"
.venv\Scripts\python.exe -m pytest tests\test_pi_bridge.py tests\test_pi_model_bridge.py -q
cd /d "<你的研迹目录>"
bun.cmd run verify
```

小练习：运行verify_pi_model，对比两行JSON的scenario、model_calls=2、tool_executions=1及同一对tool_started/tool_result的业务call_id；随后只运行`pytest tests\test_pi_model_bridge.py -q -k mixed_invalid`，确认5项通过，再读check_batch/admit解释零执行。

理解题：① 为什么Fake必须用RuleDialog，而OpenAI直接complete？② 为什么sequential不能替代整批准入，且还要比较模型返回批次？③ 为什么JSONL与AssistantMessageEventStream存在仍不能称逐Token流式模型输出？
