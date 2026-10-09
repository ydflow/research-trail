# 第24步：功能核对与 Windows 内部安装候选

2026-10-09（Asia/Shanghai），起点 main `8c0e807f4a7af1d6ff0f156008b4874ca08047da`。仅本步开发/本机打包验收，没有 add/commit/push/PR/标签/Release。状态：**代码完成/待验收**；完整固定基线和干净 Windows 门槛仍未满足。最终构建/回归/截图/SHA 回执在末尾按真实结果追加。

## 实现与调用链

`package-windows.cmd` → uv锁定 packaging组/Bun锁定 → main/preload + Vite前端 → `package-backend.py` → PyInstaller onedir（永久 UTF8/unbuffered）→ `package-windows.mjs` → Electron Builder NSIS按用户安装；只复制明确构建产物/技能/来源，不复制整仓。

`ResearchTrail.exe` → packagedLaunch(resourcesPath,userData) → `resources/backend/research-trail-backend.exe` → frozen_entry server → 令牌/loopback → Alembic/resources → 用户目录 SQLite → 白名单 IPC → renderer。SDK工作使用同一冻结exe的 `--provider-worker` 入口、JSON stdin和所属Windows Job，不二次启动服务器。评测实施hash十份原源码随包提供；原技能/许可字节不改。

修复安装版开发环境依赖、冻结SDK入口、资源遗漏及默认安装目录存库问题。完整参考核对及未实现项见 FEATURE-AUDIT-step24.md；来源见 SOURCES-step24.json；内部发布说明见 RELEASE-NOTES-step24.md；用户数据规则见 WINDOWS-INSTALL.md。

## 分层验收

| 项目 | 验证方式与边界 |
| --- | --- |
| 功能实现 | 固定README各细项逐项映射页面/接口/后端；未实现、不同设计、部分覆盖明确保留 |
| 模拟/协议 | 原创固定行情/假模型，原672项Python基线增加2项冻结路径/worker回归；Node安装启动环境过滤回归 |
| 本机源代码 | 原有完整 offline verify：契约/类型/构建、Python、原创评测/结果CLI、迁移、Node与实际Electron；最终数量按日志 |
| 本机安装 | `tests/windows-package.cjs`实际调用NSIS安装器，Temp有空格路径、独立自定义数据目录，不覆盖既有安装 |
| 无开发工具PATH | 安装后只保留Windows System32 PATH，cwd为仓库外Temp，故意无效Python/Vite/DB/历史夹具环境变量；安装版照常健康并使用实际打包exe。开发机证据，**不是干净OS** |
| 包内资源 | 冻结backend bundle-check实际import Longbridge原生模块、SQLite、TLS、时区；两技能/引用资源、评测源码、Alembic迁移；无凭证worker明确CREDENTIAL_MISSING且不联网 |
| 页面/操作 | 15导航、来源技能回读、模拟会话→采集→固定报告、四类别离线评测，实际实窗宽屏/620px截图；页面身份/非白屏/无overlay/console及交互状态 |
| 退出清理 | 正常close及仅终止本次主进程后，所属打包后端/直接桌面子进程消失；未按进程名称杀其他程序 |
| 重启保存/不重执行 | 精确会话快照一致，研究/评测/结果记录各1，没有额外触发或模型调用 |
| 数据库升级 | Temp原创0017库一会话，安装版冻结后端升级0018，保留会话、外键检查空；不接触个人旧库 |
| 卸载/重装 | 实际silent卸载去除应用，独立自定义数据库SHA保持一致；实际重装读回相同历史，最终再次卸载；用户默认目录和Windows凭证保留政策说明 |
| 真实服务/权限 | 本步真实请求0，未配置/未执行；不能记为供应商实际拒绝权限。历史LLM有限结构证据不扩大成本包真实验证 |
| 干净Windows | 当前Win11 Home中文64位10.0.26100；无WindowsSandbox.exe/已配置VM工具或服务，**待验证** |
| 正式发布 | 未签名/默认图标；完整功能、真实服务、独立安装与SDK/native许可缺口见发布说明；本步不上传Release |

## CMD 可复现命令

```bat
cd /d D:\folio\research-trail
check.cmd
package-windows.cmd
node tests\windows-package.cjs
certutil -hashfile release\windows-internal\ResearchTrail-1.0.0-internal.24-windows-x64-setup.exe SHA256
```

打包的依赖准备允许下载锁定依赖/Electron Builder工具，不执行真实模型/供应商任务。CI仍只运行确定性离线检查，安装器测试不接入CI、不开付费定时评测。安装脚本发现同名既有ResearchTrail注册时停止避免覆盖。需在干净机器另执行下列人工门槛：无Python/Node/Bun/uv/仓库，校验SHA→安装GUI→断网首次启动→读取技能/固定研究→退出检查→重启→旧库备份升级→卸载选择/数据保留→重装历史；记录环境/时间/实际结果，不预填通过。

## 中间失败与修复记录

