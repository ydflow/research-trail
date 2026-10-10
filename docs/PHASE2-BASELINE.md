# 第二阶段 P2-01：工程回归基线

核查日期：2026-10-10（Asia/Shanghai）。本轮授权仅工程基线、pi 架构核实与文档；P2-02 尚未实施。本文件与 [pi 架构决策](PHASE2-PI-ARCHITECTURE.md) 配套。

## 1. 证据等级与执行边界

- **已从源码确认**：阅读当前仓库代码得出的行为；不等于实际调用过真实服务。
- **实际测试通过**：本轮执行命令、日志和退出状态支持的本机离线结果。
- **架构建议**：下一步的接口、开关、进程与部署方案，当前未实现。
- **尚未验证**：pi 真实运行、模型/行情/账户/收费 API、远程 CI、独立 Windows 和新安装包。

未安装依赖、修改系统环境、改业务代码、迁移或生成契约；未 add/commit/push/PR/发布。本轮公开网络读取仅用于官方源码、发行与 npm 元数据查证，不运行真实模型或行情。自动检查允许 loopback 本机协议夹具。

## 2. 起点与依赖

| 检查项 | 本轮实测 |
| --- | --- |
| 用户会话初始 cwd | `<项目父目录>` |
| 本轮命令 cwd / Git 根目录 | `<repo>` / `<repo>` |
| 分支 / HEAD | `main` / `7d12da5204d7119dbd71818bbeaa8207b6aeb731` |
| origin fetch / push | `https://github.com/ydflow/research-trail.git` |
| 起始 status / unstaged / staged | 空 / 空 / 空；没有待保护的已有差异 |
| Node / Bun / uv | `v24.19.0` / `1.4.2` / `0.12.8` |
| 项目 Python | `services/backend/.venv/Scripts/python.exe`，`3.12.14`，Windows AMD64 |
| 全局 python | 命令解析到 WindowsApps 的 `python.exe`；`python --version` 未给出版本，不能据此认定系统解释器就绪；验收用项目虚拟环境 |
| Electron / 内置 Node | 实际运行本地 Electron 读取 `process.versions`：`44.5.1` / `24.21.0` |
| 已有依赖 | 根和桌面 `node_modules`、项目 `.venv` 存在；verify 检查 Electron 二进制并实际启动实窗 |
| pi 本项目依赖 | 根/桌面 package.json 与 bun.lock 搜索未发现 pi；未安装、未执行 pi |

根 AGENTS.md 已读取，`<项目父目录>`、`<磁盘根目录>` 未发现父级 AGENTS.md；仓库文件清单只发现根约定。README、ROADMAP、EVIDENCE 历史索引与当前发布回执已核对；历史 v1.0.0 证据不计入本轮新验收。

## 3. 已从源码确认的运行链

