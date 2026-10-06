# 第13步：组合风险与股票对比验收

范围仅第13步。Python负责确定性计算与结果快照；React及Agent展示同一服务的结果。模拟/固定输入与本机自动验收通过，用户亲自操作待填写；没有真实外部请求、提交、推送或发布。第14—24步未实施。

## 固定基线与覆盖

参考Folio `ba5dcdfd31b162f5edb8b908f7f099a560389326`。方法参考`packages/shared/src/portfolio-risk/service.ts`、`compare/service.ts`和core同名契约；必要显示结构参考`PortfolioRiskPanel.tsx`/`CompareTable.tsx`。保留Python/React文件来源说明，未运行原TypeScript业务内核，未搬入原AI摘要或整套组件/依赖。原作者授权确认及未独立取得授权原文的边界沿用EVIDENCE第9—11节，不声称全仓MIT。

| 风险能力 | Python覆盖与输入 | 方法/缺口 |
| --- | --- | --- |
| 资产权重、Top1/Top5、HHI | 正数量持仓快照，同币种市值 | w=市值/持仓合计，Top5取最多5项，HHI=Σw²；现金不进分母；缺估值全部权重为— |
| 集中度/单仓 | 完整权重 | Top1>0.3高、>0.2中；单仓>0.25高、>0.15中，严格大于 |
| 行业暴露 | company.profile的sector、完整权重 | >0.5高、>0.3中；未知行业单列，不解释为零暴露 |
| 回撤信号 | 至多30根日线中的最后20根high与最新close | (窗口最高价−最新close)/最高价；>0.35高、>0.2中；不是历史最大回撤 |
| 财报窗口 | research.events明确证券、类型和带时区时间 | 分析时点后7天；不猜测CLI数字counter_id与证券的对应关系 |
| 新闻暴露 | 同币种市值前3持仓的research.news | 截止时点过去7天条数，>=4中、其他正数低；无情绪判断；跨币种不排全组合前3 |
| 单股及组合波动（新增确定性指标） | 至多30根合法日线、至少2个收益 | 样本标准差；年化√252；组合用当前权重、所有正持仓严格同日期序列 |
| 摘要/来源/限制 | Python计算DTO | 固定模板摘要；原基线LLM写摘要未移植，模型不计算数值 |

风险估值使用第12步组合快照，不采用基线“缺持仓估值时补最新quote”的回退；CSV估值是用户输入且未核验。持仓估值与行情可能不同时，均显示实际时间。模拟账户不能用真实行情、真实只读账户不能用模拟行情，SOURCE_MISMATCH不发数据请求。真实只读账户未查询时报告failed/unverified，而不是假空仓通过；风险页不自动查询账户。

| 13项对比指标 | 数据/统一口径 |
| --- | --- |
| 价格、总市值 | market.quote.last_price、company.valuation.total_market_value；company.profile.currency须等于指定币种 |
| PE、PB | pe_ttm_ratio（TTM）、pb_ratio（最新每股净资产）直接值，分别注明口径 |
| 营收增长、毛利率、ROE | company.financials直接field revenue_growth/gross_margin/roe，指定report_year的Annual，指标与证券币种匹配；同期间重复值拒绝 |
| 股息率 | dividend_ratio_ttm直接值；不从一条派息金额推断年度收益率 |
| 1M、3M、1Y价格收益 | 21/63/252交易日，(最后close/窗口起始close−1)×100；请求最多260根日线，同一行已知序列须严格同窗 |
| 分析师评级 | company.ratings明确consensus标签；不选择任意一家机构充当共识 |
| 动量 | 1M与3M收益符号不同为混合；同号且1M绝对值>=5%为强，其他为弱 |

总计固定13行，2—4个不重复证券；report_year默认2023（匹配固定模拟时期），真实查询需用户选择适当年度。财务行同一Annual期间；TTM/市场时点单列，不能说整张表来自一个财务年度。币种未知/不符、财报期间缺失/歧义、不足日线或时点不齐均为—与原因；不换汇、不补零、不计算跨币种合计、平均或评分排名。当前默认四股票模拟日线仅10根，四股票对比为partial，已知12/52单元格；完整13项成功由自造协议固定数据测试证明，不代表真实SDK字段齐全。

