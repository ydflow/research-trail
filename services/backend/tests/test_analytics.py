"""Step13 hand-computable risk, fixed peer data and shared page/Agent snapshots.
All positions, credentials and vendor/model responses are invented test fixtures.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json
import time
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from research_trail.app import create_app
from research_trail.analytics_calculate import risk_group, series, stats, period_return
from research_trail.analytics_contracts import CompareQuery, RiskQuery
from research_trail.portfolio_calculate import calculate
from research_trail.portfolio_contracts import PortfolioSnapshot, HoldingInput
from research_trail.provider_service import authored_data
from research_trail.provider_contracts import ReadQuery
from research_trail.provider_errors import ProviderFault
from research_trail.provider_normalize import public_json
from research_trail.tools import ToolRegistry, ToolExecutionError
from test_settings import Vault, TOKEN, HEADERS

def bars(closes, start=1700000000):
    return [{'timestamp':start+i*86400,'close':c,'high':c if isinstance(c,(int,float,Decimal)) and not isinstance(c,bool) and c>=1 else 1, 'open':c,'low':c,'volume':1} for i,c in enumerate(closes)]

def positions(prices=('600','400'), currencies=('USD','USD'), quantities=('1','1')):
    return calculate(PortfolioSnapshot(holdings=[HoldingInput(symbol=s,currency=c,quantity=q,market_price=p)
        for s,c,q,p in zip(('AAPL.US','MSFT.US'),currencies,quantities,prices)]))[0]

def sample(q):
    s=q.symbol
    if q.capability=='market.kline': return bars(list(range(100,360)))[-q.count:]
    if q.capability=='company.profile': return {'symbol':s,'currency':'USD','sector':'测试行业'}
    if q.capability=='market.quote': return {'symbol':s,'last_price':359,'currency':'USD','timestamp':'2024-01-16T21:00:00Z'}
    if q.capability=='company.valuation': return {'symbol':s,'total_market_value':1000,'pe_ttm_ratio':20,'pb_ratio':2,'dividend_ratio_ttm':1}
    if q.capability=='company.financials': return {'list':{'IS':{'indicators':[{'currency':'USD','accounts':[
        {'field':k,'values':[{'year':2023,'period':'Annual','value':v}]} for k,v in [('revenue_growth',10),('gross_margin',50),('roe',15)]]}]}}}
    if q.capability=='company.ratings': return {'consensus':'buy'}
    if q.capability=='research.events': return [{'symbol':s,'type':'financial','datetime':'2024-01-20T21:00:00Z'}]
    if q.capability=='research.news': return [
        {'id':'past','published_at':'2024-01-15T21:00:00Z'}, {'id':'future','published_at':'2024-01-17T21:00:00Z'},
        {'id':'stale','published_at':'2023-01-15T21:00:00Z'}]
    return authored_data(q)

def client(tmp_path, executor=sample, **extra):
    return TestClient(create_app(TOKEN,database_path=tmp_path/'analytics.sqlite3',credential_vault=Vault(),
        provider_options={'simulated_executor':executor},**extra),headers=HEADERS)

def pid(c, kind='simulated'): return next(p['id'] for p in c.get('/portfolios').json() if p['kind']==kind)
def risk(c,p,**extra): return c.post('/analytics/risk',json={'portfolio_id':p,**extra})
def compare(c,**extra): return c.post('/analytics/compare',json={'symbols':['AAPL.US','MSFT.US'],**extra})
def cells(result,key): return next(r['cells'] for r in result['rows'] if r['metric']==key)
def run(c,text,kind='fake_agent'):
    sid=c.post('/sessions',json={'title':'analytics fixture'}).json()['id']
    r=c.post(f'/sessions/{sid}/runs',json={'kind':kind,'input':text}).json()
    deadline=time.monotonic()+10
    while time.monotonic()<deadline:
        record=c.get(f'/sessions/{sid}/runs/{r["id"]}').json()
        if record['status']!='running': break
        time.sleep(.01)
    assert record['status']=='completed',record
    snapshot=c.get(f'/sessions/{sid}/snapshot').json()
    return record,[e for e in snapshot['events'] if e['run_id']==r['id']]

def test_hand_concentration_and_correlated_portfolio_volatility():
    a=series(bars([100,110,99])); b=series(bars([100,90,99]))
    g=risk_group('USD',positions(),{'AAPL.US':a,'MSFT.US':b})
    assert [g.top1_weight,g.top5_weight,g.herfindahl]==['0.6','1','0.52']
    assert [x.weight for x in g.allocation]==['0.6','0.4']
    assert g.total_market_value=='1000'
    assert stats('AAPL.US',a).daily_volatility=='0.14142136' # sqrt((.1²+.1²)/1)
    assert g.portfolio_volatility.daily_volatility=='0.02828427' # weighted +.02,-.02
    assert g.portfolio_volatility.returns==2
    assert stats('AAPL.US',a).drawdown=='0.1'

@pytest.mark.parametrize('prices,severity',[(['20']*5,None),(['30','20','20','15','15'],'medium'),(['31','20','20','15','14'],'high')])
def test_concentration_strict_thresholds(prices,severity):
    hs=calculate(PortfolioSnapshot(holdings=[HoldingInput(symbol=f'S{i}.US',currency='USD',quantity='1',market_price=p) for i,p in enumerate(prices)]))[0]
    g=risk_group('USD',hs,{})
    signals=[s for s in g.signals if s.kind=='concentration']
    assert ([s.severity for s in signals] or [None])==[severity]

def test_top_five_is_not_total_for_more_than_five_holdings():
    hs=calculate(PortfolioSnapshot(holdings=[HoldingInput(symbol=f'S{i}.US',currency='USD',quantity='1',market_price='100') for i in range(10)]))[0]
    g=risk_group('USD',hs,{})
    assert (g.top1_weight,g.top5_weight,g.herfindahl)==('0.1','0.5','0.1')

@pytest.mark.parametrize('latest,severity',[(80,None),(65,'medium'),(64,'high')])
def test_drawdown_strict_thresholds(latest,severity):
    g=risk_group('USD',positions(),{'AAPL.US':series(bars([100,100,latest]))})
    assert ([s.severity for s in g.signals if s.kind=='drawdown'] or [None])==[severity]

@pytest.mark.parametrize('prices,quantities,reason',[(('0','0'),('1','1'),'ZERO_VALUE'),((None,'400'),('1','1'),'MISSING_PRICE'),(('600','400'),('0','0'),'EMPTY')])
def test_zero_missing_and_empty_do_not_renormalize(prices,quantities,reason):
    g=risk_group('USD',positions(prices,quantities=quantities),{})
    assert g.top1_weight is None and g.herfindahl is None
    assert all(a.weight is None for a in g.allocation)
    assert any(reason in x for x in g.unavailable)

def test_currency_isolation_unaligned_and_insufficient_history():
    hs=positions(currencies=('USD','HKD'))
    assert risk_group('USD',[hs[0]],{}).top1_weight=='1'
    assert risk_group('HKD',[hs[1]],{}).top1_weight=='1'
    g=risk_group('USD',positions(),{'AAPL.US':series(bars([100,110,99])), 'MSFT.US':series(bars([100,90,99],start=1700000001))})
    assert g.portfolio_volatility.daily_volatility is None
    assert stats('A',series(bars([100,100]))).daily_volatility is None
    assert stats('A',series(bars([100,100,100]))).daily_volatility=='0'

@pytest.mark.parametrize('data',[bars([1,0,1]),bars([1,-1,1]),bars([1,float('inf'),1]),bars([1,True,1]),
    bars([1,2])+[bars([1,2])[1]], [{'timestamp':1700000000,'close':1}],bars([1,2,3],start=0),
    [{'timestamp':1700000000,'close':1,'high':1},{'timestamp':1700864000,'close':2,'high':2}]])
def test_bad_or_missing_bar_never_becomes_a_zero_or_bridged_return(data):
    with pytest.raises(Exception): series(data)

@pytest.mark.parametrize('body',[{'symbols':['AAPL.US']},{'symbols':['AAPL.US']*5},{'symbols':['AAPL.US','AAPL.US']},
    {'symbols':['AAPL.US','BAD;COMMAND']},{'symbols':['AAPL.US','MSFT.US'],'currency':'usd'},
    {'symbols':['AAPL.US','MSFT.US'],'report_year':True},{'symbols':['AAPL.US','MSFT.US'],'secret':'sentinel'}])
def test_strict_comparison_boundary(body):
    with pytest.raises(ValidationError): CompareQuery.model_validate(body)

def test_full_table_fixed_windows_and_fields(tmp_path):
    with client(tmp_path) as c:
        r=compare(c); assert r.status_code==200,r.text
        d=r.json(); assert len(d['rows'])==13 and d['status']=='ready'
        assert cells(d,'gross_margin')['AAPL.US']['value']=='50'
        assert cells(d,'revenue_growth')['MSFT.US']['period']=='2023 Annual'
        assert cells(d,'return_1y')['AAPL.US']['value']=='235.51401869' # (359/107-1)*100
        assert cells(d,'return_3m')['AAPL.US']['value']=='21.28378378' # (359/296-1)*100
        assert cells(d,'momentum')['MSFT.US']['value']=='强'
        assert d==compare(c).json()
        assert d['snapshot_id']!=compare(c,refresh=True).json()['snapshot_id']

@pytest.mark.parametrize('case',['currency','year','duplicate','financial-currency','unaligned','failure','missing','invalid'])
def test_peer_missing_failure_currency_report_and_time_are_explicit(tmp_path,case):
    def execute(q):
        d=sample(q)
        if q.symbol=='MSFT.US':
            if case=='failure': raise ProviderFault('ACCESS_DENIED','restricted')
            if case=='missing': return [] if q.capability in ('market.kline','research.news') else {}
            if case=='currency' and q.capability=='company.profile': d['currency']='HKD'
            if case in ('year','duplicate','financial-currency') and q.capability=='company.financials':
                indicator=d['list']['IS']['indicators'][0]
                if case=='financial-currency': indicator['currency']='HKD'
                for a in indicator['accounts']:
                    if case=='year': a['values'][0]['year']=2022
                    if case=='duplicate': a['values']*=2
            if case=='unaligned' and q.capability=='market.kline':
                for b in d: b['timestamp']+=1
            if case=='invalid' and q.capability=='market.kline': d[20]['close']=0
        return d
    with client(tmp_path,execute) as c:
        d=compare(c).json(); assert d['status']=='partial'
        metric='price' if case in ('currency','failure','missing') else 'return_1m' if case in ('unaligned','invalid') else 'roe'
        cell=cells(d,metric)['MSFT.US']; assert cell['value'] is None and cell['reason']
        if case=='failure': assert any(r['status']=='restricted' and r['code']=='ACCESS_DENIED' for r in d['reads'])
        if case=='unaligned': assert cells(d,'return_1m')['AAPL.US']['value'] is None
        if case=='invalid': assert any(r['code']=='INVALID_SERIES' for r in d['reads'])

def test_page_agent_result_equality_events_replay_and_revision_invalidation(tmp_path):
    with client(tmp_path) as c:
        p=pid(c); page=risk(c,p).json(); assert page['groups'][0]['top1_weight']=='1'
        record,events=run(c,f'分析组合{p}风险')
        assert [e['type'] for e in events]==['run_started','message_started','status','tool_started','tool_result','text_delta','message_completed','run_completed']
        assert events[4]['payload']['result']['data']['report']==page
        assert page['snapshot_id'] in record['answer']
        comparison=compare(c).json(); _,ev=run(c,'对比AAPL.US MSFT.US')
        assert ev[4]['payload']['result']['data']['report']==comparison
        assert risk(c,p).json()==page
        csv='record_type,symbol,currency,quantity,cost_price,market_price,amount\nholding,AAPL.US,USD,3,100,120,'
        draft=c.post('/portfolios/preview',json={'portfolio_id':p,'csv_text':csv}).json()
        c.post('/portfolios/confirm',json={'portfolio_id':p,'draft_id':draft['draft_id']})
        changed=risk(c,p).json(); assert changed['snapshot_id']!=page['snapshot_id'] and changed['portfolio_revision']==1

def test_risk_baseline_signals_and_fixture_clock(tmp_path):
    with client(tmp_path) as c:
        d=risk(c,pid(c)).json(); g=d['groups'][0]
        assert {'concentration','large_position','sector_exposure','upcoming_earnings','news_exposure'} <= {s['kind'] for s in g['signals']}
        news=next(s for s in g['signals'] if s['kind']=='news_exposure')
        assert '新闻 1条' in news['detail'] # future and stale excluded
        assert '2024-01-16' in news['detail']

def test_empty_readonly_missing_market_and_no_real_fallback(tmp_path):
    with client(tmp_path,lambda q: (_ for _ in ()).throw(ProviderFault('NETWORK_ERROR'))) as c:
        d=risk(c,pid(c,'manual')).json(); assert d['status']=='empty' and d['groups']==[]
        real=risk(c,pid(c,'read_only')).json(); assert real['status']=='failed' and real['input_status']=='unverified'
        d=risk(c,pid(c)).json(); assert d['status']=='partial'
        assert d['groups'][0]['top1_weight']=='1' # snapshot concentration remains available
        assert d['groups'][0]['portfolio_volatility']['daily_volatility'] is None
        # Simulated accounts may never silently consume real prices.
        d=risk(c,pid(c),mode='real').json(); assert d['status']=='partial' and d['reads']==[]
        assert any('SOURCE_MISMATCH' in s for s in d['groups'][0]['unavailable'])
        d=compare(c,mode='real').json(); assert d['status']=='missing'
        assert all(r['status']=='unconfigured' for r in d['reads'])

def test_http_currency_groups_missing_denominator_and_cash_only(tmp_path):
    with client(tmp_path) as c:
        p=pid(c,'manual')
        header='record_type,symbol,currency,quantity,cost_price,market_price,amount\n'
        cases=[('holding,AAPL.US,USD,1,,600,\nholding,700.HK,HKD,1,,400,',{'USD','HKD'}),
            ('holding,AAPL.US,USD,1,,600,\nholding,MSFT.US,USD,1,,,',{'USD'}),
            ('cash,,USD,,,,50',{'USD'})]
        for i,(rows,expected) in enumerate(cases):
            draft=c.post('/portfolios/preview',json={'portfolio_id':p,'csv_text':header+rows}).json()
            assert draft['can_import']
            assert c.post('/portfolios/confirm',json={'portfolio_id':p,'draft_id':draft['draft_id']}).status_code==200
            d=risk(c,p).json(); assert {g['currency'] for g in d['groups']}==expected
            assert 'total_market_value' not in d # no cross-currency total
            if i==1: assert all(a['weight'] is None for a in d['groups'][0]['allocation'])
            if i==2: assert d['status']=='empty' and d['groups'][0]['top1_weight'] is None

def test_auth_and_validation_never_echo_inputs(tmp_path):
    with client(tmp_path) as c:
        assert c.post('/analytics/risk',json={'portfolio_id':str(uuid4())},headers={'X-ResearchTrail-Token':'bad'}).status_code==401
        r=c.post('/analytics/compare',json={'symbols':['secret-payload','AAPL.US']})
        assert r.status_code==422 and 'secret-payload' not in r.text
        assert risk(c,str(uuid4())).status_code==409

def test_read_budget_and_bounded_background_workers(tmp_path):
    def slow(q): time.sleep(.5); return sample(q)
    with client(tmp_path,slow) as c:
        c.app.state.analytics.budget=.01
        d=compare(c).json(); assert any(r['code']=='ANALYSIS_TIMEOUT' for r in d['reads'])
        assert any(r['code']=='READ_BUDGET' for r in d['reads'])
        assert len(d['reads'])==14 and d['status']=='missing'

def test_kline_boundary_allows_260_but_not_other_reads():
    assert ReadQuery(capability='market.kline',symbol='AAPL.US',count=260).count==260
    assert len(public_json(bars(range(1,261))))==260
    for cap,count in [('market.quote',101),('market.kline',261)]:
        with pytest.raises(ValidationError): ReadQuery(capability=cap,symbol='AAPL.US',count=count)

def test_openai_adapter_uses_identical_risk_snapshot(tmp_path):
    target={}; messages=[]
    async def exchange(request):
        body=json.loads(request.content); messages.append(body)
        if body['messages'][-1]['role']=='tool': message={'role':'assistant','content':'工具已返回Python风险快照；模拟行情。'}
        else: message={'role':'assistant','content':None,'tool_calls':[{'id':'risk_call','type':'function','function':{'name':'portfolio_risk','arguments':json.dumps({'portfolio_id':target['id']})}}]}
        return httpx.Response(200,json={'choices':[{'finish_reason':'tool_calls' if 'tool_calls' in message else 'stop','message':message}]})
    with client(tmp_path,openai_transport=httpx.MockTransport(exchange)) as c:
        target['id']=pid(c); page=risk(c,target['id']).json()
        c.put('/settings/connections/model',json={'endpoint':'https://model.invalid/v1','model':'fake-http-risk','enabled':True})
        c.put('/settings/connections/model/credential',json={'secret':'authored-test-model-secret'})
        _,events=run(c,'风险工具契约测试','openai_agent')
        assert events[4]['payload']['result']['data']['report']==page
        assert json.loads(messages[1]['messages'][-1]['content'])['data']['report']==page
        assert 'authored-test-model-secret' not in json.dumps(events)

def test_unregistered_or_bad_analytics_tool_is_never_executed():
    registry=ToolRegistry()
    with pytest.raises(ToolExecutionError): registry.decode('portfolio_risk',{'portfolio_id':str(uuid4())})
    registry.register('stocks.compare',lambda _:None)
    with pytest.raises(ToolExecutionError): registry.decode('stocks_compare',{'symbols':['AAPL.US']})
