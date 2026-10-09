# Windows 安装与数据处理

版本 `1.0.0`；公开发布以对应 Release 和验收记录为准。Windows x64，按用户安装，安装包暂未签名；SmartScreen 行为待干净环境验证，不要求用户绕过保护。

安装：运行 ResearchTrail-1.0.0-windows-x64-setup.exe，选择路径。安装目录包含 Electron/前端、resources/backend 内的 Python 3.12 与依赖、skills 及来源/许可。启动 ResearchTrail.exe，无须 Python、uv、Bun、Node 或源代码。开发环境变量不能覆盖安装版后端或页面；CLI 支持 `--research-trail-data-dir=绝对路径` 选择独立用户数据目录。

默认业务库在 `%APPDATA%\ResearchTrail\data\research-trail.sqlite3`；浏览器缓存也在该用户目录。安装目录为资源，不存业务库。关闭窗口会停止本次所属 Python 及受控 SDK 子进程。提醒/自动化只在应用运行时调度，关闭期间不常驻、不补称已执行。

升级前关闭研迹、备份完整用户数据目录（包括 SQLite 的 WAL/SHM 如仍存在）；新安装版启动使用 Alembic 升级。数据库升级不等于支持任意旧版本或降级，请保留升级前备份。异常时保留原库并报告错误，不自动清空数据库。

卸载默认保留研究、会话、设置及数据库，重新安装可读回。Windows 系统凭证管理器中的研迹凭证也不由卸载器删除。需要彻底清除时，先在设置/提供商页逐项删除凭证并备份需要保留的数据，退出应用，卸载；然后由用户确认并手动删除上述用户目录（自定义目录按实际路径处理）。不自动清除其他应用或整份系统凭证库。

验收边界：开发机实际安装、受限 PATH 启动、关闭重启、升级和卸载可作为本机证据；独立干净 Windows 首装/启动、签名信任、长期运行及真实服务仍须分别记录。独立干净Windows已按用户要求跳过／未验证，未签名事实保留。最终安装包SHA及实际验收见 ACCEPTANCE-v1.0.0.md；历史internal.24证据不代表本版。