| 范围 | 关键源码与确认结果 |
| --- | --- |
| 请求入口 | `apps/desktop/src/renderer/SessionPanel.tsx` → preload `startAgentRun` → main `index.ts` 的 `runs:agent` → `backend.ts` 的 `POST /sessions/{id}/runs` → Python `app.py:start_run` |
| Agent | `app.py:create_app` 默认 `FakeModelProvider` + `market_tools`，追加 `portfolio.risk` / `stocks.compare`；真实模式另建 `OpenAIModelProvider`，共用注册表，交给 `lifecycle.py:RunManager.start/execute` → `agent.py:AgentRunner.run` |
| 消息协议 | `model_provider.py` 的 Protocol 是规则 `plan/respond`；`agent.py:RuleDialog` 适配到 `complete(messages, tools, stop, deadline)`。这不是现成统一 AgentEngine 接口 |
| 模型传输 | `openai_provider.py` 使用 Chat Completions、`stream=False`，无重试、重定向或环境代理；一次配置快照。最大请求 1MiB，响应 256KiB，错误/取消/请求和整体超时有界 |
| 工具与预算 | Agent 先校验整批：ID 格式/重复、参数 JSON 重复字段/4096 字符、白名单及 Pydantic；最多默认 8 轮且累计 8 次，再顺序执行。最终答复非空且 ≤4000 字符 |
| 业务工具 | `tools.py:ToolRegistry` 从 `capabilities.py` 获取定义；`decode/execute` 二次校验、返回类型/证券/来源/模式一致性检查。行情/K线是 fixture；风险/比较经 Python Analytics/Provider，不能整体宣称都是真实或都是模拟 |
| 唯一终态 | `lifecycle.py` 持有 worker、stop 和计时器；`store.py:finish` 的事务仅允许 running→terminal，晚回调不得改写。`database.py` 写事务使用 `BEGIN IMMEDIATE` |
| 事件与显示 | Store 校验 envelope 并分配每 run 的 sequence；`app.py:stream_events` 读取已提交事件 → `run-stream.ts` 验身份、完整帧、连续序号、断线续读 → preload → SessionPanel 先快照再订阅。SSE 流不是当前模型 token 流 |
| 恢复 | 通用会话 `Store.recover_interrupted`：保留结果、标 interrupted，不恢复工具循环；`research.py` / `research_store.py` / `research_checkpoints.py` / `research_recovery.py`：研究采集事务检查点、generation 隔离、成功证据复用、显式 resume/restart/abandon；resume 不自动生成模型报告 |
| 报告 | `reports.py` / `report_synthesis.py` 从冻结采集包生成与验证报告；不是通用 AgentRunner 的同一执行链。结果、证据、版本、评测继续由 Python 管 |
| Windows | `backend.ts` 管所属 Python 子进程；`packaged-launch.ts` 生产环境白名单并固定用户库；`package-backend.py` PyInstaller onedir；`package-windows.mjs` Electron/NSIS、资源/许可/构建身份检查，没有 Node worker 打包入口 |
| K线基线 | `FinancialKLineChart.tsx` 使用 `klinecharts 10.0.3`，秒转毫秒、UTC、symbol/period/resetData、ResizeObserver/dispose；真实 canvas loader 验收已有测试。增强指标/分页或板块热力图不能从该组件现有能力推定完成 |

用户列出的全部 14 份文件已读取；额外追到 app/lifecycle/database/capabilities/reports/checkpoints、桌面 main、打包与 CI。有关 pi 的官方固定源码范围另见架构文档。

## 4. 本轮实际回归

实际入口（PowerShell，日志在仓库外）：

```powershell
bun.cmd run verify *> "$env:TEMP\research-trail-p2-01-verify.log"
```

`scripts/verify.mjs` 不安装依赖；删除子环境中凭证、代理与开发覆盖变量，设置 `RESEARCH_TRAIL_OFFLINE=1`、`UV_OFFLINE=1`、`UV_NO_SYNC=1`、`UV_PYTHON_DOWNLOADS=never`。Python `scripts/offline/sitecustomize.py` 和 Node `scripts/offline/network.cjs` 阻止外部连接，使用临时迁移库。护栏是回归探针，不是操作系统安全沙箱。

| 检查 | 状态 / 证据 |
| --- | --- |
| 项目 Python 版本断言 | 通过，3.12.14 |
| OpenAPI / TypeScript 一致性 | 通过，`contracts.mjs --check`；未重生成 |
| 前端 tsc | 通过，`tsc --noEmit` |
| 原生声明离线核验 | 通过，263 external crates / 9 local crates / 471 license texts；不是 pi 依赖许可审计 |
| Python 全套 | 通过，696 passed，1 warning，201.74 秒 |
| 原创离线工程评测 CLI | 通过，12/12，model_requests=0、external_uploads=0 |
| 原创历史观察 CLI | 通过，30 authored samples，可复现，real_model_requests=0、real_provider_requests=0；不是投资实绩 |
| 临时库 Alembic | 连续两次 upgrade head、current、check 通过；`0020_research_quality (head)`，No new upgrade operations detected |
| Node 离线/传输/打包环境/Markdown/声明 | 通过，19 tests，19 pass，fail/cancelled/skipped/todo=0 |
| main / preload / renderer 构建 | 通过；输出在已有 ignored dist，未修改受控业务或生成契约 |
| 实际 Electron 完整集成 | 通过，58 tests / 58 pass，fail/cancelled/skipped/todo=0，410.03 秒 |
| 文档路径、UTF-8、diff 与范围 | 最终本地静态核验，回执见第8节 |

相关测试并非仅查名称：已阅读 `test_agent.py` 的 Provider 调用/数据变化断言，`test_openai.py` 的 MockTransport/整批白名单/重复 ID/预算/反射凭证/取消，`test_run_lifecycle.py` 的三方终态竞争与迟到结果，`test_snapshot_stream.py` 的事务水位与零重执行，`test_recovery.py` 的成功字节与时间复用/generation 防旧写；Node stream tests 的撕裂帧/重连/去重/终态水位；Electron canvas 与持久会话/取消/重启等真实断言。

