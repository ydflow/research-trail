"""Step19: fixed small pools, independently chosen boundary inputs for every task."""
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from copy import deepcopy
from uuid import uuid4
import threading
import time
from unittest.mock import Mock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from research_trail.app import create_app
from research_trail.provider_errors import ProviderFault
from research_trail.provider_service import authored_data
from research_trail.screening_rules import TASKS
from research_trail.screening import digest
from test_settings import TOKEN, HEADERS, Vault

NOW=datetime(2030,1,1,tzinfo=timezone.utc)
IDS=[r[0] for r in TASKS]

def bars():
    return [{'timestamp':(NOW-timedelta(days=90-i)).isoformat(),'close':'100','high':'101','low':'99','volume':'100'} for i in range(64)]

def fixture(strategy, included=True, missing=False):
    rows=bars()
    data={'market.quote':{'last_price':'100','change_percent':'1' if included else '.999999999999'},
        'company.valuation':{'pe_ttm_ratio':'14.99999999999' if included else '15','pb_ratio':'1.2','volume_ratio':'1.5' if included else '1.499999999999','amplitude':'3' if included else '2.99999999999','dividend_ratio_ttm':'3' if included else '2.99999999999'},
        'company.financials':{'roe':'15' if included else '14.99999999999','revenue_growth':'10' if included else '9.99999999999','net_margin':'10'},
        'company.dividends':{'list':[{'ex_date':(NOW+timedelta(days=90,seconds=0 if included else 1)).isoformat()}]},
        'market.sentiment':{'temperature':'50'},'company.ratings':{'latest':{'recommend':'buy','target_price':'105' if included else '104.99999999999'}},
        'research.events':{'list':[{'symbol':'AAPL.US' if included else 'MSFT.US','type':'financial','date':(NOW+timedelta(days=30,seconds=0 if included else 1)).isoformat()}]},
        'research.news':[{'id':str(i),'title':str(i),'published_at':(NOW-timedelta(days=7-i)).isoformat()} for i in range(3 if included else 2)],'market.kline':rows}
    if strategy=='top-losers': data['market.quote']['change_percent']='-1' if included else '-.999999999999'
    if strategy=='quality-growth': data['company.financials']['revenue_growth']='5'; data['company.financials']['net_margin']='10'
    if strategy=='strong-momentum':
        rows[0].update(close='90'); rows[-1].update(close='105' if included else '104.99999999999',high='106')
    if strategy=='breakout': rows[-1].update(close='102' if included else '101',high='103',volume='150')
    if strategy=='oversold': rows[-1].update(close='90' if included else '90.00000000001',high='100',low='89')
    if strategy=='trend-reversal':
        rows[0].update(close='120',high='121',low='119'); rows[-1].update(close='105',high='106',low='100')
        if not included: rows[-6].update(close='105',high='106')
    if missing:
        for cap in data: data[cap]=[] if cap=='market.kline' else [{'title':'undated fixture'}] if cap=='research.news' else {}
    return data

@pytest.fixture
def api(tmp_path):
    @contextmanager
    def make(executor=None,path=None,timeout=15):
        model=Mock(); model.label='unused-model'
        app=create_app(TOKEN,database_path=path or tmp_path/'screening.sqlite3',credential_vault=Vault(),model_provider=model,
            provider_options={'simulated_executor':executor or authored_data},screening_options={'clock':lambda:NOW,'timeout_seconds':timeout})
        with TestClient(app,headers=HEADERS) as c:
            yield c,app
            assert model.mock_calls==[]
    return make

def start(c,strategy='top-gainers',**kw):
    body={'strategy':strategy,'universe':['AAPL.US','MSFT.US','NVDA.US'],'request_id':str(uuid4()),**kw}
    r=c.post('/screening/runs',json=body); assert r.status_code==200,r.text
    return r.json(),body

def settled(c,identity):
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        r=c.get('/screening/runs/'+identity); assert r.status_code==200,r.text
        value=r.json()
        if value['status']!='fetching': return value
        time.sleep(.01)
    raise AssertionError('Screening did not settle')