为满足1Y窗口，仅将market.kline查询count扩大至260；既有公开列表上限1000已足够，无需放宽序列化。其他查询count仍<=100，字典200字段、响应256KiB/深度等边界保留。官方[历史K线接口](https://open.longbridge.com/zh-CN/docs/quote/pull/candlestick)支持count上限1000，项目仍限制260；SDK版本5.2.0及依赖锁未变。这是文档与模拟协议核对，实际SDK权限、数据完整度、直接财务字段、sector/consensus/CLI事件映射均未真实验证。

## 计算假设与边界

- Decimal计算金额，完整市值保留精度；风险/对比指标输出最多8位小数，内部权重用于阈值和组合计算，不由前端或LLM重算。权重、波动、回撤用0—1比例，对比收益/财务率用百分数。
- 发布审查修复单仓/回撤阈值与动量的舍入误判：分类按未舍入值，最多8位小数仅用于显示。因此极近阈值的显示值可能等于阈值，但原始输入已超过；6项回归先失败后通过，见EVIDENCE第33节。
- rᵢ=closeᵢ/closeᵢ₋₁−1；样本σ=√(Σ(rᵢ−均值)²/(n−1))；至少3根日线。组合rᵢ=Σ当前市值权重×单股rᵢ，假设每日再平衡，不是账户真实历史收益。
- 年化乘√252是交易日数量假设；未纳入现金、费用、税、汇率、分红再投资。当前适配器不复权，拆股/分红可扭曲价格收益；不能推断未来风险。
- 日线需合法正价格、high>=close、带时区时间、每日唯一；坏行不丢弃后跨缺口计算。相邻间隔>7天保守判缺失（长假也可能因此受限），不补成日收益。组合要求全部持仓同窗；空组合/仅现金为empty，0市值权重无定义；负持仓仍由第12步明确拒绝。
- 每币种独立结果，任何持仓缺估值不按已知子集重新归一化。风险行情至多20证券；其余仍进入分母，行情缺口明确标注。缺行业/事件/新闻/权限不能被称为“没有风险”。
- 一次分析读取预算25秒、最多4个并行任务且不堆无限队列；超时ANALYSIS_TIMEOUT，未调度READ_BUDGET。运行中的最多4个提供商任务不能强行终止Python线程，沿用提供商有界超时/关闭；迟到数据不进入返回快照。分析互斥等待1秒后明确503，不伪造成功。
- Agent沿用现有运行整体/工具限时和取消：当前默认单工具2秒可能先于分析25秒预算超时；该分支保留TOOL_TIMEOUT，真实大查询性能未验证。页面IPC限时35秒。无后台自动付费查询。

## 页面与Agent同源

POST `/analytics/risk`及工具`portfolio.risk`调用同一AnalyticsService.risk；POST `/analytics/compare`及工具`stocks.compare`调用同一compare。工具白名单现在恰为market.quote/market.kline/portfolio.risk/stocks.compare，参数与返回种类/身份均校验，没有交易工具。

缓存key包含查询、完整组合输入/revision及提供商配置版本；最多32份内存结果，最长30秒复用同snapshot_id/calculated_at。主动refresh或输入变化创建新快照。提供商自身缓存命中保留原fetched_at/market_time，因此主动重新分析不承诺绕过提供商缓存。每个read显示模式、transport、缓存与时效依据；SDK/CLI失败不回退模拟。

页面和已保存工具卡均使用`renderer/analytics/Results.tsx`。保存事件携完整当时报告，历史重放不再调用行情/模型。相同查询与输入在复用期内逐字段相同，超过30秒或主动刷新后可有新时间/ID，这是新快照而不是双份计算公式。结果只内存；主动Agent工具结果会随事件写入本机忽略运行库，真实模型选择工具后会收到主动请求的组合事实，不上传到Git或诊断。

## 本机操作与手算

已按README准备依赖后，CMD：

```cmd
cd /d "D:\folio\research-trail"
call start-dev.cmd
```

1. 组合工作台选择CSV录入，预览并确认以下自造内容（原文件只放本机/Temp，不入Git）。
2. “风险与对比”→组合风险，选该组合及模拟/Longbridge，点击读取分析。USD市值1000，权重0.6/0.4，Top1=0.6、Top5=1、HHI=0.36+0.16=0.52；现金100不进分母。10根默认模拟日线可算短样本波动，不能验证真实历史。
3. 30秒内在会话选择默认假模型，输入页面给出的“分析组合<完整UUID>风险”，核对保存报告snapshot_id及计算值与页面相同。主动刷新生成新ID；修改估值/确认导入后revision变化也使旧快照失效。
4. 股票对比输入AAPL.US MSFT.US NVDA.US TSLA.US、USD/2023；模拟价格显示，缺财务与不足1M/3M/1Y为—，展开来源和限制。测试重复代码、一个或五个代码时不显示旧成功结果。
5. 在真实模式无提供商配置时检查未配置码与缺失值；无需配置凭证或发真实请求。不要把假模型会话切成已有真实模型进行本步验收。

```csv
record_type,symbol,currency,quantity,cost_price,market_price,amount
holding,AAPL.US,USD,2,100,300,
holding,MSFT.US,USD,4,50,100,
cash,,USD,,,,100
```

固定Python行情额外手算：AAPL收盘100→110→99，收益+0.1/−0.1；MSFT100→90→99，收益−0.1/+0.1。样本单股日σ=√0.02=0.14142136；按0.6/0.4权重组合收益+0.02/−0.02，日σ=√0.0008=0.02828427。此固定三根测试数据仅存在测试，未替换页面默认行情。

```cmd
cd /d "D:\folio\research-trail"
call check.cmd
```

## 实际验收与未验证

2026-10-06完整check.cmd退出0：Python334（新增45）、Node8、真实Electron26（新增4），无跳过。契约生成/一致性、TS、main/preload与renderer构建、隔离库重复upgrade/current/check通过，迁移仍0008_portfolios；未新建表/改变依赖或工作流。证据目录`C:\Users\38905\AppData\Local\Temp\research-trail-verify-dtA3Sg`。既有TestClient弃用与主chunk501.54KiB提示保留。

完整检查后复查恢复不需要的provider_normalize字典字段上限（仍原200），未放宽序列化；analytics+providers定向140项通过。其他运行源码与完整检查一致。最终152份UTF-8/54本地链接/8忽略探针/秘密与禁传文件/git diff --check通过，index为空、所属进程无残留。

| 类别 | 已观察证据 |
| --- | --- |
| 确定性与边界 | 手算权重/HHI/样本波动、严格阈值、Top5边界、空/现金/0/缺估值/不同币种/重复或坏日线/不齐窗口 |
| 对比 | 2—4校验、13项完整固定协议、指定币种/Annual/重复期间、260根收益、缺失/失败无错误汇总 |
| 同源工具 | HTTP与假模型/OpenAI模拟响应报告逐字段相同，同ID/revision；真实模型适配仍同ToolRegistry/事件链，未真实请求 |
| 实窗交互 | 实际CSV确认→风险→Agent卡、四股票表、重复参数清旧结果、缺失与提供商失败、旧风险迟到不覆盖新对比 |
| 渲染 | Windows实际Electron/Playwright；1100×800和600×680已查看，非空/无错误overlay/相关console错误警告/页面横溢出，表格窄窗有内部滚动 |
| 回归 | 第1—12步窗口/提供商/CSV/持久化/生命周期/SSE全部通过，无真实网络业务请求 |

Browser技能/插件不可用，沿用项目已安装Playwright/Electron，无新增浏览器依赖。实际截图已查看：`C:\Users\38905\AppData\Local\Temp\research-trail-step13-qa\step13-risk-wide.png`、`step13-compare-narrow.png`、`step13-missing.png`、`step13-failure.png`；原始截图/CSV/DB均仓库外，不上传。

未验证：真实Longbridge/Massive数据/权限/财务直接字段与CLI事件映射、真实模型风险/对比调用、本轮干净源码新装/远程CI、长期负载/其他OS/安装包、用户亲自操作及学习。历史第9步真实行情工具验证不证明本步真实风险成功。检查修复经过见EVIDENCE第32节。

用户操作记录：待填写。练习与三道理解题见[practice C08](../practice.md)，真实调用链见[tutorial C08](../tutorial.md)。本步完成后停止，未执行第14步。

## 第13步独立发布

用户另行授权发布已验收第13步。源码/隐私与来源审查、舍入边界修复、修复后完整检查与干净源码验收、对应PR/CI/合并分别记在EVIDENCE第33节；第32节及上文334/8/26是开发轮历史，不替代发布轮新head结果。没有新增交易接口、下一步、标签、Release或定时付费评测。
