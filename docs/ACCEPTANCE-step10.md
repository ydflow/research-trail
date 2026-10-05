# 第10步验收与本机配置

本轮用户确认“尚未配置，先完成模拟验收”。本步不发送真实Longbridge/Massive查询，凭证不进聊天。能力与范围见 [覆盖表](PROVIDER-COVERAGE-step10.md)，证据见 [EVIDENCE第26节](EVIDENCE.md)。

## Windows CMD

```bat
cd /d "D:\folio\research-trail"
call check.cmd
call start-dev.cmd
```

打开“数据与只读账户”。选择Longbridge行情、Longbridge只读账户或Massive；默认模拟查询。选择能力后点击“验证模拟查询”：成功结果必须写“模拟数据”，仅该条目变“模拟通过”，其他条目仍未验证。真实模式在未保存配置/缺凭证时分别显示PROVIDER_UNCONFIGURED/CREDENTIAL_MISSING，不出现模拟成功。

## 将来由你在本机配置

1. 同一面板选择提供商，设置区域、超时与行情缓存，先“保存提供商配置”。默认时效未知，避免无证据声明实时。
2. Longbridge输入App Key、App Secret、Access Token；Massive输入API Key，点击“保存提供商凭证”。全部密码框立即清空，返回仅说明已保存，不回显原文。行情与账户三项分别保存；删除凭证后真实SDK查询必须失败。
3. SDK账户仅开放positions/assets/cashFlow。账户身份/完整组合与SDK缺的日历/报告参数可选CLI；需要你已有本机CLI登录及绝对路径，使用CLI自己的认证存储。研迹不执行安装、登录或交易。此时不要把CLI登录状态当作SDK三项凭证已保存。
4. 少量真实验收：先选择一个提供商，在面板切换“真实查询”，AAPL.US、market.quote或account.positions，执行一次。它只验证该能力。账户数据在本页查看，不复制到公开证据/聊天；不发送模型请求。

也可使用只读日常配置的命令入口。以下三条只检查配置，外部查询预算为0：

```bat
uv run --directory services/backend --frozen python -m research_trail.verify_data --provider longbridge
uv run --directory services/backend --frozen python -m research_trail.verify_data --provider longbridge-account
uv run --directory services/backend --frozen python -m research_trail.verify_data --provider massive
```

配置后只选需要的一条加 `--run`（每条一次只读业务查询；SDK初始化可能还有供应商握手）：

```bat
uv run --directory services/backend --frozen python -m research_trail.verify_data --provider longbridge --run
```

替换provider即可验证Massive行情或Longbridge账户positions；此入口不运行CLI、不缓存、不写日常库，不输出价格、持仓、账户ID或密钥，仅打印passed/failed/restricted/not_executed、固定错误码和查询启动数。passed不能证明其他功能或实时授权。

## 本轮结果

- 新增95项Python离线契约与生命周期检查通过：24能力模拟、19 SDK映射、CLI参数/真实基线响应形状、Massive3能力假HTTP、错误/超时/取消/进程树清理、独立健康、配置与凭证隔离、缓存失效、只读验证入口。
- 完整统一检查最终结果记录在EVIDENCE第26节；没有把早期失败或针对性测试当作全项目通过。
- Electron新增流程通过：默认模拟/未知状态 → 模拟成功 → 未配置真实失败 → 保存配置/缺凭证 → 占位凭证保存清空/删除 → 账户模拟持仓 → Massive模拟；1100×800与600×680，无页面错误/横向溢出。截图只在仓库外临时目录。
- 本机三个配置检查均not_executed/PROVIDER_UNCONFIGURED/queries_started=0。未配置不是权限受限；权限错误只在假HTTP/SDK错误映射里验证，真实权限仍未知。
- 未验证：全部真实供应商查询/数据/权限/限流/错误，外部CLI版本兼容/OAuth内部存储与续期，完整分页/批量参数、真实SDK握手阻塞；安装包、其他OS、干净无工具机器、长期负载、用户亲自操作和练习。开发轮未提交/上传；独立发布复验见下方，不实施下一步。

## 独立发布复验（2026-10-05）

用户另行授权只发布已验收第10步。本轮check.cmd重新执行，完整Python225/Node8/真实Electron15全部通过、无跳过；契约/类型/构建、0006重复迁移/current/check通过。干净源码120份文本在仓库外锁定新装71个前端包与29个Python包，同一完整检查再次通过；根目录CMD实窗选股、会话、查询、取消、关闭/重启历史通过，快照一致、无新运行、所属进程退出。下载可利用本机缓存，不代表空缓存或无工具机器验证。

所有业务验收仍为假响应/本机通信，未使用模型Key或发送真实Longbridge/Massive/账户请求。上方真实能力缺口保持。公开候选无密钥、账户、数据库、日志、缓存、截图或依赖二进制；上游出处与声明保留。PR、最终head远程CI及普通合并结果见EVIDENCE第27节与最终发布回执，不能由本机通过推定远程通过。