- 首次新增Python测试从仓库根运行无法import，改在services/backend执行后2通过；不当作产品失败，也不隐去首次结果。
- 构建探索时Electron先于Python完成，Builder告警缺后端仍生成过不完整产物；随后新增打包入口前置存在检查，重新构建完整后端/安装器。早期 SHA 作废，不交付为成功。
- 包内安全扫描第一次把certifi公共根证书cacert.pem视为个人密钥；核对实际唯一命中后仅允许该明确路径，其余.pem/.key仍拒绝。保留来源，未豁免任意证书/私钥。
- 原Vite单块超过500KB提示和httpx弃用提示未伪装修复；签名/图标、第三方许可证、独立干净环境是明确未完成项。
- 补充截图流程第一次把尚未执行的结果预期为pending，实际UI正确为not_run；测试改为先断言not_run，再点击评估，观察WINDOW_NOT_DUE/pending，无虚假价格/分数。失败回执保留Temp `research-trail package QA-RvsIAM`，其已知测试安装由精确路径卸载，未删数据。安装注册名实际带版本，预检查改匹配ResearchTrail名称前缀，最终卸载明确复查注册为空。
- 实际PYZ图发现可选packaging/setuptools/Pygments/_pytest，补齐依赖闭包声明；nested vendor dist-info 的同名许可保存完整相对路径，避免覆盖。仅许可材料改变时重新构建并安装验收，之前成功的SHA保留为中间记录，不作为最终包。

## 最终回执

最终候选 `ResearchTrail-1.0.0-internal.24-windows-x64-setup.exe`，141217842字节（约134.7MiB），SHA256：

```text
411e40108ff280e9182ebfc9898df0809d4ffe2e459aa6b8cb153e7380c4fb92
```

完整本机离线回归674 Python/12 Node/55实际Electron全部通过（失败/取消/跳过0），12原创工程案例CLI和两库原创历史CLI、0018重复迁移/模型检查、OpenAPI/TypeScript/前端构建通过。之后新增安装环境测试并合跑13 Node通过；最后生产通知标识/二次启动聚焦改动后类型/构建及3项实际窗口/缺Python/异常退出回归通过。本步没有远程CI或发布，root完整离线日志`verify-step24.log`，单独Node及桌面生命周期日志明确保留，不把它们当新增55项。

实际根CMD package-windows.cmd成功（锁定依赖准备允许下载）；最后只补许可证后的Builder重新生成最终SHA。最终安装验收 `package-qa-step24-delivery.log`通过14阶段，仓库外回执 `%TEMP%\research-trail package QA-eujNZ5\acceptance.json`与该SHA相同：首次NSIS安装、冻结bundle-check、SDK入口缺凭证拒绝、同数据目录单实例、15导航、技能/会话/采集/报告/四类别离线评测、实窗宽/620px/未执行→未到窗口/截图、正常退出、精确重启不重复、异常退出、原创0017升级、卸载保留hash、重装/最终卸载/注册空、页面与console错误0/警告0。主程序和所属后端无残留。原固定行情2024时点早于当前研究，所以入场显示ENTRY_STALE/—，概率为null；未到窗口不产生评价，未伪造当前真实报价。

首次成功包SHA f6c29605…和后续242a62a3…只为中间构建/许可补齐前回执；最终交付仅上方411e4010…，不将不同文件的成功串成同一包证据。SHA只识别此文件，不声称每次构建PE/NSIS字节确定性；投资/工程离线计算可复现另有固定案例。

交付源码312份、包内1151文件、8忽略探针、30原技能/许可、10评测hash源码、当前来源/依赖声明以及公开certifi CA字节审核通过；Python声明与实际模块图的31项闭包+2打包工具清单，wheel许可缺失仅Longbridge（官方两份原文本已保留但exact分发未核实）。检查为UTF8/签名/路径和字节审核，不承诺覆盖任何可能秘密或所有native许可证。

所有交付材料在`release/windows-internal`：安装器、SHA256SUMS、bundle-manifest、delivery-audit、materials内完整验收/功能核对/来源/发布说明/日志及原创模拟截图。包内来源与许可在安装resources/notices，真实个人DB/账户/凭证不在包；QA库留Temp，不随材料复制。

状态最终**代码完成/待验收**，干净Windows/签名/完整基线/真实服务/许可补核缺口见RELEASE-NOTES-step24，不声称完整v1.0.0。HEAD仍8c0e807，暂存为空，差异仅本步，完成后停止，不实施下一步或上传。

## 后续独立源码发布边界（2026-10-09）

用户随后单独授权本步骤提交/功能分支/PR。发布前32份差异、312份源码与上方内部候选交付清单逐字节一致，重新资源/来源/秘密签名及私有文件排除审核、契约/类型检查通过；只追加发布记录，不改变运行代码。按EVIDENCE第55节分组提交源码并创建草稿PR，不上传安装器、日志、运行数据库、账户或截图。上方未提交状态保留为开发交付时事实。

第24步完整验收仍待完成，草稿PR即使离线源码CI通过也不合并，干净Windows/完整固定功能/真实服务/许可缺口未被CI消除。最终PR/提交与CI回执在仓库外PROJECT_STATE及PR按实际结果记录；本步不创建标签或Release，不实施下一步。