## 5. 阻塞、警告与未执行项目

- 当前离线基线依赖已齐备，无安装阻塞；完整 verify 退出0，Python/Node/Electron 全套通过。
- 已有 Starlette/httpx TestClient 弃用警告；Vite 主 chunk 510.24kB，提示大于 500kB。均为本轮通过检查中的警告，不在文档步骤修改依赖或 UI。
- pi 未加入锁文件、未运行。ESM import、JSON Schema/TypeBox 映射、子进程双向桥、批次许可、退出竞态、冻结包进程清理和额外体积尚未验证；这是下一步工程门槛，不冒充失败测试。
- `verify:clean` 未执行：会重新准备锁定依赖，与本轮不安装/不下载约束冲突。
- GitHub CI 未触发/未复验；只核对现有 `.github/workflows/offline-checks.yml`：准备阶段可联网，验收阶段运行 `check.cmd`。本机成功不代表新远程 CI 通过。
- Windows 新打包、安装/升级/卸载、独立干净 Windows、pi/Node 发布许可闭包与运行体积：未执行。
- 真实模型、行情、账户、收费 API、外部追踪：未执行；不读取用户真实凭证或个人库。
- 用户亲手桌面操作、体验/报告质量与下列练习：待人工验收。
- 探索读取曾遇到不存在的 `runner.py`、`tests/helpers.cjs` 和旧 pi `providers/openai-completions.ts` 路径，随后通过 rg 定位真实 `lifecycle.py`、desktop test 内置 launch 和 `api/openai-completions.ts`；不将这些定位错误记为产品回归失败。固定 pi agent 源码另以 GitHub Contents API 的 blob 与 raw 字节一致校验。

## 6. Windows CMD 复核

已有依赖齐备时直接执行，缺依赖即停止并记录，不运行安装命令：

```cmd
cd /d "<你的研迹目录>"
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git diff --stat
git diff --cached --stat
node --version
call bun.cmd --version
uv --version
services\backend\.venv\Scripts\python.exe --version
call bun.cmd run verify > "%TEMP%\research-trail-p2-01-recheck.log" 2>&1
echo %ERRORLEVEL%
type "%TEMP%\research-trail-p2-01-recheck.log"
git diff --check
git status --short
git diff -- docs\ROADMAP.md docs\EVIDENCE.md
type docs\PHASE2-BASELINE.md
type docs\PHASE2-PI-ARCHITECTURE.md
```

新增文件未暂存，普通 `git diff --stat` 不包含它们；用 status/type 复核，不为显示 diff 执行 git add。

## 7. 亲手练习与理解题

练习（待用户执行）：阅读 `agent.py` 的整批校验和 `store.py:finish`，画出“查询AAPL.US行情”从模型提议到保存终态的 5 个节点，圈出 **工具执行前** 和 **终态保存前** 两个校验位置。不改代码、不配置模型、不访问真实账户。

1. 为什么界面收到 SSE 的 text_delta，并不能证明当前模型使用 token streaming？
2. 如果取消与工具迟到结果同时发生，哪个模块决定最后状态？为什么不能由 pi 的 agent_end 直接决定？
3. 为什么研究采集 resume 可以复用成功证据，而打开会话历史或重放事件不能重新执行工具？

P2-01 完成后停止，P2-02 仅为架构文档中的建议范围。

## 8. 最终交付回执

`bun.cmd run verify` 完整退出0；696 Python / 19 Node / 58 实际 Electron、两项原创 CLI、契约/类型/声明/重复迁移/构建全部通过。日志：`%TEMP%\research-trail-p2-01-verify.log`；临时迁移库：`%TEMP%\research-trail-verify-rSy9nC\migration.sqlite3`。未重跑未变业务代码，不把既有发布/CI或模拟结果换写成新真实服务证据。

最终差异仅新增两份 PHASE2 文档、最小更新 ROADMAP/EVIDENCE；HEAD、分支未变，索引空。UTF-8/本地文档链接/源码路径/允许改动范围与 `git diff --check` 核验结果由本轮最终命令回执支持。测试输出仅 Temp 与已有 ignored 构建/缓存；没有业务源码、锁文件、迁移或生成契约差异。本机离线/文档范围验收通过，pi 真实接入、人工体验和安装分发门槛继续标未验证。
