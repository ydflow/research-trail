# 研迹 Windows 内部候选包来源声明

研迹以 Python 管理本地业务和存储，以 Electron 管理桌面与所属后端进程。应用代码为各步骤记录的个人新增实现与修复；不将上游作者的代码、案例、截图或测试计入个人成果。

功能参考：helsome/folio，固定版本 `ba5dcdfd31b162f5edb8b908f7f099a560389326`。本包保留 `notices/sources/SOURCES*.json` 中的逐文件来源与 SHA256。两个技能目录及原资源/版权声明保留，`resources/skills/LICENSE` 是已核实的 MIT 授权；尚未独立取得 Folio 整体适用许可，不给研迹整仓附加 MIT 标识。以项目证据里的实际复用确认确定公开范围，本内部候选包不是新增公开二进制授权或 Release。

Electron/Chromium 许可证位于安装目录 LICENSE.electron.txt / LICENSES.chromium.html；Python、其运行依赖、打包工具及前端依赖声明在 resources/notices 中。PyInstaller 使用 GPL 及 bootloader 分发例外，保留原许可，不能将其概括为 MIT。自动依赖清单列出精确版本、发行包许可文本和缺失项；缺失文本仍需补核，不因构建成功自动通过发布授权审核。

Python清单由声明依赖及实际PyInstaller PYZ模块图生成，也包含分析器带入的可选packaging/setuptools/Pygments/_pytest模块；这不是调用测试框架或增加上游案例的证明。嵌套vendor许可保留目录，避免同名LICENSE覆盖。原生DLL及SDK的完整版本授权仍按下面缺口处理。

Longbridge SDK 5.2.0 的 wheel 未携带许可文件或 License 元数据；第10步已保留官方源码仓库的 LICENSE-MIT / LICENSE-APACHE 及核实边界 NOTICE，本包在 notices/third-party/longbridge 原样提供两份文本。它们来自仓库 main，不证明实际 wheel 的版本对应关系与原生依赖声明已经全部核实，此项仍是正式公开二进制发布缺口。KLineChart 与内含 Lightweight Charts 声明也原样保留。本包不包含账户、个人持仓、运行数据库、日志、凭证或开发仓库；certifi/cacert.pem 是公开 TLS 根证书资源，不是个人私钥。

默认真实服务未配置，固定模拟行情显著标记。安装包离线可启动与固定测试通过不等于真实行情、账户权限、真实模型质量或投资收益验证。
