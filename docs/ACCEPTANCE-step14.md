# 第14步：统一能力注册与技能目录验收

仅第14步；从main 3198f106edaf81c19a93084e805e3c9888dabd85干净工作区开始。
模拟/本机自动验收通过；最终check.cmd退出0，Python370/Node8/真实Electron28，无跳过，完整证据见EVIDENCE第34节。
没有真实模型/行情/账户请求，不提交、推送或发布；第15—24步未开始。

## 实现与同源状态

Python CapabilityRegistry是工具/数据能力入口。ToolRegistry只适配模型协议和执行校验；
ProviderService原health和配置revision仍是唯一查询健康记录；SkillCatalog每次读取
同registry.state计算就绪，没有另一份ready缓存或持久健康副本。
四个原只读工具及21种数据能力ID形成23个注册ID；24个提供商覆盖条目保留。
页面读取/capabilities与/skills，模型暴露和decode/execute按同注册表校验。
工具handler仅在后端注册；没有新增交易工具。

可用表示已实现并可按当前模式调用，不保证证券、字段、时点和结果完整。
模拟模式明确SIMULATED_ONLY；真实数据需当前配置revision成功请求证据，
未配置、缺凭证、停用、未验证或受限均不可用。Python风险/对比计算能力本身
是PYTHON_COMPUTATION，不证明输入行情齐全；原market.quote/kline工具仍仅模拟。
真实查询失败不会改用模拟数据。已有ProviderPanel的查询入口用于显式验证，
仍可主动执行一次未验证的只读请求以获得失败/权限证据；技能就绪不靠该按钮猜测。

禁用技能不会禁用被其他页面/工具共享的数据能力。第8步技能连接卡的假测试
只保留历史配置语义，新增说明；不参与技能目录的启用或就绪判定。

## 技能资料与安全

首批保留Folio固定ba5dcdfd31b162f5edb8b908f7f099a560389326：
skills/longbridge-technical、skills/longbridge-market-data的29份Markdown及skills/LICENSE，
全部保持原字节。依赖映射来自packages/skill-hub/src/capability-map.ts，
放入skills/catalog.json；逐文件来源/SHA256见[SOURCES-step14](SOURCES-step14.json)。
原许可/声明保留，局部许可不扩展为全仓MIT；原作者授权记录仍见第9—11节。
Python新实现参考registry/readiness与SkillHub路径检查设计，没有引入TS业务内核。

自定义SKILL.md支持安全的小型frontmatter子集（见[技能目录说明](../skills/README.md)），
不使用可执行YAML、不运行脚本/CLI/链接。名字必须等于目录名，缺少声明依赖为invalid。
必要依赖缺失unavailable，可选缺失partial，未知能力NOT_IMPLEMENTED；
缺必要参考文件unavailable/RESOURCE_MISSING；上游可选参考断链partial/OPTIONAL_RESOURCE_MISSING，禁用disabled，解析或输入无效invalid。
首批technical在模拟/Longbridge声明能力齐全，但因3个上游可选参考断链为partial；market-data有7项未实现可选能力和1个上游可选参考断链，也是partial。
“就绪”不证明RSI/MACD/形态分析或任何研究策略已经实现。

最多64个技能、每技能40项必要/可选依赖及80份参考路径；文本UTF-8且最多64KiB。
扫描只读SKILL.md并检查参考文件存在，参考正文仅显式请求时读取。
资料必须在SKILL正文或随包受审catalog声明中；拒绝绝对路径、../、反斜杠、ADS、空路径段、尾部点/空格，
拒绝链接/Windows reparse与目录联接，并检查打开后Windows文件句柄的实际路径。
每次读取重新检查启用、依赖与路径；不存在/无权限/非法UTF-8/过大均返回安全固定码。
不存在任意文件选择或任意后端URL桥；新增四项命名操作，桥共56项。

启用偏好只存本机忽略SQLite的skill_preferences；迁移0009_skills，保留既有历史。
外部手动修改文件不具备跨进程原子事务，本机有权限用户仍可更换受信任目录；
未声称抵抗本机管理员攻击或所有并发文件修改。

