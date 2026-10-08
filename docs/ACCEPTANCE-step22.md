# 第22步：Python本地评测与显式外部追踪

日期：2026-10-08（Asia/Shanghai）。开发基线main `a0bd31cfd22ffef080cde63f5e2b96117aa8a096`。
本轮仅执行第22步；不提交、推送或发布，不实施第23/24步。最终检查回执补在本文件末尾。

## 已实现行为

- `EvaluationPanel`经18个命名桥及鉴权API进入Python `EvaluationService`。案例、实验、基线、反馈、追踪配置和投递记录由同一SQLite管理，迁移头`0017_evaluation`新增五表；前端只保留显示缓存及编辑草稿。
- 12个研迹原创案例：正常quote-aapl/kline-nvda；错误unknown-symbol/invalid-args/unknown-tool/model-shape/tool-budget/provider-error；恢复restart-interrupted/replay-no-tools；回归quote-msft/minimal-redaction。所有案例标记`research-trail`，上游只作概念参考，没有复制上游案例、分数或测试历史。来源见[SOURCES-step22.json](SOURCES-step22.json)。
- 工具案例实际调用原`AgentRunner`、`ToolRegistry`和固定行情夹具；假模型/故意错误探针不发LLM请求。恢复案例在独立临时库调用原`Store`的中断恢复和事件重放，不能污染用户会话、研究或提醒。固定市场/获取时刻为2024-01-16T21:00:00Z；工具call_id规范化，轨迹保留实际事件序号、工具名、结果和终态。
- 创建只产生`not_run`，显式执行才开始。案例/实验区分未执行、运行中、取消、运行错误、质量不达标和通过；预期错误案例可能断言通过，但实际运行仍为failed及原错误码。详情同时显示这两项，不能把正确拒绝非法工具称为工具成功。
- 通过/质量不达标须有对应有效断言，分别为1/0分；未执行、取消或运行错误的分数为空。含任何无效案例的实验没有总分、基线变化或回归分数；故意错误候选可产生真实失败断言及有效低分。分数只表示本套工程断言通过率，不是投资收益、模型综合质量或研究正确率。
- 一个活动执行事务受SQLite唯一约束，重复开始不重执行；UUID重放同请求，不同内容冲突。取消丢弃迟到结果；运行中崩溃后记运行错误，保留已完成结果和未执行项，不自动补跑。历史列表最多100、实验最多500，详情按需读取。
- 基线仅从全部通过的有效实验保存，不可变；冻结案例、评估器、固定夹具及相关实现代码hash，同套才比较差值与退化案例。案例选择顺序规范化；旧结果不会因代码或案例更新被重新评分。未执行实验遇实现变化拒绝开始，必须新建，不能用旧hash包装新执行。人工反馈追加保留身份/时间/理由，不能改写自动分数。

## 外部追踪与隐私

