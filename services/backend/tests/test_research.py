"""Step15 collection lifecycle, persistence and shared provider/skill boundaries."""
from contextlib import contextmanager
import json
import threading
import time
from unittest.mock import Mock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from research_trail.app import create_app
from research_trail.provider_service import authored_data
from research_trail.provider_errors import ProviderFault
from research_trail.provider_contracts import ReadQuery
from research_trail.research_contracts import ResearchInput
from test_settings import TOKEN, HEADERS, Vault

@pytest.fixture
def api(tmp_path):
    @contextmanager
    def make(executor=None, timeout=20, path=None):
        model=Mock(); model.label='not-invoked'
        app=create_app(TOKEN,database_path=path or tmp_path/'research.sqlite3',credential_vault=Vault(),model_provider=model,
            provider_options={'simulated_executor':executor or authored_data},
            research_options={'timeout_seconds':timeout,'drain_seconds':0.05})
        with TestClient(app,headers=HEADERS) as c: yield c,app,model
    return make

def start(c, **values):
    response=c.post('/research/runs',json={'symbol':'AAPL.US',**values})
    assert response.status_code==200,response.text
    return response.json()['id']

def settled(c, identity, timeout=5):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        result=c.get('/research/runs/'+identity).json()
        if result['status']!='fetching': return result
        time.sleep(0.01)
    raise AssertionError('Research did not settle')

def test_strategy_selection_changes_plan_and_never_fetches(api):
    executor=Mock(side_effect=authored_data)
    with api(executor) as (c,app,model):
        strategies=c.get('/research/strategies').json()
        assert {s['id'] for s in strategies}=={'comprehensive','value','growth','technical','earnings','event-driven','risk-review','income'}
        value=c.post('/research/plan',json={'symbol':'AAPL.US','strategy':'value'}).json()
        technical=c.post('/research/plan',json={'symbol':'AAPL.US','strategy':'technical'}).json()
        assert [r['capability'] for r in value['reads']]==['company.profile','company.valuation','company.financials','company.dividends']
        assert [r['capability'] for r in technical['reads']]==['market.kline','market.intraday','market.depth','market.trades','market.sentiment']
        assert technical['reads'][-1]['query']['symbol'] is None
        assert technical['reads'][-1]['query']['market']=='US'
        assert value['input']['concurrency']==4 and value['timeout_seconds']==20
        assert value['skills'][0]['code']=='SKILL_NOT_IMPORTED'
        assert technical['skills'][0]['status']=='partial'
        c.put('/skills/longbridge-technical/enabled',json={'enabled':False})
        assert c.post('/research/plan',json={'symbol':'AAPL.US','strategy':'technical'}).json()['skills'][0]['status']=='disabled'
        assert app.state.research.registry is app.state.capabilities is app.state.providers.registry
        assert app.state.research.skills is app.state.skills
        assert c.get('/research/runs').json()==[]
        assert executor.call_count==model.complete.call_count==0

def test_one_failure_keeps_successes_and_persisted_inputs(api):
    def execute(q):
        if q.capability=='company.financials': raise ProviderFault('NETWORK_ERROR')
        return authored_data(q)
    with api(execute) as (c,app,model):
        identity=start(c,strategy='value'); result=settled(c,identity)
        assert (result['status'],result['succeeded'],result['failed'],result['completed'])==('partial',3,1,4)
        failure=next(s for s in result['steps'] if s['capability']=='company.financials')
        assert failure['code']=='NETWORK_ERROR' and not failure['has_result']
        saved=c.get(f'/research/runs/{identity}/data/company.profile').json()
        assert saved['result']['provenance']['mode']=='simulated'
        assert saved['result']['data']['symbol']=='AAPL.US'
        assert saved['result']['provenance']['fetched_at']
        assert c.get(f'/research/runs/{identity}/data/company.financials').status_code==409
        assert result['plan']['reads'][0]['query']['use_cache'] is False
        assert c.get('/research/runs').json()[0]['id']==identity
        assert model.complete.call_count==0
        with app.state.store.database.engine.connect() as db:
            assert db.scalar(text('select count(*) from research_steps where run_id=:id'),{'id':identity})==4
            assert db.scalar(text('select count(*) from runs'))==0
    with api(execute) as (c,_,_):
        assert c.get('/research/runs/'+identity).json()==result
        assert c.get(f'/research/runs/{identity}/data/company.profile').json()==saved

