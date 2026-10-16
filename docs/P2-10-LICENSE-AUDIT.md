# P2-10 分发许可审核

2026-10-16；范围为实际 Windows 包，不能把开发依赖图等同于安装包。

| 范围 | 依据和处理 |
| --- | --- |
| Folio 局部适配 | 固定 ba5dcdfd31b162f5edb8b908f7f099a560389326；Watchlist、QuoteCard、FinancialKLineChart 与后续 SecurityViews 等实际复用记录见 EVIDENCE 第 8/10/28 节和源文件头。用户确认原作者授权复用相关代码；没有独立核验覆盖 Windows 二进制公开分发的原始授权文件。保留来源，不添加全仓 MIT，不将确认范围擅自扩大。 |
| 技能 | 固定来源的 [skills/LICENSE](https://github.com/helsome/folio/blob/ba5dcdfd31b162f5edb8b908f7f099a560389326/skills/LICENSE) 为 MIT、Longbridge Inc. 2026；原文件与 29 份资源的 SOURCES-step14 哈希和版权保留。 |
| Python / PyInstaller | Python 3.12 LICENSE 原文；PyInstaller GPL 及 bootloader 例外原文；依赖和 PYZ 实际模块图生成 python-dependencies.json，保留嵌套 vendor 文本。 |
| Electron / Chromium | 固定 Electron 44.5.1，安装目录 LICENSE.electron.txt、LICENSES.chromium.html；前端仅 desktop 生产依赖及传递依赖，逐版本许可正文和 ui-dependencies.json。 |
| 图表 | KLineCharts 10.0.3 及附带 Lightweight Charts 原 LICENSE / NOTICE，按原来源哈希保留；不修改金融计算。 |
| NSIS 安装器 | 既有 nsis-3.0.4.1 / nsis-resources-3.4.1 归档 SHA256 与锁定 Electron Builder toolset 校验值一致；补存核心 COPYING 原字节及来源 NOTICE，包含 zlib/libpng、bzip2、CPL-1.0 和 LZMA 链接例外。资源归档不等于实际嵌入插件清单；安装器内插件逐项来源/声明的闭包尚未独立完成，不把核心许可扩为全部插件许可。 |
| Longbridge SDK | 5.2.0 Windows CPython 3.12 原生扩展与官方 wheel 哈希一致；wheel 缺许可文本由精确源码 tag MIT / Apache-2.0 原文及既有 native 263 外部 / 9 本地 crate、471 文本审计补足。源归档、选用条款和 Rust 声明见 third-party/longbridge/native；不宣称二进制可复现构建或真实服务权限通过。 |
| Pi / proxy-agent-negotiate | Pi Worker 与仅供实验的 Node 依赖不应进入正式包。该依赖在开发 Worker 图的许可缺口仍保留，不擅自补授权。需由最终包完整清单、ASAR 构建哈希、生产 Node 输入清单、UI 依赖和后端 PYZ 图共同核验实际排除，再记录最终结果。 |

当前结论：继续内部打包和离线验收；源码 PR 可按用户当前明确授权推进。公开二进制分发仍需核实 Folio 适配代码的原始授权范围和安装器插件的完整声明；未确认前不得上传新安装包。v1.0.0 的既有发布是历史事实，本轮不撤销、覆盖或据此自动推定新包许可。无新第三方业务代码、字体、素材或运行依赖；仅补充已有打包器许可正文。

本轮实查补充：2026-10-16 GitHub API 的 Folio 当前 main 递归许可文件仍只有 skills/LICENSE，仓库 license 元数据为空；不把元数据空值单独当作法律判断，结合固定来源树和既有适配/授权记录保留范围缺口。

开发包实际外层清单 1661 文件、ASAR 32 文件、Python 31 个 runtime 发行包、前端生产许可清单 105 个包（103 MIT / 1 ISC / 1 Apache-2.0），native 263 外部 crate / 9 本地 crate / 471 正文审计通过。Worker 图为 87 个包；84 个仅实验，3 个与前端图共享（debug@4.4.3、extend@3.0.2、ms@2.1.3）。保留共享依赖的实际前端用途及声明，不声称全部 87 个包都不存在。Pi Worker / 两个 Pi 根包 / proxy-agent-negotiate 不在实际载荷，五个 Pi Python 实验模块不在本次 PYZ 图。最终稳定候选增加本许可说明文件后，准确文件数和哈希以其新清单为准。
