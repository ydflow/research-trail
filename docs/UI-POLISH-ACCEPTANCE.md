# 桌面 UI 结构与视觉整理（2026-10-15）

## 2026-10-16 提交与合并授权

用户已明确要求提交 PR 并合并，取代此前“停在本地待审核”的交付边界。此次提交包含同一分支上 P2-09.6 与后续 UI 整理的累计改动；不授权发布、Windows 打包或执行 P2-10。完整本地门禁最终为1168项通过；PR及合并后的CI结果另行核验，不将本地结果当作远程CI结果。

过程补充：后续完整门禁曾出现 K线滚轮、热力图 tooltip 和原生窗口尺寸设置失败；单项复跑通过，但尚未证明这些时序问题已永久消除。P2-08 的报告证据点击失败确认存在窄屏 transcript 被压到0高度的布局回归，已修正并在最终完整门禁中通过；600宽度输入区边界也已修正。诊断阶段曾误用旧dist、出现CSS构建语法错误及临时测试文件编码重写，均已纠正；最终原有测试正文保留、无诊断日志残留，并通过313文件哈希核验。各次失败/专项复跑/最终门禁日志在仓库外保留；最终完整日志原件为 `D:\folio\research-trail-ui-polish-final2\verify.log`，退出0。不得将单项复跑通过表述为已查明所有间歇失败根因。

状态：代码完成/待用户审核（完整本地1168项通过）。沿用 `fix/pre-release-product-experience` 的 P2-09.6 未提交修改，本轮仅整理前端结构、样式与测试。用户审核尚未完成；没有提交、推送、PR、合并、发布或执行 P2-10。

## 最终本地验收回执

完整 `bun.cmd run verify` 退出 **0**：**999 Python + 70 Node（24+46）+ 99 实际 Electron = 1168 通过**。失败、取消、跳过、todo 均为 0。上轮1166与原1159基线全部保留，本轮追加2项 Electron UI 回归；本轮开始时已有的 Electron 测试正文逐字保留。313个源码/配置/资源哈希在门禁前后一致。

完整日志：[verify.log](D:/folio/research-trail-ui-polish-qa/verify.log)。机器回执：[delivery-manifest.json](D:/folio/research-trail-ui-polish-qa/delivery-manifest.json)。专项16/16及浮层边界2/2日志均保留；主动中止和开发期失败记录未计为通过。

全部12张本轮UI原生窗口截图在 `D:\folio\research-trail-ui-polish-qa\verify`。原15个导航、证券缓存/失败恢复/配置失效、历史分页/SSE/迟到保护/取消、报告证据、长聊天局部滚动通过；实际Electron→Python受控SDK/CLI请求为首次6、返回页面增量0、失败刷新6、恢复6，共18；外部API为0。

本轮未新增后端/Agent/数据库/IPC/Provider授权/Pi或依赖变更，不需要额外契约审批。仅本地验收完成，用户视觉与代码审核仍待进行。

| 实际 Electron 页面 | 1440×900 | 1000×700 | 600×700 |
| --- | --- | --- | --- |
| 证券与侧边助手 | [1440](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-security-1440.png) | [1000](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-security-1000.png) | [600](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-security-600.png) |
| 完整会话 | [1440](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-sessions-1440.png) | [1000](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-sessions-1000.png) | [600](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-sessions-600.png) |
| 执行轨迹 | [1440](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-trace-1440.png) | [1000](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-trace-1000.png) | [600](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-trace-600.png) |
| 空会话 | [1440](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-empty-1440.png) | [1000](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-empty-1000.png) | [600](D:/folio/research-trail-ui-polish-qa/verify/ui-polish-empty-600.png) |

性能：最终主JS 324057 bytes，较本轮开始323115增加 942 bytes（0.29%）；主CSS构建约56.18kB，gzip约10.22kB（上轮55.92/10.28kB）。没有新轮询、请求、定时器或依赖。未新增长期RSS/堆压力测量。证券缓存生命周期和过期风险沿用上轮：仅当前应用运行内存，明确快照非实时，显式刷新更新，退出或配置失效释放；本轮不扩大缓存范围。

## 布局与根因

