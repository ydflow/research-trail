# 研迹 · ResearchTrail

将行情、持仓与 AI 分析串联起来，让每次研究都有据可查。

研迹计划构建 **Electron / React 桌面界面 + Python 核心后端**的投资研究工作台。参考 [Folio](https://github.com/helsome/folio) 的功能和界面，按模块逐步移植必要组件，由 Python 实现核心业务。

## 当前状态

截至 2026-10-04：**第 0 步验收通过；第 1 步代码完成，自动化验证通过，待用户手动验收**。现在可运行最小 Electron / React 窗口和 Python 3.12 / FastAPI 健康服务；行情、Agent 和会话存储均未实现。

- 默认分支 `main`；本次源码交付包含第0步项目资料和第1步桌面健康链，提交记录以Git历史为准。
- 公开仓库：[ydflow/research-trail](https://github.com/ydflow/research-trail)。仅上传源码、测试、文档、依赖清单与锁文件；不包含运行数据或截图。
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

第 1 步已实现：React → 四个白名单 preload 接口 → Electron 主进程 → 带令牌的本机健康请求 → Python。其余业务链仍是计划。端口和令牌只在主进程和后端之间使用，不传给页面；Python 无 reload worker，直接作为 Electron 子进程启动。

## 开发与学习路线

| 阶段 | 内容 | 当前状态 |
| --- | --- | --- |
| 0 | 项目约定、本地 Git、路线与学习大纲 | 验收通过 |
| 1 | 桌面启动、Python 健康通信、重试与退出清理 | 代码完成/待验收；自动化通过 |
| 2—7 | 模拟行情、会话保存、假模型工具、取消恢复、首版验收 | 未开始 |
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
├─ apps/desktop/       # main、preload、React 健康页
├─ services/backend/   # Python 健康服务、测试、uv.lock
└─ packages/contracts/ # 空目录，类型契约按步骤建立
```

空目录不由 Git 单独追踪；后续新增真实文件后才会出现在提交中。

## CMD 一条命令启动

本机需有 Bun、uv 和 Node.js 24；Python 3.12 由 uv 管理。首次同步依赖或下载 Electron 需要网络。脚本只在本项目同步锁定依赖，不修改系统执行策略。

```cmd
"D:\folio\research-trail\start-dev.cmd"
```

脚本依次执行 `bun install --frozen-lockfile`、`uv sync --project services\backend --frozen`，然后打开 Vite + Electron；Electron 再启动本项目虚拟环境中的 Python。React 修改支持热更新，main/preload/Python 修改后关闭窗口重新运行脚本。

正常界面显示“连接就绪”和“运行正常”；点击“重新检查”会做真实健康请求。启动失败或后端退出时显示原因与“重试启动”。关闭窗口会通知 Python 退出，终端随后结束 Vite；不按进程名称结束其他项目。

### 手动验收（待用户完成）

1. 执行上面一条命令，确认真实桌面窗口出现并显示健康。
2. 点击“重新检查”，观察检查时间更新。
3. 关闭窗口，确认启动命令结束。故障、重试与两实例隔离已通过自动化；用户可按 practice.md 在本机复验。

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

## 来源与公开边界

参考目录：`D:\folio\主分支和简历skill\folio-main`，只读。原 ZIP 记录来源 commit `ba5dcdfd31b162f5edb8b908f7f099a560389326`；它是来源标识，不等于本地解压目录有 Git 历史。

当前未导入 Folio 业务代码或图片，第 1 步为本项目新实现。复用时记录出处、保留版权与适用许可。只查到上游 `skills/LICENSE` 的 MIT 文本，整项目授权未核实；本仓库不自行声明全仓 MIT。详细记录见 [证据文档](docs/EVIDENCE.md)。

模型密钥、真实账户资料、运行数据库和私人日志不纳入版本控制。项目目标是研究与只读分析，计划不包含交易下单或盈利承诺。
