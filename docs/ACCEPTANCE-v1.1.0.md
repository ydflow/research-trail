# P2-10 Windows 1.1.0 验收

状态：本地验收通过；公开二进制分发受阻，源码交付及最终 main 包由独立回执确认。完整本地 verify 已通过 1171 项。起点为 main `2d14a53bcbeedbff1b446a6bfac5115403aeb48c`，合并后 [CI 38786288117](https://github.com/ydflow/research-trail/actions/runs/38786288117) 成功。基线为 999 Python + 70 Node + 99 Electron = 1168；不删减原测试。分支 `release/phase2-windows-v1.1.0`。

## 构建和执行边界

沿用 PyInstaller + Electron Builder + NSIS，Windows x64、Python 3.12。正式执行链为 Electron / React → FastAPI → Python AgentRunner → Python 金融工具 → SQLite。不改 Agent Loop、数据库契约、权限或金融计算。

正式 1.0.0、1.1.0 统一要求干净已提交源码；Python、Electron 构建来源必须与当前 Commit / Tree 完全一致。前端构建记录全部产物哈希，包装时再次比对；最终 ASAR 逐文件核对构建哈希。完整文件清单、安装包 SHA256、SOURCE-COMMIT.txt、bundle-manifest.json、delivery-audit.json 和 app-file-list.json 随本地交付生成。内部开发候选明确记录 dirty 状态，不能作为正式候选。

Pi 源码与离线测试保留仓库中；正式后端收集排除五个 Pi 实验模块。生产桌面入口不使用 Pi Worker，仅复制已构建前端、冻结后端、技能和许可。需以最终安装包实际清单、ASAR 和 PYZ 模块图证明排除，不能以“未调用”代替。

## 验收方法

`bun.cmd run verify` 保留原 1168 项，新增正式版本防绕过和载荷隔离 Node 回归。额外 `node tests/windows-package.cjs release/windows/1.1.0` 使用真实 NSIS 安装器、临时安装和用户数据目录；只继承系统环境、PATH 仅 System32，使用不存在的开发 Python / 页面 / 数据库覆盖探针。

安装验收覆盖实际 v1.0.0 安装 → 写入离线会话、研究与报告 → 新版 NSIS 原位置升级 → 内容逐项相同；安装版 Frozen SDK / SQLite / TLS / 时区 / 技能、15 页、Fake Agent、报告证据、13 Run 的 10+3 分页、SSE 与持久事件逐项相同、K 线、1440 / 600 画面、退出所属后端、重启、旧 schema 迁移、卸载和重装保留库。仅使用原创模拟数据、假模型和 fixed 合成器，不调用真实服务。

本节以下记录提交 PR 前实际结果。最终 main 合并及其 CI 成功后，必须重新从该 main 构建和执行安装验收，最终来源不能停留在 PR Head；最终数量/哈希以交付清单和相应安装回执确认，不预写尚未发生的远程结果。

## 已完成的本地回归

完整 `bun.cmd run verify` 退出 0：999 Python（316.70 秒）+ 73 Node（24 Worker + 49 其他）+ 99 实际 Electron（621.53 秒）= **1171**；失败、取消、跳过、todo 均 0。原 1168 项保留，新增 3 项打包回归。契约、TypeScript、Electron / renderer 构建、临时数据库重复迁移与一致性、native / Pi 开发依赖审计通过。保留 1 条既有 Starlette/httpx 弃用提示。

首次完整回归在差异审核发现“无 Git 源码导出不能普通构建”的新限制后主动停止，日志保留，不算通过。修正为无 Git 时仅允许普通开发构建记录 null 身份和 dirty=true；正式版本及 RC 继续拒绝。新增测试覆盖该边界，然后从头执行上述完整回归。产品及该命令执行的测试源码前后哈希一致；独立安装脚本在运行期间另补原生窗口断言，它不属于 verify，由后续干净安装专项执行。

首次 ASAR 审核因 Windows 原生路径分隔符处理错误失败；修正后增加实际 ASAR 成功、额外实验文件和篡改编译产物回归，8 项打包专项通过。没有关闭审计或跳过检查。

内部开发包 `1.1.0-internal.p2-10` 明确记录 dirty=true，SHA256 `5d7ccaaa97e6a47b4751f9853b2c31a7807832802d404f91b3b94ccbb91e5619`。真实 NSIS 的 18 项安装检查全部通过、页面/控制台错误 0，包括实际发布的 v1.0.0 升级、离线研究/会话/报告保留、13 Run 的 10+3 分页与精确 SSE 回放、退出、重启、迁移、卸载及重装保留自定义数据。该开发包不是最终 1.1.0 构建。

干净正式候选来源 `08a6eafe94f7edc9fb9c3779a89354500fc73deb`，Python 与 Electron 来源均与该 Commit / Tree 相同，dirty=false；安装包 SHA256 `efbd6d2fbfcd33824bdee3dfbf685e1a826ee809f063dc961af07b39269d6814`。外层 1662 文件、ASAR 32 文件，自动来源和交付审计通过。增强脚本的 **20 项检查全部通过**、页面/控制台错误 0；每个已安装文件与 bundle 清单哈希相同，仅另有 NSIS 生成的卸载器/图标。1440×900、600×900 原生 BrowserWindow 内容尺寸和页面视口同时精确断言，证券/K 线及完整会话截图均实拍。受限 PATH / 临时数据目录用于隔离开发环境；不修改个人数据库或凭证。

真实升级使用保留的 v1.0.0 安装器（原 SHA256 a630d520…3315cd），先由旧应用生成会话/事件和研究报告，再以 1.1.0 原位置升级，逐对象完全相同。卸载以默认不清数据选项执行，已关闭的自定义业务数据库逐字节相同；重装后会话可读。未在个人默认 AppData 数据库上进行破坏性试验，不将隔离验收说成全部用户配置或独立干净机器验证。

以上候选之后只补文档和既有 NSIS 核心许可正文，不改产品或测试。核心 COPYING 的归档 SHA 与锁定 builder 校验值一致；精确插件声明闭包仍待核实。它们将进入最终 main 重建包，不能用旧候选的文件数或 SHA 冒充最终包。

本地完整日志、回执和截图保存于仓库外 `research-trail-p2-10-qa`。最终 main 构建后生成的 bundle-manifest / SOURCE-COMMIT / SHA256SUMS 与安装回执是最终包的来源证据，不改写旧候选 SHA 冒充合并提交。

## 修改范围与性能

打包与来源：`package-windows.cmd`、`package.json`、`scripts/build.mjs`、`scripts/package-backend.py`、`scripts/package-windows.mjs`、`scripts/package-policy.mjs`、`scripts/package-archive.mjs`、`scripts/audit-windows.mjs`。CI / 回归：`.github/workflows/offline-checks.yml`、`scripts/verify.mjs`、`tests/packaging.test.cjs`、`tests/windows-package.cjs`。文档：README、ROADMAP、WINDOWS-INSTALL、BUNDLE-NOTICE、本验收、P2-10-LICENSE-AUDIT、third-party/nsis/COPYING 与 NOTICE；`.gitattributes` 保留 COPYING 原字节。共 21 个修改/新增文件。

仅在构建/审计时增加文件遍历、哈希、来源和 ASAR 校验；前端仍只构建一次，运行时没有新增请求、进程、持久缓存或后台任务。AgentRunner、业务 app.py、Store、金融计算、SQLite 契约、真实服务授权及原 Electron 回归未改动。真实金融快照仍沿用本次应用运行期内存生命周期，不新增跨重启金融数据缓存；研究/会话的 SQLite 持久化另验。

## 分发与未验证事项

- 未签名；开发机受限环境验收不等于独立干净 Windows 或所有 Windows 兼容。
- 真实模型、金融 SDK 账户、地域、数据服务及再分发权限没有全面验证。
- Folio 三个早期 UI 局部适配及其后续组件保留来源。EVIDENCE 第 10 节记录用户确认已获原作者复用授权，但原始授权文件未独立核验，不能自行推定公开二进制再分发范围。仅 skills/LICENSE 独立确认为 MIT。NSIS 核心原许可已补存，安装器内插件逐项声明尚未闭环。详见 [许可审核](P2-10-LICENSE-AUDIT.md)。
- 既有 CI 偶发时序风险保留：PR #38 的首次 Push CI 曾在未改动的 Python 研究取消测试失败，隔离测试通过、失败 job 重跑通过；PR CI 与最终 main CI 成功。不称已永久解决。
- v1.0.0 Release、Tag、附件保持原样；未确认公开二进制授权时，只交付内部包及已验收源码 PR，不创建 v1.1.0 公开二进制 Release。第三阶段不在范围内。