| 原问题 | 本轮处理 |
| --- | --- |
| 自选资产是无边界文字与按钮的组合，激活项与普通项不统一 | 一个有边界的横向资产栏；46px 等高证券项、代码/名称两层、统一圆角与绿色激活边；超出宽度仅栏内滚动。未改资产选择、持久化或轮询逻辑。 |
| 完整会话复用旧助手外壳、面板顶部遗留间距，标题/操作/创建表单各占整行 | 完整页使用独立工作区容器，但保留同一个已挂载的 SessionPanel；资产栏后直接进入会话。标题与操作合并为 PageHeader，模型/数据/连接状态合并为说明栏。 |
| 助手标题来自 App，其他内容来自 SessionPanel，样式分散在四个文件 | 标题、工具栏、状态、会话、输入区统一由 SessionPanel 管理；会话结构样式集中到 chat.css，删除 style.css/foundation.css/product-experience.css 的重复会话布局规则。 |
| 历史、创建、聊天的空间分配不明确 | 完整页左列为历史与创建；右列为当前会话、独立滚动正文/真实持久化工具轨迹、底部输入区。1440/1000 为双栏；600 保留创建入口，历史按钮展开轻量抽屉。 |
| 没有当前会话时只剩空容器 | 显示明确的“开始一次研究会话”提示；没有当前会话就不渲染正文/输入占位。资产加载/断开/空列表分别有明确文字，空 nav 自动折叠。 |
| 顶部占用过多、证券工具栏控件不等高 | 统一 8/12/16/20px 间距、30/36px 控件和现有圆角/边框 token；600 宽度顶栏压为一行，导航变为单行横向栏；证券工具栏按钮与选择器统一尺寸。 |

PageHeader 使用现有 SectionHeader 的公共 `page-header` 类；业务页面继续使用自己的现有标题与工具栏，不添加重复的通用标题。页面内容在资产栏后紧接业务面板，没有业务内容的会话页 main 只承载资产栏，完整会话在余下网格中伸展。

## 本轮修改文件

| 文件（仓库相对路径） | 用途 |
| --- | --- |
| apps/desktop/src/renderer/App.tsx | 完整会话使用独立容器；移除重复助手标题。 |
| apps/desktop/src/renderer/AssetTabs.tsx | 资产栏标签/计数层级与明确空态。 |
| apps/desktop/src/renderer/SessionPanel.tsx | 合并标题工具栏/说明区；创建与历史归左栏；明确空态。执行、SSE、分页与 SQLite 通信算法保持。 |
| apps/desktop/src/renderer/main.tsx | 明确公共基础/会话/证券补充样式的导入顺序。 |
| apps/desktop/src/renderer/style.css | 移除遗留资产栏/会话布局规则。 |
| apps/desktop/src/renderer/ui/Primitives.tsx | 现有 SectionHeader 共享 PageHeader 类。 |
| apps/desktop/src/renderer/ui/foundation.css | 统一资产栏、页面间距、顶栏响应式；移除重复聊天规则。 |
| apps/desktop/src/renderer/ui/chat.css | 同一个会话组件的完整/紧凑/窄屏结构与统一边界。 |
| apps/desktop/src/renderer/ui/product-experience.css | 只保留上轮金融卡片与快照显示规则，消除聊天覆盖层叠。 |
| apps/desktop/src/renderer/securities/security-overview.css | 图表卡标题间距、证券工具栏控件尺寸；未改图表实现或计算。 |
| tests/desktop.test.cjs | 追加 2 项实际 Electron UI 回归，原测试正文保留。 |
| docs/UI-POLISH-ACCEPTANCE.md、docs/ROADMAP.md、docs/EVIDENCE.md | 本轮回执与证据链接。 |
| D:\folio\PROJECT_STATE.md（仓库外） | 前置本轮状态，保留原有历史。 |

与本轮开始时相比，后端、Agent、数据库、IPC、Provider 授权、证券快照实现、分页容量、依赖清单与 Pi 均无新增变更。Git diff 中原已存在的 P2-09.6 Python/缓存修改属于上一轮，已在仓库外 baseline 保留，不应误记成本轮修改。

## 验证方法与边界

