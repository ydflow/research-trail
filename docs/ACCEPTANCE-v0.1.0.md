# v0.1.0首版验收与操作清单

日期：2026-10-04（Asia/Shanghai）。当前状态：**验收通过；源码可发布（仅假模型＋模拟数据）**。完整本机检查和干净源码真实桌面操作链通过；用户亲自清单待填写。首版仅为Windows开发源码＋本机SQLite；v0.1.0是验收范围名称，不是已创建的标签或Release。第7步开发轮无提交或上传、远程CI未执行；后续发布复验、PR及远程CI见EVIDENCE第21节，历史表格保留开发轮结果。

## 范围和判断条件

第1—6步：Electron管理Python、随机本机端口/启动令牌、白名单preload、四股票固定行情与K线、持久会话/消息/运行/事件、规则假模型调用Python工具、取消/超时/中断、快照恢复与SSE续读去重。第7步只建立统一验证、离线CI文件、干净源码检查和说明，不增加业务功能。

只有完整统一检查及干净源码实际启动/桌面流程通过后，才标为“可发布（假模型与模拟数据源码首版）”。任何失败尚未解决时不标。用户亲自操作记录与自动实窗观察分开；不能观察的项目写待人工验收，不用构建替代桌面证明。第7步开发轮不提交、推送、打标签或创建Release；后续用户另授权提交/PR交付，不等于已创建版本标签或Release。

## 可重复入口

```cmd
cd /d "D:\folio\research-trail"
call bun install --frozen-lockfile
uv sync --project services\backend --frozen
call bun run prepare:desktop
call check.cmd
call bun run verify:clean
```

前三步和干净源码中的依赖准备允许下载；check.cmd验收不安装依赖、只允许本机通信。无真实模型API、行情API、账户、收费评测或追踪。已有FakeModelProvider的本机确定性函数用于验证工具调用，不是LLM推理。全部运行数据在独立临时目录，不访问日常库。

## 验证记录

| 项目 | 本轮结果 | 证据/范围 |
| --- | --- | --- |
| Python完整pytest | 73通过、无跳过；1条上游弃用提示 | 原72项＋Python子进程离线策略；行情、未知股票、工具/模型回复失败、取消/超时竞争、正常/硬退出恢复、快照与事件隔离/续读 |
| 契约、前端类型与构建 | 通过 | Pydantic→OpenAPI→生成TS；人为契约过期在临时副本被check.cmd拒绝，退出码1 |
| 离线策略/SSE适配 | 8通过、无跳过 | 原SSE/适配5项＋Node离线3项；外部TCP/DNS拒绝、本机允许、子进程继承；半帧、续读、重复帧、终态空流；无真实模型调用 |
| 实窗集成 | 12通过、无跳过 | 页面身份/非空/无overlay/目标流程console error或warning、实际画布、错误、取消、重启、刷新、去重和所属退出；真实Electron独立分区外部请求被阻止 |
| 重复迁移 | 通过 | 仓库外临时库两次upgrade、current=0003_lifecycle (head)、check无新升级操作；无新迁移 |
| 干净源码安装/验收 | 通过 | 导出86份源码；新安装71个前端包、28个Python包，显式准备Electron；副本完整73/8/12项和类型/构建/迁移通过 |
| 根CMD真实启动及操作链 | 通过 | 依赖已准备的离线模式start-dev.cmd，两次真实Vite/Electron：选股→会话→行情→取消→关窗/重启；完整快照相同、4消息/2运行、获取时间不变、无进程残留 |
| CMD失败返回 | 通过 | 临时副本契约漂移/缺Electron标记均check.cmd非零退出；根start-dev.cmd离线缺二进制也在开窗前失败、不下载；恢复后完整操作链通过 |
| GitHub Actions | actionlint静态通过，远程未执行 | actionlint 1.7.12官方归档SHA256已核对；只读Windows作业，准备/离线验证分开，固定Action SHA，无schedule或业务密钥 |
| 用户亲自操作 | 待用户填写 | 下方清单不代用户勾选 |