@pytest.mark.parametrize('exception',[ProviderFault('NETWORK_ERROR'),RuntimeError('test-private-key-never-return')])
def test_all_failed_is_failed_and_exception_text_is_not_saved(api,exception):
    def execute(q): raise exception
    with api(execute) as (c,app,_):
        identity=start(c); result=settled(c,identity)
        assert result['status']=='failed' and result['succeeded']==0 and result['failed']==16
        assert all(not s['has_result'] for s in result['steps'])
        assert 'test-private-key-never-return' not in json.dumps(result)
        with app.state.store.database.engine.connect() as db:
            assert 'test-private-key-never-return' not in str(db.exec_driver_sql('select * from research_steps').all())

def test_unsupported_and_real_unconfigured_keep_all_planned_dimensions(api):
    executor=Mock(side_effect=authored_data)
    with api(executor) as (c,_,_):
        identity=start(c,provider='massive'); result=settled(c,identity)
        assert (result['status'],result['total'],result['succeeded'],result['failed'])==('partial',16,3,13)
        assert executor.call_count==3
        identity=start(c,mode='real'); result=settled(c,identity)
        assert result['status']=='failed' and result['failed']==16
        assert all(s['code']=='UNCONFIGURED' and s['started_at'] is None for s in result['steps'])
        assert executor.call_count==3  # no silent simulated fallback

@pytest.mark.parametrize('concurrency',[1,4])
def test_physical_concurrency_limit_and_single_active_run(api,concurrency):
    gate=threading.Event(); ready=threading.Event(); lock=threading.Lock()
    active=peak=count=0
    def execute(q):
        nonlocal active,peak,count
        with lock:
            active+=1; count+=1; peak=max(peak,active)
            if active==concurrency: ready.set()
        try:
            assert gate.wait(4)
            time.sleep(0.02)
            return authored_data(q)
        finally:
            with lock: active-=1
    with api(execute) as (c,_,_):
        try:
            identity=start(c,concurrency=concurrency)
            assert ready.wait(2)
            assert c.post('/research/runs',json={'symbol':'MSFT.US'}).json()['detail']=='RESEARCH_ACTIVE'
        finally: gate.set()
        result=settled(c,identity)
        assert result['status']=='collected' and result['succeeded']==16
        assert peak==concurrency and count==16

def test_cancel_keeps_success_and_rejects_late_return_without_global_stop(api):
    gate=threading.Event(); entered=threading.Event()
    def execute(q):
        if q.capability=='company.financials':
            entered.set(); assert gate.wait(4)
        return authored_data(q)
    with api(execute) as (c,app,_):
        try:
            identity=start(c,strategy='value'); assert entered.wait(2)
            deadline=time.monotonic()+2
            while c.get('/research/runs/'+identity).json()['succeeded']<3:
                assert time.monotonic()<deadline; time.sleep(0.01)
            before=c.get(f'/research/runs/{identity}/data/company.profile').json()
            cancelled=c.post(f'/research/runs/{identity}/cancel').json()
            assert cancelled['status']=='cancelled' and cancelled['succeeded']==3 and cancelled['failed']==1
            assert not app.state.providers.stop.is_set()
            assert c.post('/providers/longbridge/query',json={'capability':'market.quote','symbol':'MSFT.US'}).json()['ok']
        finally: gate.set()
        time.sleep(0.08)
        assert c.get('/research/runs/'+identity).json()==cancelled
        assert c.get(f'/research/runs/{identity}/data/company.profile').json()==before
        assert c.get(f'/research/runs/{identity}/data/company.financials').status_code==409
        assert c.post(f'/research/runs/{identity}/cancel').json()==cancelled

