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

## 本轮阻塞补齐与设置空白修复（2026-10-09）

用户追加授权解决阻塞、合并第24步并发布v1.0.0，随后请求配置指导及模型空白/行情校验。本轮新增Python思考参数持久化、模型配置身份失效及0019迁移；前端新增三栏/常驻资产、按需GFM Markdown，原始HTML/自动外链图片/危险URL不执行。前端许可脚本遍历生产传递依赖及精确版本。SDK精确v5.2.0标签许可文本与保留文件一致，PyPI公开wheel摘要/发布声明已读取，未作密码学验证或原生依赖全闭包认证。

运行中的用户应用在0019文件落盘前启动，数据库停0018而源码ORM已有新字段；只读诊断复现OperationalError。页面读取失败后切换设置页签原本清掉错误，表现空白；现保留错误并显示重读/重启指引。迁移前使用SQLite在线backup创建本机一致性备份，integrity_check=ok，位于ignored runtime/backups，不上传；没有清空/自动迁移运行中用户库或重启用户窗口。用户须正常退出后重新start-dev.cmd应用迁移。

本机完整离线重跑：680 Python、15 Node、原创12案例/两库历史CLI、0019重复迁移/模型检查、契约/类型/构建通过；Electron56项中55通过、1失败，原因是常驻助手增加status元素后既有设置测试使用全页严格定位。已将其定位限定设置区。随后真实Electron专项：三栏/资产/跨页精确快照、设置读失败/页签保留/恢复、设置/凭证/资料/诊断重启共3项通过；再次三项包含三栏、设置故障及更新的OpenAI兼容loopback Markdown/限制/取消/持久化协议通过。窄屏和助手行情卡片布局修正后再测三栏1440/620px1项通过。未把跨轮专项回执冒称新57项完整单轮成功；远程尚未验证本轮未提交代码。构建有大于500kB主chunk警告，构建成功不隐去该警告。

Browser插件未提供，使用既有Playwright Electron；page title/文件URL、非白屏、无框架overlay、页面/console错误、实际控件状态及1440/620px截图核对，截图只含原创模拟数据，在Temp/research-trail-step24-completion-qa，不上传。原内部安装包未重建，旧SHA/14阶段安装证据不覆盖本轮代码。

行情用户配置只读诊断：Longbridge已配置/启用但credential_present=false，真实quote入口返回CREDENTIAL_MISSING，未发起服务商请求；K线/新闻未验，不记录权限受限或真实连接通过。仅使用Python既有服务链与只读数据库会话，未启动第二业务后端、未读取/展示账户或持仓、未输出密钥。用户需另行保存三项提供商凭证后才能真实验收；指引见CONFIGURATION.md。

当前源码差异仍在本地；PR #24仍草稿、head2856974、main8c0e807。账号ydflow/目标origin重新确认；本轮未合并、未创建标签或Release。状态进行中，剩余基线功能、重新打包、干净Windows/签名/原生许可及真实服务边界见FEATURE-AUDIT-step24。

用户重启并称完成设置后的复核：运行库已升级0019，模型已启用、地址/模型标识/凭证均存在，思考为default；这里只证明本机配置可读，未调用真实模型。Longbridge配置仍revision2、启用且凭证未关联（credential_present=false），行情尚未完成。遵照用户最新“未完成停止并告知补齐”指令，在配置检查处停止，不继续外部模型/行情请求或GitHub写入；用户需在数据与只读账户另行保存三项提供商凭证，真实查询仍待复核。

### Longbridge本机保存与真实三项补验（2026-10-09）

用户随后明确授权直接设置三项凭证。发现每项700字节上限无法容纳合法较长Access Token，修正为单项2048字节、准确JSON编码后组合2560字节；沿用Windows Credential Manager原子保存，虚构长Token/重开读取/转义及UTF-8总量超限回归通过。真实凭证经隐藏输入传递，保存与逐项读回一致，未进入源码/命令参数/明文环境文件/测试/验收记录，未调用交易或私人账户接口。