实际检查文件：后端`test_market.py`、`test_agent.py`、`test_run_lifecycle.py`、`test_snapshot_stream.py`及`test_offline_policy.py`；桌面`tests/desktop.test.cjs`、`tests/stream.test.cjs`、`tests/offline.test.cjs`与独立`tests/clean-start.cjs`。测试分别验证成功、明确失败、取消/超时/中断和历史读取，不把失败响应包装成成功。新增验收工具的问题（Windows路径转义、Electron策略加载时机、延迟二进制准备及独立分区保护）已解决并复验，未改业务代码、fixture价格或Agent。

桌面QA环境：Windows、Node.js 24.19.0、Bun 1.4.2、uv 0.12.8、Python 3.12.14、Electron 44.5.1。Browser plugin not available，使用已有Playwright Electron及CDP连接真实CMD窗口；dist页面和127.0.0.1随机Vite地址均已观察，标题为“研迹 · ResearchTrail”。默认1100×800和600×620，默认/窄窗无横向溢出、需纵向滚动看后续内容；已查看实际截图的历史/取消、模拟行情和K线，不做UI重设计。截图和测试库在仓库外，仅模拟数据，不上传。

## 你亲自操作的五段清单

建议用独立验收库，避免把演示测试混进日常历史。第一次在CMD执行：

```cmd
cd /d "D:\folio\research-trail"
set "RESEARCH_TRAIL_DB_PATH=%TEMP%\research-trail-manual-%RANDOM%.sqlite3"
echo %RESEARCH_TRAIL_DB_PATH%
call start-dev.cmd
```

保留同一CMD及输出的路径；第二次启动沿用同一路径，否则无法对照历史。关闭窗口会结束本次启动器，返回CMD。后端异常时核对原因和“重试启动”，不要批量结束python.exe。

| 顺序 | 你操作什么 | 亲自核对什么 | 你的结果 |
| --- | --- | --- | --- |
| 1 选股票 | 等“连接就绪”；依次点AAPL.US/NVDA.US/MSFT.US/TSLA.US | 卡片和图表代码、最后收盘一致；明确模拟标签；市场时间固定；重新查询价格不变 | 待填写 |
| 2 创建会话 | 切“会话与事件”，建立甲、乙；选择甲 | 空历史，乙不显示甲消息；规则演示／假模型标记 | 待填写 |
| 3 查询行情 | 甲输入“查询AAPL.US行情”点运行；展开工具状态 | tool_started→tool_result→回复→run_completed；行情189.43为固定模拟；两条消息及一张结果卡；记录获取时间 | 待填写 |
| 4 取消运行 | 选择“延迟演示”，输入“查看NVDA.US的K线”，运行后立即取消 | 已取消，工具不继续追加成功结果；重复读不重复消息/终态；切乙没有甲的结果 | 待填写 |
| 5 重启历史 | 关窗，在同一CMD再call start-dev.cmd；选甲和旧成功运行 | 原消息/事件/获取时间不变；取消仍为取消；没有新运行；若关窗前有running，重启标已中断，不自动重调 | 待填写 |

加测错误：行情页查询ZZZZ.US，明确未知且无旧卡片；会话输入“查询ZZZZ.US行情”，failed/UNKNOWN_SYMBOL而非成功；选择超时演示，明确TOOL_TIMEOUT。刷新/切会话重复读历史不增消息；单独SSE断流自动化已覆盖，关闭后端属于重启中断，不能代替断流证明。

用户验收人/时间/发现问题：待填写。学习练习见practice第7步，不代填掌握程度。

## 未验证与发布边界

真实LLM、实时行情、账户/持仓/下单、研究/组合/提醒等后续功能未实现或未验证。真实外部Provider阻塞取消、安装包、无Node/Python工具的干净机器、其他OS、迁移降级/离线SQL/备份恢复、大历史分页和长时重连压力未验证。主进程普通响应和单SSE帧上限仍为256KiB。

网络拦截为测试回归保护，覆盖当前Node/Python及桌面资源路径，不是操作系统或不可信代码安全沙箱。GitHub需要获取源码、Action、工具和包，只有安装后的验收阶段离线；工作流文件的本地检查不代表远程CI执行通过。源码可发布与已发布、真实服务可用、安装包交付分别记录。
