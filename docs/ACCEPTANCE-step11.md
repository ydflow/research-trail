# 第11步：证券工作台验收（2026-10-06）

本文件保留第11步开发轮验收快照；独立发布轮复验见[EVIDENCE第29节](EVIDENCE.md)。本轮仅第11步开发与本机模拟验收。用户此前明确尚未配置数据凭证、先完成模拟验收；没有真实模型、行情、账户请求，不读取已配置模型Key。没有组合、研究报告、下单、交易或第12步实现；未提交或发布本步。

## 本机入口

已有锁定依赖与Electron二进制的CMD：

```cmd
cd /d "D:\folio\research-trail"
set "RESEARCH_TRAIL_OFFLINE=1"
call start-dev.cmd
```

打开“证券工作台”。默认Longbridge模拟数据，初始四股票保持Fixture原顺序。左侧加入/选择/移除由Python存储，最多20只；自选视图每组最多查询4只。证券概览、行情、K线、财务报表、新闻、市场状态共享当前股票，关闭再打开保留自选与股票。清空自选后重启不重新填入默认股票。

切换提供商/模式/股票/视图会清除旧显示；模拟自动查询，真实模式只在显式点击查询后请求。真实失败不回退模拟，未配置、权限受限、缺失数据、能力不支持、提供商失败分别有说明和固定错误码。Massive当前覆盖仅美股profile/quote/kline；其余视图如实不支持，不用Longbridge模拟结果冒充。

缺失数字、币种、报告期、发布时间、市场时间均显示“—”；数值0仍显示0。不根据请求时间补市场时间，不计算不存在的财务指标或跨币种合计。模拟K线仍为固定日线样例，选择分钟/周线只验证参数和图表配置链，不证明真实周期数据。模拟财报为自造年度样例，展示返回报告期，不证明半年度/季度接口。新闻原始合法HTTP(S)链接保持路径/参数/片段，点击经主进程打开；缺链接显示“—”，不生成供应商主页替代。

## 三态案例矩阵

每格均有Python API和真实Electron窗口断言，合计各21个视图案例；成功表示模拟数据返回，不表示真实服务权限。

| 视图 | 模拟成功 | 缺失数据 | 提供商失败 |
| --- | --- | --- | --- |
| 自选列表 | 四只独立quote/来源卡片 | 每只缺失，价格— | 每只NETWORK_ERROR，无旧价格 |
| 证券概览 | profile/valuation独立指标卡 | 缺指标—，不填零 | 两能力独立失败 |
| 行情 | AAPL示例189.43及统计 | 所有缺指标— | 固定错误，无旧行情 |
| K线 | 真实画布loader/代码/收盘一致 | 无画布，暂无K线 | 无画布，固定错误 |
| 财务报表 | IS/BS/CF及现金流0 | 空表说明— | 错误与无报表 |
| 新闻 | 自造条目/原始示例链接 | 空列表，暂无新闻 | 错误，无伪造新闻 |
| 市场状态 | 当前US市场/固定时钟/Closed | 状态及时间— | 错误，不猜测休市 |

成功夹具中的资讯链接是example.com示例，不是真实新闻。本机missing/failure/delayed仅可在RESEARCH_TRAIL_OFFLINE=1时由测试启动变量注入，不是产品/API可选择的假成功开关。

## 实际检查

```cmd
cd /d "D:\folio\research-trail"
set "RESEARCH_TRAIL_QA_DIR=%TEMP%\research-trail-step11-qa"
call check.cmd
```

统一离线入口：Python254、Node8、Electron19项通过，无跳过；契约一致性、TS、构建、临时库重复upgrade/current/check通过，迁移head为0007_security_workspace。新增Python29项与Electron4项，涵盖三态矩阵、自选重启/清空/重复/并发/上限、0006旧库升级保留会话和配置、迟到AAPL不能覆盖NVDA、跨页/离开/重入/重启保持、删除当前股票回退、实际周线chart配置、Massive不支持/未配置真实路径无回退、安全新闻链接。保留原测试严格回归；仅既有TestClient/httpx弃用提示。

Playwright驱动真实Electron，标题“研迹 · ResearchTrail”，URL为本机apps/desktop/dist/renderer/index.html，窗口1100×800和600×680。非空/无Vite overlay、应用console warning/error或pageerror、无横向溢出；截图复核后修正移除按钮继承全局宽度造成股票代码竖排，并加入实际代码文本盒宽/高断言。新闻点击用主进程shell.openExternal桩验证完整原URL，无外部导航。Browser plugin not available，采用项目既有Playwright，无新增浏览器依赖。

截图只在上面系统临时目录，另有news-content-compact图显示窄窗口内容。验收库、日志、缓存不进入源码，不枚举系统凭证。来源及实际轮次见[EVIDENCE第28节](EVIDENCE.md)，调用链见[tutorial](../tutorial.md)，练习见[practice](../practice.md)。

## 仍未验证

真实Longbridge/Massive SDK/CLI/HTTP数据、新闻链接内容、财报字段及周期完整性、实际权限/时效/外部失败、缓存长期负载和全部分页、CLI本机兼容性、用户亲自清单/练习、干净源码重新安装/其他OS/安装包、远程CI。用户未配置不等于权限受限；失败/受限用模拟响应检验。需要真实查询时沿用[第10步本机配置与受限查询入口](ACCEPTANCE-step10.md)，密钥只在本机输入，不发送聊天；本轮没有执行该入口。

用户亲自操作结果及三题回答：待填写，不由自动化代填。
