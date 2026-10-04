# 研迹 · ResearchTrail

将行情、持仓与 AI 分析串联起来，让每次研究都有据可查。

研迹计划构建 **Electron / React 桌面界面 + Python 核心后端**的投资研究工作台。参考 [Folio](https://github.com/helsome/folio) 的功能和界面，按模块逐步移植必要组件，由 Python 实现核心业务。

## 当前状态

截至 2026-10-04：**第0/2/3/4步验收通过；第1步代码完成、自动化通过**。桌面支持四股票模拟行情、SQLite会话历史，以及调用Python数据工具的最小规则Agent。界面明确标注“规则演示／假模型”，没有真实LLM。第4步状态依据自动复验及用户本轮已验收发布确认；逐项手动与学习记录待填写。

- 默认分支 `main`；初始公开提交为 `55b1a3d`，第2步按功能分支/PR保留导入、Python新实现、修复与桌面适配提交。
- 第2步公开复用依据为用户本轮确认的原作者授权，保留适配来源与依赖声明；交付见 [PR #1](https://github.com/ydflow/research-trail/pull/1)，发布检查和授权记录见EVIDENCE第9—11节，最终提交/合并状态以Git与发布回执为准。
- 公开仓库：[ydflow/research-trail](https://github.com/ydflow/research-trail)。仅上传源码、测试、文档、依赖清单与锁文件；不包含运行数据或截图。
- 第2步已普通合并，main基线为 `0e1dfd5ccf7e99c66d58188dcac9497ddd6e2bd8`；第3步以 [PR #2](https://github.com/ydflow/research-trail/pull/2) 交付，开发与发布验证见EVIDENCE第12—13节，最终提交和合并状态以Git与发布回执为准。
- 第3步合并基线为 `7f925dee768ff33c076582dd9d41055aca9a5932`；第4步以 [PR #3](https://github.com/ydflow/research-trail/pull/3) 交付，开发及发布复验见EVIDENCE第14—15节，按功能分支/PR保留提交，最终远程状态以GitHub和发布回执为准。
- 首版 `v0.1.0`、完整版本 `v1.0.0` 都是计划，不是已发布版本。
- Folio 功能和测试属于参考项目，不代表研迹已实现或用户已完成的贡献。

## 架构与当前边界

```text
React 页面
  → Electron 白名单通信桥
    → 本机 Python / FastAPI 服务
      ├─ 模型与只读工具
      ├─ 行情 / 账户数据提供商
      ├─ 研究 / 提醒 / 评测
      └─ SQLite：会话、运行、事件及业务记录
```

Python 统一管理业务状态，前端维护显示缓存。假模型和模拟行情分别实现，后续分别替换为真实连接。真实数据来源与模型回答不能混为一谈。

行情调用链：股票选择 → `MarketPanel` → preload 的 `marketSnapshot` → Electron 主进程 → 带令牌的 `/market/snapshot/{symbol}` → Python `FixtureMarketProvider` → 同一份 `MarketSnapshot` → 行情卡片与 K 线。桥现在共16个命名操作：原健康/行情六项、会话五项、运行五项（新增startAgentRun）。端口和令牌只在主进程和后端之间使用，不传给页面；Python无reload worker，直接作为Electron子进程启动。

会话调用链：`SessionPanel` → preload白名单 → main → 带令牌的FastAPI → `Store` / SQLAlchemy事务 → SQLite。启动固定测试运行会一次提交两条消息、一条运行和七个事件，然后返回已完成的运行。事件以运行ID＋递增序号标识；main读取有限SSE响应并校验身份/顺序，页面只缓存展示，重复读取按身份去重。没有后台Agent、取消、中断恢复或自动重连，这些属于后续步骤。

规则Agent调用链：`startAgentRun` → POST /sessions/{id}/runs（kind=fake_agent）→ `Store.start_agent` → `AgentRunner` → `FakeModelProvider.plan` → `ToolRegistry.execute` → 第2步同一 `MarketProvider.snapshot` → 模型按工具结果组织回复 → 消息/事件/终态提交 → SSE与结果卡片。模型只识别“查询/查看 单一US代码 行情/K线”，价格不写在Agent中。默认无kind的API仍启动第3步固定通信测试；界面的主按钮“运行规则演示”显式选择fake_agent，次按钮保留原测试入口。

支持输入“查询AAPL.US行情”“查看NVDA.US的K线”，同样可查四只示例股票。未知意图返回当前支持范围，不调用工具；“查询ZZZZ.US行情”会经过Python工具，保存UNKNOWN_SYMBOL、tool_result.ok=false、failed运行及stop_reason=error，不生成成功卡片。成功运行有8个事件，工具失败有9个，未知意图通常6个。工具开始/结果用call_id关联，SSE仍读取已完成运行的有限记录；界面显示保存的过程，不模拟实时LLM打字。模型Provider与数据Provider分别注入，后续可各自替换。

默认数据库为项目根 `runtime/research-trail.sqlite3`，启动时自动执行Alembic `upgrade head`，迁移成功后才报告就绪。关闭应用释放数据库连接；重启继续使用同一路径，删除会话级联删除其消息、运行和事件。可用当前CMD的 `set "RESEARCH_TRAIL_DB_PATH=绝对数据库路径"` 选择独立库；测试使用临时库，不修改日常历史。运行数据库与WAL/SHM文件已忽略，不上传。

Pydantic 是业务契约来源。离线导出 OpenAPI 后，`openapi-typescript` 生成 `packages/contracts/generated.ts`，页面通过类型别名消费，未手写第二份 Quote/Kline。`bun run check` 同时检查契约是否过期。

模拟数据支持 `AAPL.US`、`NVDA.US`、`MSFT.US`、`TSLA.US`，每只10根日线；价格是本项目编写的示例，不是历史交易所记录。固定市场时间为 **2024-01-16 21:00 UTC**，每次数据调用另记 `fetched_at`。行情接口未知代码返回404；Agent工具错误保存为失败运行。界面明确显示“模拟数据”。规则模型独立于行情Provider，不是真实LLM；重读工具结果卡片保留当时获取时间，不查询新的行情。

## 开发与学习路线

| 阶段 | 内容 | 当前状态 |
| --- | --- | --- |
| 0 | 项目约定、本地 Git、路线与学习大纲 | 验收通过 |
| 1 | 桌面启动、Python 健康通信、重试与退出清理 | 代码完成/待验收；自动化通过 |
| 2 | 模拟行情与K线、股票选择、OpenAPI类型 | 验收通过；自动化复验及用户发布确认，手动记录待补 |
| 3 | SQLite会话/消息/运行/事件、有限SSE读取 | 验收通过；29项Python、8项实窗复验及用户发布确认，手动记录待补 |
| 4 | Python工具注册、最小规则Agent、过程与结果卡片 | 验收通过；自动复验＋用户发布确认 |
| 5—7 | 取消恢复、完整对话与首版验收 | 未开始 |
| 8—13 | 设置与凭证、真实模型/行情、市场工作台、组合及对比 | 未开始 |
| 14—20 | 能力技能、研究策略/报告/恢复、论点、筛选与事件 | 未开始 |
| 21—24 | 提醒与 Today、评测、研究结果校准、Windows 交付 | 未开始 |

每次只执行用户发送的一步，运行验证后再决定上传或下一步。界面逐步复用，Python 核心按功能实现；不导入整套 TypeScript 后端同时管理业务。

## 材料入口

- [项目执行约定](AGENTS.md)：目录、技术栈和停止边界。
- [路线与功能对照](docs/ROADMAP.md)：25 步进度及验收标准。
- [来源与验收证据](docs/EVIDENCE.md)：来源、个人动作、实际检查与未验证事项。
- [源码学习大纲](tutorial.md)：按调用链阅读参考源码，随后映射到 Python 实现。
- [阅读引导与练习](practice.md)：课程练习和用户回答位置。

## 目录

```text
research-trail/
├─ AGENTS.md
├─ README.md
├─ .gitignore
├─ docs/
│  ├─ ROADMAP.md
│  └─ EVIDENCE.md
├─ tutorial.md
├─ practice.md
├─ package.json / bun.lock
├─ start-dev.cmd
├─ scripts/            # 构建与开发启动器
├─ tests/              # Electron 实窗自动化
├─ apps/desktop/       # main、preload、React 健康/行情/会话页
├─ services/backend/   # Python API、Store、SQLAlchemy、Alembic迁移、测试与锁文件
└─ packages/contracts/ # 生成的 openapi.json 与 generated.ts
```

参考组件的适配来源和依赖声明见 EVIDENCE.md 第8节及 docs/third-party。

## CMD 一条命令启动

本机需有 Bun、uv 和 Node.js 24；Python 3.12 由 uv 管理。首次同步依赖或下载 Electron 需要网络。脚本只在本项目同步锁定依赖，不修改系统执行策略。

```cmd
"D:\folio\research-trail\start-dev.cmd"
```

脚本依次执行 `bun install --frozen-lockfile`、`uv sync --project services\backend --frozen`，离线生成 OpenAPI/TypeScript 契约，然后打开 Vite + Electron；Electron 再启动本项目虚拟环境中的 Python。React 修改支持热更新，main/preload/Python 修改后关闭窗口重新运行脚本。

正常界面显示“连接就绪”和“运行正常”；点击“重新检查”会做真实健康请求。启动失败或后端退出时显示原因与“重试启动”。关闭窗口会通知 Python 退出，终端随后结束 Vite；不按进程名称结束其他项目。

### 手动验收（待用户完成）

1. 执行上面一条命令，确认真实桌面窗口出现并显示健康。
2. 点击“重新检查”，观察检查时间更新。
3. 关闭窗口，确认启动命令结束。故障、重试与两实例隔离已通过自动化；用户可按 practice.md 在本机复验。
4. 分别选择四只股票，确认卡片代码与图表代码相同，最后收盘等于卡片价格；所有数据带模拟标签。
5. 输入 `ZZZZ.US` 查询，确认明确错误且不保留其他股票的卡片/图表。
6. 选择有效股票，记下价格与两种时间；点击“重新查询”，确认获取时间更新，固定市场时间和价格不变。
7. 切到“会话与事件”，创建甲、乙会话，各输入不同文字并启动固定测试；切换后只显示本会话消息和运行，事件为1—7。
8. 点击“重新读取事件”两次，确认仍为七项且历史不增加；关窗再启动，确认两会话历史仍在。
9. 删除甲会话，确认乙的消息、运行和事件仍在。删除操作会移除当前会话的本地历史。
10. 新建会话，输入“查询AAPL.US行情”，点击“运行规则演示”：核对规则/模拟标签、行情卡片，以及tool_started→tool_result→回复→run_completed；再输入“查看NVDA.US的K线”，核对10根日线和回复最后收盘一致。
11. 输入“你好”，确认说明支持范围且没有工具结果卡片；输入“查询ZZZZ.US行情”，确认运行失败、UNKNOWN_SYMBOL和失败卡片，没有旧行情结果。
12. 选择旧运行、重读事件、关窗再打开，确认原结果及获取时间保持不变。fixture改价练习见practice第4步，不能改Agent价格或测试预期。

## 可重复的 CMD 检查

```cmd
cd /d "D:\folio\research-trail"
git status --short --branch
git symbolic-ref --short HEAD
git remote -v
type README.md
bun run check
bun run build
uv run --directory services\backend --frozen python -m pytest -q
bun run test:desktop
```

检查记录见 EVIDENCE.md。Electron 自动化会打开并关闭测试窗口；它验证开发源码，不代表安装包验收。没有配置或调用真实模型、行情或账户。

修改 Python 契约后执行 `bun run contracts:generate`，再执行上述检查。生成器使用 TypeScript 5.9.3 编译器 API，与其 peer 约束兼容。

手动检查迁移（关闭应用后，在同一CMD执行）：

```cmd
cd /d "D:\folio\research-trail"
uv run --directory services\backend --frozen python -m alembic -c alembic.ini upgrade head
uv run --directory services\backend --frozen python -m alembic -c alembic.ini upgrade head
uv run --directory services\backend --frozen python -m alembic -c alembic.ini current
uv run --directory services\backend --frozen python -m alembic -c alembic.ini check
```

`current`应显示 `0002_agent (head)`，`check`确认模型与迁移一致。第4步迁移只给运行增加可空的模型标记/错误字段，旧第3步历史保留；重复upgrade不清空历史。迁移降级与离线SQL导出未验证。

## 来源与公开边界

参考目录：`D:\folio\主分支和简历skill\folio-main`，只读。原 ZIP 记录来源 commit `ba5dcdfd31b162f5edb8b908f7f099a560389326`；它是来源标识，不等于本地解压目录有 Git 历史。

第1步为本项目新实现；第2步局部适配 Folio 的 Watchlist、QuoteCard、FinancialKLineChart，保留逐文件来源说明，未导入原 TypeScript 后端、图片或完整工作台。用户本轮确认已获原作者复用授权，并明确授权本步公开上传；依该确认执行本步公开范围，未独立取得授权原文，不由 `skills/LICENSE` 推定 Folio 全仓 MIT。图表库 klinecharts 10.0.3 的 Apache-2.0 LICENSE、NOTICE 及所带第三方许可保存在 `docs/third-party/klinecharts`。详细记录见 [证据文档](docs/EVIDENCE.md)。

模型密钥、真实账户资料、运行数据库和私人日志不纳入版本控制。项目目标是研究与只读分析，计划不包含交易下单或盈利承诺。
