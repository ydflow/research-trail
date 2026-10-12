# P2-05：金融工作台参考来源与使用边界

核查日期：2026-10-12（Asia/Shanghai）。本次是 [Draft PR #33](https://github.com/ydflow/research-trail/pull/33) 的文档补充；已验收 UI、CSS、测试与业务代码不变。实现与视觉验收见 [UI 基础说明](PHASE2-UI-FOUNDATION.md)，本轮证据见 [EVIDENCE 第73节](EVIDENCE.md)。

## 1. 先区分发生过的参考与本轮调研

下列四个仓库均在本轮实际阅读了固定提交的 README、许可证、相关 UI 源码和仓库截图。但已有 P2-05 前两轮记录没有将它们用于实施的证据，本轮也没有据此修改产品。不能将现在观察到的相似设计倒填为已经发生的借鉴或代码复用。

| 来源类别 | 实际使用情况 | 研迹对应部分与责任边界 |
| --- | --- | --- |
| 用户提供并确认的金融工作台概念图 | P2-05 实际采用的主要视觉方向 | 浅色/深绿、三栏、证券主报价与图表优先、独立研究聊天区域。只采用布局方向，不复制图中数字、财报、公司标识或不存在的操作 |
| 第一轮生成的施工概念图 | 已记录的设计沟通材料 | 辅助确定外壳和信息层级；概念图不是行情或功能证明，也没有作为产品位图导入 |
| 固定版本 Folio 源码 | 既有适配来源；第二轮实际只读参考信息分层 | 版本 `ba5dcdfd31b162f5edb8b908f7f099a560389326`；[SecurityHeader](https://github.com/helsome/folio/blob/ba5dcdfd31b162f5edb8b908f7f099a560389326/packages/ui/src/components/workspace/SecurityHeader.tsx)、[OverviewView](https://github.com/helsome/folio/blob/ba5dcdfd31b162f5edb8b908f7f099a560389326/packages/ui/src/components/workspace/OverviewView.tsx)。原 QuoteCard/SecurityViews 等局部适配仍保留逐文件出处及 EVIDENCE 第8/28节记录；本轮未新增导入，不把 Folio 全仓判为 MIT |
| 本文四个金融项目 | 本轮补充调研，未用于修改已交付 UI | 下文“对应部分”只表示可比较的通用设计，不表示这些项目是研迹该部分的历史来源；没有导入其代码、CSS、图标、截图、字体或依赖 |
| 研迹自行实现的 P2-05 展示基础 | 实际实现，未从本文四库复制 | `ui/tokens.css`、`ui/Primitives.tsx` 中 SectionHeader/SurfaceCard/StatusIndicator/StateNotice、`ui/Navigation.tsx` 中原创代码 SVG 与分组、外壳/响应式样式及 SecurityOverview 的既有 DTO 组合展示。沿用旧业务组件的部分不因新外壳被改称全部原创 |

这里的“未使用”指未据本轮四库调研改变当前产品；不声称能够证明历史上任何人从未浏览过这些项目。可核验的历史依据是 EVIDENCE 第70～72节、UI 基础说明及当前源码出处声明。

## 2. 固定版本与核查方式

先读取 GitHub 默认分支 `main` 的提交对象，再用完整 SHA 固定文件树及全部引用。以下均为本轮快照，不用可移动的 `main` URL 代表版本，也不把 README 宣传或截图当作本机运行验收。

| 仓库 | 固定 Commit SHA | 实际许可证结论 | 此前实施证据 / 本轮采用 |
| --- | --- | --- | --- |
| [ErTasselli/OpenTerminal](https://github.com/ErTasselli/OpenTerminal) | `aed097c680cd8ec1c391ae06966babe7d6d91fc6` | 根 LICENSE 为 MIT，与 README 一致 | 无 / 仅调研，零代码或素材导入 |
| [Hitheshkaranth/OpenTerminalUI](https://github.com/Hitheshkaranth/OpenTerminalUI) | `5ceeb3860308c05ddb9424eb25932312417355a2` | 根 LICENSE 为 MIT，与 README 一致 | 无 / 仅调研，零代码或素材导入 |
| [ghostfolio/ghostfolio](https://github.com/ghostfolio/ghostfolio) | `b9832e8eff7f8d5bf471fc02ef3ff3766f6bfe67` | 根 LICENSE 为 GNU AGPL v3，README 为 AGPLv3，GitHub 元数据 AGPL-3.0 | 无 / 仅调研，零代码或素材导入 |
| [Fincept-Corporation/FinceptTerminal](https://github.com/Fincept-Corporation/FinceptTerminal) | `3f444cb7ab712d85a57d270d5edd6e7a2ef50d55` | 文本不一致，GitHub 元数据 NOASSERTION；见第6节，不能只按 README 归为标准 AGPL | 无 / 仅调研，零代码或素材导入 |

四份递归文件树均未截断；所读文件通过树中的 blob SHA 取回，并校验 Git blob SHA-1 与内容 SHA256。外部核查副本/清单位于仓库外 `research-trail-p2-05-qa/references/`，不提交上游源码或截图。没有安装、构建或启动四个项目，也没有执行其 README 中的命令、连接行情或模型服务。

## 3. ErTasselli/OpenTerminal

实际观察：深色、高密度、可组合面板；报价区突出价格/涨跌，辅助指标与来源/币种在同一面板；图表、新闻、自选分区。源码将工具栏、侧栏与可滚动工作区拆开，报价读取有加载和失败展示。这些是可学习的金融信息分层，不是研迹已发生的参考记录。

研迹对应：`App.tsx` 的外壳、`SecurityOverview.tsx` 的报价/图表/摘要、`QuoteCard.tsx` 的数字层级。研迹层级已由概念图和既有业务实现，本轮不采纳其深色橙色主题、拖拽布局、指标/热力图、公开行情接口或交易记录功能；不复制报价或新闻内容。

核查来源：[README](https://github.com/ErTasselli/OpenTerminal/blob/aed097c680cd8ec1c391ae06966babe7d6d91fc6/README.md)、[LICENSE](https://github.com/ErTasselli/OpenTerminal/blob/aed097c680cd8ec1c391ae06966babe7d6d91fc6/LICENSE)、[Terminal](https://github.com/ErTasselli/OpenTerminal/blob/aed097c680cd8ec1c391ae06966babe7d6d91fc6/web/components/Terminal.tsx)、[Sidebar](https://github.com/ErTasselli/OpenTerminal/blob/aed097c680cd8ec1c391ae06966babe7d6d91fc6/web/components/Sidebar.tsx)、[QuoteWidget](https://github.com/ErTasselli/OpenTerminal/blob/aed097c680cd8ec1c391ae06966babe7d6d91fc6/web/components/widgets/QuoteWidget.tsx)、[仓库截图](https://github.com/ErTasselli/OpenTerminal/blob/aed097c680cd8ec1c391ae06966babe7d6d91fc6/docs/screenshots/dashboard.png)。

许可证边界：MIT 文本署名为 OpenTerminal contributors；若以后复制软件或实质片段，须保留版权与许可文本。README 同时说明市场数据来自第三方公共端点，代码 MIT 不等于取得数据服务或再分发授权。本轮没有复用。

## 4. Hitheshkaranth/OpenTerminalUI

实际观察：导航、主工作区、上下文侧区与状态栏分层；TerminalPanel 将标题/操作/主体/页脚组合为统一容器；主题变量区分界面字体、金融数字、密度及反馈颜色。ChatThread 区分消息角色、工具步骤/错误与回复。这些结构可用于比较展示层一致性。

研迹对应：`ui/tokens.css`、`ui/Primitives.tsx`、`App.tsx`、`SessionPanel.tsx` 与 ToolResultCards。当前研迹没有使用其变量值或组件实现；没有复制其命令栏、终端缩写、光效、Tailwind、角色辩论、交易或 Agent 工具编排，也不以其后端能力补齐概念图。数据来源/模拟/缺失标签在研迹已有契约和验收中存在，不能因本轮看到相近原则而改记来源。

核查来源：[README](https://github.com/Hitheshkaranth/OpenTerminalUI/blob/5ceeb3860308c05ddb9424eb25932312417355a2/README.md)、[LICENSE](https://github.com/Hitheshkaranth/OpenTerminalUI/blob/5ceeb3860308c05ddb9424eb25932312417355a2/LICENSE)、[TerminalShell](https://github.com/Hitheshkaranth/OpenTerminalUI/blob/5ceeb3860308c05ddb9424eb25932312417355a2/frontend/src/components/layout/TerminalShell.tsx)、[TerminalPanel](https://github.com/Hitheshkaranth/OpenTerminalUI/blob/5ceeb3860308c05ddb9424eb25932312417355a2/frontend/src/components/terminal/TerminalPanel.tsx)、[主题 CSS](https://github.com/Hitheshkaranth/OpenTerminalUI/blob/5ceeb3860308c05ddb9424eb25932312417355a2/frontend/src/styles/terminal-theme.css)、[ChatThread](https://github.com/Hitheshkaranth/OpenTerminalUI/blob/5ceeb3860308c05ddb9424eb25932312417355a2/frontend/src/agent/components/ChatThread.tsx)、[仓库截图](https://github.com/Hitheshkaranth/OpenTerminalUI/blob/5ceeb3860308c05ddb9424eb25932312417355a2/assets/readme/dashboard.jpg)。

许可证边界：根文件为 MIT，署名 OpenTerminalUI Contributors；未来复制实质软件片段须保留版权/许可。该结论不代替依赖、第三方素材、品牌与数据服务条款的逐项核查。本轮没有复用。

## 5. ghostfolio/ghostfolio

实际观察：README 明确 mobile-first；截图以曲线、主金额、币种、收益与时间范围建立层级。HomeOverview 对空账户引导与已有资产概览分支处理；PortfolioSummary 分离金额、百分比及加载占位；页头与响应式样式处理移动导航。可学习的是少量关键金融信息和状态的清楚表达。

研迹对应：主报价/币种的排版、公共空态/加载态、窄窗口导航及摘要卡片。对应关系仅用于调研比较：不复制 Angular/Material 模板、曲线素材、颜色值、组合收益计算、移动页结构或账户管理。研迹窄窗仍是工作台导航和助手下移，不改成 Ghostfolio 的产品布局。

核查来源：[README](https://github.com/ghostfolio/ghostfolio/blob/b9832e8eff7f8d5bf471fc02ef3ff3766f6bfe67/README.md)、[LICENSE](https://github.com/ghostfolio/ghostfolio/blob/b9832e8eff7f8d5bf471fc02ef3ff3766f6bfe67/LICENSE)、[页头](https://github.com/ghostfolio/ghostfolio/blob/b9832e8eff7f8d5bf471fc02ef3ff3766f6bfe67/apps/client/src/app/components/header/header.component.html)、[HomeOverview](https://github.com/ghostfolio/ghostfolio/blob/b9832e8eff7f8d5bf471fc02ef3ff3766f6bfe67/apps/client/src/app/components/home-overview/home-overview.html)、[PortfolioSummary](https://github.com/ghostfolio/ghostfolio/blob/b9832e8eff7f8d5bf471fc02ef3ff3766f6bfe67/apps/client/src/app/components/portfolio-summary/portfolio-summary.component.html)、[主题](https://github.com/ghostfolio/ghostfolio/blob/b9832e8eff7f8d5bf471fc02ef3ff3766f6bfe67/apps/client/src/styles/theme.scss)、[仓库截图](https://github.com/ghostfolio/ghostfolio/blob/b9832e8eff7f8d5bf471fc02ef3ff3766f6bfe67/apps/client/src/assets/images/screenshot.png)。

许可证边界：AGPL v3 属于 copyleft。若未来修改/整合并分发受覆盖软件，或向网络用户提供修改版本，需要具体评估相应源码提供等义务（许可证第5/6/13节）；不能把它当作 MIT 组件库。本轮只记录来源和通用观察，零代码/素材导入，不据此改变研迹许可证。

## 6. Fincept-Corporation/FinceptTerminal

实际观察：该快照是 C++20/Qt6 桌面 UI。TerminalShell、NavigationBar 与 DashboardScreen 分开外壳、紧凑导航/时钟状态、面板工作区和工具栏；ThemeTokens 将表面、边框、文字及正负/警告等语义分开。仓库 Dashboard 图片是带界面画面的宣传图，不能当作本轮实机截图；结构判断同时依据源码。

研迹对应：仅比较 `App.tsx` 的工具栏/状态与 `ui/tokens.css` 的语义组织。不采用其 Qt/停靠系统、深色橙色外观、命令/功能码、面板词汇、品牌、行情接入或交易能力；不制作相似素材，也不导入任何实现。

核查来源：[README](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/README.md)、[根 LICENSE](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/LICENSE)、[COMMERCIAL_LICENSE](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/docs/COMMERCIAL_LICENSE.md)、[TerminalShell](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/fincept-qt/src/app/TerminalShell.cpp)、[NavigationBar](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/fincept-qt/src/ui/navigation/NavigationBar.cpp)、[ThemeTokens](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/fincept-qt/src/ui/theme/ThemeTokens.h)、[DashboardScreen](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/fincept-qt/src/screens/dashboard/DashboardScreen.cpp)、[DashboardToolBar](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/fincept-qt/src/screens/dashboard/DashboardToolBar.cpp)、[仓库宣传图](https://github.com/Fincept-Corporation/FinceptTerminal/blob/3f444cb7ab712d85a57d270d5edd6e7a2ef50d55/images/Dashboard.png)。

许可证核查发现同一提交内存在不一致：README 宣称 AGPL-3.0-or-later；`docs/COMMERCIAL_LICENSE.md` v3.0（2026-08-11）称撤回旧双许可和商用限制；根 LICENSE 却仍为 v2.0（2026-04-30），包含双许可、商用/内部使用限制及商标/外观声明，且不是完整标准 AGPL 正文。GitHub 元数据为 NOASSERTION。这里记录各文件的事实，不裁定冲突条款效力，也不将该快照标为已核实的标准 AGPL 授权。未来如需实际复用，须先澄清这一缺口；本轮零复用，不引入该冲突到产品。

## 7. 本轮验收与停止边界

补齐文档不是补做 UI 设计。当前采用的视觉方向仍来自已确认概念图及已记录的 Folio 局部参考；四个新调研项目只形成上述观察和许可台账，不产生产品变化。保留全部既有出处与版权说明，不给研迹全仓新增 MIT/AGPL 声明。

必要检查为固定来源/文件存在性、许可证文本交叉核对、Markdown 链接、UTF-8、Git 差异与范围，以及代码/测试相对补充前 Head 不变。原 Head `f9e661cbace28182908813a71894a4229333c021` 的 push/PR CI 均成功，828 Python/51 Node/67 Electron共946项；这是旧 Head 的验收。文档提交后的当前 Head 必须另等两条远程 CI 成功，不提前继承。未重新执行本机全量业务测试；本轮不合并、不进入P2-06、不发布。