def pointer(value,path):
    for key in path.split('/')[1:]: value=value[int(key)] if isinstance(value,list) else value[key]
    return value

@pytest.mark.parametrize('strategy',IDS)
def test_every_baseline_task_boundary_small_pool_and_raw_evidence(api,strategy):
    def executor(q): return deepcopy(fixture(strategy,q.symbol!='MSFT.US',q.symbol=='NVDA.US')[q.capability])
    with api(executor) as (c,app):
        tasks=c.post('/screening/tasks',json={}).json(); assert [t['id'] for t in tasks]==IDS
        run,_=start(c,strategy); run=settled(c,run['id'])
        assert run['status']=='partial'
        assert [x['symbol'] for x in run['candidates']]==['AAPL.US'],run
        assert [(x['symbol'],x['status']) for x in run['decisions']]==[('AAPL.US','included'),('MSFT.US','excluded'),('NVDA.US','missing')]
        assert run['task']['rule'] and run['task']['score_rule']
        for metric in run['candidates'][0]['metrics']:
            assert metric['inputs'] and metric['formula']
            for ref in metric['inputs']:
                evidence=c.get(f"/screening/runs/{run['id']}/evidence/{ref['read_id']}").json()
                assert evidence['read']['symbol']=='AAPL.US'
                assert evidence['read']['result_hash']==digest(evidence['result'])
                pointer(evidence['result'],ref['pointer'])
                assert evidence['result']['provenance']['data_label']=='模拟数据'
        if strategy=='trend-reversal': assert run['candidates'][0]['score'] is None
        expected={'top-gainers':'0.1','top-losers':'0.1','high-volume':'0.25','unusual-movement':'0.5','high-roe':'0.5','revenue-growth':'0.25','high-dividend':'0.375','breakout':'0.5','upcoming-earnings':'0','rating-changes':'0.125','news-surge':'0.3','dividend-events':'0'}
        if strategy in expected: assert run['candidates'][0]['score']==expected[strategy]

def test_capability_missing_all_failed_and_partial_never_fake_candidates(api):
    calls=[]
    def executor(q):
        calls.append(q)
        if q.symbol=='MSFT.US': raise ProviderFault('NETWORK_ERROR')
        return fixture('top-gainers')[q.capability]
    with api(executor) as (c,app):
        run,_=start(c,universe=['AAPL.US','MSFT.US']); run=settled(c,run['id'])
        assert run['status']=='partial' and run['candidates'][0]['symbol']=='AAPL.US'
        run,_=start(c,universe=['MSFT.US']); assert settled(c,run['id'])['status']=='failed'
        calls.clear()
        run,_=start(c,'high-roe',provider='massive'); run=settled(c,run['id'])
        assert run['status']=='failed' and run['candidates']==[] and calls==[]
        assert all(not t['capabilities'][0]['available'] for t in c.post('/screening/tasks',json={'mode':'real'}).json())
        run,_=start(c,mode='real'); assert settled(c,run['id'])['candidates']==[] and calls==[]

def test_bounded_input_idempotence_default_pool_and_auth(api):
    with api() as (c,app):
        assert c.get('/screening/runs',headers={'x-researchtrail-token':'bad'}).status_code==401
        for changes in ({'universe':[]},{'universe':['AAPL.US']*41},{'universe':['AAPL.US','AAPL.US']},{'universe':['../secret']},{'limit':True},{'strategy':'scan-world'}):
            assert c.post('/screening/runs',json={'request_id':str(uuid4()),**changes}).status_code==422
        run,body=start(c,universe=None); run=settled(c,run['id']); assert run['universe_source']=='watchlist'
        assert c.post('/screening/runs',json=body).json()['id']==run['id']
        assert c.post('/screening/runs',json={**body,'limit':1}).status_code==409
        assert len(c.get('/screening/runs').json())==1
        assert c.get('/screening/runs/../../secret').status_code!=200

