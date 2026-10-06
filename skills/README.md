# 第14步技能资料

首批只读引入两个目录：longbridge-technical、longbridge-market-data。
上游为 https://github.com/helsome/folio ，固定提交
ba5dcdfd31b162f5edb8b908f7f099a560389326。

SKILL.md和references中的Markdown按原字节保留；许可原文见LICENSE。
逐文件路径和SHA256见[来源清单](../docs/SOURCES-step14.json)。
catalog.json的必要/可选能力来自该版本
packages/skill-hub/src/capability-map.ts；这是Python目录的声明输入，
不是另一套运行健康状态。注册及就绪判定由后端完成。

这些原资料含CLI、交易信号、指标或外部服务说明。研迹只读文本，
不执行其中的脚本、命令或链接。原说明不代表这些业务已实现。
模拟依赖就绪不证明真实权限、数据完整度、指标计算或策略成绩。
market-data的7项可选能力未实现，因此显示部分就绪。
真实模式必须逐项有当前配置版本的真实请求证据；未配置/未验证不就绪。

自定义目录采用一个小型frontmatter子集：name必须等于目录名；
description支持单行、|或>；required-capabilities、optional-capabilities
支持方括号数组或两个空格缩进的“-”列表，列表中可有空行；不支持的缩进或空列表块返回invalid，空依赖必须明确写[]。没有声明依赖时不就绪。
参考资料只能是SKILL.md正文或随包catalog声明的references/*.md文本；
目录扫描不读取参考正文，读取时限制64KiB、UTF-8并拒绝越界/链接/联接。
catalog.json只为这两个未改动上游技能提供依赖映射。

上游技能局部许可不扩展为Folio整仓MIT；原作者授权确认和未独立持有
授权原文的边界仍以docs/EVIDENCE.md第9—11节为准。

来源审查还发现4个上游断链（1个行情可选资料、3个Elliott Wave可选资料），其相对路径保留，catalog声明为optional-resources。两技能因此均为partial；缺失资料不能读取。它们是上游原文缺口，不是补齐的方法或已实现能力。明细见SOURCES-step14.json的inherited_missing_links。
