# 第19步：17个固定筛选任务与机会发现

2026-10-07（Asia/Shanghai）。开工基线main
`c4e1679b4463835530c3648c3f698fdaa9f0a766`，第18步PR #17已普通合并。
本步仅本机开发与验收，不提交、推送或发布，不实现第20步事件日历。

## 固定规则及小股票池验收

以下常数和分数来自固定Folio `ba5dcdfd` 筛选基线；Python使用未四舍五入的Decimal比较。
clamp表示限制在0至1，分数不是收益概率。每项测试使用AAPL.US、MSFT.US、NVDA.US
三只固定股票，分别构造满足边界、边界外和缺指标输入。测试数据不是当前市场行情。

| 任务 | 必需能力 | 入选规则 | 固定评分 |
| --- | --- | --- | --- |
| top-gainers | quote | 涨跌幅≥1% | clamp(涨跌幅/10) |
| top-losers | quote | 涨跌幅≤-1% | clamp(-涨跌幅/10) |
| high-volume | quote、valuation、kline | 明确量比≥1.5；缺现成量比用最新量/前20根均量 | clamp((量比-1)/2) |
| unusual-movement | kline、valuation、sentiment | 振幅≥2%，振幅/前20根平均振幅≥1.5 | clamp(振幅比-1) |
| low-valuation | valuation | 0<PE<15 或 0<PB<1.2 | 正PE/PB对应clamp((22.5-PE)/22.5)、clamp((3-PB)/3)取最大 |
| high-roe | financials | ROE≥15% | clamp(ROE/30) |
| revenue-growth | financials | 营收同比≥10% | clamp(同比/40) |
| high-dividend | valuation、dividends | 股息率≥3%，必须取得股息记录列表 | clamp(股息率/8) |
| quality-growth | financials | ROE≥15%、净利率≥10%、营收同比≥5% | clamp((ROE/30+同比/40+净利率/20)/3) |
| strong-momentum | kline | 21交易日收益≥5%、63交易日收益≥10% | clamp((21日收益/20+63日收益/60)/2) |
| breakout | kline | 收盘>前20根最高价，量≥前20根均量1.5倍 | clamp(量比/3) |
| oversold | kline | 偏离SMA20≤-8%、63交易日收益≤-10% | clamp((-偏离-8)/20) |
| trend-reversal | kline | 63日收益<0、5日收益>0、收盘>SMA5 | 基线二元规则，无数值分数 |
| upcoming-earnings | events | 同股票financial事件在参考时间至30天内（含两端） | clamp(1-ceil(距事件天数)/30) |
| rating-changes | ratings、quote | 明确buy/strong_buy评级，明确目标价较实际现价空间≥5% | clamp(空间/40) |
| news-surge | news | 过去7天至参考时间内≥3条去重新闻 | clamp(条数/10) |
| dividend-events | dividends | 明确除息日在参考时间至90天内（含两端） | clamp(1-ceil(距事件天数)/90) |

能力全名由Python任务列表返回：行情为market.*，公司为company.*，新闻和事件为research.*。
默认模拟样例缺ROE、评级目标价、除息日等时如实缺失，不为让演示有结果而补数字。
默认样例可用“跌幅居前”观察TSLA.US；“涨幅居前”无候选是规则的真实结果。

## 数据与运行边界

- 股票池1—40只，代码标准化后拒绝重复、非法和超限，不静默截断、不扩大为全市场。
  不提供股票池时使用Python持久自选；自选为空时明确记录fixture-catalog四只示例。
  显式空列表拒绝。结果最多40，默认20；其余股票决策仍保存。分数相同按股票代码排序。
- 同一个CapabilityRegistry给出任务能力可用性；数据只经已有ProviderService.query读取，
  复用配置、凭证、适配器和来源标签。没有第二套行情访问或健康状态。
  真实模式未验证/未配置或不支持的能力会阻止候选；不回退模拟。
- 基线并发4、每项15秒、日K请求90根；与第15步研究任务20秒超时分别记录。
  超时物理调用保留槽位，迟到结果不能改写证据；四槽占满且均超时后，排队项记
  EXECUTOR_DRAINING，实际线程排空前拒绝新任务。取消保留已取得结果。
- 每次保存输入、解析后的股票池及来源、固定规则/评分、参考时钟、逐项查询/时间/失败、
  原始ProviderResult、SHA256、指标公式和JSON Pointer输入。SQLite新增0014_screening，
  不改既有报告/论点。重复request_id同输入复用原任务，不同输入拒绝；重开读取不重新查询。
  应用退出或非正常中断留下interrupted记录，不自动续扫。
- 所有股票均能查看included/excluded/missing/failed决策。valid但没入选是excluded；缺必需
  指标是missing；能力不可用/失败是failed。全部无法计算时任务failed，合法零候选可completed；
  有效股票与失败/缺失混合为partial。单项能力失败不抹掉同股票其他成功执行结果。
- 指标保存未舍入十进制字符串，评分最后展示时量化至8位。K线不丢掉坏柱、补零或跨缺口
  算日收益；长窗口至少64根。成交量必须对应实际最新柱，前20根量全部明确。
  估值现成5日量比与K线20日量比在公式/来源中区分。
