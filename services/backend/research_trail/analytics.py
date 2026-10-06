"""One Python analytics service for HTTP pages and registered Agent tools.

Market reads use the existing provider boundary. No model computes numeric facts.
An explicit refresh creates a snapshot; reads reuse it for at most 30 seconds.
"""
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED
from datetime import datetime, timedelta, timezone
from decimal import Decimal, localcontext
import hashlib
import json
import threading
import time
from uuid import uuid4
from .analytics_contracts import (RiskReport, Comparison, AnalysisRead, CompareCell, CompareRow, RiskSignal)
from .analytics_calculate import number, output, series, risk_group, period_return, time_text
from .provider_contracts import ReadQuery
from .workspace_normalize import timestamp

RISK_LIMITS = ['权重分母为同币种正数量持仓市值，不含现金；缺任一估值时不按已知子集归一化。',
    'Top1>30%高、>20%中；单仓>25%高、>15%中；行业>50%高、>30%中；均为基线启发式阈值。',
    '回撤=(至多20根日K线最高价−最新收盘)/最高价，>35%高、>20%中；不是历史最大回撤。',
    '波动为至多30根日K线简单收益的样本标准差；年化乘√252，假设252个交易日，不预测未来。',
    '组合波动用当前市值权重加权严格相同时点的收益，假设每日再平衡；不含现金、交易费/税或汇率。',
    '估值使用组合快照单价，不用另一个来源补齐缺失估值；相邻日K间隔超过7天视为缺失历史，拒绝计算。',
    '行情最多覆盖20只正持仓；缺行业/财报事件/新闻/行情单列，不把缺失解释为无风险。',
    '新闻统计仅为前3持仓过去7天条数，不判断情绪；财报窗口为分析时点后7天。',
    '一次读取预算25秒、最多4个并行读取，超时/未执行有明确状态；快照复用最长30秒，时间不改写。']
COMPARE_LIMITS = ['价格/市值按指定币种筛选，未知或不符币种为—，不执行汇率转换。',
    '营收增长/毛利率/ROE仅接受指定年度Annual直接指标，未提供或期间不匹配为—；不从其他字段猜测。',
    'PE/PB及股息率为提供商TTM指标，与年度财务指标分列；市场时间和来源逐次展示。',
    '1M/3M/1Y为21/63/252交易日价格收益，最多260根日K线；同一行已知序列须严格同窗口。',
    '动量仅依基线1M/3M符号与1M绝对值5%阈值；评级只展示有明确标签的提供商共识，不择取任意机构记录。',
    '不含现金分红再投资、拆股调整推断或评分/排名；不对缺失值求均值或补零。',
    '原适配器当前使用不复权日K线，价格收益/波动可能受拆股或分红影响；样本间隔不等也会限制解释。',
    '相邻日K间隔超过7天保守判为缺失历史；不补零或把多日缺口当成日收益。',
    '一次读取预算25秒、最多4个并行读取；快照复用最长30秒，主动刷新产生新快照。']

class AnalyticsError(Exception): pass

def now(): return datetime.now(timezone.utc).isoformat()
def obj(data): return data if isinstance(data, dict) else {}
def items(data): return data if isinstance(data,list) else []
def missing(reason): return CompareCell(reason=reason)