- LangSmith和Langfuse配置默认关闭、凭证未配置。评测、保存配置及生成预览不会联网。真实连接检查与上传是分别显式执行的操作；CI的`RESEARCH_TRAIL_OFFLINE=1`在HTTP前拒绝真实调用，只允许测试注入的`httpx.MockTransport`协议桩。
- 使用当前官方[LangSmith REST追踪](https://docs.langchain.com/langsmith/trace-with-api)的`POST /runs`及[Langfuse OTLP JSON](https://langfuse.com/docs/observability/get-started)的`POST /api/public/otel/v1/traces`。上游Langfuse v3 ingestion只作为历史参考；[官方公共API说明](https://langfuse.com/docs/api-and-data-platform/features/public-api)已宣布旧ingestion弃用，研迹不新增旧协议。
- 一次上传是一个离线实验根run/span，含安全案例状态和工具轨迹摘要；不是全部原始工具child span、完整生产追踪或模型成本/延迟评测。连接探针分别查询LangSmith sessions和Langfuse projects；探针、HTTP回执与控制台呈现分开记录。
- 白名单重建载荷：固定案例身份、状态/错误码/环节、工具名及有界序号/次数、断言身份/布尔、工程分数（只限有效结果）、suite hash；不上传实验/基线名称、提示、回答、工具参数/结果、人工反馈、账户/持仓及秘密。界面预览显示配置版本与SHA256；配置改变使旧预览失效。
- 凭证仅Windows系统凭证管理器保存，SQLite只有引用，失败无明文降级；不读环境密钥或借用模型密钥。地址限定HTTPS源站或HTTP本机，不带路径、账户、查询或fragment；禁止HTTP远程、重定向，5秒期限及64KB请求/响应上限，禁用环境代理。
- 用户明确确认布尔`true`和当前预览digest才可上传。先持久化领取，按平台/实验/配置版本/digest唯一；重复UUID或重复内容只回读原收据。断线或崩溃记uncertain，不自动重试，可能漏传；不承诺跨SQLite/网络的恰好一次交付。远程接受回执只证明协议接收，不能证明分析质量或控制台呈现。
- 本轮没有真实追踪凭证，真实LangSmith/Langfuse连接、上传和控制台验证均**未执行**。Mock协议测试不能代替真实验收。此功能没有后台SDK、定时付费评测或隐式模型调用。

## 复验与操作

依赖已按README准备后，在CMD执行：

```bat
cd /d D:\folio\research-trail
check.cmd
bun run verify:clean
set RESEARCH_TRAIL_OFFLINE=1
uv run --project services/backend --no-sync python -m research_trail.verify_evaluations
start-dev.cmd
```

打开“评测中心”，默认12案例 → 创建未执行实验（无分）→ 执行离线实验（12通过）→ 保存基线。
切“故意回答错误价格”创建并执行，比较原基线，应看到质量不达标、负差值及退化案例。
切“故意使提供商失败”应看到运行错误及无有效分数；创建后立即取消也无分。
展开unknown-symbol确认原UNKNOWN_SYMBOL、tool-result及实际事件定位；人工反馈不会改分。
关闭重启检查历史、基线和反馈没有消失，也没有新增研究或上传。
展开外部追踪只生成本地脱敏预览；检查名称、回复、反馈等未出现。真实连接应另轮在本机配置凭证并逐项人工验证。

CI沿用现有Windows离线门禁，在全量pytest之后额外执行原创案例CLI，临时数据库在Temp，模型请求/外部上传均0。
用户亲自操作记录、学习题答案、真实服务、长期压力、独立Windows及安装包均未验证；不把源码构建当安装包交付。

初次类型检查发现新增Comparison与旧analytics契约同名，已改为EvaluationComparison并重新生成；初次实窗脚本错写事件名并发现下拉框可访问名称不清楚，已按实际tool_result修正测试及页面；新增迁移测试初次误用旧表cursor列及Store.list_sessions，按真实state列及Store.sessions修正。首轮完整失败/迁移诊断日志留Temp，其余初次失败见本会话工具回执，最终以复验回执为准。

## 最终自动验收回执

- 定向：`test_evaluation.py` **46通过**；新增实际Electron窗口 **2通过**。补充严格布尔确认、原0016会话/规则/游标升级保留、脱敏非法序号、系统凭证失败和外部删除、超时/部分拒收/重启领取、旧未执行实验实现hash变化拒绝开始。
- 本机完整`check.cmd`：**622 Python / 12 Node / 52实际Electron通过**；最新跨版本保护另获46项定向复验。原有契约paths/schemas语义不变，类型、构建、0017重复upgrade/current/check全通过。
- 最终独立`verify:clean`：导出283份源码，无Git/依赖/构建/运行库，按锁文件重新安装；**623 Python / 12 Node / 52实际Electron通过**，包含新增跨版本回归，0失败/取消/跳过。12原创案例CLI均通过，valid/1分、模型请求0/外部上传0。
- 实际根CMD：证券→会话→quote→取消→关闭/重启→历史快照完全一致，未新增运行，所属进程均退出。干净目录：`C:\Users\38905\AppData\Local\Temp\research-trail-clean-jjdhjR\clean source`；CMD证据：`C:\Users\38905\AppData\Local\Temp\research-trail-cmd-qa-g2qPRo`。
- 视觉：Playwright操作实际Electron，已查看宽窗口、600px紧凑窗口、案例轨迹/反馈和追踪面板截图；独立入口截图确认12案例与0页面异常、无横向溢出。截图仅Temp，不纳入Git。
- 源码审计：283份UTF-8、七参考SHA256、30原技能/许可、八忽略探针、新增文档本地链接、旧API契约均通过。244份运行/测试/配置/技能文件逐字节等于最终验收副本；不含密钥、账户、运行数据库、日志、缓存、构建及截图。秘密格式扫描0命中不等同于全世界所有凭证检测。
- 既有TestClient弃用与Vite主chunk 505.83KB提示保留；没有新增依赖，未以此制造无关修复。

日志位于`C:\Users\38905\AppData\Local\Temp`：`research-trail-step22-python-targeted.log`、`research-trail-step22-desktop-targeted.log`、`research-trail-step22-full.log`、`research-trail-step22-clean.log`及`research-trail-step22-source-audit.json`。初次完整失败保留`research-trail-step22-full-first-failure.log`。
真实LangSmith/Langfuse、控制台呈现、真实LLM质量和真实数据未验证；本步没有Git提交/推送/PR/远程CI，开发基线HEAD不变，index为空。第22步自动验收交付完成，已停止，第23/24步未实施。

## 独立发布轮复核

本轮另获第22步发布授权，开发验收历史保留。现场账号ydflow、目标研迹既有公开仓库及origin/默认main核对一致，原授权/来源保留。实际38文件按来源、Python新实现、旧迁移测试修复、桌面和文档分别提交。
当前244份运行/测试/配置/技能文件逐字节等于最终独立验收副本，复用623/12/52和根CMD重启证据；本轮不改运行代码或依赖。283源码、7参考SHA、30原资源、8忽略探针、旧契约与文档链接通过；仅只读检查1个应用系统凭据目标，秘密原文源码匹配0。
远程CI、PR与合并按实际回执，发布过程见EVIDENCE第51节；真实服务缺口不因源码发布而消失。不打标签/Release，不实施下一步。

已创建[第22步PR #21](https://github.com/ydflow/research-trail/pull/21)，初始head a53aba58adcd1db719a9b1ffe35522b01d06d574。最终CI/合并与本地main同步见PR及根PROJECT_STATE；不得以本地通过预先称远程通过。


发布CI修复：push 37766332829通过，PR 37766338266在既有Step17中断测试失败（51 Electron通过/1失败），未合并。已将CIM查询移到15秒采集窗口前，杀进程前断言fetching/3成功；注入16秒延迟旧测试复现、修复后1通过。业务代码及断言超时不变，新的完整干净验收单独记录，初始244文件与旧副本一致不再代表修复后的测试。详情见EVIDENCE第51节。


合并后main CI 37770288708失败（623 Python/12 Node通过，Electron 50通过/2失败），已合并PR #21的通过不代替该结果。第22步补修分支fix/step-22-publication-ci仅同步既有取消测试的实际夹具/物理退出预算，及行情测试的后端就绪等待；不改业务、不实现下一步。补修验证与PR/main CI按EVIDENCE第51节和根PROJECT_STATE实际回执记录。

补修延迟复现：启动额外6秒、研究响应额外4秒，旧测试2失败，补修后同一延迟2项实际Electron通过（0失败/取消/跳过）。完整新验收与补修CI待实际结果。


补修PR22首head的PR CI通过，push CI在第22步实验仍running时的5秒终态断言失败（51 Electron通过/1失败），未合并。同一PR增加Python实验终态等待helper，3秒×案例数+25秒沙盒/IPC测试预算，错误终态立即失败，UI仍5秒；真实SQLite恢复案例各延迟4秒，旧测试2失败、新测试同一延迟2通过。新增tests/backend-ready.cjs后补修4文件、全步39文件；业务与评测结果未改，新完整验收另行记录。