def test_timeout_is_terminal_and_physical_slots_are_not_replaced(api):
    gate=threading.Event(); lock=threading.Lock(); count=0
    def execute(q):
        nonlocal count
        with lock: count+=1
        assert gate.wait(4)
        return authored_data(q)
    with api(execute,timeout=0.08) as (c,_,_):
        try:
            identity=start(c); result=settled(c,identity)
            assert result['status']=='failed'
            assert sum(s['status']=='timed_out' for s in result['steps'])==4
            assert sum(s['code']=='EXECUTOR_DRAINING' for s in result['steps'])==12
            assert count==4  # not 16 leaked calls after timeout
            assert c.post('/research/runs',json={'symbol':'AAPL.US'}).json()['detail']=='EXECUTOR_DRAINING'
        finally: gate.set()
        time.sleep(0.1)
        assert c.get('/research/runs/'+identity).json()==result
        assert c.get(f'/research/runs/{identity}/data/market.quote').status_code==409
        assert settled(c,start(c,strategy='growth'))['status']=='collected'

def test_single_slow_call_times_out_but_other_calls_succeed(api):
    gate=threading.Event()
    def execute(q):
        if q.capability=='company.financials': assert gate.wait(4)
        return authored_data(q)
    with api(execute,timeout=0.15) as (c,_,_):
        try:
            identity=start(c,strategy='value'); result=settled(c,identity)
            assert (result['status'],result['succeeded'],result['failed'])==('partial',3,1)
            assert next(s for s in result['steps'] if s['capability']=='company.financials')['status']=='timed_out'
        finally: gate.set()
        time.sleep(0.05)
        assert c.get('/research/runs/'+identity).json()==result

def test_configuration_change_stops_new_reads(api):
    gate=threading.Event(); ready=threading.Event(); lock=threading.Lock(); count=0
    def execute(q):
        nonlocal count
        with lock:
            count+=1
            if count==4: ready.set()
        assert gate.wait(4)
        return authored_data(q)
    with api(execute) as (c,_,_):
        try:
            identity=start(c); assert ready.wait(2)
            c.put('/settings/providers/longbridge',json={'enabled':True})
        finally: gate.set()
        result=settled(c,identity)
        assert result['status']=='partial' and result['succeeded']==4
        assert all(s['code']=='CONFIG_CHANGED' for s in result['steps'][4:])
        assert result['plan']['provider_revision']==0 and count==4

def test_restart_marks_pending_interrupted_without_reexecuting(api):
    executor=Mock(side_effect=authored_data)
    with api(executor) as (c,app,_):
        plan=app.state.research.plan(ResearchInput(symbol='AAPL.US',strategy='value'))
        identity=app.state.research.store.begin(plan)  # saved crash state, no worker
        data=app.state.providers.query('longbridge',ReadQuery(capability='company.profile',symbol='AAPL.US'))
        app.state.research.store.step(identity,'company.profile','success',result=data.model_dump(mode='json'))
        app.state.research.store.step(identity,'company.valuation','running')
    previous=executor.call_count
    with api(executor) as (c,_,_):
        result=c.get('/research/runs/'+identity).json()
        assert result['status']=='interrupted' and result['succeeded']==1 and result['failed']==3
        assert result['steps'][0]['has_result'] and all(s['code']=='BACKEND_INTERRUPTED' for s in result['steps'][1:])
        assert executor.call_count==previous
        assert c.get(f'/research/runs/{identity}/data/company.profile').json()['result']==data.model_dump(mode='json')