- 财报接受明确百分比字段或具名IS年度指标；派生营收同比需连续两年度、正分母和无歧义。
  不把两个季度/隔年报表猜成同比。评级适配实际SDK summary.recommend/target和SDK枚举字符串，
  当前buy共识不等于已证明发生评级变化，目标价不是未来行情事实。
- 日历只为本步筛选读取既有能力，不新增日历页。CLI counter_id必须明确归属ST/市场/代码，
  不把其他股票事件赋给查询股票；使用实际datetime/type。除息只读ex_date/exDate，支付日不替代。
  明确YYYYMMDD或YYYY-MM-DD日精度按UTC当天00:00比较，未编造盘中时刻。
  新闻不计未来条目，按实际id/URL或标题+时间去重；缺失发布时间不能改用获取时间。
- LLM没有参与扫描、筛选、评分或文字理由；理由由实际指标和公式生成。没有LLM说明功能，
  不声称模型完成全市场扫描。若以后增加模型解释，其输入只能来自已取得候选，本步不先实现。
- 原始事实回读校验结果hash；失败也可查看实际失败记录。hash用于一致性检查，不是管理员
  无法改写的签名；来源关联不证明筛选理由或投资判断正确。

## 页面和真实调用链

DiscoverPanel → 六项命名preload/IPC（assertSender、启动令牌）→ ScreeningService →
CapabilityRegistry/ProviderService.query → screening_rules.evaluate → SQLite → 候选/原始事实。
前端只显示Python规则、保存记录及表单，不复制业务公式。

候选按钮使用已保存候选symbol和该次mode/provider：自选走既有WatchlistStore，
对比带入AnalyticsPanel（一个候选需补第二只才可完成2—4股票分析），研究带入ResearchPanel。
两条跳转只填入口，不自动采集、生成报告或花费模型调用。
显式候选股票不会被另一项中断研究的自动显示覆盖；原任务仍在历史，服务仍拒绝并发新研究。
历史结果展示已保存规则/数据模式，区别于上方新任务表单。切任务/输入/上下文或卸载后迟到读取
不能污染新页面，重复开始/加入自选有同步互斥。
六项命名桥使总白名单88项，无任意文件/URL/SQL执行入口。

## 验证记录

- 定向33项Python通过：17任务边界小池、复合阈值、SMA/动量第二边界、真实DTO形状模拟、
  日期归属、未来/重复新闻、支付日、完整K线、缺能力、部分/全失败、超时/物理槽位、取消、
  请求去重、配置变化、原始证据损坏、明确非买入及空列表排除、重启历史及0013升级。模型spy零调用。
- 定向2项实际Electron通过：17选项、规则切换、TSLA.US候选/事实/自选/对比/研究代码，
  重启相同历史且无新任务；缺指标/不支持/真实未就绪均不产生候选；IPC额外字段和越界ID拒绝。
  实际窗口宽屏及600px截图检查无横向溢出。截图只在Temp，未进源码。
- 原OpenAPI路径和模型逐项深比较未改变，新增5个路径（run路径同时GET/POST）、10个模型。
  契约、TypeScript和构建通过；未增依赖，保留既有TestClient弃用及Vite大chunk提示。
- 最终完整check.cmd退出0：502 Python / 8 Node / 43实际Electron，零失败/取消/跳过，
  契约/类型/构建、0014重复迁移/current/check通过，No new upgrade operations detected。首轮5失败/496通过，四个旧迁移断言仍期待0013，实际已到0014；
  一个取消测试睡40毫秒便假定保存完成，改为观察成功记录保存后再取消。更新head断言，
  保留原历史/外键/重复迁移和取消保留结果验证，不跳过或放宽检查。
- 真实Longbridge/Massive/CLI、真实筛选行情、模型解释、安装包、用户亲自逐项操作：未执行。
  本步CI、提交/推送/PR：未执行。来源及授权边界见SOURCES-step19.json和EVIDENCE第44节。

## Windows CMD

```bat
cd /d D:\folio\research-trail
check.cmd
start-dev.cmd
```

打开机会发现，选“跌幅居前”，股票池输入AAPL.US TSLA.US，开始筛选；验证TSLA.US
事实与三个按钮。再选“高ROE”观察缺口。可逆练习与理解题见practice.md C13，用户答案不代填。


## 独立发布复验

收到本步独立发布授权后，保留上方开发轮502/8/43及33项筛选测试的历史含义。
发布复核新增两项回归，修复前失败、修复后筛选35项通过：物理调用完成超过截止时刻不能成功，
明确另一股票的除息记录不能作为当前股票候选。修复单独提交，未放宽默认超时或数据边界。
完整本机check.cmd和独立干净源码verify:clean均退出0：504 Python / 8 Node / 43实际Electron，
零失败/取消/跳过，契约/类型/构建及0014重复迁移/current/check通过。
干净源码锁定安装依赖和Electron后验证根CMD实际启动/关闭/重开，历史完全相同、无新运行、所属进程退出。
178份运行/测试/配置与导出字节一致、按Git规范化后与提交内容一致。已创建[PR #18](https://github.com/ydflow/research-trail/pull/18)，远程CI/合并待真实结果，
证据见EVIDENCE第45节和根发布回执。