def test_concurrency_timeout_slots_cancel_keep_success_and_ignore_late(api):
    blocked=threading.Event(); lock=threading.Lock(); active=0; peak=0
    def executor(q):
        nonlocal active,peak
        with lock: active+=1; peak=max(peak,active)
        try:
            if q.symbol!='AAPL.US': blocked.wait(2)
            return fixture('top-gainers')[q.capability]
        finally:
            with lock: active-=1
    with api(executor,timeout=.05) as (c,app):
        run,_=start(c,universe=['AAPL.US','MSFT.US','NVDA.US','TSLA.US','META.US','AMD.US'])
        run=settled(c,run['id']); assert peak<=4 and run['status']=='partial'
        assert [x['symbol'] for x in run['candidates']]==['AAPL.US']
        assert c.post('/screening/runs',json={'request_id':str(uuid4())}).status_code==409
        old=deepcopy(run); blocked.set(); time.sleep(.07)
        assert c.get('/screening/runs/'+run['id']).json()==old
    blocked.clear()
    with api(executor,path=app.state.screening.database.path,timeout=2) as (c,app):
        run,_=start(c,universe=['AAPL.US','MSFT.US'])
        deadline=time.monotonic()+5
        while not any(r['symbol']=='AAPL.US' and r['status']=='completed' for r in c.get('/screening/runs/'+run['id']).json()['reads']):
            assert time.monotonic()<deadline,'First successful read was not persisted'
            time.sleep(.01)
        c.post('/screening/runs/'+run['id']+'/cancel'); run=settled(c,run['id'])
        assert run['status']=='cancelled' and run['candidates'][0]['symbol']=='AAPL.US'
        blocked.set()

def test_history_evidence_tampering_and_interrupted_restart(api,tmp_path):
    path=tmp_path/'persist.sqlite3'
    with api(path=path) as (c,app):
        run,_=start(c,universe=['AAPL.US']); run=settled(c,run['id'])
        with app.state.screening.database.write() as db:
            from research_trail.models import ScreeningRecord
            row=db.get(ScreeningRecord,run['id']); p=deepcopy(row.payload); p['run']['status']='fetching'; row.payload=p
    with api(path=path) as (c,app):
        saved=c.get('/screening/runs/'+run['id']).json(); assert saved['status']=='interrupted' and saved['reads']==run['reads']
        with app.state.screening.database.write() as db:
            row=db.get(ScreeningRecord,run['id']); p=deepcopy(row.payload); p['results'][saved['reads'][0]['id']]['data']['change_percent']=999; row.payload=p
        assert c.get('/screening/runs/'+run['id']).status_code==409
        assert c.get(f"/screening/runs/{run['id']}/evidence/{saved['reads'][0]['id']}").status_code==409

def test_no_future_news_duplicate_payment_date_or_cross_stock_events(api):
    def executor(q):
        if q.capability=='research.news':
            return [{'url':'same','published_at':NOW.isoformat()}]*3+[{'url':str(i),'published_at':(NOW+timedelta(seconds=1)).isoformat()} for i in range(5)]
        if q.capability=='company.dividends': return {'list':[{'date':NOW.isoformat()}]}
        return {'list':[{'symbol':'NVDA.US','type':'financial','date':NOW.isoformat()}]}
    with api(executor) as (c,app):
        for strategy in ('news-surge','dividend-events','upcoming-earnings'):
            run,_=start(c,strategy,universe=['AAPL.US']); run=settled(c,run['id']); assert run['candidates']==[]
        assert run['status']=='failed'

def test_invalid_bar_does_not_shift_last_or_fill_missing_and_volume_fallback(api):
    def executor(q):
        data=fixture('high-volume')[q.capability]
        if q.capability=='company.valuation': return {}
        if q.capability=='market.kline':
            data[-1]['volume']='150'
            if q.symbol=='MSFT.US': data[-1]['volume']=None
            if q.symbol=='NVDA.US': data[-1]['timestamp']=data[-2]['timestamp']
        return data
    with api(executor) as (c,app):
        run,_=start(c,'high-volume'); run=settled(c,run['id']); assert [x['symbol'] for x in run['candidates']]==['AAPL.US']
        assert run['candidates'][0]['score']=='0.25'

