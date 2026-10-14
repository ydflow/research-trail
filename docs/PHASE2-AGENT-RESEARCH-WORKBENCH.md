# P2-08：AI Agent金融研究闭环与工作台联动

日期：审计2026-10-13，实施2026-10-14，最终收尾2026-10-15（Asia/Shanghai）。状态：本机离线验收通过，待最终代码审核；用户已正式批准第5节方案A并认可四张实际Electron图，本轮授权完整验收后提交/普通推送/独立Draft PR。第2～11节保留审计、设计、实施及前轮1124项本地验收历史，当前以第12节为准；不扩大到真实模型、真实数据、合并或发布。

## 1. 恢复基线与授权边界

- 本地HEAD/main、origin/main、远程main均为d51476757e508b2054942478bfb19fe6deb0b0c0，工作区/暂存区干净。最新[main CI 38382422780](https://github.com/ydflow/research-trail/actions/runs/38382422780) completed/SUCCESS，headSha精确匹配，既有基线900 Python/57 Node/82 Electron，共1039项。
- fetch后重新核对main，创建feat/phase2-agent-research-workbench；同名本地/远程分支创建前不存在，未覆盖其他分支或未提交改动。
- 已读AGENTS、ROADMAP、EVIDENCE、PHASE2-MULTI-MARKET、PHASE2-MARKET-DATA-AUDIT、PHASE2-PI-RUNTIME、ACCEPTANCE-step15/16/17及实际实现；仓库外PROJECT_STATE和P2-07-HANDOFF-d514767作为上一阶段历史，与现场Git/CI一起核对。本轮正式启动P2-08取代交接中“未获P2-08开发授权”的历史状态，但没有取代本轮的契约审批边界。
- 不提交/推送/PR/合并，不新Provider/依赖/交易、不真实LLM或金融API调用，不替换正式AgentRunner、不公开Pi、不执行P2-09/10、不Release/安装包。

## 2. 十项实际架构审计

| 项目 | 源码与已经存在的行为 | 缺口/实施约束 |
| --- | --- | --- |
| App跨页面股票上下文 | [App.tsx](../apps/desktop/src/renderer/App.tsx)维护researchSymbol、discoveryTarget、researchEventRef；证券入口清事件/发现上下文，切到ResearchPanel；发现/日历传mode/provider/event_ref | 不是统一的研究/报告/会话关联；没有initialStrategy；市场selectSecurity的await完成后无导航代次检查，可能迟到跳页 |
| 证券选择 | [SecurityWorkspace.tsx](../apps/desktop/src/renderer/securities/SecurityWorkspace.tsx)从workspaceState读active_symbol/revision，写操作串行、读取按query/revision/generation隔离；已有“采集此股票研究数据” | 入口按钮没有使用writing禁用条件，选择尚未保存时可能仍携带旧active_symbol；应从已核WorkspaceState派生入口，不凭名称拼接 |
| 总览详情 | [overview-display.ts](../apps/desktop/src/renderer/market/overview-display.ts)精确守卫四只US equity；[MarketOverview.tsx](../apps/desktop/src/renderer/market/MarketOverview.tsx)只选中crypto详情，不发股票IPC | CN/crypto没有已验证采集链，需说明研究限制；不能将P2-07样例池数据冒充研究源或自动启动采集 |
| ResearchPanel参数 | [ResearchPanel.tsx](../apps/desktop/src/renderer/research/ResearchPanel.tsx)以initialSymbol/mode/provider初始化useState，事件默认event-driven，普通入口默认comprehensive；180ms预览、有active/代次保护 | initial参数只初始化，不响应同组件新入口；需明确入口身份/重置规则并防迟到。实际主页面切换会卸载，不据此假称所有同组件更新都安全 |
| 计划/采集/恢复API | [app.py](../services/backend/research_trail/app.py)、[research.py](../services/backend/research_trail/research.py)、[research_recovery.py](../services/backend/research_trail/research_recovery.py)已有受token保护的plan/start/get/data/cancel/checkpoint/resume/restart/abandon | Planner是Python八策略能力映射与状态快照，不是LLM自主规划。start重新生成并保存实际计划，不承诺执行的计划与旧预览逐字锁定 |
| Agent工具 | [capabilities.py](../services/backend/research_trail/capabilities.py)、[tools.py](../services/backend/research_trail/tools.py)、app.py只注册market.quote、market.kline、portfolio.risk、stocks.compare | ToolName/ToolInput/ToolData及执行结果校验均为闭合类型；没有研究/报告/证据读取或启动采集工具。不能复用quote返回任意报告JSON绕过类型 |
| 会话/消息/事件 | [SessionPanel.tsx](../apps/desktop/src/renderer/SessionPanel.tsx)复用session快照→活动Run SSE；[session-adapter.ts](../apps/desktop/src/renderer/session-adapter.ts)按session/run/sequence去重；显式发送选择fake/openai | App没有研究身份传入SessionPanel；主区和常驻区在切换时挂载不同实例。execute/create/delete的await续段没有新的外部研究上下文票据；AgentRunner只构造本次输入与本次工具结果，不读取旧消息作为多轮模型记忆 |
| 报告/证据 | [reports.py](../services/backend/research_trail/reports.py)、[report_facts.py](../services/backend/research_trail/report_facts.py)、[ReportPanel.tsx](../apps/desktop/src/renderer/research/ReportPanel.tsx)已有显式生成/读取/版本/Diff/导出；证据按run/capability/ordinal/pointer/value/SHA256回读 | 这是报告页面的数据访问能力，不等于Agent工具暴露。ReportSummary.mode是fixed/real合成器，ReportDocument.source_mode是simulated/real数据源，不能混为一类“真实” |
| 两类Run身份 | [research_contracts.py](../services/backend/research_trail/research_contracts.py)的ResearchRun在research_runs/research_steps保存计划/采集/代次；[conversation.py](../services/backend/research_trail/conversation.py)、[store.py](../services/backend/research_trail/store.py)、[lifecycle.py](../services/backend/research_trail/lifecycle.py)的RunDTO在session内保存消息/事件/生命周期 | collection run_id与agent run_id是两个UUID域；当前不存在引用关系。不能拿采集进度冒充聊天tool_started，也不能把两类ID互换 |
| 安全地向助手提供保存结果 | StartRun只允许input/kind/scenario；AgentRunner的工具结果只能四种kind；报告页面的reportEvidence返回ReportOriginal并核对原值/hash | 靠现有契约不能完成可信报告工具输入。必须批准小型结构化绑定与只读工具；粘贴报告文本或股票名称没有授权范围、证据回读或持久关联保证 |

其他已核边界：ProviderService.authored_data对股票调用FixtureMarketProvider.snapshot，离线只支持原四只US证券；ResearchInput语法虽允许.SH/.SZ等后缀，不等于存在A股Fixture或账户权限。crypto交易对不符合该股票契约。P2-07三市场总览与旧研究/Agent样例独立，不能用总览存在推断采集支持。

另有会话容量约束：[Store.snapshot](../services/backend/research_trail/store.py)返回该session全部消息/Run/事件，没有分页；[BackendManager.localRequest](../apps/desktop/src/main/backend.ts)将响应解码为字符串，超过262144个JavaScript UTF-16代码单元即拒绝，[run-stream.ts](../apps/desktop/src/main/run-stream.ts)也限制SSE单帧/缓冲长度。该限额不是UTF-8字节数。报告工具结果会被保存并进入快照，不能只限制单次结果而忽略历史累积，也不能为新功能放宽传输上限。第5.4节增加仅针对新关联运行的启动容量门禁；旧长期会话分页仍是尚未实施的后续事项。

## 3. 当前完整链路与可复用能力

现有证券→报告链：WorkspaceState选证券 → App.onResearch(symbol) → ResearchPanel预填 → researchPlan → ResearchService.plan/八策略/CapabilityRegistry/SkillCatalog → 用户点击开始采集 → ResearchService.start → 默认最多4并发、每项20秒 → ProviderService.query → ResearchStore唯一保存计划/步骤/结果 → RunProgressCard轮询实际状态 → 用户显式生成报告 → ReportService读取已存packet → 固定或显式真实合成器 → ReportStore保存版本 → ReportPanel/ReportOriginal核对引用。

既有会话链：用户显式创建/选择session与发送 → runs:agent → POST /sessions/{session_id}/runs → RunManager → 正式Python AgentRunner → 现有四工具 → 持久tool_started/tool_result/message事件 → 快照/SSE → SessionPanel。此链没有连接ReportStore；采集链不会产生聊天Agent工具事件。

- 计划预览只读状态，既不发Provider请求，也不创建ResearchRun。标签必须是“计划/准备读取”，不能写已执行。
- 采集只有一个活动任务/数据库，排空占物理槽；成功/部分/失败/取消/中断均已有语义。复用协调器，不创建新前端或Python调度器。
- 报告可来自有成功数据的partial/cancelled/interrupted采集，但保留源终态和缺口；零成功、活动采集或无可用事实拒绝。固定合成器是离线流程验证，不是已核AI投资分析。
- 事实引用与分析/预测分开。原始回读校验成功步骤/执行ordinal/完整结果hash/JSON Pointer值；hash不是防本机管理员全量改写的签名。当前Forecast是另有标签的主观、未校准概率，历史step16的初始无概率限制不能覆盖后续实际契约。
- 研究历史只读不重采；恢复原ID/计划与成功结果，只续未完成项；restart新ID/新计划重新采集；abandon保留历史但禁止续采/新报告。报告中断恢复不重发模型，不把request_uncertain=0计数解释为服务端未消费。
- Python仍是业务真相；沿用SQLite、报告与研究表、检查点、会话事件。不新增报告数据库或前端业务持久化。

## 4. 可以仅用旧接口实施的UI联动

以下属于已授权UI范围，但本次先停在第5节的核心审批阻塞，不把它们单独实现后称为全阶段完成。

| UI状态/连接 | 建议最小实现 | 不改公开契约的边界 |
| --- | --- | --- |
| ResearchEntry | 从后端active_symbol/revision或已支持EquityAsset.id派生symbol、strategy、mode=simulated、provider=longbridge及入口代次；证券写入期间禁用研究入口 | 仅内部props/state；沿用ResearchInput八策略，不加股票/总览DTO字段 |
| 计划确认 | 显著展开当前标的/策略/预计能力/可用性；输入变更立即清旧计划，核对plan.input与当前key；显式开始，展示运行实际保存计划和能力重查 | 不虚构LLM Planner，不加plan_id/hash锁定执行契约，不将可用性快照当请求成功 |
| 过程/证据 | 复用RunProgressCard与ResearchData、RecoveryPanel；突出source/mode/fetched/market_time和缺口 | 采集步骤与会话工具事件分别标识，不把Provider采集重新称为Agent工具调用 |
| 报告出口 | ReportPanel完成后向App提供已核report.id/run_id/document.source_run_id，新增“关联到助手”的显式操作 | 只显示候选关联；工具未批准时显示“当前无法作为AI工具证据”，不发送报告全文或自动启动模型 |
| 助手候选上下文 | 从实际报告/研究GET响应构造ID对象；会话切换、股票/任务变更、解除关联时清候选；异步动作带session/entry代次 | UI标签不授予工具访问权限，不依赖名称、标题、localStorage或输入框隐藏文本认定后端绑定 |
| 市场/导航 | 原四US可走证券→研究；CN/crypto提示采集未支持；App对迟到证券选择续段核对导航代次 | 保留15入口/三栏/AI助手及P2-06/07；浏览不采集、不启Agent或真实Provider |

旧计划、报告、恢复、会话API以及原具名IPC可以直接复用。若用户要求“执行完全等于某个旧预览计划”或跨重启保留未发送的候选关联，需要另行设计；本方案不暗中添加这样的承诺。

## 5. 审批项A：可信报告读取的最小设计（尚未授权/未实现）

阻塞依据是本轮用户明确要求“新增公开契约、注册新工具或迁移先提交最小设计等待单独批准”，以及最后“必须扩展公开契约才能完成核心研究证据闭环，先报告阻塞和最小方案”。不是技能推定审批，也不是安装或真实数据许可证造成离线阻塞。

### 5.1 范围与公开契约清单

推荐批准A后继续完整离线MVP：只让本次显式绑定报告的fake_agent运行读取simulated数据源、fixed合成器的completed报告。报告未生成/失败/中断、真实数据源/真实合成器、非四只US、crypto或其他报告都明确拒绝。既有独立真实模型/报告选项保留，新增报告联动不自动进入真实运行。

| 项目 | 拟变更 | 兼容目标 |
| --- | --- | --- |
| 新ReportContextRef | report_id: UUID、source_run_id: UUID；extra forbid | 不接受客户端symbol/mode/provider/报告全文/URL；由后端加载报告与采集推导 |
| 现有StartRun | 增加research_context: ReportContextRef或null，默认无关联 | input/kind/scenario及旧fixture/fake/openai行为保留；绑定报告的路径初期仅fake_agent/normal |
| 现有StartedPayload | 增加可选research_context，持久记录本次后端核验后的两ID | 用现有run_started事件JSON，不另加Run表/前端业务存储；旧事件可读取，缺省字段的旧序列化形状需专项保护 |
| 新ReportReadArguments | report_id/source_run_id UUID、evidence_offset严格int 0..383、evidence_limit严格int 1..32，默认0/16 | 只读已绑定报告一页；不接受查询Provider、重新生成或任意路径参数 |
| 新ReportReadToolData | kind=research_report，绑定身份/来源/返回页/保存摘要/缺口等有界结果，详见5.3 | 复用既有ReportEvidence、Provenance、ReportClaim、ReportForecast、ReportGap；不把旧Quote或ProviderResult当任意JSON容器 |
| ToolName/ToolInput/ToolData | 允许新工具名、专用参数与专用结果分支 | ToolCall、ToolStarted/ToolResult事件及SessionSnapshot的生成引用同步；旧四工具字段与语义不改 |
| Electron | 现有startAgentRun增加可选末尾context参数；runs:agent验证该对象及两UUID并传固定本机路径 | 不新增IPC名称/任意请求，不改变sender/token隔离；其余白名单保持 |

无新HTTP路径，复用POST /sessions/{session_id}/runs；无新数据库迁移，现有事件payload JSON可承载绑定；无新依赖、Provider、交易或模型调用。Quote/ReadQuery/SecurityQuery/ResearchInput/ReportGenerate及P2-07独立总览契约不变。生成OpenAPI/TypeScript只有上述已列范围及引用需要调整，不能以“只加工具”隐瞒公共事件契约扩展。

示意请求（ID为格式占位，实际必须来自已保存对象）：

```json
{
  "input": "读取已关联研究报告，说明资料来源与缺口",
  "kind": "fake_agent",
  "scenario": "normal",
  "research_context": {
    "report_id": "00000000-0000-0000-0000-000000000001",
    "source_run_id": "00000000-0000-0000-0000-000000000002"
  }
}
```

### 5.2 工具与身份/访问范围

- 工具名拟为research.report.read，模型wire名research_report_read；用途仅回读当前显式关联的已保存报告/事实。不会启动采集、生成报告、执行网络、搜索全部报告或写研究数据。
- 启动前核验现有session存在、规范UUID、ReportJob.status=completed且有document、job.run_id=document.source_run_id=ref.source_run_id；从ResearchStore核验symbol/provider/mode/检查点与原始证据。拒绝不匹配、损坏、不支持或真实范围。不要在创建Agent运行后才发现输入关联非法并偷启模型。
- 绑定冻结到本次agent_run_id/session_id及采集generation；保存两ID到该Run的started事件。用户只建立候选关联时不启动Run；显式发送才让后端核验并持久绑定。不是聊天标题、sessionStorage或模型输出授予的权限。
- 每运行创建一个受限注册表/内部工具闭包，报告关联运行只暴露research.report.read；普通未关联会话仍原四工具，默认Python AgentRunner执行循环不替换。复用现有RunManager内部factory/生命周期，不另建Harness或采集引擎，不修改Pi暴露工具/正式运行时。
- 模型提交两ID必须与本次冻结scope完全一致。工具定义可将两ID约束为本次允许值，但后端仍必须独立再校验；不依赖模型遵守schema。不能查询另一个session关联的scope或另一份本机报告。
- 本系统是本机启动token下的单用户数据库，不声称新增多租户权限。新scope是模型/渲染器的最小访问范围限制；ReportStore仍是报告唯一存储方。

### 5.3 返回字段、长度与事实边界

拟返回：report_id、source_run_id、symbol、strategy、report_version、source_mode、provider、synthesizer_mode、collection_status；本页facts、按capability的sources（复用Provenance）、对应步骤开始/结束时间；saved_summary、saved_forecast、gaps及total/returned/next_offset/omitted计数。

- 每页默认16/最多32事实，按报告原有稳定顺序；沿既有事实投影最多384条。每页最多16来源/时间组、16缺口；保存摘要最多4项、单项480字符；forecast最多一项，basis沿480字符界限。序列化UTF-8总量上限24KiB，过大明确TOOL_RESULT_TOO_LARGE，不以偷偷压缩值、随机抽样或伪造事实成功。
- 每个事实保留id、run_id、capability、ordinal、pointer、value、result_hash、provider/source_mode/fetched_at。复用ReportService.evidence/report_facts.original核对步骤/结果hash/原值，再投影有界元数据；可在本次调用内按capability复用读取/摘要，避免对同份大结果反复读库。不给模型原始完整ProviderSuccess或任意SQL/文件。
- 只返回引用在本页已验证facts中的摘要/预测；其余标明未返回数量，不把缺省forecast当成“报告没有预测”。超出页、缺口截断和来源遗漏都有计数，不声称整个报告已读完；不无限自动分页。
- facts是原始保存数据；saved_summary/saved_forecast是先前合成器产物，显式标记fixed演示/分析/预测、主观概率未经校准，不当行情事实；当前Agent答复同样是分析性文字。缺失null、失败与partial来源状态保留，不补造。
- 数值单位/币种只认已返回的原字段；原字段缺失就标不明确，不按证券代码猜单位或转换币种。来源/新闻/报告文字均是数据而非指令，不执行其中命令/URL或当作新工具权限。

### 5.4 失败、取消、持久化与成本

- 输入/绑定非法在启动前拒绝；执行错误使用现有ToolFailure/ErrorPayload，拟区分REPORT_CONTEXT_REQUIRED、REPORT_CONTEXT_MISMATCH、REPORT_NOT_READY、EVIDENCE_CHANGED、REPORT_CONTEXT_UNSUPPORTED、TOOL_RESULT_TOO_LARGE。不得回退行情工具、模拟另一份报告或暴露异常中的私密信息。
- 回读前及分批/返回前检查本次stop/deadline、session/agent Run仍有效、采集generation/证据未变。沿原Manager/Store终态和checkpoint门禁拦截取消/删除后的迟到结果；不承诺强杀任意SQLite/Python同步调用。
- 保留原单工具2秒、默认运行15秒与默认AgentRunner最多8轮/调用；报告关联的独立实例用已有构造参数收紧到最多1轮/1次读取，每次显式发送只读一页，后续页需要另一次显式发送。不改默认执行循环、普通会话限制或自动重试，不建后台调度。若实测有界回读不能符合既有预算，报告原因，不擅自延长旧时限。
- 新关联运行在Store.begin_agent的同一写事务内、创建Run/消息之前，检查现有会话快照的实际JSON字符串长度（按Electron同样的UTF-16代码单元计算）。现有长度不得超过131072，预留98304代码单元给本次完整运行并留下32768安全余量；否则返回SESSION_CONTEXT_CAPACITY，不创建工作、不删除历史、不自动换会话，提示用户显式新建会话。一次工具的24KiB UTF-8结果、原2000字符输入/4000字符答复及所有消息/事件封套必须共同符合98304预留；用最大输入、输出、转义、非BMP字符和全部终态验证上界。若实际序列化不能证明该预算，暂停并修订方案，不能上调旧262144限制。
- 新Run绑定和tool_result沿现有事件事务/快照/SSE保存；重启读取原事件和结果，不重调报告/模型/Provider。旧Run无绑定继续旧语义；当前普通Agent原本不发送历史对话，方案不顺带增加真实模型多轮历史输入。
- 初期仅Fake+Fixture/fixed报告，金融API与真实LLM费用0，无数据授权/套餐新增；真实历史报告进入模型、真实LLM或行情仍需独立批准。

## 6. 文件级实施清单（审批后，非已经改动）

| 文件 | 计划动作 |
| --- | --- |
| apps/desktop/src/renderer/App.tsx | 内部证券/研究/报告候选上下文和导航代次，传给常驻助手；保持15入口/三栏 |
| renderer/securities/SecurityWorkspace.tsx、renderer/market/MarketOverview.tsx | 稳定证券入口、写入忙态守卫、CN/crypto限制提示；不自动研究 |
| renderer/research/ResearchPanel.tsx、RunProgressCard.tsx、ReportPanel.tsx、research.css | 可见计划确认/真实过程/来源；参数上下文清理；显式报告/候选关联回调；复用RecoveryPanel |
| renderer/SessionPanel.tsx、session-adapter.ts、ToolResultCards.tsx及小型样式/内部类型文件 | 显示候选/保存绑定身份、拒绝迟到操作、报告专用工具卡与摘要/事实分层；新类型不能落入stocks.compare或K线兜底分支 |
| services/backend/research_trail/conversation.py | 第5.1节可选启动/事件绑定和专用工具参数/结果类型 |
| services/backend/research_trail/report_read_tool.py（拟新增） | 有界、scope约束的已有报告/原始证据回读；无新存储/Provider |
| services/backend/research_trail/app.py、lifecycle.py、store.py | 受保护启动前验证、每Run内部factory/scope、started事件保存；仅新报告关联运行的原子会话容量门禁；旧入口无绑定保持默认行为 |
| services/backend/research_trail/tools.py、capabilities.py | 受信每实例spec/handler及专用结果身份校验，默认注册仍四个，不全局放开报告访问 |
| services/backend/research_trail/model_provider.py或独立绑定报告Fake适配文件 | 确定性报告工具演示；不改旧规则四工具行为，不宣称任意自然语言投资分析 |
| apps/desktop/src/bridge.ts、main/backend.ts、main/index.ts、preload/index.ts、conversation-types.ts | runs:agent可选末尾上下文/严格字段与UUID校验；更新生成类型引用，sender/token保持 |
| packages/contracts/generated.ts、openapi.json | Python契约生成；明确包含现有StartRun/StartedPayload/工具事件引用扩展 |
| services/backend/tests、tests/desktop.test.cjs及必要Node专项、scripts/verify.mjs | 新scope/回读/竞争专项接入；旧1039项保留，不删/跳/放宽 |
| 本文、ROADMAP、EVIDENCE | 分开记录旧复用、新UI、工具真实读入、模拟验收、真实未验证与截图 |

不修改ResearchService调度/ResearchStore/ReportStore业务结构、旧Quote/ReadQuery/SecurityQuery、P2-06图表、P2-07总览契约、默认AgentRunner循环、Pi UI/Worker、凭证管理、依赖锁/迁移或打包配置。确需超出此范围时再次提交准确变更设计。

## 7. 审批后的测试/实际Electron验收计划

1. 四US从证券/总览进入研究，symbol与workspace revision一致；默认模拟/八策略/Provider预填；写入中按钮禁用，CN/crypto明确限制。
2. 快速证券/导航/入口/参数切换；延迟plan、security selection、report读取和session动作不会跳回旧页面或串context。
3. 计划预览零Provider/模型/写任务；显式开始后实际步骤与保存记录一致，计划不显示为执行成功。
4. collected/partial/failed/cancelled、来源/时间/缺口；真实未配置/无权限保持失败，零模拟回退。
5. 真实隔离进程中断、原历史读取零重执行、显式恢复/restart/abandon、generation及checkpoint保持原约束。
6. 显式固定报告、version/report_id/source_run_id/evidence_id/ordinal/pointer/hash匹配；错误引用/结果变更/损坏checkpoint拒绝。
7. 无context、跨报告/源Run/会话、真实来源/合成器、非支持股票、crypto、超长/重复/未知字段全部拒绝；非法绑定不创建Agent工作或消费模型。
8. 默认四工具不变；绑定报告Run只暴露新工具，无法读取其他报告或隐式重新采集。ToolName/ToolData事件分支、前端目标名称及结果卡正确，不落入K线/对比fallback。
9. 数据页/24KiB/32事实/来源/摘要引用/forecast遗漏/缺口计数边界；数值与单位不猜，分析/预测不冒充事实；外部文字不增加权限。新实例最多一次工具调用；容量门禁的131072边界、最大输入/答复/封套/Unicode及98304预留证明、并发启动竞争、超容量零Run/模型/工具均有专项，实际快照和SSE保持原262144限额。
10. 取消/删除/切换及报告原数据变化，旧scope/迟到响应不可污染当前；重启回放绑定事件/tool_result不执行工具或模型，绑定未发送只为候选。
11. 保留原SSE水位/去重/快照/终态、研究/报告/恢复、P2-05/06/07导航/UI/图表全部回归；原1039项完整保留。
12. 真实Electron1440×900、1000×700、600×700，截图覆盖证券发起、计划确认、采集实际过程、partial/缺口、报告与来源、助手候选/实际工具证据身份、窄窗口操作；测试注入标明离线Fixture。没有批准的新工具部分不得用假卡片截图冒充实现。

之后按相关专项→类型/契约/main-preload/Renderer→实际Electron→完整bun.cmd run verify→diff/来源/敏感信息/截图清单验收。只用隔离数据库、Fake、Fixture、MockTransport和离线网络护栏；不消费真实服务。

## 8. 本轮已经执行的审计验证与未执行事项

- 既有研究/报告/恢复/Agent/运行/会话六份Python专项：116 passed，失败/跳过0，64.15秒；保留1项既有Starlette/httpx弃用警告。
- 既有SSE/异步就绪Node专项：17通过，失败/取消/跳过/todo均0；OpenAPI/TypeScript一致性检查通过。
- 新Temp SQLite+实际create_app/TestClient/Fake/Fixture审计探针：value计划4项、Provider读取0、研究列表0；显式采集4项成功；显式fixed报告completed、模型请求0、37条保存事实，source_run_id与report.run_id一致，原始证据回读校验通过；历史重读新增Provider调用0。
- 同一探针读取实际注册表仅四工具。向fake_agent输入“读取研究报告 <实际report_id>”运行虽completed，但tool_started为0，没有读取报告；StartRun增加research_context被422拒绝。这个completed只表示规则回复完成，不是可信报告联动完成。
- 探针/日志在仓库外D:/folio/research-trail-p2-08-qa：audit-python.log、audit-node.log、audit-contracts.log、audit_probe.py、audit-probe.log、audit-probe.json；只有自主Fixture/假token，不读取用户数据库/凭证或调用真实API。
- 本轮只有新本文与ROADMAP/EVIDENCE审计状态修改。未改产品源码、API/生成契约、Agent工具/默认Runner、迁移、依赖或UI；未新增仓库自动测试。完整verify、新UI和新Electron截图尚未执行，1039是已合并main CI基线，不是P2-08全量验收数。

## 9. 当前待决定事项与P2-09交接边界

当前需要用户单独批准第5节A：允许所列可选运行/事件绑定、ToolName/Input/Data及生成契约扩展、受限research.report.read工具与现有runs:agent末尾上下文参数。批准后即可继续第4/6/7节的完整离线联动，不需要付费账户、第三方依赖、数据API或新迁移。若不批准，只能交付明确未接入报告证据的UI/旧工具联动，不能称整个P2-08核心闭环已完成。

P2-09稳定性/性能优化未开始。后续待P2-08实际验收后记录有界证据回读耗时、SSE/跨面板渲染与订阅、主chunk体积、Windows资源清理、长期会话/恢复压力；现有旧会话全量快照的分页/长期容量治理尚未解决，第5.4节只避免新报告关联继续放大该问题。本轮不调整旧阈值、重写调度或进行P2-09优化。真实金融API/模型授权、地域、再分发及Windows/Pi原生分发风险继续保持独立核验。

## 10. 方案A实施与本地验收（2026-10-14，进行中）

用户明确批准第5.1～5.4节，授权契约、只读工具、现有IPC可选参数、容量门禁、跨页面联动及本地离线验收；禁止提交/推送/PR/合并、真实模型/行情、新Provider/依赖/迁移/端点、Pi正式切换及P2-09/10/Release/安装包。基线及既有三份审计文档完整保留。

### 10.1 实际实现

- 证券写入中禁用研究入口，只支持原四US样例。App用导航代次隔离市场/资产页签的迟到选择；研究入口带内部代次，ResearchPanel同组件参数变化清理旧计划/任务并重新读取，当前计划必须与当前证券/策略/mode/provider/event_ref匹配后才允许显式开始。计划是现有Python策略映射，非LLM Planner。
- 沿现有ResearchService/RunProgressCard/RecoveryPanel展示实际采集，明确与会话Agent工具事件分开。报告仍由用户点击旧生成操作，ReportService/ReportStore/ReportOriginal、版本、Diff和恢复保持原实现。
- 报告页新增显式“关联到AI助手”，只传保存的report_id/source_run_id及展示用symbol/version；会话/证券/研究/报告切换清候选。准备问题不发送，用户显式发送后才核验并建立本次Run绑定。异步发送/创建/删除会话有当前身份守卫，迟到启动在已改变界面范围时取消该Run。
- 新ReportContextRef、ReportReadArguments、ReportReadSource、ReportReadToolData。修改的生成schema仅StartRun、StartedPayload、ToolStartedPayload、ToolResultPayload、ToolSuccess；其他schema/HTTP路径集合保持，旧Quote/ReadQuery/SecurityQuery/ResearchInput/ReportGenerate不变。现有runs:agent增加可选末尾context，没有新IPC名或HTTP路径，保留sender/token和固定本机路径。
- 启动前及创建Run的写事务内核验completed/fixed/simulated/四US报告、两ID、原采集检查点、所有原始投影事实和缺口；校验pointer/ordinal/value/来源及完整结果SHA256。冻结报告摘要hash与采集generation，并绑定session_id/agent_run_id。每运行独立CapabilityRegistry/ToolRegistry只暴露research.report.read；普通会话仍原四工具。agent.py、Pi Worker/runtime/工具和默认引擎开关零修改。
- 默认16/最多32事实、最多16来源与缺口、最多4摘要/一个有引用的预测；分页/遗漏数明确。只返回本页已核引用覆盖的摘要/预测，事实、固定分析与未校准预测分层；ToolSuccess实际JSON的UTF-8不得超过24KiB。新实例沿原AgentRunner构造参数最多一次工具，无自动分页、重试、重采或报告生成。BoundReportFake消费真实工具JSON生成离线规则回复，不冒充LLM分析或多轮模型记忆。
- 回读前/逐项/结束验证当前Run与冻结来源，成功tool_result保存前在同一SQLite写事务再次核验；Manager/Store原终态门禁阻止取消、超时或删除后的迟到写入。原单工具2秒/运行15秒保留。

### 10.2 容量证明与专项

先实施session_capacity与Store.begin_agent门禁，使用与FastAPI JSONResponse一致的compact JSON、ensure_ascii=false、真实UTF-16代码单元计数。新关联运行现有快照长度大于131072拒绝，Run/消息创建前在BEGIN IMMEDIATE内检查并核验绑定；98304预留加32768余量，旧Electron响应/SSE262144限额不变。普通会话仍旧行为，长期历史分页未顺带开发。

容量专项最终31通过：131071/131072/131073、ASCII/中文/非BMP/JSON控制与转义、最大2000字符输入和4000字符答复、32事实且ToolSuccess恰好24576 UTF-8字节、五种终态/所有消息与封套、实际JSONResponse/SSE帧、两个并发启动仅一个成功、非法绑定零Run/消息。最大2000/4000字符逐项断言，增加全控制字符输入、非BMP与转义混合等20种终态组合；实测最大增量88064，低于98304。新增Fake回复另验真实JSON的8192 UTF-16预算，超过时MODEL_RESPONSE_INVALID明确失败而不截断成成功，原公开2000/4000字符上限及旧模型不改；原传输上限不放宽。异常代理对Unicode的原Pydantic string_unicode拒绝及IPC孤立代理项拒绝均在启动前。工具/绑定/回放及独立导入/提交前守卫最终43通过，含跨报告/采集Run/会话、未知/真实/crypto/未完成/空/伪造/hash/pointer/ordinal、原四工具、32条分页、超24KiB明确失败、重复调用预算、真实Manager阻塞回读的取消/删除/超时、会话容量API拒绝及重开数据库只读历史。新Python专项最终共74，失败/跳过0；新增冷启动四种导入顺序、读取后提交前变更、generation变化和回复序列化/非法Unicode检查。

相关既有专项加新增最初92通过；新增Node4通过，验证现有IPC路径/旧请求、严格参数/模式拒绝、报告目标显示、实际JS字符串UTF-16长度。契约/TypeScript/main-preload/Renderer通过。完整verify结果待本轮运行结束后记录，不能以这些专项替代全量。

### 10.3 实际Electron与视觉边界

Browser plugin not available；使用已有Playwright的真实Electron/实际preload/Python、独立Temp SQLite及网络护栏。新增5项专项通过：证券→价值计划→显式采集→显式固定报告→候选关联零Run→准备问题零Run→显式发送一次research.report.read→引用实际事实；partial与缺口；会话/研究输入切换；证券选择延迟时入口禁用；迟到总览选择不跳回旧页、CN/crypto限制。标准流程重启后整个会话快照精确一致，候选不跨重启，历史不重执行。

窗口实际contentSize/innerWidth/innerHeight为1440×900、1000×700、600×700，无整页横向溢出，主流程pageerror/console error-warning为空。初轮专项2通过/3失败是新增测试中的计划标的说明缺失、错误IPC测试频道和错误市场入口/角色选择，修正说明及测试定位后5通过；没有删除/放宽旧断言。所有过程日志保留于仓库外research-trail-p2-08-qa。截图在electron-corrected/；全量重采清单及运行UUID回执待完整验收后补充。

保留浅色三栏/15入口、单股/P2-06 K线/P2-07等面积总览。报告仍是既有来源索引与文字分区，部分来源需展开或滚动；未重做为概念图式分析卡/市值行业图，未补造指数/行业/预测/AI结论。假模型回答只能确定性展示工具事实、固定摘要与缺口，不能称开放式金融研究LLM或有模型历史记忆。真实报告暂不可作助手工具证据，真实模型/数据、A股/crypto采集、市场数据授权及Windows/Pi分发仍未核验。

过程回执补充：首次完整verify的952 Python全部通过，随后独立评测CLI出现另一种导入循环；将旧ToolArguments移至内部tool_arguments.py并保持conversation导出/生成schema完全一致，四种冷导入与独立评测复验通过。之后两次完整命令在补强最大JSON转义预算及新测试期望时主动停止，日志verify-final/verify-complete保留；这些不能写作全量通过。最新稳定实现的完整命令为verify-accepted，最终结论仍待该次结束。

最终回归过程补充：verify-accepted为974 Python/61 Node通过、Electron88通过/1失败（原P2-07鼠标悬停未显示tooltip）；单项原断言复验通过，未稳定复现。新研究限制说明合并到原有详情行以保留旧布局，热力图事件/样式及原断言、时限零修改，8项专项复验通过。final-verify为原Pi内部计时竞争断言1失败/973 Python通过；Pi源码/Worker/测试未改，单项原断言4.86秒通过。过程日志保留，当前最终命令accepted-verify，974 Python与独立CLI/隔离迁移已通过，Node/Electron结果待完成。初期部分截图的文件名含1440但采用默认窗口，保留为过程图；最后拍摄已先设置并断言实际contentSize和innerWidth/Height，再用PNG头复核，不冒充尺寸。

## 11. 最终本地回执（2026-10-14）

最终串行完整bun.cmd run verify退出0，日志为仓库外D:/folio/research-trail-p2-08-qa/accepted-verify.log：974 Python、61 Node（24 Pi Worker+37其余Node）、89实际Electron，共1124通过，失败/取消/跳过/todo均0。原1039项完整保留，新增74 Python/4 Node/7 Electron共85项；old-test-preservation.json证明旧Python/Node测试未改，Electron旧正文零删除/替换。独立评测/历史CLI、生成契约/类型、main-preload/Renderer、许可图、Pi离线往返、隔离0020重复迁移/一致性通过。保留Starlette/httpx弃用及主chunk>500kB警告，不改旧阈值。所有先前失败/主动停止日志保留，不把它们称为通过。

最终24张P2-08实际Electron截图在qa/accepted，覆盖证券入口、计划、实际采集中/取消、partial/缺口、保存报告、助手关联/工具结果、重启历史；标准1440×900、紧凑1000×700、窄600×700的窗口及PNG尺寸双重核对通过。初始标准画面拍摄前就设置真实1440×900，不以viewport模拟代替native contentSize。P2-08-acceptance.json记录24图尺寸/SHA256与32个源码/测试/契约文件SHA256；accepted-source-sha256.json验收前后完全一致，文档收尾不改代码。图中Source是自主Fixture，部分失败来自已有明确离线注入，不是第三方真实反馈。Browser plugin not available，使用已有Playwright实际Electron，没有新依赖。

accepted-tool-run-evidence.json保存实际数据库回执：标准报告a6197daf-cec3-42e6-a1a0-2852dd19c8f4对应采集8d7d1e41-2ef4-4c73-a970-4ebb62f8cc75，工具事件#5返回16/37事实；来源、ordinal、JSON Pointer、SHA256及引用进入规则回复核验通过。每次关联发送最多一个工具，资料准备/候选关联零Run，历史重启快照一致、零重执行。事件是实际Python AgentRunner调用并持久保存，模型仍是假模型，不是付费LLM/真实金融数据验证。

容量门槛131072、预留98304、原传输262144不变；capacity-measured-final.json的20种最大输入/回复/终态组合最大增量88064，且工具成功JSON恰好24KiB。新Fake回复超过8192 UTF-16序列化预算明确失败，原公共2000/4000字符字段及旧模型不改。取消/超时/删除、源generation变化及工具返回后提交前证据变化均不能写入迟到成功；界面候选改变/离开时沿旧取消API使旧关联运行结束，绑定事件作为历史保留。

实际新公开schema为ReportContextRef/ReportReadArguments/ReportReadSource/ReportReadToolData，修改schema仅StartRun/StartedPayload/ToolStartedPayload/ToolResultPayload/ToolSuccess及联合类型引用；没有新HTTP/IPC名称、迁移/依赖/Provider。旧ToolArguments仅移到内部模块打断导入循环，原conversation导出及公开schema完全一致；Quote/ReadQuery/SecurityQuery、采集与报告服务、默认agent.py、Pi及正式引擎不变。证券/导航/三栏/15入口/P2-06/07和研究/会话回归均通过。

当前仅本地：feature分支feat/phase2-agent-research-workbench，HEAD/main/origin/main仍d51476757e508b2054942478bfb19fe6deb0b0c0，暂存区空，未提交/推送/PR/合并/发布。实际界面用户审核待完成。P2-09仍未开始，可单独授权后评估长期会话全量快照分页、证据回读与hash/DB开销、SSE订阅/渲染、bundle/资源清理、旧悬停及Pi计时竞争的稳定性。真实LLM/报告输入、真实金融接口与市场授权/地域/再分发、A股/crypto采集及Windows/Pi分发仍需独立批准和核验。

## 12. 最终审查与独立Draft交付（2026-10-14）

### 12.1 本轮授权与局部展示调整

第10/11节保留为前轮本地开发回执。用户已认可四张实际Electron图，本轮授权最终审查、局部精修、完整验收后提交、普通推送及独立Draft PR；不合并、不发布、不执行P2-09/10。

报告先显示证券、保存事实数量和缺口数量；证据按钮改为短编号，完整ev-ID仍在无障碍名称和原始事实回读中，既有入口可继续读取。报告身份、候选身份和已核验session/Agent Run绑定收纳为原生details；工具卡先展示本页/总数/未读、来源/缺口计数，再分别展开原始事实、固定摘要与分析，未校准预测和缺口单独提示。全部Report/Run ID、来源、Pointer、ordinal、SHA256保留，无契约或权限调整，无虚构分析/行情/概率。

真实Electron三尺寸新增展开身份的键盘操作、原始证据按钮回读与引用/Pointer/ordinal/hash核对、工具页事实/hash、无横向溢出；重启会话快照仍精确相等。Browser plugin not available，复用已有Playwright和实际Electron/隔离SQLite/离线护栏。长原始JSON和报告仍需展开及滚动，工具返回有界页不是完整报告；固定假模型不是开放式LLM研究分析。

### 12.2 最终成功提交保护与审查

成功tool_result原来已有事务内重验，但工具保存到最终回复提交间的变更仍可被标为成功。新增可选内部Store.finish result_guard，仅新关联运行的completed提交在同一BEGIN IMMEDIATE内再次验证冻结报告/来源generation；旧普通运行、失败/取消/超时路径不变，默认agent.py及Pi零修改。新增3项回归在实际Fake读取工具JSON并形成回复后改变报告/来源代次或使只读报告服务返回REPORT_NOT_FOUND，终态必须failed且无最终text_delta，已保存工具结果保留。报告有其他业务引用，缺失桩不绕过数据库外键或引入删除API。

报告/容量专项最终77通过（46工具+31容量），IPC专项4通过。超时专项最初修改共享SCENARIOS导致后续用例采用50ms工具限时，已改为单测试时序副本；生产2秒工具/15秒运行不变，旧断言不删不放宽。首次手工Vite命令路径错误导致旧构建被测，正确构建复验通过；拍摄前增加native窗口可见门禁，仍严格核对actual contentSize/innerWidth/Height和PNG尺寸。上述失败/复验日志保留，不写成一次全通过。

### 12.3 完整验收与交付回执

最后完整bun.cmd run verify通过：977 Python（417.55秒）/61 Node（24 Pi Worker+37其余）/89真实Electron（623.96秒），共1127，失败/取消/跳过/todo0。原1039与前轮85项保留，本次额外3Python回归不替代任何旧用例；阶段总新增88。独立评测/历史CLI、生成契约/类型/构建、隔离重复迁移/一致性、Pi离线往返与许可审计通过，既有弃用及bundle>500kB警告保留。

33个源码/测试/契约SHA256验收前后一致，文档收尾不改产品代码。wrapup-source-sha256.json、wrapup-verify.log、33张wrapup-accepted/实际图、wrapup-acceptance.json及wrapup-tool-run-evidence.json在仓库外D:/folio/research-trail-p2-08-qa；截图不进Git。native contentSize/innerWidth/Height和PNG尺寸均为1440×900/1000×700/600×700，主流程无整页横向溢出/pageerror/console error-warning；身份可键盘展开，短证据按钮可读原始ID/Pointer/ordinal/SHA256和JSON。清单另证明旧Python/Node未改、Electron旧正文零删除/替换、未发现敏感文件或密钥模式。最终36文件包含生成契约/测试/文档，无数据库、日志或截图。

三个本次实际Electron数据库的报告运行回执核对：唯一research.report.read调用、session/Agent Run/report/source绑定、每条实际投影值、来源、ordinal、JSON Pointer、SHA256及规则回复消费工具JSON。重启快照相等，历史不重执行。最终提交/普通推送/独立Draft后的精确Head双CI需独立核验，PR与完整日志结果记录于仓库外pr-delivery.json，不以本机通过代替远程验收；不自动合并。

审查范围仅已批准方案A：独立报告Ref/读取DTO、StartRun与started事件可选绑定、既有runs:agent可选末参数、只读research.report.read与跨面板联动。旧Quote/ReadQuery/SecurityQuery/Report/Research API、默认四工具权限、HTTP路径集合、IPC名称集合、迁移/依赖/Provider/Pi保持。全过程无真实金融API/付费模型调用；真实数据/模型、A股/crypto研究、账户套餐/地域/展示与再分发许可证、Windows/Pi分发风险仍需独立授权和核验。