最初全球端点三项PROVIDER_ERROR，窄化诊断为SDK初始化IO/Windows10054，独立TLS握手复现`.com`HTTP/quote双端点重置、`.cn`双端点成功；不是服务返回认证拒绝。临时中国端点SDK取得数据但正常化拒绝naive时间。固定v5.2.0官方python/src/time.rs第45—51行使用PyDateTime::from_timestamp(...,None)，是本地时间；仅SDK边界允许该格式，转换UTC时保留真实瞬间，其他无时区提供商数据仍拒绝。不得直接给naive时间贴UTC。来源：https://github.com/longbridge/openapi/blob/v5.2.0/python/src/time.rs 。

修复后隔离worker三项真实请求成功，再保存region=cn、其余配置保留、revision6并通过ProviderService正式查询链路各复验一次：AAPL.US报价、5条K线、5条新闻，均ready、real/sdk、cached=false、有数据、SDK时间转UTC。没有模拟fallback，不上传实际行情/新闻正文或私人配置。98项提供商离线回归、契约再生成与TypeScript检查通过，保留Starlette/httpx弃用警告。本轮未验其他股票/市场/深度/私人账户/真实模型质量/追踪，不声称全部连接或完整第24步通过。旧运行进程需正常退出重开加载修复，安装器未重建，旧包/SHA不覆盖新源码。PR未更新/合并、标签与Release未创建。

最终补验：完整Python回归通过683项，启用RESEARCH_TRAIL_OFFLINE与scripts/offline网络护栏，1项既有Starlette/httpx弃用警告；真实服务验证与离线回归分开执行。契约再生成/一致性、TypeScript和git diff --check通过。未把本轮Python成功称为最新完整Electron或安装包验收。

## 用户要求跳过干净Windows验收并合并源码（2026-10-09）

用户明确表示没有干净Windows电脑或虚拟机，要求直接跳过这一验收并合并第24步。本轮按最新授权处理现有PR #24及本步骤后续源码修复，不开发下一步。独立干净Windows首次安装/无开发环境验证记为“用户要求跳过／未验证”，开发机安装结果仍不能替代这项证明。

本次交付范围是源码合并。真实模型A/B与完整质量量表、报告概率及Diff/真实校准、高思考工具协议、其他服务/权限、原生二进制分发许可等未完成事实继续保留，不将其标为完成。原内部安装包没有本轮修复，尚未重建，不上传安装器或SHA附件；本轮不创建v1.0.0标签/Release。此前“保持草稿、不合并”是当时授权与门槛下的历史事实，本次源码合并以当前指令替代，完整v1.0.0发布标准未放宽。检查失败则修复并重验，不绕过GitHub检查或保护。

本次源码合并复核：Python完整离线683项已在同一代码上通过；本轮再运行15项Node、Electron/main及renderer构建、完整57项真实Electron，全部通过，Electron失败/取消/跳过0。独立网络护栏与沙箱数据库启用，不调用真实模型/行情/账户/追踪。完整Electron实际409秒，未把开发机窗口测试称为干净Windows或安装包验收。契约/类型/diff检查通过；保留Starlette/httpx弃用及Vite大chunk警告。

后续源码分类提交：6d8ff90 Python思考配置/0019迁移，bd6b36a提供商长凭证/时间修复，d33f12c桌面工作台/设置修复，bc5cf18打包UI许可收集，89db6c2精确SDK来源核实，最终文档另一个真实提交。只有源码及来源/验收文档，安装包/敏感截图/运行库/密钥/日志/缓存均排除。最终文档head与远程push/PR/main检查、合并SHA按实际GitHub与仓库外PROJECT_STATE记录，不预写成功。

## 后续正式交付

上述内部候选/缺口是对应时点历史。第24步PR #24与补齐PR #25已普通合并，v1.0.0已发布安装器与SHA256；最新实施/验收和仍未验证边界见[版本验收](ACCEPTANCE-v1.0.0.md)与[Release](https://github.com/ydflow/research-trail/releases/tag/v1.0.0)。独立干净Windows仍为用户要求跳过／未验证，不将本机成功记作独立OS通过。