def test_annual_financial_sources_and_no_nonadjacent_growth(api):
    def executor(q):
        return {'list':{'IS':{'indicators':[{'accounts':[{'field':'OperatingRevenue','values':[
            {'period':'Annual','year':2029,'value':'110'}, {'period':'Annual','year':2028 if q.symbol=='AAPL.US' else 2027,'value':'100'}]}]}]}}}
    with api(executor) as (c,app):
        run,_=start(c,'revenue-growth',universe=['AAPL.US','MSFT.US']); run=settled(c,run['id'])
        assert run['candidates'][0]['metrics'][0]['value']=='10' and len(run['candidates'])==1

@pytest.mark.parametrize('strategy,field,edge,outside',[
    ('quality-growth','revenue_growth','5','4.999999999999'),
    ('quality-growth','net_margin','10','9.999999999999'),
    ('low-valuation','pb_ratio','1.199999999999','1.2')])
def test_independent_compound_boundaries(api,strategy,field,edge,outside):
    def executor(q):
        data=fixture(strategy)[q.capability]
        if q.capability in ('company.financials','company.valuation'):
            data[field]=edge if q.symbol=='AAPL.US' else outside
            if strategy=='low-valuation': data['pe_ttm_ratio']='15'
        return data
    with api(executor) as (c,app):
        run,_=start(c,strategy,universe=['AAPL.US','MSFT.US']); run=settled(c,run['id'])
        assert [x['symbol'] for x in run['candidates']]==['AAPL.US']

def test_exact_sma_boundary_and_secondary_momentum_return(api):
    def executor(q):
        data=bars()
        data[0].update(close='110',high='111')
        data[-2].update(close='108',high='109'); data[-1].update(close='92' if q.symbol=='AAPL.US' else '92.00000000001',low='90')
        return data
    with api(executor) as (c,app):
        run,_=start(c,'oversold',universe=['AAPL.US','MSFT.US']); run=settled(c,run['id'])
        assert [x['symbol'] for x in run['candidates']]==['AAPL.US']
        assert run['candidates'][0]['metrics'][1]['value']=='-8'
        def momentum(q):
            data=bars();data[-22].update(close='100',high='101');data[0].update(close='100',high='101')
            data[-1].update(close='110' if q.symbol=='AAPL.US' else '109.999999999999',high='111');return data
        app.state.providers.simulated_executor=momentum
        run,_=start(c,'strong-momentum',universe=['AAPL.US','MSFT.US']); run=settled(c,run['id'])
        assert [x['symbol'] for x in run['candidates']]==['AAPL.US']

def test_actual_sdk_rating_and_cli_calendar_shapes_day_precision(api):
    def executor(q):
        if q.capability=='company.ratings': return {'summary':{'recommend':'InstitutionRecommend.Buy','target':'105'}}
        if q.capability=='market.quote': return {'last_price':'100'}
        if q.capability=='company.dividends': return {'list':[{'ex_date':'20300101','symbol':q.symbol}]}
        return [{'counter_id':'ST/US/AAPL','type':'financial','datetime':str(int(NOW.timestamp()))}]
    with api(executor) as (c,app):
        for strategy in ('rating-changes','upcoming-earnings','dividend-events'):
            run,_=start(c,strategy,universe=['AAPL.US']); run=settled(c,run['id'])
            assert run['status']=='completed' and run['candidates'][0]['symbol']=='AAPL.US'
            for m in run['candidates'][0]['metrics']:
                for ref in m['inputs']: pointer(c.get(f"/screening/runs/{run['id']}/evidence/{ref['read_id']}").json()['result'],ref['pointer'])

def test_bad_dates_per_stock_partial_and_config_change_during_call(api):
    gate=threading.Event(); entered=threading.Event()
    def executor(q):
        if q.capability=='research.news': return [{'id':str(i),'published_at':'invalid' if q.symbol=='MSFT.US' else NOW.isoformat()} for i in range(3)]
        entered.set();gate.wait(2);return fixture('top-gainers')[q.capability]
    with api(executor) as (c,app):
        run,_=start(c,'news-surge',universe=['AAPL.US','MSFT.US']); run=settled(c,run['id'])
        assert run['status']=='partial' and run['candidates'][0]['symbol']=='AAPL.US'
        run,_=start(c,universe=['AAPL.US']); assert entered.wait(1)
        assert c.put('/settings/providers/longbridge',json={'cache_ttl_seconds':1}).status_code==200
        gate.set();run=settled(c,run['id']);assert run['status']=='failed' and not run['candidates']
        assert run['reads'][0]['code']=='CONFIG_CHANGED'

