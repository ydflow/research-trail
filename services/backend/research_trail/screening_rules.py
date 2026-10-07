"""New Python/Decimal implementation of Folio ba5dcdfd screening strategies.

Reference: packages/shared/src/screening/strategies.ts. No upstream runtime.
Missing bars/metrics are never zero-filled or bridged. All comparisons use raw Decimal.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal, localcontext
from math import ceil
import re
from .analytics_calculate import number, output, series
from .portfolio_contracts import decimal_text
from .provider_errors import ProviderFault
from .workspace_normalize import timestamp
from .screening_contracts import ScreeningDecision, ScreeningMetric, ScreeningReference

# id, title, dependencies, exact eligibility, baseline score formula
TASKS = (
 ('top-gainers','涨幅居前',('market.quote',),'涨跌幅 >= 1%','clamp(涨跌幅 / 10)'),
 ('top-losers','跌幅居前',('market.quote',),'涨跌幅 <= -1%','clamp(-涨跌幅 / 10)'),
 ('high-volume','放量活跃',('market.quote','company.valuation','market.kline'),'量比 >= 1.5；无现成量比时使用最新成交量 / 前20根均量','clamp((量比 - 1) / 2)'),
 ('unusual-movement','异动观察',('market.kline','company.valuation','market.sentiment'),'最新振幅 >= 2%，且 / 前20根平均振幅 >= 1.5','clamp(振幅比 - 1)'),
 ('low-valuation','低估值',('company.valuation',),'0 < PE < 15 或 0 < PB < 1.2','max(clamp((22.5 - PE)/22.5), clamp((3 - PB)/3))；仅正值参与'),
 ('high-roe','高ROE',('company.financials',),'ROE >= 15%','clamp(ROE / 30)'),
 ('revenue-growth','营收增长',('company.financials',),'营收同比 >= 10%','clamp(营收同比 / 40)'),
 ('high-dividend','高股息',('company.valuation','company.dividends'),'股息率 >= 3%；必须取得股息能力结果','clamp(股息率 / 8)'),
 ('quality-growth','优质成长',('company.financials',),'ROE >= 15%、净利率 >= 10%、营收同比 >= 5%','clamp((ROE/30 + 营收同比/40 + 净利率/20)/3)'),
 ('strong-momentum','强势动量',('market.kline',),'21交易日收益 >= 5%、63交易日收益 >= 10%；至少64根完整日K','clamp((21日收益/20 + 63日收益/60)/2)'),
 ('breakout','放量突破',('market.kline',),'收盘 > 前20根最高价，成交量 >= 前20根均量的1.5倍','clamp(量比 / 3)'),
 ('oversold','超卖观察',('market.kline',),'收盘偏离SMA20 <= -8%、63交易日收益 <= -10%','clamp((-偏离 - 8) / 20)'),
 ('trend-reversal','趋势反转',('market.kline',),'63交易日收益 < 0、5交易日收益 > 0、收盘 > SMA5','二元筛选；基线没有数值分数'),
 ('upcoming-earnings','即将财报',('research.events',),'本股票financial事件日期在参考时间至30天内（含两端）','clamp(1 - ceil(剩余天数)/30)'),
 ('rating-changes','评级观察',('company.ratings','market.quote'),'明确buy/strong_buy评级，目标价较现价空间 >= 5%','clamp(空间 / 40)；当前评级不证明发生评级变化'),
 ('news-surge','新闻密集',('research.news',),'过去7天至参考时间内至少3条去重新闻','clamp(新闻条数 / 10)'),
 ('dividend-events','除息临近',('company.dividends',),'明确除息日在参考时间至90天内（含两端）；支付日不作除息日','clamp(1 - ceil(剩余天数)/90)'),
)
BY_ID = {row[0]: row for row in TASKS}

class Missing(ValueError): pass

def event_time(value):
    # Declared calendar dates carry day precision, using UTC midnight for this rule.
    if isinstance(value,str) and (re.fullmatch(r'\d{4}-\d{2}-\d{2}',value) or re.fullmatch(r'\d{8}',value)):
        fmt='%Y-%m-%d' if '-' in value else '%Y%m%d'
        return datetime.strptime(value,fmt).replace(tzinfo=timezone.utc)
    return timestamp(value)

def clamp(v): return max(Decimal(0), min(Decimal(1), v))

class Facts:
    def __init__(self, results):
        self.results = results
        self.metrics = []

    def data(self, cap): return self.results[cap][1]['data']

    def ref(self, cap, pointer):
        return ScreeningReference(read_id=self.results[cap][0], pointer='/data'+pointer)

    def metric(self, name, value, refs, formula='来源字段', unit='%'):
        if value is None: raise Missing('MISSING_METRIC: '+name)
        self.metrics.append(ScreeningMetric(name=name, value=decimal_text(value), unit=unit, formula=formula, inputs=refs))
        return value

    def scalar(self, cap, keys, name, unit='%'):
        data=self.data(cap)
        if not isinstance(data, dict): raise Missing('INVALID_DATA: '+name)
        for key in keys:
            if key in data and number(data[key]) is not None:
                return self.metric(name, number(data[key]), [self.ref(cap,'/'+key)], unit=unit)
        raise Missing('MISSING_METRIC: '+name)

    def financial(self, field, name):
        data=self.data('company.financials')
        aliases={'roe':('roe','ROE'),'revenue_growth':('revenue_growth','revenueGrowth'), 'net_margin':('net_margin','netMargin','NetProfitMargin')}
        # Explicit normalized percent fields are accepted; no ratio/unit guessing.
        if isinstance(data,dict) and any(k in data for k in aliases[field]):
            return self.scalar('company.financials',aliases[field],name)
        rows=[]
        groups=data.get('list',{}).get('IS',{}).get('indicators',[]) if isinstance(data,dict) else []
        for i,indicator in enumerate(groups):
            for j,account in enumerate(indicator.get('accounts',[])):
                if account.get('field') not in (('OperatingRevenue','revenue') if field=='revenue_growth' else aliases[field]): continue
                for k,value in enumerate(account.get('values',[])):
                    if value.get('period') not in ('Annual','annual') or not isinstance(value.get('year'),int): continue
                    rows.append((value['year'],value, f'/list/IS/indicators/{i}/accounts/{j}/values/{k}'))
        rows.sort(key=lambda r:r[0],reverse=True)
        if not rows or len({r[0] for r in rows})!=len(rows): raise Missing('MISSING_OR_AMBIGUOUS_ANNUAL: '+name)
        year,row,path=rows[0]
        if field!='revenue_growth':
            return self.metric(name,number(row.get('value')),[self.ref('company.financials',path+'/value')])
        if number(row.get('yoy')) is not None:
            return self.metric(name,number(row['yoy']),[self.ref('company.financials',path+'/yoy')])
        if len(rows)<2 or rows[1][0]!=year-1: raise Missing('MISSING_YEAR_ON_YEAR: '+name)
        previous=number(rows[1][1].get('value')); latest=number(row.get('value'))
        if previous is None or previous<=0 or latest is None: raise Missing('INVALID_REVENUE_BASE')
        return self.metric(name,(latest/previous-1)*100,[self.ref('company.financials',path+'/value'),self.ref('company.financials',rows[1][2]+'/value')], '(本年度营收 / 上年度营收 - 1) * 100')

    def bars(self, count):
        data=self.data('market.kline'); validated=series(data)
        if len(validated)<count: raise Missing('INSUFFICIENT_DAILY_BARS')
        indexed=sorted(enumerate(data), key=lambda p:timestamp(p[1]['timestamp']))
        return indexed

    def bar_values(self, bars, field, positive=False):
        values=[]; refs=[]
        for index,row in bars:
            value=number(row.get(field))
            if value is None or (positive and value<=0) or (field=='volume' and value<0): raise Missing('MISSING_BAR_'+field)
            values.append(value); refs.append(self.ref('market.kline',f'/{index}/{field}'))
        return values,refs

    def returns(self,bars,sessions):
        values,refs=self.bar_values([bars[-sessions-1],bars[-1]],'close',True)
        return self.metric(f'{sessions}交易日收益',(values[1]/values[0]-1)*100,refs,'(最新收盘 / N交易日前收盘 - 1) * 100')

    def volume(self,bars):
        values,refs=self.bar_values(bars[-21:],'volume')
        mean=sum(values[:-1])/20
        if mean<=0: raise Missing('ZERO_VOLUME_BASE')
        return self.metric('量比',values[-1]/mean,refs,'最新成交量 / 前20根均量','倍')

def evaluate(strategy, symbol, name, results, now):
    f=Facts(results); included=False; score=None
    try:
        with localcontext() as ctx:
            ctx.prec=80
            if strategy in ('top-gainers','top-losers'):
                v=f.scalar('market.quote',('change_percent','changePercent'),'涨跌幅')
                included=v>=1 if strategy=='top-gainers' else v<=-1
                score=clamp(v/10 if strategy=='top-gainers' else -v/10)
            elif strategy=='low-valuation':
                pe=pb=None
                for field,keys in [('PE',('pe_ttm_ratio','pe')),('PB',('pb_ratio','pb'))]:
                    try: value=f.scalar('company.valuation',keys,field,'倍')
                    except Missing: value=None
                    if field=='PE': pe=value
                    else: pb=value
                if pe is None and pb is None: raise Missing('MISSING_VALUATION')
                included=(pe is not None and 0<pe<15) or (pb is not None and 0<pb<Decimal('1.2'))
                score=max(clamp((Decimal('22.5')-pe)/Decimal('22.5')) if pe is not None and pe>0 else Decimal(0), clamp((3-pb)/3) if pb is not None and pb>0 else Decimal(0))
            elif strategy in ('high-roe','revenue-growth','quality-growth'):
                if strategy=='high-roe':
                    v=f.financial('roe','ROE'); included=v>=15; score=clamp(v/30)
                elif strategy=='revenue-growth':
                    v=f.financial('revenue_growth','营收同比'); included=v>=10; score=clamp(v/40)
                else:
                    roe=f.financial('roe','ROE'); growth=f.financial('revenue_growth','营收同比'); margin=f.financial('net_margin','净利率')
                    included=roe>=15 and growth>=5 and margin>=10; score=clamp((roe/30+growth/40+margin/20)/3)
            elif strategy=='high-dividend':
                history=f.data('company.dividends')
                if not isinstance(history,dict) or not isinstance(history.get('list'),list): raise Missing('MISSING_DIVIDEND_RECORDS')
                f.metric('股息记录数',Decimal(len(history['list'])),[f.ref('company.dividends','/list')],'实际返回记录数；不证明支付完成','条')
                v=f.scalar('company.valuation',('dividend_ratio_ttm','dividendYield'),'股息率'); included=v>=3; score=clamp(v/8)
            elif strategy in ('high-volume','unusual-movement','strong-momentum','breakout','oversold','trend-reversal'):
                bars=f.bars(64 if strategy in ('strong-momentum','oversold','trend-reversal') else 0 if strategy=='high-volume' else 21)
                if strategy=='high-volume':
                    try:
                        v=f.scalar('company.valuation',('volume_ratio','volumeRatio'),'量比','倍')
                        f.metrics[-1].formula='提供商CalcIndex量比（5日均量基准）；字段原值'
                    except Missing:
                        if len(bars)<21: raise Missing('INSUFFICIENT_DAILY_BARS')
                        v=f.volume(bars)
                    included=v>=Decimal('1.5'); score=clamp((v-1)/2)
                elif strategy=='unusual-movement':
                    values=[]; refs=[]
                    for bar in bars[-21:]:
                        high,rh=f.bar_values([bar],'high',True); low,rl=f.bar_values([bar],'low',True); close,rc=f.bar_values([bar],'close',True)
                        if low[0]>close[0] or low[0]>high[0]: raise Missing('INVALID_BAR_RANGE')
                        values.append((high[0]-low[0])/close[0]*100); refs.extend(rh+rl+rc)
                    try: today=f.scalar('company.valuation',('amplitude',),'最新振幅')
                    except Missing: today=f.metric('最新振幅',values[-1],refs[-3:],'(高 - 低) / 收盘 * 100')
                    mean=sum(values[:-1])/20
                    if mean<=0: raise Missing('ZERO_AMPLITUDE_BASE')
                    ratio=f.metric('振幅比',today/mean,refs+f.metrics[-1].inputs,'最新振幅 / 前20根平均振幅','倍')
                    included=today>=2 and ratio>=Decimal('1.5'); score=clamp(ratio-1)
                elif strategy=='breakout':
                    closes,rc=f.bar_values([bars[-1]],'close',True); highs,rh=f.bar_values(bars[-21:-1],'high',True)
                    distance=f.metric('突破幅度',(closes[0]/max(highs)-1)*100,rc+rh,'(收盘 / 前20根最高价 - 1) * 100')
                    v=f.volume(bars); included=distance>0 and v>=Decimal('1.5'); score=clamp(v/3)
                else:
                    r63=f.returns(bars,63)
                    if strategy=='strong-momentum':
                        r21=f.returns(bars,21); included=r21>=5 and r63>=10; score=clamp((r21/20+r63/60)/2)
                    elif strategy=='oversold':
                        closes,refs=f.bar_values(bars[-20:],'close',True); mean=sum(closes)/20
                        dev=f.metric('偏离SMA20',(closes[-1]/mean-1)*100,refs,'(收盘 / SMA20 - 1) * 100')
                        included=dev<=-8 and r63<=-10; score=clamp((-dev-8)/20)
                    else:
                        r5=f.returns(bars,5); closes,refs=f.bar_values(bars[-5:],'close',True)
                        dev=f.metric('偏离SMA5',(closes[-1]/(sum(closes)/5)-1)*100,refs,'(收盘 / SMA5 - 1) * 100')
                        included=r63<0 and r5>0 and dev>0
            elif strategy=='rating-changes':
                data=f.data('company.ratings'); row=data.get('summary',data.get('latest',{})) if isinstance(data,dict) else {}
                prefix='/summary' if 'summary' in data else '/latest'
                recommendation=row.get('recommend',row.get('consensus',data.get('consensus')))
                recommendation={f'InstitutionRecommend.{k}':v for k,v in [('Buy','buy'),('StrongBuy','strong_buy'),('Hold','hold'),('Sell','sell'),('StrongSell','strong_sell'),('Underperform','underperform'),('NoOpinion','no_opinion')]}.get(recommendation,recommendation)
                path=prefix+'/recommend' if 'recommend' in row else prefix+'/consensus' if 'consensus' in row else '/consensus'
                if recommendation not in ('buy','strong_buy','hold','sell','strong_sell','underperform','no_opinion'): raise Missing('MISSING_EXPLICIT_RATING')
                if recommendation not in ('buy','strong_buy'):
                    metric=ScreeningMetric(name='当前评级',value=recommendation,unit='文本',formula='固定规则要求明确buy/strong_buy',inputs=[f.ref('company.ratings',path)])
                    return ScreeningDecision(symbol=symbol,name=name,status='excluded',metrics=[metric],reasons=['实际评级 '+recommendation+' 未满足买入共识规则。'])
                target=number(row.get('target',row.get('target_price',row.get('targetPrice'))))
                if target is None or target<=0: raise Missing('MISSING_TARGET_PRICE')
                last=f.scalar('market.quote',('last_price','lastPrice'),'现价','价格')
                if last<=0: raise Missing('INVALID_CURRENT_PRICE')
                key='target' if 'target' in row else 'target_price' if 'target_price' in row else 'targetPrice'
                upside=f.metric('目标价空间',(target/last-1)*100,[f.ref('company.ratings',prefix+'/'+key)]+f.metrics[-1].inputs,'(明确目标价 / 实际现价 - 1) * 100')
                # Preserve the explicit recommendation in evidence as well as the numerical inputs.
                f.metrics.append(ScreeningMetric(name='当前评级',value=recommendation,unit='文本',formula='明确来源评级；不证明变化历史',inputs=[f.ref('company.ratings',path)]))
                included=upside>=5; score=clamp(upside/40)
            elif strategy=='news-surge':
                data=f.data('research.news'); rows=data if isinstance(data,list) else data.get('list',[]) if isinstance(data,dict) else []
                if not rows:
                    if not isinstance(data,list) and (not isinstance(data,dict) or not isinstance(data.get('list'),list)): raise Missing('MISSING_DATED_NEWS')
                    f.metric('近7天新闻数',Decimal(0),[f.ref('research.news','' if isinstance(data,list) else '/list')],'来源返回空新闻列表','条')
                    return ScreeningDecision(symbol=symbol,name=name,status='excluded',metrics=f.metrics,reasons=['来源返回空新闻列表，未满足至少3条规则。'])
                refs=[]; seen=set(); dated=0
                for i,row in enumerate(rows):
                    key=next((k for k in ('published_at','publishedAt','timestamp') if k in row),None)
                    dt=timestamp(row.get(key)) if key else None
                    if dt is None: continue
                    dated+=1
                    identity=row.get('id') or row.get('url') or (row.get('title'),dt.isoformat())
                    if now-timedelta(days=7)<=dt<=now and str(identity) not in seen:
                        seen.add(str(identity)); refs.append(f.ref('research.news',('/'+str(i) if isinstance(data,list) else '/list/'+str(i))+'/'+key))
                if not dated: raise Missing('MISSING_DATED_NEWS')
                # Even zero has source input: the inspected dates explain the exclusion.
                if not refs: refs=[f.ref('research.news','')]
                v=f.metric('近7天新闻数',Decimal(len(seen)),refs,'去重且非未来的近7天新闻计数','条'); included=v>=3; score=clamp(v/10)
            else:
                cap='research.events' if strategy=='upcoming-earnings' else 'company.dividends'
                data=f.data(cap); rows=data if isinstance(data,list) else data.get('list',[]) if isinstance(data,dict) else []
                if not rows:
                    if not isinstance(data,list) and (not isinstance(data,dict) or not isinstance(data.get('list'),list)): raise Missing('MISSING_ATTRIBUTED_EVENT_DATE')
                    f.metric('窗口内事件数',Decimal(0),[f.ref(cap,'' if isinstance(data,list) else '/list')],'来源返回空事件列表','条')
                    return ScreeningDecision(symbol=symbol,name=name,status='excluded',metrics=f.metrics,reasons=['来源返回空事件列表，没有窗口内候选。'])
                dates=[]; valid=[]
                for i,row in enumerate(rows):
                    if strategy=='upcoming-earnings':
                        actual=row.get('symbol')
                        if actual is None:
                            match=re.fullmatch(r'ST/(US|HK|SG|SH|SZ)/([A-Z0-9]{1,6})',str(row.get('counter_id','')))
                            actual=match[2]+'.'+match[1] if match else None
                        if actual!=symbol or str(row.get('type',row.get('event_type'))).lower()!='financial': continue
                        keys=('datetime','date','timestamp')
                    else:
                        if row.get('symbol') not in (None,symbol): continue
                        keys=('ex_date','exDate')
                    key=next((k for k in keys if k in row),None)
                    dt=event_time(row.get(key)) if key else None
                    if dt is None: continue
                    pointer=('/'+str(i) if isinstance(data,list) else '/list/'+str(i))+'/'+key
                    valid.append(f.ref(cap,pointer))
                    if now<=dt<=now+timedelta(days=30 if strategy=='upcoming-earnings' else 90): dates.append((dt,pointer))
                if not valid: raise Missing('MISSING_ATTRIBUTED_EVENT_DATE')
                if dates:
                    dt,path=min(dates); days=Decimal(ceil((dt-now).total_seconds()/86400))
                    f.metric('距事件天数',days,[f.ref(cap,path)],'ceil((来源日期 - 固定参考时间) / 86400秒)','天')
                    included=True; score=clamp(1-days/(30 if strategy=='upcoming-earnings' else 90))
                else: f.metric('窗口内事件数',Decimal(0),valid,'检查全部明确日期，窗口内无事件','条')
        reasons=[f'{m.name} = {m.value} {m.unit}；{m.formula}' for m in f.metrics]
        return ScreeningDecision(symbol=symbol,name=name,status='included' if included else 'excluded',score=output(score) if included else None,metrics=f.metrics,reasons=reasons)
    except (ValueError,TypeError,KeyError,ArithmeticError,AttributeError,IndexError,ProviderFault) as error:
        code=str(error) if isinstance(error,Missing) else 'INVALID_METRIC_DATA'
        return ScreeningDecision(symbol=symbol,name=name,status='missing',code=code,metrics=f.metrics,reasons=['必要数据缺失或不符合规则输入要求，无法完成筛选。'])