class AnalyticsService:
    def __init__(self, portfolios, providers, *, clock=time.monotonic, budget=25):
        self.portfolios, self.providers, self.clock, self.budget = portfolios, providers, clock, budget
        self.pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix='analytics-read')
        self.slots = threading.BoundedSemaphore(4)
        self.lock = threading.Lock()
        self.cache = {}

    def close(self):
        self.cache.clear()
        self.pool.shutdown(wait=False, cancel_futures=True)

    def _reads(self, body, specs):
        deadline = self.clock()+self.budget
        reads, data, pending = [], {}, {}
        todo = iter(specs)
        remaining = list(todo)
        while remaining or pending:
            while remaining and self.clock() < deadline and self.slots.acquire(blocking=False):
                symbol, cap, count = remaining.pop(0)
                query = ReadQuery(capability=cap, symbol=symbol, mode=body.mode, count=count, period='1d',
                    report='annual' if cap=='company.financials' else None,
                    start=(datetime(2024,1,16,tzinfo=timezone.utc) if body.mode=='simulated' else datetime.now(timezone.utc)).date() if cap=='research.events' else None,
                    end=((datetime(2024,1,16,tzinfo=timezone.utc) if body.mode=='simulated' else datetime.now(timezone.utc))+timedelta(days=7)).date() if cap=='research.events' else None,
                    market={'SH':'CN','SZ':'CN','HAS':'CN'}.get(symbol.split('.')[-1],symbol.split('.')[-1]),
                    use_cache=True)
                try: future = self.pool.submit(self.providers.query, body.provider, query)
                except Exception:
                    self.slots.release(); raise AnalyticsError('分析服务已关闭。') from None
                future.add_done_callback(lambda _: self.slots.release())
                pending[future] = (symbol, cap)
            if not pending or self.clock() >= deadline: break
            done, _ = wait(pending, timeout=max(0, deadline-self.clock()), return_when=FIRST_COMPLETED)
            if not done: break
            for future in done:
                symbol, cap = pending.pop(future)
                try:
                    r = future.result()
                    if r.ok:
                        if isinstance(r.data, dict) and r.data.get('symbol') not in (None, symbol): raise ValueError()
                        if cap in ('market.kline','research.news') and not isinstance(r.data,list): raise ValueError()
                        if cap in ('company.profile','company.valuation','company.financials','market.quote','company.ratings') and not isinstance(r.data,dict): raise ValueError()
                        data[(symbol, cap)] = r.data
                        reads.append(AnalysisRead(symbol=symbol, capability=cap, status='ready', provenance=r.provenance))
                    else: reads.append(AnalysisRead(symbol=symbol, capability=cap, status=r.state, code=r.code))
                except Exception: reads.append(AnalysisRead(symbol=symbol, capability=cap, status='failed', code='INVALID_RESPONSE'))
        for future, (symbol, cap) in pending.items():
            future.cancel()
            reads.append(AnalysisRead(symbol=symbol, capability=cap, status='timed_out', code='ANALYSIS_TIMEOUT'))
        reads.extend(AnalysisRead(symbol=s, capability=c, status='unavailable', code='READ_BUDGET') for s,c,_ in remaining)
        reads.sort(key=lambda r: (r.symbol or '', r.capability))
        return reads, data

    def _cached(self, kind, body, inputs, compute):
        profile = self.providers.settings.profile(body.provider)
        key = hashlib.sha256(json.dumps([kind,body.model_dump(exclude={'refresh'}), inputs,
            profile.model_dump(mode='json')], sort_keys=True).encode()).hexdigest()
        if not self.lock.acquire(timeout=1): raise AnalyticsError('已有分析正在执行，请稍后重试。')
        try:
            entry = self.cache.get(key)
            if not body.refresh and entry and self.clock() < entry[0]: return entry[1].model_copy(deep=True)
            result = compute()
            if len(self.cache) >= 32: self.cache.pop(next(iter(self.cache)))
            self.cache[key] = (self.clock()+30,result.model_copy(deep=True))
            return result
        finally: self.lock.release()

    def risk(self, body):
        view = self.portfolios.view(body.portfolio_id)
        return self._cached('risk', body, view.model_dump(mode='json'), lambda: self._risk(body, view))

    def _risk(self, body, view):
        positive = [h for h in view.holdings if number(h.quantity)>0]
        symbols = sorted({h.symbol for h in positive})[:20]
        blocked = (view.kind=='read_only' and body.mode=='simulated') or (view.kind=='simulated' and body.mode=='real')
        specs = [] if blocked else [(s,c,30 if c=='market.kline' else 10) for s in symbols for c in ('market.kline','company.profile','research.events')]
        top = sorted(positive, key=lambda h: -(number(h.market_value) or 0))[:3] if len({h.currency for h in positive}) <= 1 else []
        specs += [] if blocked else [(h.symbol,'research.news',30) for h in top]
        reads, data = self._reads(body,specs)
        histories = {}
        for s in symbols:
            profile = obj(data.get((s,'company.profile')))
            if profile.get('currency') not in {h.currency for h in positive if h.symbol==s}: continue
            try:
                rows = series(data.get((s,'market.kline'), []))
                if rows: histories[s] = rows
            except Exception:
                for r in reads:
                    if r.symbol==s and r.capability=='market.kline': r.status='failed'; r.code='INVALID_SERIES'
        groups = [risk_group(c, [h for h in view.holdings if h.currency==c], histories) for c in sorted({v.currency for v in view.currencies})]
        reference = datetime.fromisoformat(view.market_time) if view.source=='authored-fixture' and view.market_time else datetime.now(timezone.utc)
        # Simulation uses the authored fixture clock, not today's wall clock.
        if body.mode=='simulated': reference = datetime(2024,1,16,21,tzinfo=timezone.utc)
        for group in groups:
            if blocked: group.unavailable.append('SOURCE_MISMATCH: 模拟账户不能使用真实行情，真实账户不能使用模拟行情。')
            if len({h.currency for h in positive})>1: group.unavailable.append('NEWS: 不跨币种比较市值排名，未执行全组合前3新闻暴露。')
            sectors, unknown = {}, 0
            earnings, news_count = set(), 0
            for a in group.allocation:
                p = obj(data.get((a.symbol,'company.profile')))
                sector = p.get('sector')
                if isinstance(sector,str) and sector and a.weight is not None: sectors[sector]=sectors.get(sector,Decimal(0))+number(a.market_value)/number(group.total_market_value)
                else: unknown += 1
                events = data.get((a.symbol,'research.events'))
                if isinstance(events,list):
                    identified=0
                    for e in events:
                        if not isinstance(e,dict) or e.get('type') not in ('financial','earnings'): continue
                        # CLI counter identifiers are not assumed to be ticker.region.
                        if e.get('symbol',e.get('counter_id')) != a.symbol: continue
                        try: at=timestamp(e.get('datetime',e.get('date')))
                        except Exception: continue
                        if at: identified+=1
                        if at and reference <= at <= reference+timedelta(days=7): earnings.add(a.symbol)
                    if events and not identified: group.unavailable.append(f'{a.symbol}: 事件存在但缺可核验代码/类型/时间。')
                else: group.unavailable.append(f'{a.symbol}: 财报事件缺少可核验代码/类型/时间。')
                news = data.get((a.symbol,'research.news'))
                if isinstance(news,list):
                    unknown_time=0
                    for n in news:
                        try: at=timestamp(obj(n).get('published_at',obj(n).get('timestamp')))
                        except Exception: at=None
                        if at is None: unknown_time+=1
                        if at and reference-timedelta(days=7) <= at <= reference: news_count += 1
                    if unknown_time: group.unavailable.append(f'{a.symbol}: {unknown_time}条新闻缺合法时间，未计入7天暴露。')
                elif a.symbol in {h.symbol for h in top}: group.unavailable.append(f'{a.symbol}: 新闻数据未提供。')
            if unknown: group.unavailable.append(f'SECTOR: {unknown}只持仓缺行业或完整权重。')
            for sector,w in sorted(sectors.items()):
                if w>Decimal('.3'): group.signals.append(RiskSignal(kind='sector_exposure',severity='high' if w>Decimal('.5') else 'medium',detail=f'{sector}行业已知权重 {output(w)}，缺行业持仓未当作零暴露。'))
            if earnings: group.signals.append(RiskSignal(kind='upcoming_earnings',severity='medium',detail=f'{reference.isoformat()}之后7天财报事件：'+', '.join(sorted(earnings))))
            if news_count: group.signals.append(RiskSignal(kind='news_exposure',severity='medium' if news_count>=4 else 'low',detail=f'以{reference.isoformat()}为截止，前3持仓过去7天新闻 {news_count}条。'))
            if group.unavailable or any(r.status!='ready' for r in reads):
                if group.status=='ready': group.status='partial'
        status = 'failed' if view.status in ('failed','restricted','unconfigured','unverified') else 'empty' if not positive else 'partial' if blocked or any(g.status!='ready' for g in groups) else 'ready'
        summary = '；'.join(f'{g.currency}持仓Top1 {g.top1_weight or "—"}，Top5 {g.top5_weight or "—"}，HHI {g.herfindahl or "—"}' for g in groups) or '没有正数量持仓，风险指标无定义。'
        return RiskReport(snapshot_id=str(uuid4()),calculated_at=now(),portfolio_id=view.id,account_id=view.account_id,
            portfolio_revision=view.revision,account_kind=view.kind,input_source=view.source,input_time=view.market_time or view.updated_at,
            input_status=view.status,input_code=view.code,input_message=view.message,provider=body.provider,mode=body.mode,status=status,groups=groups,reads=reads,
            summary=summary,limitations=RISK_LIMITS+[f'事件/新闻窗口基准：{reference.isoformat()}。', '手工CSV为未核验估值输入；行情与持仓快照不是同一历史投资组合。'])

    def compare(self, body):
        return self._cached('compare',body,None,lambda: self._compare(body))

    def _compare(self, body):
        capabilities = ('market.quote','company.profile','company.valuation','company.financials','company.dividends','market.kline','company.ratings')
        reads, data = self._reads(body,[(s,c,260 if c=='market.kline' else 20) for s in body.symbols for c in capabilities])
        rows=[]
        metrics=[('price','价格',body.currency),('market_cap','总市值',body.currency),('pe','PE TTM','倍'),('pb','PB','倍'),
            ('revenue_growth','营收增长','%'),('gross_margin','毛利率','%'),('roe','ROE','%'),('dividend_yield','股息率 TTM','%'),
            ('return_1m','1M价格收益','%'),('return_3m','3M价格收益','%'),('return_1y','1Y价格收益','%'),
            ('rating','分析师共识',''),('momentum','动量','')]
        prepared={}
        for s in body.symbols:
            p=obj(data.get((s,'company.profile'))); v=obj(data.get((s,'company.valuation'))); q=obj(data.get((s,'market.quote')))
            currency=p.get('currency'); same=currency==body.currency
            cells={key:missing('MISSING_DATA') for key,_,_ in metrics}
            def set_cell(key,value,period,currency_needed=False):
                if currency_needed and not same: cells[key]=missing('CURRENCY_MISMATCH_OR_UNKNOWN'); return
                try: n=number(value)
                except Exception: cells[key]=missing('INVALID_NUMBER'); return
                cells[key]=CompareCell(value=output(n),reason=None if n is not None else 'MISSING_DATA',currency=currency if currency_needed else None,period=period)
            set_cell('price',q.get('last_price'),'市场快照',True)
            set_cell('market_cap',v.get('total_market_value'),'市场快照',True)
            set_cell('pe',v.get('pe_ttm_ratio'),'TTM')
            set_cell('pb',v.get('pb_ratio'),'最新每股净资产')
            set_cell('dividend_yield',v.get('dividend_ratio_ttm'),'TTM')
            financial=obj(data.get((s,'company.financials')))
            target=f'{body.report_year} Annual'
            candidates={k:[] for k in ('revenue_growth','gross_margin','roe')}
            # Recognize direct indicators only with a declared report year and period.
            for group in obj(financial.get('list')).values():
                for indicator in items(obj(group).get('indicators')):
                    for account in items(obj(indicator).get('accounts')):
                        key={'revenue_growth':'revenue_growth','gross_margin':'gross_margin','roe':'roe'}.get(obj(account).get('field'))
                        if not key: continue
                        matches=[r for r in items(obj(account).get('values')) if str(obj(r).get('year'))==str(body.report_year) and obj(r).get('period') in ('Annual','annual')]
                        candidates[key].extend((obj(r).get('value'),obj(indicator).get('currency')) for r in matches)
            for key,matches in candidates.items():
                if len(matches)>1: cells[key]=missing('AMBIGUOUS_PERIOD')
                elif len(matches)==1:
                    if matches[0][1]!=body.currency: cells[key]=missing('FINANCIAL_CURRENCY_MISMATCH_OR_UNKNOWN')
                    else: set_cell(key,matches[0][0],target,True)
            for key in ('revenue_growth','gross_margin','roe'):
                if cells[key].value is None and cells[key].reason=='MISSING_DATA': cells[key].reason='MISSING_OR_MISMATCHED_REPORT_PERIOD'
            rating=obj(data.get((s,'company.ratings'))).get('consensus')
            labels={'buy':'买入','strong_buy':'买入','sell':'卖出','strong_sell':'卖出','hold':'中性','neutral':'中性','overweight':'买入','outperform':'买入','underweight':'卖出','underperform':'卖出','equal_weight':'中性'}
            if isinstance(rating,str) and rating.lower() in labels: cells['rating']=CompareCell(value=labels[rating.lower()],period='提供商最新共识')
            try: bars=series(data.get((s,'market.kline'),[])) if same else []
            except Exception:
                bars=[]
                for r in reads:
                    if r.symbol==s and r.capability=='market.kline': r.status='failed'; r.code='INVALID_SERIES'
            prepared[s]=(cells,bars)
        for key, sessions in [('return_1m',21),('return_3m',63),('return_1y',252)]:
            valid=[r[-sessions-1:] for _,r in prepared.values() if len(r)>sessions]
            aligned=all([t for t,_,_ in r]==[t for t,_,_ in valid[0]] for r in valid) if valid else False
            for s,(cells,bars) in prepared.items():
                value=period_return(bars,sessions) if aligned else None
                cells[key]=CompareCell(value=output(value),reason=None if value is not None else 'INSUFFICIENT_OR_UNALIGNED_HISTORY',
                    currency=body.currency,period=f'{time_text(bars[-sessions-1][0])} → {time_text(bars[-1][0])}' if value is not None else None)
        for cells,_ in prepared.values():
            one,three=number(cells['return_1m'].value),number(cells['return_3m'].value)
            if one is not None and three is not None:
                cells['momentum']=CompareCell(value='混合' if (one>=0)!=(three>=0) else '强' if abs(one)>=5 else '弱',period='1M/3M')
        for key,label,unit in metrics: rows.append(CompareRow(metric=key,label=label,unit=unit,cells={s:prepared[s][0][key] for s in body.symbols}))
        known=sum(c.value is not None for r in rows for c in r.cells.values())
        status='missing' if not known else 'ready' if known==len(rows)*len(body.symbols) else 'partial'
        return Comparison(snapshot_id=str(uuid4()),calculated_at=now(),symbols=body.symbols,provider=body.provider,mode=body.mode,currency=body.currency,
            report_period=f'{body.report_year} Annual',status=status,rows=rows,reads=reads,
            summary=f'{len(body.symbols)}只股票，{body.currency}；年度指标对齐{body.report_year} Annual；{known}/{len(rows)*len(body.symbols)}个已知单元格。',limitations=COMPARE_LIMITS)
