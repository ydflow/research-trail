# 研迹 · ResearchTrail

将行情、持仓与 AI 分析串联起来，让每次研究都有据可查。

研迹计划构建 **Electron / React 桌面界面 + Python 核心后端**的投资研究工作台。参考 [Folio](https://github.com/helsome/folio) 的功能和界面，按模块逐步移植必要组件，由 Python 实现核心业务。

## 当前状态

第21步已实现并通过本机及干净源码自动验收（2026-10-08）：577 Python/12 Node/50实际Electron；另获本机原生通知show回执。Python持久化八类提醒、五类固定自动化、执行/证据游标/冷却及一次采集领取；Electron显示原生通知，Today保留组合、自选、提醒、事件、研究/报告和待复审论点的来源。首版只在应用运行时调度，关闭漏计划记未执行、不补跑；财报前后自动数据采集需额外开启默认关闭选项，不自动调用报告模型。范围见[第21步清单](docs/ACCEPTANCE-step21.md)与EVIDENCE第48节。开发轮未提交/发布；本次另获第21步发布授权，复核见EVIDENCE第49节，已创建[PR #20](https://github.com/ydflow/research-trail/pull/20)；最终CI/合并按PR及根PROJECT_STATE实际回执。第22—24步未实施。

第20步固定财报、宏观与央行事件日历已实现，模拟及本机自动验收通过。Python复用同一能力注册表和数据提供商，保存事件精度、预告/发生/更新时刻、时区、股票关联、读取结果与不可变快照。六条自造固定示例、跨日/DST、去重与冲突、缺口及带事件研究/报告上下文的开发定向28 Python/3实际Electron通过；开发完整本机与独立干净源码均532 Python/8 Node/46实际Electron、契约/类型/构建、0015重复迁移及根CMD重启历史通过。真实央行未实现，Massive事件不支持；真实不可用不回退，过去预告不算已发生。范围见[第20步清单](docs/ACCEPTANCE-step20.md)与EVIDENCE第46节；独立发布复核修复溢出及超时边界，日历31项、最终本机/干净源码535/8/46及根CMD重启通过，已创建[PR #19](https://github.com/ydflow/research-trail/pull/19)，最终远程检查/合并见第47节和根回执。第22—24步未开始，第21步见当前记录。

第19步17个固定筛选任务及机会发现页已实现，模拟及本机自动验收通过。Python对1—40只有界股票池确定性筛选/评分，保存规则、指标、实际能力结果和失败；缺数据不生成候选。候选可入自选、带入对比或研究入口。开发定向33项Python与2项实际Electron、完整502/8/43通过；发布复核修复两项边界后筛选35项、本机与干净源码504/8/43及根CMD重启通过。来源、阈值及操作见[第19步清单](docs/ACCEPTANCE-step19.md)和EVIDENCE第44—45节。[PR #18](https://github.com/ydflow/research-trail/pull/18)已普通合并，当前开发基线a8bb67938e9cb962d5f532a5920b8f99d765ea44，发布CI与回执保留在根PROJECT_STATE。

第18步投资论点、版本与复审已实现，模拟及本机自动验收通过。Python从已保存报告形成论点，编辑追加版本；新采集报告与旧论点数据比较，缺数据记录无法评估，投资影响由用户显式判断并保存理由。来源和操作范围见[第18步清单](docs/ACCEPTANCE-step18.md)，完整检查469 Python/8 Node/41实际Electron与0013迁移通过，定向18项Python/2项Electron通过。独立发布复验修复清空条目列表被拒绝的问题；[PR #17](https://github.com/ydflow/research-trail/pull/17)已普通合并，本机main为c4e1679b；最终发布回执与main CI证据见根PROJECT_STATE，第43节保留发布过程。

第17步研究检查点及显式恢复、重新发起、放弃已实现，模拟、协议与本机进程中断自动验收通过。SQLite保留原计划、逐项证据与报告历史；恢复复用成功采集，续跑中断工作；报告中断后等待显式生成，不自动消费模型请求。配置变化、凭证缺失、证据损坏与重复操作有明确反馈。范围见[第17步清单](docs/ACCEPTANCE-step17.md)与EVIDENCE第40—41节；本步[PR #16](https://github.com/ydflow/research-trail/pull/16)已普通合并；main CI首次SSE超时及第二次完整通过均保留，最终发布回执见根PROJECT_STATE，第22—24步未开始，第21步见当前记录。

第16步结构化报告、事实追溯、版本保存、Markdown导出与Research Diff已实现。固定合成器、模拟协议及本机桌面验收通过；发布复验中一次真实LLM请求成功保存报告，37条模拟数据证据回读通过，此前五次失败记录保留。该真实验证只证明结构、引用和保存流程通过，报告仍使用模拟采集数据，且出现定性文字与原始值不符，不能声称分析正确。事实值只来自已有执行结果，分析/预测独立标记。范围及发布验证见[第16步清单](docs/ACCEPTANCE-step16.md)与EVIDENCE第38—39节；发布状态以Git/PR回执为准，第22—24步未开始，第21步见当前记录。

第15步Python研究执行器已实现，8种固定策略驱动同一能力注册表和现有提供商采集，默认并发4、单项20秒；计划、逐项状态和成功数据保存在SQLite。支持整体取消、明确部分失败、全失败标失败和重启读取不重执行。采集服务本身不调用LLM，终态后可显式进入第16步报告生成；技能缺口如实显示。历史验收见[第15步清单](docs/ACCEPTANCE-step15.md)及EVIDENCE第36—37节。本地main已包含[PR #14](https://github.com/ydflow/research-trail/pull/14)合并。

第14步统一能力注册与技能目录保留，同一注册表驱动工具、能力页和技能依赖状态；支持持久启用禁用、受限SKILL.md解析与按需安全读取，首批两个固定Folio技能目录保留原字节及许可。见[第14步清单](docs/ACCEPTANCE-step14.md)与EVIDENCE第34—35节；本地main已包含[PR #13](https://github.com/ydflow/research-trail/pull/13)合并，真实服务仍未验证。

第13步风险与2—4股票对比已实现，模拟和本机自动验收通过，见[第13步清单](docs/ACCEPTANCE-step13.md)与EVIDENCE第32节。Python统一计算权重、Top1/Top5、HHI、波动、回撤与基线风险信号；13项对比指标标明币种、期间和缺失原因。页面和Agent共用同一服务与快照，LLM不计算确定性数值。真实数据未验证；本步按用户独立授权通过[PR #12](https://github.com/ydflow/research-trail/pull/12)交付，发布复验见第33节，最终提交/合并以Git与回执为准；第22—24步未开始，第21步见当前记录。第12步组合导入及持久化保留，已通过[PR #11](https://github.com/ydflow/research-trail/pull/11)交付，历史证据见第30—31节。

截至 2026-10-07：**第0/2/3/4/5/6/7/8/9/10/11/12/13/14/15/16/17/18/19步自动验收通过（第11—19步含模拟与本机实窗，第16步另含一次真实LLM结构/引用验证，第9步历史含一次真实模型工具验证）；第1步原用户手动记录仍待填写**。v0.1.0源码版已发布，仅假模型＋模拟数据。第8步新增设置/连接/个人资料/脱敏诊断，五类配置和健康由Python独立管理、凭证存于Windows系统凭证管理器；第8步连接探针仍是假测试；第9步真实模型运行需显式选择，第10步SDK/只读CLI/Massive适配已实现并通过模拟验收，真实行情/账户因未配置仍未验证。用户逐项亲自操作和学习记录仍待填写，第8步按独立授权通过 [PR #7](https://github.com/ydflow/research-trail/pull/7)交付，开发与发布复验见EVIDENCE第22—23节；最终合并状态以GitHub与发布回执为准。

- 默认分支 `main`；初始公开提交为 `55b1a3d`，第2步按功能分支/PR保留导入、Python新实现、修复与桌面适配提交。
- 第2步公开复用依据为用户本轮确认的原作者授权，保留适配来源与依赖声明；交付见 [PR #1](https://github.com/ydflow/research-trail/pull/1)，发布检查和授权记录见EVIDENCE第9—11节，最终提交/合并状态以Git与发布回执为准。
- 公开仓库：[ydflow/research-trail](https://github.com/ydflow/research-trail)。仅上传源码、测试、文档、依赖清单与锁文件；不包含运行数据或截图。
- 第2步已普通合并，main基线为 `0e1dfd5ccf7e99c66d58188dcac9497ddd6e2bd8`；第3步以 [PR #2](https://github.com/ydflow/research-trail/pull/2) 交付，开发与发布验证见EVIDENCE第12—13节，最终提交和合并状态以Git与发布回执为准。
- 第3步合并基线为 `7f925dee768ff33c076582dd9d41055aca9a5932`；第4步以 [PR #3](https://github.com/ydflow/research-trail/pull/3) 交付，开发及发布复验见EVIDENCE第14—15节，按功能分支/PR保留提交，最终远程状态以GitHub和发布回执为准。
- 第5步开发基线为 `4a72e47f79d478ed4f611444ee8d64dccf9d6a17`；以 [PR #4](https://github.com/ydflow/research-trail/pull/4) 普通合并，第6步发布基线为`a56cc62d9efe4ca6e02cb9f0f06af1bcd3dc6677`。第6步 [PR #5](https://github.com/ydflow/research-trail/pull/5)已普通合并，第7步发布基线为`f51b802d61896f9da30cd1f6df331c90e75e24b9`。第7步以 [PR #6](https://github.com/ydflow/research-trail/pull/6)交付，开发与发布证据见EVIDENCE第20—21节；第11步本机开发交付见下方；第12步已发布，第13步本机自动验收通过，独立发布复验见EVIDENCE第33节；第22—24步未开始，第21步见当前记录。
- [v0.1.0源码Release](https://github.com/ydflow/research-trail/releases/tag/v0.1.0)对应main `716543305ba5d74f57336c589c4b2dffaf6e3592`，没有安装包。第8—21步改动不在此标签内；[首版清单](docs/ACCEPTANCE-v0.1.0.md)保留标签创建前的验收快照，完整版本 `v1.0.0`仍为计划。
- Folio 功能和测试属于参考项目，不代表研迹已实现或用户已完成的贡献。

## 架构与当前边界

```text
React 页面
  → preload：99个命名操作，新闻只允许显式点击打开HTTP(S)来源
    → Electron main：随机端口/令牌、所属Python进程、SSE续读
      → 本机 Python / FastAPI：鉴权与Pydantic契约
        ├─ 行情：FixtureMarketProvider（四股票固定示例）
        ├─ 运行：RunManager → AgentRunner → FakeModel / OpenAIModelProvider
        │    → 已注册只读ToolRegistry → 行情或Python风险/对比 → 返回模型 → 最终回复
        └─ Store / SQLAlchemy / SQLite：会话、消息、运行、事件
            → 事务提交 → 快照/SSE → main校验 → React显示缓存
设置页面 → 同一白名单桥 → Python SettingsService
  ├─ SQLite：五类独立非敏感配置、测试状态和本机个人资料
  ├─ Windows Credential Manager：凭证原文（只在保存请求中进入Python）
  └─ 确定性假连接测试 → 独立健康状态 → 白名单脱敏诊断JSON
```

研究采集链：研究入口/StrategyPicker → preload.startResearch → Python ResearchService.plan/execute → 同一CapabilityRegistry、SkillCatalog与ProviderService.query → ResearchStore/SQLite → RunProgressCard及按需读取的保存数据。元数据轮询只显示Python状态，不发模型请求。

研究恢复链：RecoveryPanel → 四个命名桥 → Python ResearchRecovery → 检查点/配置/凭证核对 → 既有ResearchService续采或新计划。状态与检查点在同一SQLite事务提交；恢复代次拒绝旧工作回写。恢复沿用原ID和计划，重新发起创建新ID、按当前配置重新采集。已发送但未保存的模型结果标为不确定，不重试；缺少证据不称成功。

Python 统一管理业务状态，前端维护显示缓存。假模型和模拟行情分别实现；会话可主动选择OpenAI兼容真实模型，行情仍为模拟数据。真实数据来源与模型回答不能混为一谈。

行情调用链：股票选择 → `MarketPanel` → preload 的 `marketSnapshot` → Electron 主进程 → 带令牌的 `/market/snapshot/{symbol}` → Python `FixtureMarketProvider` → 同一份 `MarketSnapshot` → 行情卡片与 K 线。桥共93个命名操作：原健康/行情/会话/运行19项、设置/凭证/资料/诊断11项、提供商配置/凭证/能力/只读查询7项、证券工作区/自选/页面/新闻6项、组合/预览/确认/撤销/只读刷新7项、风险/股票对比2项、能力/技能4项、研究7项、报告7项、研究检查点/恢复/重启/放弃4项、论点8项、筛选6项、事件5项。订阅返回解除函数；页面不能指定后端URL、端口、令牌、文件或进程。诊断和报告导出只通过主进程系统保存对话框选择目的地，不给页面任意文件能力。Python无reload worker，直接作为Electron子进程启动。

事件链：CalendarPanel → 五个命名桥 → Python CalendarService → 同一CapabilityRegistry/ProviderService → calendar_snapshots及原始读取证据。EventResearchRef只传保存ID与显示时区，Python核对后冻结事件上下文到研究计划、报告及Markdown；宏观研究股票标明用户选择。切时区、读历史和重启不重新查询，跳转不自动消费模型。

会话调用链：`SessionPanel` → preload.sessionSnapshot → main → GET /sessions/{id}/snapshot → Store单一SQLite读事务。消息、运行、事件及各运行last_sequence来自同一快照；页面先显示它，再通过subscribeRun从活动运行的水位订阅SSE。订阅间隙提交的事件会重放，不丢失或重新调用工具。工作区/会话/运行选择只作为sessionStorage显示偏好，业务内容仍从Python数据库读取。

持续流使用`/events?follow=true&after_sequence=N`，Last-Event-ID为run_id:N；默认follow=false保留有限历史读取。Python只发送已提交记录，活动流每100ms检查数据库并定期发心跳。main逐完整帧验证身份/序号，重复事件忽略；断流按最后完整收到序号退避重连（250ms至4秒）。拆开的UTF-8由HTTP解码、拆开的CRLF/半帧由解析器处理；半帧不推进游标。终态头和末事件区分正常结束与异常EOF，已到终态末尾不重连。

页面用运行ID＋序号去重、同一message_id更新文字；快照里已有的text_delta不再追加，也不订阅旧消息渠道。run_completed后再读Python快照取得终态，前端不制造终态。切换会话、切页面、刷新、后端关闭及窗口退出均解除旧订阅，清理请求和重连定时器；过期快照/事件不写到新会话。界面保留侧栏、输入、历史、结果卡和取消入口，增加折叠Python工具状态与事件连接提示。

规则Agent调用链：`startAgentRun` → POST /sessions/{id}/runs（kind=fake_agent）→ `RunManager.start` / `Store.begin_agent` → 后台`AgentRunner` → `FakeModelProvider.plan` → Python工具 → 第2步同一`MarketProvider.snapshot` → 结果/回复保存 → `Store.finish` → SSE及快照/结果卡片。POST返回已创建的running记录，不等待完成。默认无kind的API仍启动固定通信测试；主按钮选择fake_agent，次按钮保留原测试入口。

支持输入“查询AAPL.US行情”“查看NVDA.US的K线”，同样可查四只示例股票。未知意图说明范围，不调用工具；未知股票保存UNKNOWN_SYMBOL、tool_result.ok=false及failed终态。正常成功8事件、工具失败9事件、未知意图6事件。工具开始/结果由call_id关联，SSE读取当前已提交记录，不模拟LLM打字。模型Provider与数据Provider分别注入。

在“模拟工具时序”选择正常（无额外延迟、工具限时2秒）、延迟演示（等待3秒、限时5秒）或超时演示（等待2秒、限时0.6秒），整体运行限时15秒；这些是本步假工具验收配置，日志事件也标明时序。点击“取消运行”调用POST /sessions/{id}/runs/{run_id}/cancel。running只允许一次转为completed/failed/cancelled/timed_out/interrupted，重复取消返回原终态；事务内更新同一条响应消息并写一次run_completed。取消后不能写入迟到成功结果，已保存文本/工具证据保留。

默认数据库为项目根 `runtime/research-trail.sqlite3`。启动先取得数据库独占持有锁、执行迁移，再把遗留running标记为interrupted，完成后报告就绪；同库第二个服务明确报占用，不中断活着的持有者。正常退出也将活动运行标为中断；硬退出由下次启动处理。只保留历史，不自动重调模型/工具。删除会话先取消其活动运行，再级联删除记录；同一会话只允许一个活动运行。可用CMD的 `set "RESEARCH_TRAIL_DB_PATH=绝对数据库路径"` 选择独立库；测试库在临时目录。数据库、WAL/SHM与持有锁均忽略，不上传。

Pydantic 是业务契约来源。离线导出 OpenAPI 后，`openapi-typescript` 生成 `packages/contracts/generated.ts`，页面通过类型别名消费，未手写第二份 Quote/Kline。`bun run check` 同时检查契约是否过期。

模拟数据支持 `AAPL.US`、`NVDA.US`、`MSFT.US`、`TSLA.US`，每只10根日线；价格是本项目编写的示例，不是历史交易所记录。固定市场时间为 **2024-01-16 21:00 UTC**，每次数据调用另记 `fetched_at`。行情接口未知代码返回404；Agent工具错误保存为失败运行。界面明确显示“模拟数据”。规则模型独立于行情Provider，不是真实LLM；重读工具结果卡片保留当时获取时间，不查询新的行情。

## 开发与学习路线

第8步入口为“设置与诊断”。模型设置单列模型；连接设置列行情、账户、技能和运行时。各类先保存非敏感配置，再分别点“测试假连接”；可选成功/失败/失效，仅为状态流程演示。配置或凭证变更后原测试失效；所需凭证丢失、系统存储不可用分别显示失效/失败。停用和未配置不会成为成功。更改服务地址或模型名称不会改变现有规则Agent和模拟行情。

凭证输入为密码框，保存后立即清空、不回显、不写浏览器存储。Python直接调用Windows CredWriteW/CredReadW/CredDeleteW，原文只保存在系统凭证管理器；SQLite仅存随机引用及非敏感配置，按数据库路径隔离凭证命名空间。删除配置同时清理所属凭证，替换凭证先写新条目再提交引用，旧条目随后清理；若旧清理失败会明确返回失败说明，极端进程崩溃/系统清理失败可能留下孤立系统条目，不回退明文。数据库移动/备份恢复不会搬运系统凭证，需重新本机配置。普通Python字符串不承诺内存完全擦除。

本步仅实现Windows系统凭证存储。系统存储失败拒绝保存，其他OS不静默改用文件。个人资料只存本机显示名称/研究偏好。诊断JSON白名单只有各连接状态、是否存在凭证、测试时间和假连接标识；不含密钥、endpoint、模型名、资料、凭证引用、路径、环境或异常原文。说明和操作清单见 [第8步验收](docs/ACCEPTANCE-step8.md)。

| 阶段 | 内容 | 当前状态 |
| --- | --- | --- |
| 0 | 项目约定、本地 Git、路线与学习大纲 | 验收通过 |
| 1 | 桌面启动、Python 健康通信、重试与退出清理 | 代码完成/待验收；自动化通过 |
| 2 | 模拟行情与K线、股票选择、OpenAPI类型 | 验收通过；自动化复验及用户发布确认，手动记录待补 |
| 3 | SQLite会话/消息/运行/事件、有限SSE读取 | 验收通过；29项Python、8项实窗复验及用户发布确认，手动记录待补 |
| 4 | Python工具注册、最小规则Agent、过程与结果卡片 | 验收通过；自动复验＋用户发布确认 |
| 5 | 运行取消、超时竞争、删除与重启中断 | 验收通过；67项Python、10项实窗复验＋用户发布确认 |
| 6 | 会话界面、数据库快照恢复、SSE续读和去重 | 验收通过；第6步发布复验见EVIDENCE第19节 |
| 7 | 首版验收、离线CI、干净源码启动 | 验收通过；源码可发布，仅假模型＋模拟数据；远程CI与发布复验见EVIDENCE第21节 |
| 8 | 设置、凭证、个人资料与脱敏诊断 | 自动验收通过，PR #7已合并；连接探针仍是假测试，用户操作待填 |
| 9 | OpenAI兼容模型与受限只读工具循环 | 自动验收通过；一次真实模型工具验证通过（2次请求、1次工具，行情仍为模拟）；交付 [PR #8](https://github.com/ydflow/research-trail/pull/8) |
| 10 | Longbridge/只读CLI/Massive数据与只读账户 | 验收通过（模拟）；真实数据未验证 |
| 11 | 持久自选、概览、行情、K线、财报、新闻、市场状态 | 验收通过（模拟/本机实窗）；独立授权交付[PR #10](https://github.com/ydflow/research-trail/pull/10)，发布复验见EVIDENCE第29节 |
| 12 | 组合导入、现金/持仓/资产和撤销 | 验收通过（模拟/本机实窗）；已交付PR #11 |
| 13 | Python风险与2—4股票对比 | 验收通过（模拟/本机自动）；真实未验证；独立发布复验见第33节，最终PR/合并以回执为准 |
| 14 | 统一能力注册、技能目录/开关/依赖与安全按需资料读取 | 验收通过（模拟/本机自动）；真实未验证；见第14步清单 |
| 15 | Python八种研究策略与结构化能力采集 | 验收通过（模拟/本机自动）；4并发/20秒、取消、部分失败与保存；真实未验证 |
| 16—18 | 报告/恢复、论点与复审 | 16/17/18验收通过（各自验证边界见清单） |
| 19 | 17个固定筛选任务与机会发现 | 验收通过（模拟/本机自动）；PR #18已合并 |
| 20 | 固定财报/宏观/央行事件日历与事件研究上下文 | 验收通过（固定模拟/本机自动）；真实覆盖未验证 |
| 21 | 提醒、固定自动化、每日简报与Today | 验收通过（固定数据/本机自动）；仅应用运行时调度 |
| 22—24 | 评测、研究结果校准、Windows交付 | 未开始 |

每次只执行用户发送的一步，运行验证后再决定上传或下一步。界面逐步复用，Python 核心按功能实现；不导入整套 TypeScript 后端同时管理业务。

## 第9步：模型配置与一次真实验证

Python OpenAIModelProvider使用Chat Completions协议，Base URL拼接`/chat/completions`。先在设置保存Base URL（例如服务提供的`https://example.com/v1`）、模型ID与系统凭证；API Key不通过聊天或环境变量导入。默认工具轮数与累计执行次数均最多8，整体120秒、单次请求30秒；可分别设置1—32次、1—600秒、1—120秒。连接探针仍是假测试，不能证明真实模型可用。

会话的“运行模型”默认是假模型，显式选择“OpenAI兼容／真实模型”才请求本机配置的服务。模型选择注册工具→Python校验整批参数→执行→tool_call_id回传→继续模型→最终回复，最多限制值+1次模型请求（最后一次允许回复）；非法/超额工具不执行，不自动重试、不回退假模型。仅注册只读工具开放（第13步后恰为market.quote、market.kline、portfolio.risk、stocks.compare）；模拟行情标签与时间保留。只发送本次输入和主动请求的工具结果（可含组合事实），上下文附当前技能声明状态与资料缺口摘要；不发送其他历史或个人资料。取消关闭HTTP流并阻止后续模型/工具；运行错误码见会话记录。

远程服务必须HTTPS，本机模型可HTTP；不跟随重定向、不使用环境代理。上下文1MiB、响应256KiB、最终回复4000字符上限，输出最多1024 tokens；不支持所有厂商扩展、Responses或模型增量流。认证/限流/超时/网络/异常响应分别保存固定错误码，错误原文、Key与provider元数据不入事件。已知Key若被模型在回复中反射则替换为脱敏标记。

开发轮未配置模型，入口返回MODEL_UNCONFIGURED、请求数0。发布轮用户在本机配置后，一次受限真实验证通过：2次模型请求、1次成功工具回传、8个持久化事件、最终completed。行情仍为模拟数据；不代表全部服务商或真实行情已验收。可从CMD明确发起最多两次模型请求、一次工具调用的验证：

```cmd
cd /d "D:\folio\research-trail\services\backend"
.venv\Scripts\python.exe -m research_trail.verify_live --run
```

不带`--run`仅检查配置，不发请求。该入口只读日常库/系统凭证，运行与事件保存在仓库外新临时库；没有工具调用的直接回复不算验收通过。完整清单与未验证项见 [第9步验收](docs/ACCEPTANCE-step9.md)，代码调用链见tutorial C05，练习见practice第9步。第9步按用户独立授权准备功能分支/PR交付，发布复验见EVIDENCE第25节；最终PR/合并状态以GitHub和发布回执为准，该发布轮未实施第10步；第10步模拟验收见下方。

## 材料入口

- [项目执行约定](AGENTS.md)：目录、技术栈和停止边界。
- [路线与功能对照](docs/ROADMAP.md)：25 步进度及验收标准。
- [来源与验收证据](docs/EVIDENCE.md)：来源、个人动作、实际检查与未验证事项。
- [源码学习大纲](tutorial.md)：按调用链阅读参考源码，随后映射到 Python 实现。
- [阅读引导与练习](practice.md)：课程练习和用户回答位置。
- [v0.1.0验收与亲自操作清单](docs/ACCEPTANCE-v0.1.0.md)：首版范围、检查证据、发布准备和未验证内容。

## 目录

```text
research-trail/
├─ AGENTS.md
├─ README.md
├─ .gitignore
├─ docs/
│  ├─ ROADMAP.md
│  └─ EVIDENCE.md
├─ tutorial.md
├─ practice.md
├─ package.json / bun.lock
├─ start-dev.cmd
├─ scripts/            # 构建与开发启动器
├─ tests/              # Electron 实窗自动化
├─ apps/desktop/       # main、preload、React 健康/行情/会话页
├─ services/backend/   # Python API、Store、SQLAlchemy、Alembic迁移、测试与锁文件
└─ packages/contracts/ # 生成的 openapi.json 与 generated.ts
```

参考组件的适配来源和依赖声明见 EVIDENCE.md 第8/18节及 docs/third-party。

## CMD 一条命令启动

本机需有 Bun、uv 和 Node.js 24；Python 3.12 由 uv 管理。首次同步依赖或下载 Electron 需要网络。脚本只在本项目同步锁定依赖，不修改系统执行策略。

本轮验证工具版本：Node.js 24.19.0、Bun 1.4.2、uv 0.12.8、Python 3.12.14。从源码准备依赖（普通CMD，不在已有应用运行期间操作）：

```cmd
cd /d "D:\folio\research-trail"
call bun install --frozen-lockfile
uv sync --project services\backend --frozen
call bun run prepare:desktop
```

这三步允许下载锁定依赖和Electron二进制；当前Electron包可能在首次require时才准备二进制，故提前显式检查。缺工具时先安装工具，不依赖其他项目的node_modules或虚拟环境。`start-dev.cmd`会同步依赖，然后启动；空格路径受支持。

```cmd
"D:\folio\research-trail\start-dev.cmd"
```

脚本依次执行 `bun install --frozen-lockfile`、`uv sync --project services\backend --frozen`，离线生成 OpenAPI/TypeScript 契约，然后打开 Vite + Electron；Electron 再启动本项目虚拟环境中的 Python。React 修改支持热更新，main/preload/Python 修改后关闭窗口重新运行脚本。

正常界面显示“连接就绪”和“运行正常”；点击“重新检查”会做真实健康请求。启动失败或后端退出时显示原因与“重试启动”。关闭窗口会通知 Python 退出，终端随后结束 Vite；不按进程名称结束其他项目。

依赖和Electron二进制准备完成后可离线启动：同一CMD先`set "RESEARCH_TRAIL_OFFLINE=1"`，再运行start-dev.cmd；两种安装器都使用`--offline`，缺Electron二进制在打开窗口前明确失败，不补装。恢复常规模式执行`set "RESEARCH_TRAIL_OFFLINE="`。该标志用于开发/验收，不代表安装包或操作系统网络沙箱；统一验收还会加载专用网络拦截策略。

### 手动验收（待用户完成）

1. 执行上面一条命令，确认真实桌面窗口出现并显示健康。
2. 点击“重新检查”，观察检查时间更新。
3. 关闭窗口，确认启动命令结束。故障、重试与两实例隔离已通过自动化；用户可按 practice.md 在本机复验。
4. 分别选择四只股票，确认卡片代码与图表代码相同，最后收盘等于卡片价格；所有数据带模拟标签。
5. 输入 `ZZZZ.US` 查询，确认明确错误且不保留其他股票的卡片/图表。
6. 选择有效股票，记下价格与两种时间；点击“重新查询”，确认获取时间更新，固定市场时间和价格不变。
7. 切到“会话与事件”，创建甲、乙会话，各输入不同文字并启动固定测试；切换后只显示本会话消息和运行，事件为1—7。
8. 点击“重新读取事件”两次，确认仍为七项且历史不增加；关窗再启动，确认两会话历史仍在。
9. 删除甲会话，确认乙的消息、运行和事件仍在。删除操作会移除当前会话的本地历史。
10. 新建会话，输入“查询AAPL.US行情”，点击“运行规则演示”：核对规则/模拟标签、行情卡片，以及tool_started→tool_result→回复→run_completed；再输入“查看NVDA.US的K线”，核对10根日线和回复最后收盘一致。
11. 输入“你好”，确认说明支持范围且没有工具结果卡片；输入“查询ZZZZ.US行情”，确认运行失败、UNKNOWN_SYMBOL和失败卡片，没有旧行情结果。
12. 选择旧运行、重读事件、关窗再打开，确认原结果及获取时间保持不变。fixture改价练习见practice第4步，不能改Agent价格或测试预期。
13. 第5步：选择“延迟演示”，运行查询后点击“取消运行”，确认已取消且无新成功卡片；重复读取不增加最终消息。选择“超时演示”再运行，确认TOOL_TIMEOUT和已超时。
14. 延迟运行期间删除会话，确认列表消失、另一个会话仍在；再建会话延迟运行并关窗，重新打开确认“已中断”、保留历史，不自动执行。可在输入框手动重新发起。
15. 第6步：选择已有会话和运行，刷新窗口后核对相同消息ID/条数、工具卡和获取时间；反复“重新读取事件”不会产生新回复或工具调用。再选择延迟运行，展开工具状态，核对执行中→已返回/取消/超时。
16. 延迟运行期间切到另一会话，确认另一会话无旧消息或结果；原运行可继续在Python中完成，切回后读保存结果。切页或刷新会解除旧连接，再读快照建立新连接。
17. 后端断开时核对顶层健康及事件连接提示，保存内容保留；“重试启动”后中断状态由Python恢复，不自动发起。SSE单独断流的续读由本机自动化强制关闭指定HTTP请求验证，不通过关闭后端冒充断流测试。

## 可重复的 CMD 检查

```cmd
cd /d "D:\folio\research-trail"
git status --short --branch
git symbolic-ref --short HEAD
git remote -v
call check.cmd
```

`check.cmd`与`bun run verify`是同一个完整验收入口：离线契约一致性→前端类型→pytest→临时库重复迁移→离线策略/SSE/适配→构建→真实Electron集成。失败立即返回非零，不把某一通过项当作整体验收成功。不会安装或下载依赖，不读取日常数据库；请先准备依赖。子进程环境去除模型凭证和代理，仅允许Node/Python及桌面资源的本机通信，外部TCP/DNS请求会被拦截。FakeModelProvider的确定性函数仍被测试；没有真实模型调用。

单项定位命令仍保留：`bun run check`、`bun run build`、`uv run --directory services\backend --frozen python -m pytest -q`、`bun run test:stream`、`bun run test:desktop`。普通单项命令不自动加载完整离线策略，首版以统一入口为准。

检查记录见 EVIDENCE.md和首版清单。Electron自动化会打开并关闭真实窗口，并观察DOM、画布、连接状态及进程退出；不代表用户亲自勾选或安装包验收。

干净源码复验（本机工具已安装，耗时更长）：

```cmd
cd /d "D:\folio\research-trail"
call bun run verify:clean
```

只读git文件清单，将当前源码（包含工作区中未被忽略的源码）复制到`%TEMP%\research-trail-clean-*\clean source`；不带.git、node_modules、.venv、构建输出和日常数据。随后按上面三条README命令安装锁定依赖并准备Electron二进制，再执行同一离线验收，最后从根start-dev.cmd打开真实Vite/Electron，做选股→建会话→行情→取消→关闭/重启历史检查。临时源码和隔离历史留在仓库外供核查，不修改原运行库；可自行删除已关闭的该临时目录。验证可复用本机下载缓存，不能称为无工具的干净机器安装。

GitHub Actions文件为`.github/workflows/offline-checks.yml`：Windows、只读权限、无定时任务/业务密钥；依赖准备阶段需要网络，验收阶段用同一check.cmd，仅本机通信、不调用真实模型/行情。Action引用固定SHA，工具版本与本次本机一致。[setup-bun官方说明](https://github.com/oven-sh/setup-bun)和[setup-uv官方说明](https://github.com/astral-sh/setup-uv)记录下载/安装行为，因此不把整个GitHub作业称为断网。第7步开发轮仅本地静态检查，远程CI结果单独记录在EVIDENCE第21节，不由本地通过推定远程通过。

修改 Python 契约后执行 `bun run contracts:generate`，再执行上述检查。生成器使用 TypeScript 5.9.3 编译器 API，与其 peer 约束兼容。

手动检查迁移（关闭应用后，在同一CMD执行）：

```cmd
cd /d "D:\folio\research-trail"
uv run --directory services\backend --frozen python -m alembic -c alembic.ini upgrade head
uv run --directory services\backend --frozen python -m alembic -c alembic.ini upgrade head
uv run --directory services\backend --frozen python -m alembic -c alembic.ini current
uv run --directory services\backend --frozen python -m alembic -c alembic.ini check
```

`current`应显示 `0009_skills (head)`，`check`确认模型与迁移一致。0003允许运行完成时间为空，并增加每会话唯一活动运行/每运行每角色唯一消息索引；保留旧历史及外键、序号约束。SQLite表重建只在迁移连接临时关闭外键，提交前检查完整性，再开启；业务连接仍开启外键。重复upgrade不清空历史。0003不提供自动降级；离线SQL与备份恢复未验证。

## 来源与公开边界

参考目录：`D:\folio\主分支和简历skill\folio-main`，只读。原 ZIP 记录来源 commit `ba5dcdfd31b162f5edb8b908f7f099a560389326`；它是来源标识，不等于本地解压目录有 Git 历史。

第1步为本项目新实现；第2步局部适配Folio的Watchlist、QuoteCard、FinancialKLineChart；第6步局部适配ToolActivity折叠工具时间线及耗时格式，保留逐文件来源说明。没有导入原TypeScript后端、图片、完整侧栏或Markdown/引用系统。按用户此前确认的原作者复用授权及第6步发布指令，相关局部组件适配已纳入公开范围；第7步没有新组件导入。授权事实保留在第9—11节，未独立取得授权原文，不由`skills/LICENSE`推定Folio全仓MIT。图表库klinecharts的Apache-2.0 LICENSE、NOTICE及所带许可保存在`docs/third-party/klinecharts`。详细记录见 [证据文档](docs/EVIDENCE.md)。

模型密钥、真实账户资料、运行数据库和私人日志不纳入版本控制。项目目标是研究与只读分析，计划不包含交易下单或盈利承诺。


## 第10步：数据与只读账户

官方Longbridge Python SDK（锁定5.2.0）、SDK缺口只读CLI和Massive美股REST已接入“数据与只读账户”配置/验收面板。Python管理三个独立配置、系统凭证和逐项能力状态；行情仅内存缓存，账户数据不落库。默认模拟，真实失败显示固定错误码，不回退模拟；现有Agent工具仍使用Fixture。

本轮用户选择先模拟：完整Python225、Node8、真实Electron15通过，真实Longbridge/Massive查询未执行。入口、少量真实查询命令与缺口见 [第10步验收](docs/ACCEPTANCE-step10.md)，固定Folio版本与24条目/参数边界见 [能力覆盖表](docs/PROVIDER-COVERAGE-step10.md)。该第10步交付当时没有下单、交易或完整市场工作台；第11步工作台见下方。第10步按用户独立授权通过 [PR #9](https://github.com/ydflow/research-trail/pull/9)交付；发布轮完整检查及干净源码锁定安装/根CMD启动、重启历史复验通过，见EVIDENCE第27节。最终PR、远程CI与合并状态以GitHub及发布回执为准。

## 第11步：证券工作台

“证券工作台”逐页适配Folio的自选、概览、行情、K线、财务报表、新闻和市场状态。页面→命名preload→main→Python SecurityWorkspace→ProviderService→严格展示DTO；没有TypeScript行情业务内核。Python/SQLite保存最多20只自选及当前股票，0007迁移保留会话和配置；请求上下文与revision防止迟到数据写入其他股票。

默认模拟，真实查询需显式点击；各块显示提供商、SDK/CLI/HTTP或模拟来源、缓存、时效依据、市场/获取/服务时间。缺失显示“—”，0保持0；新闻保留原始合法HTTP(S)链接，点击由main打开。Massive未覆盖财报/新闻/状态如实显示不支持，真实失败不替换模拟数据。模拟K线和财报是固定日线/年度样例，不证明其他周期真实可用。

2026-10-06本机完整check.cmd通过：Python254、Node8、真实Electron19；七视图各成功/缺失/失败21例均在API和窗口验证，另有重启持久化、股票切换/迟到响应、来源切换与真实未配置检查。第11步开发轮无真实数据或模型请求、未提交/发布；当时第12—24步未开始，当前第12步另见前述清单。入口、操作和缺口见[第11步验收](docs/ACCEPTANCE-step11.md)，来源/轮次见EVIDENCE第28节，课程/练习保留待用户填写。

第11步发布轮完整检查及干净源码锁定安装/根CMD启动、重启历史复验通过，见EVIDENCE第29节。按本轮独立授权通过[PR #10](https://github.com/ydflow/research-trail/pull/10)交付，最终CI/合并状态以GitHub和发布回执为准；开发轮未提交记录保留为历史。