使用项目现有 Playwright `_electron` 启动真正的 Electron 主进程与 Python 后端。当前没有可用 Browser 插件，且浏览器页面不能替代用户要求的真实 Electron 验证。窗口通过 BrowserWindow.setContentSize 设置为 1440×900、1000×700、600×700，并读取 innerWidth/innerHeight 确认；PNG 使用 CSS 像素，不是缩放后的概念图。

新增回归验证：资产项高度与圆角一致；资产栏与会话之间没有空预留带；宽屏历史/详情构成双栏；窄屏历史可展开；输入区留在原生窗口内；没有整页横向/纵向溢出；空态创建后恢复正常输入；切换布局保留同一 DOM 会话实例和运行记录，不重复执行 Agent。

原测试继续覆盖 15 个导航、首屏证券摘要、真实模式受控 Provider 请求计数、长文本/表格/代码局部滚动、历史分页、SSE、水位、迟到事件、取消、报告证据身份与引用。所有数据/模型验证均为离线受控测试；截图中“规则演示/假模型”“模拟数据”保留。没有新增外部金融或模型 API 调用，不将结果当作真实服务权限或安装包证明。

证据根目录：`D:\folio\research-trail-ui-polish-qa`。本轮前的 17 个未提交文件保存于 `baseline/`；原 P2-09.6 验收仍位于 `D:\folio\research-trail-p2-09.6-qa`。

## 过程问题记录

- focused.log：3/4 通过；新布局回归发现文档纵向溢出。
- focused-2.log：1/3 通过；首屏摘要被资产栏间距推下、文档溢出继续确认。
- focused-3.log：3/6 通过；修复定位边界后溢出消失，但长 Markdown 表格的 nowrap 规则在移除旧覆盖时遗漏；新用例还误将种子中的旧“已完成”运行当作新运行完成。
- focused-4.log：3/4 通过；恢复表格局部滚动，并等待新工具结果后比对运行记录；剩余首屏间距问题。
- focused-5.log：3/3 通过；统一证券工具栏高度后原首屏断言通过。
- focused-final.log：16/16 通过；复核全部 P2-05、P2-09.6 与新增 UI 回归。
- 冻结前自查发现说明浮层在窄助手内可能裁切，主动中止首次完整门禁（verify-interrupted-popover.log，退出 1，未完成、不计通过）；改为说明栏内定位并补充三尺寸边界断言，popover.log 2/2 通过后重新完整运行。
- 所有失败日志保留；没有放宽原业务断言或增加等待预算。原有 P2-09.6 测试正文与本轮开始时逐字比对保留。

## 视觉参考对照

本轮为已有设计系统内的定向整理，直接沿用用户金融工作台参考图和现有绿色/白色 token，不新增概念图片资产。参考图是布局方向，不复制虚构行情、财报、AI 步骤或 Token 数据。

| 对照点 | 实现与有意差异 |
| --- | --- |
| 资产导航 | 同一横向容器、代码/名称两层、绿色激活；保留项目现有自选语义，不添加关闭/新增等未实现控件。 |
| 标题与操作 | 品牌、标题、说明、操作有固定层级；会话操作为统一轻量工具栏。 |
| 配色与边界 | 使用项目原有 #14685a / 白色 / 浅灰绿背景、1px 边框与 5/8/10px 圆角，不更换品牌。 |
| 助手内容 | 保留真实持久化消息、工具结果、来源、时间与规则演示标识；不照抄概念图的财报结论。 |
| 完整会话 | 用户本轮指定双栏替代概念图三栏；同一个会话组件在侧边/完整页切换，输入始终独立于正文滚动。 |
| 窄屏 | 600 下历史抽屉、导航/资产局部滚动，压缩 chrome 给正文留空间；完整会话截图无整页横向溢出。 |

## 手工复查与理解

CMD 验证：

```cmd
cd /d D:\folio\research-trail
bun.cmd run verify
```

可选小练习：在现有 spacing token 范围调整资产栏间距，确认三种尺寸仍没有整页溢出。

理解题：为何完整页与侧边助手要保留同一组件？为何滚动正文与输入区要分离？为何删除重复 CSS 时必须保留 Markdown 表格的局部滚动规则？