def test_close_interrupts_active_and_no_late_write(api):
    gate=threading.Event(); entered=threading.Event()
    def execute(q): entered.set(); gate.wait(3); return authored_data(q)
    with api(execute) as (c,app,_):
        identity=start(c,strategy='growth'); assert entered.wait(2)
        try:
            app.state.research.close()
            result=c.get('/research/runs/'+identity).json()
            assert result['status']=='interrupted' and result['succeeded']==0
        finally: gate.set()
        time.sleep(0.08)
        assert c.get('/research/runs/'+identity).json()==result
        assert c.post('/research/runs',json={'symbol':'AAPL.US'}).json()['detail']=='BACKEND_CLOSED'

@pytest.mark.parametrize('values',[
    {'strategy':'invented'},{'strategy':'../../private'},{'symbol':'AAPL'}, {'symbol':'../AAPL.US'},
    {'provider':'longbridge-account'},{'concurrency':5},{'concurrency':True},{'concurrency':0},
    {'timeout_seconds':600},{'mode':'auto'}])
def test_request_contract_rejects_unsafe_or_unimplemented_options(api,values):
    with api() as (c,_,_):
        assert c.post('/research/runs',json={'symbol':'AAPL.US',**values}).status_code==422

def test_auth_unknown_record_and_no_result_for_failure(api):
    with api() as (c,_,_):
        assert c.get('/research/runs',headers={'X-ResearchTrail-Token':'wrong'}).status_code==401
        assert c.get('/research/runs/not-an-id').status_code==404
        assert c.post('/research/runs/not-an-id/cancel').status_code==404
        assert c.get('/research/runs/not-an-id/data/market.quote').status_code==404

def test_revision_guard_and_cancel_control_do_not_poison_shared_health(api):
    with api() as (c,app,_):
        service=app.state.providers
        query=ReadQuery(capability='market.quote',symbol='AAPL.US')
        first=service.query('longbridge',query)
        health=dict(service.health)
        stop=threading.Event(); stop.set()
        assert service.query('longbridge',query,stop=stop).code=='CANCELLED'
        assert service.health==health and not service.stop.is_set()
        assert service.query('longbridge',query,expected_revision=99).code=='CONFIG_CHANGED'
        assert service.health==health
        assert service.query('longbridge',query).ok and first.ok

def test_real_transport_budget_is_clamped_without_changing_configuration(api):
    with api() as (c,app,_):
        c.put('/settings/providers/longbridge',json={'enabled':True,'timeout_seconds':60})
        c.put('/settings/providers/longbridge/credential',json={'app_key':'invented-key','app_secret':'invented-secret','access_token':'invented-token'})
        service=app.state.providers; captured=[]
        def sdk(snapshot,query,stop):
            captured.append((snapshot.configuration.timeout_seconds,stop))
            return {'symbol':query.symbol,'timestamp':'2024-01-16T21:00:00+00:00'}
        service.sdk_executor=sdk
        revision=service.settings.profile('longbridge').revision
        result=service.query('longbridge',ReadQuery(capability='market.quote',symbol='AAPL.US',mode='real'),
            stop=threading.Event(),timeout_seconds=20,expected_revision=revision)
        assert result.ok and captured[0][0]==20 and isinstance(captured[0][0],int)
        assert service.settings.profile('longbridge').timeout_seconds==60
        assert captured[0][1] is not service.stop

def test_no_success_or_health_after_real_call_cancellation(api):
    with api() as (c,app,_):
        c.put('/settings/providers/longbridge',json={'enabled':True})
        c.put('/settings/providers/longbridge/credential',json={'app_key':'invented-key','app_secret':'invented-secret','access_token':'invented-token'})
        stop=threading.Event(); service=app.state.providers
        def sdk(snapshot,query,control):
            assert not control.is_set()
            stop.set()
            assert control.wait(0.01)
            return {'symbol':query.symbol,'timestamp':'2024-01-16T21:00:00+00:00'}
        service.sdk_executor=sdk
        result=service.query('longbridge',ReadQuery(capability='market.quote',symbol='AAPL.US',mode='real'),stop=stop,timeout_seconds=20)
        assert result.code=='CANCELLED' and not service.health and not service.stop.is_set()