## Agent与页面

显式“技能 ID 状态”“能力 namespace.name 状态”“读取技能 ID path”由Python
直接回答，不消耗模型。使用“真实状态”或“读取真实技能”检查真实依赖。
不可用或禁用资料拒绝读取；直接请求使用不可用技能也返回固定不可用说明。
普通模型请求收到当前声明状态和只读工具约束；没有声称任意模型自由文本绝无幻觉。
资料作为引用文本展示，不把原技能指令提升为系统权限或真实能力证明。
Agent直接资料回答最多展示3400字符并注明截断；完整文本可在技能页读取。
资料回答随现有会话写本机运行库，不进入诊断/Git；默认不发给真实模型。

SkillsPanel按需加载并通过同源返回值显示必要/可选依赖、缺文件、来源及模式。
上下文改变/禁用会清除旧文本，generation拒绝迟到响应覆盖新视图。
原技能的营销/业务描述收在“原技能说明”，明确不代表研迹已实现。

## 本机操作

```cmd
cd /d "D:\folio\research-trail"
call start-dev.cmd
```

1. “能力与技能”默认模拟/Longbridge，检查两技能部分就绪，technical声明能力齐全但缺可选资料，market-data另缺可选能力。
2. technical“参考资料与来源”读取references/technical.md；禁用后资料清除且按钮不可用。
3. 假模型会话输入“技能 longbridge-technical 状态”；应显示disabled/SKILL_DISABLED。
4. 关闭重启后禁用仍保留；再启用，切换真实模式，未配置应unavailable。
5. 模拟/Massive下market-data必要依赖不足应unavailable；不配置凭证，不发真实请求。

```cmd
cd /d "D:\folio\research-trail"
call check.cmd
```

可撤销练习和三题见[practice C09](../practice.md)，实际调用链见[tutorial C09](../tutorial.md)。
用户亲自操作/学习记录：待填写。

## 验证边界

开发验收Python370（第14步新增30）/Node8/实际Electron28（新增2）通过，证据Temp/research-trail-step14-acceptance.log及迁移目录research-trail-verify-YMwwLw。独立发布审查修复列表缩进/空行漏读依赖及直接状态回复过长；新增5项回归先复现失败，35项技能测试全部通过。修复后完整check.cmd为Python375/Node8/实际Electron28，通过且无跳过；契约/类型/构建及0009重复迁移/模型一致性通过。发布复验日志Temp/research-trail-step14-publication-check.log，迁移目录research-trail-verify-Rg6LSp。保留既有TestClient弃用与Vite主chunk提示。
缺文件真实服务端拒绝在Python临时目录验证；桌面缺文件显示分支使用注入IPC响应，
迟到资料测试使用有界延迟IPC。未将页面注入称作真实提供商证据。
真实权限/数据/模型风险对比、任意自定义技能质量、指标执行、长期负载、其他OS、
干净机器和安装包仍未验证；源码新装与远程CI/发布证据以EVIDENCE第35节和最终GitHub/发布回执为准，本步未自动执行下一步。

四个上游可选资料断链按原始文件路径与目标列于SOURCES-step14.json；上游固定资料本身缺失，未伪造补文件或改原文。目录就绪显示partial/OPTIONAL_RESOURCE_MISSING，缺失按钮禁用，直接读取仍RESOURCE_MISSING。

发布前隔离源码新装verify:clean通过：新建71项前端/29项Python依赖与Electron准备，重复完整375/8/28及迁移验收；实际根CMD开窗、取消、重启/历史恢复快照一致，无新增运行，自有进程退出。导出Temp/research-trail-clean-7jLQoa/clean source，日志research-trail-step14-publication-clean.log，CMD证据research-trail-cmd-qa-ykjoEE；141份运行文件与导出原字节一致。仅依赖准备允许联网，业务验证离线；不是另一台干净机器或安装包验证。全量来源审查保留10处上游原有行尾空格并登记，自写/适配文件及未登记空格检查通过。