def test_score_ties_limit_keeps_all_decisions_and_failed_required_read(api):
    def executor(q):
        if q.capability=='company.valuation': raise ProviderFault('PERMISSION_DENIED','restricted')
        return fixture('top-gainers')[q.capability]
    with api(executor) as (c,app):
        run,_=start(c,universe=['NVDA.US','AAPL.US','MSFT.US'],limit=1);run=settled(c,run['id'])
        assert run['status']=='completed' and run['candidate_count']==1 and run['candidates'][0]['symbol']=='AAPL.US' and len(run['decisions'])==3
        run,_=start(c,'high-volume',universe=['AAPL.US']);run=settled(c,run['id'])
        assert run['status']=='failed' and not run['candidates']
        assert sum(r['status']=='completed' for r in run['reads'])==2
        for read in run['reads']: assert c.get(f"/screening/runs/{run['id']}/evidence/{read['id']}").status_code==200

def test_additive_upgrade_from_0013_preserves_existing_workspace(api,tmp_path):
    path=tmp_path/'upgrade.sqlite3'
    with api(path=path) as (c,app):
        old=c.get('/workspace').json()
        with app.state.screening.database.write() as db:
            for name in ('monitoring_research_actions','monitoring_runs','monitoring_rules','calendar_snapshots','screening_runs'): db.execute(text('DROP TABLE '+name))
            db.execute(text("UPDATE alembic_version SET version_num='0013_theses'"))
    with api(path=path) as (c,app):
        assert c.get('/workspace').json()==old and c.get('/screening/runs').json()==[]
        with app.state.screening.database.sessions() as db:
            assert db.scalar(text('SELECT version_num FROM alembic_version'))=='0016_monitoring'
            assert not db.execute(text('PRAGMA foreign_key_check')).all()

def test_explicit_nonbuy_and_empty_lists_are_excluded_not_capability_failures(api):
    def executor(q):
        if q.capability=='company.ratings': return {'summary':{'recommend':'InstitutionRecommend.Hold'}}
        if q.capability=='market.quote': return {'last_price':'100'}
        return {'list':[]} if q.capability=='company.dividends' else []
    with api(executor) as (c,app):
        for strategy in ('rating-changes','news-surge','upcoming-earnings','dividend-events'):
            run,_=start(c,strategy,universe=['AAPL.US']);run=settled(c,run['id'])
            assert run['status']=='completed' and not run['candidates'] and run['decisions'][0]['status']=='excluded'

def test_result_finished_after_deadline_is_not_success_when_coordinator_delayed(api):
    entered=threading.Event(); release=threading.Event()
    def executor(q):
        entered.set(); release.wait(2); return fixture('top-gainers')[q.capability]
    with api(executor,timeout=.03) as (c,app):
        run,_=start(c,universe=['AAPL.US']); assert entered.wait(1)
        with app.state.screening.lock:
            time.sleep(.06)
            release.set(); assert app.state.screening.calls[0]['done'].wait(1)
        run=settled(c,run['id'])
        assert run['status']=='failed' and not run['candidates']
        assert run['reads'][0]['code']=='TIMEOUT'

def test_explicit_other_stock_dividend_cannot_be_candidate_evidence(api):
    def executor(q): return {'list':[{'symbol':'MSFT.US','ex_date':NOW.isoformat()}]}
    with api(executor) as (c,app):
        run,_=start(c,'dividend-events',universe=['AAPL.US']); run=settled(c,run['id'])
        assert run['status']=='failed' and not run['candidates']
        assert run['decisions'][0]['code']=='MISSING_ATTRIBUTED_EVENT_DATE'
