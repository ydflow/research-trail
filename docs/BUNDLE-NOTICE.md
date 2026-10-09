# 研迹 Windows 内部候选包来源声明

研迹以 Python 管理本地业务和存储，以 Electron 管理桌面与所属后端进程。应用代码为各步骤记录的个人新增实现与修复；不将上游作者的代码、案例、截图或测试计入个人成果。

功能参考：helsome/folio，固定版本 `ba5dcdfd31b162f5edb8b908f7f099a560389326`。本包保留 `notices/sources/SOURCES*.json` 中的逐文件来源与 SHA256。两个技能目录及原资源/版权声明保留，`resources/skills/LICENSE` 是已核实的 MIT 授权；尚未独立取得 Folio 整体适用许可，不给研迹整仓附加 MIT 标识。以项目证据里的实际复用确认确定公开范围，本内部候选包不是新增公开二进制授权或 Release。

Electron/Chromium 许可证位于安装目录 LICENSE.electron.txt / LICENSES.chromium.html；Python、其运行依赖、打包工具及前端依赖声明在 resources/notices 中。PyInstaller 使用 GPL 及 bootloader 分发例外，保留原许可，不能将其概括为 MIT。自动依赖清单列出精确版本、发行包许可文本和缺失项；缺失文本仍需补核，不因构建成功自动通过发布授权审核。

Python清单由声明依赖及实际PyInstaller PYZ模块图生成，也包含分析器带入的可选packaging/setuptools/Pygments/_pytest模块；这不是调用测试框架或增加上游案例的证明。嵌套vendor许可保留目录，避免同名LICENSE覆盖。原生DLL及SDK的完整版本授权仍按下面缺口处理。

Longbridge SDK 5.2.0 的 wheel 未携带许可文件或 License 元数据；第10步保留官方源码仓库的 LICENSE-MIT / LICENSE-APACHE 及核实边界 NOTICE。第24步补核精确 v5.2.0 标签：对应提交 b2f749a3c68cc4f05642b37fc790fb711d2dfb13，Python原生包声明 MIT OR Apache-2.0，两份已保留许可文本与标签版本逐字节一致。PyPI提供该Windows wheel的SHA256及发布声明；读取声明不等于密码学验证，更不证明原生传递依赖许可已全部闭环，公开二进制仍有此缺口。详细hash与来源在 notices/third-party/longbridge/NOTICE。KLineChart 与内含 Lightweight Charts 声明也原样保留。本包不包含账户、个人持仓、运行数据库、日志、凭证或开发仓库；certifi/cacert.pem 是公开 TLS 根证书资源，不是个人私钥。

本轮会话Markdown新增react-markdown与remark-gfm。前端许可收集改为遍历锁定安装的全部生产依赖及传递依赖，逐名称/版本保留原许可文本，不再只列四个包；缺少文本时构建失败。此源码修复尚未进入原内部安装包，须重新构建和核对新清单。

默认真实服务未配置，固定模拟行情显著标记。安装包离线可启动与固定测试通过不等于真实行情、账户权限、真实模型质量或投资收益验证。
