"""Offline vendor contract, isolated credentials, provenance and owned-process regressions."""
from contextlib import contextmanager
from datetime import date, datetime, timezone
import json
from pathlib import Path
import socket
import sqlite3
import sys
import threading
import time
from types import SimpleNamespace

from fastapi.testclient import TestClient
import httpx
import pytest
from pydantic import ValidationError

from research_trail.app import create_app
from research_trail.provider_contracts import ReadQuery, ProviderConfiguration, ProviderCredentials
from research_trail.provider_settings import ProviderSnapshot
from research_trail.provider_service import SUPPORTED, authored_data
from research_trail.provider_sdk import SDK_METHODS, execute_sdk
from research_trail.provider_cli import arguments, execute_cli
from research_trail.provider_massive import MassiveProvider
from research_trail.provider_normalize import public_json, sdk_fields
from research_trail.provider_errors import ProviderFault, classify
from research_trail.provider_process import run_process, sdk_process, safe_environment
from research_trail.verify_data import verify
from test_settings import Vault, TOKEN, HEADERS, SENTINEL

NO_SYMBOL={'market.sentiment','market.status','account.accounts','account.portfolio','account.assets'}
MASSIVE_KEY='test-only-massive-secret-never-return'

def query(cap='market.quote',**kw):
    return ReadQuery.model_validate({'capability':cap,**({'symbol':'AAPL.US'} if cap not in NO_SYMBOL else {}),**kw})

def snap(provider='longbridge',**config):
    return ProviderSnapshot(provider,ProviderConfiguration(**config),1,
        {'api_key':MASSIVE_KEY} if provider=='massive' else {'app_key':SENTINEL+'-app','app_secret':SENTINEL+'-secret','access_token':SENTINEL+'-token'})

@pytest.fixture
def api(tmp_path):
    vault=Vault(); calls=[]; clock=[0.0]
    def sdk(snapshot,q,stop):
        calls.append((snapshot.provider,q.capability))
        if q.capability=='company.profile': raise ProviderFault('ACCESS_DENIED','restricted')
        if q.capability=='market.depth': raise RuntimeError(SENTINEL)
        return authored_data(q)
    app=create_app(TOKEN,database_path=tmp_path/'providers.sqlite3',credential_vault=vault,
        provider_options={'sdk_executor':sdk,'clock':lambda:clock[0]})
    with TestClient(app,headers=HEADERS) as client: yield client,vault,app,calls,clock

def save(client,provider='longbridge',**config):
    result=client.put('/settings/providers/'+provider,json=config)
    assert result.status_code==200,result.text
    return result.json()

def authorize(client,provider='longbridge'):
    body={'api_key':MASSIVE_KEY} if provider=='massive' else {'app_key':SENTINEL+'-app','app_secret':SENTINEL+'-secret','access_token':SENTINEL+'-token'}
    assert client.put('/settings/providers/'+provider+'/credential',json=body).status_code==200

def execute(client,provider='longbridge',cap='market.quote',**kw):
    return client.post('/providers/'+provider+'/query',json=query(cap,**kw).model_dump(mode='json')).json()

def test_configuration_secret_lifecycle_and_isolation(api,caplog):
    client,vault,app,calls,_=api
    assert all(not p['configured'] for p in client.get('/settings/providers').json())
    save(client)
    body={'app_key':SENTINEL+'-app','app_secret':SENTINEL+'-secret','access_token':SENTINEL+'-token'}
    response=client.put('/settings/providers/longbridge/credential',json=body)
    assert response.status_code==200 and response.json()['credential_present']
    assert SENTINEL not in response.text
    assert len(vault.values)==1
    assert all(not p['credential_present'] for p in client.get('/settings/providers').json() if p['provider']!='longbridge')
    original=set(vault.values)
    assert client.put('/settings/providers/longbridge/credential',json=body).status_code==200
    assert len(vault.values)==1 and set(vault.values)!=original
    with sqlite3.connect(app.state.provider_settings.database.path) as db:
        dump='\n'.join(db.iterdump())
        assert SENTINEL not in dump and 'authored-test-account' not in dump
    assert client.delete('/settings/providers/longbridge/credential').json()['credential_present'] is False
    assert vault.values=={}
    assert client.delete('/settings/providers/longbridge').json()['configured'] is False
    assert SENTINEL not in caplog.text and calls==[]

def test_vault_failure_rollback_and_validation_redaction(api,monkeypatch):
    client,vault,app,*_=api; save(client,'massive')
    vault.fail=True
    result=client.put('/settings/providers/massive/credential',json={'api_key':SENTINEL})
    assert result.status_code==409 and SENTINEL not in result.text
    vault.fail=False
    assert vault.values=={}
    for body in ({'api_key':SENTINEL,'app_secret':'oops'},{'api_key':SENTINEL,'arbitrary':SENTINEL},{'api_key':SENTINEL*100}):
        r=client.put('/settings/providers/massive/credential',json=body)
        assert r.status_code==422 and SENTINEL not in r.text
    assert client.put('/settings/providers/longbridge/credential',json={'api_key':SENTINEL}).status_code==409
    @contextmanager
    def fail_write():
        raise RuntimeError(SENTINEL)
        yield
    monkeypatch.setattr(app.state.provider_settings.database,'write',fail_write)
    assert client.put('/settings/providers/massive/credential',json={'api_key':SENTINEL}).status_code==409
    assert vault.values=={}


def test_long_access_token_roundtrip_reopen_and_total_blob_limit(api):
    client,vault,app,*_=api
    save(client)
    body={'app_key':'synthetic-app','app_secret':'synthetic-secret','access_token':'synthetic-long-token-'+'x'*1200}
    response=client.put('/settings/providers/longbridge/credential',json=body)
    assert response.status_code==200 and response.json()['credential_present']
    snapshot=app.state.provider_settings.snapshot('longbridge')
    assert snapshot.credentials==body
    assert body['access_token'] not in response.text
    from research_trail.provider_settings import ProviderSettings
    reopened=ProviderSettings(app.state.settings)
    assert reopened.snapshot('longbridge').credentials==body
    original=dict(vault.values)
    for invalid in (
        {**body,'access_token':'z'*2049},
        {'app_key':'a'*1000,'app_secret':'b'*1000,'access_token':'c'*1000},
        {'app_key':'a','app_secret':'b','access_token':'"'*1300},
        {'app_key':'a','app_secret':'b','access_token':'\u6a21'*900},
    ):
        rejected=client.put('/settings/providers/longbridge/credential',json=invalid)
        assert rejected.status_code==422
        assert invalid['access_token'] not in rejected.text
        assert vault.values==original
    with sqlite3.connect(app.state.provider_settings.database.path) as db:
        assert body['access_token'] not in '\n'.join(db.iterdump())

@pytest.mark.parametrize('provider,cap',[(p,c) for p,cs in SUPPORTED.items() for c in cs])
def test_all_baseline_simulations_need_no_credentials_or_transport(api,provider,cap,monkeypatch):
    client,_,_,calls,_=api
    monkeypatch.setattr(socket,'create_connection',lambda *a,**k:pytest.fail('external network'))
    result=execute(client,provider,cap)
    assert result['ok'] and result['provenance']['mode']=='simulated'
    assert result['provenance']['data_label']=='模拟数据' and result['provenance']['permission']=='unknown'
    assert calls==[]
    states=client.get('/providers/capabilities').json()
    assert len(states)==24
    assert sum(c['validation']=='simulated' for c in states)==1

def test_missing_disabled_failed_restricted_independent_health_and_cache(api):
    client,_,app,calls,clock=api
    assert execute(client,mode='real')['code']=='PROVIDER_UNCONFIGURED'
    save(client,enabled=False)
    assert execute(client,mode='real')['state']=='disabled'
    save(client,timeliness='delayed',cache_ttl_seconds=10)
    assert execute(client,mode='real')['code']=='CREDENTIAL_MISSING' and not calls
    authorize(client)
    first=execute(client,mode='real')
    assert first['provenance']['data_label']=='延迟行情' and first['provenance']['timeliness_basis']=='user-declared'
    second=execute(client,mode='real')
    assert second['provenance']['cached'] and second['provenance']['fetched_at']==first['provenance']['fetched_at']
    assert len(calls)==1
    vault=app.state.provider_settings.vault
    saved=vault.values.copy(); vault.values.clear()
    assert execute(client,mode='real')['code']=='CREDENTIAL_MISSING'  # cache cannot hide external removal
    vault.values.update(saved)
    assert not execute(client,mode='real')['provenance']['cached'] and len(calls)==2
    restricted=execute(client,cap='company.profile',mode='real')
    assert restricted['state']=='restricted' and 'data' not in restricted
    assert execute(client,cap='market.depth',mode='real')['code']=='PROVIDER_ERROR'
    coverage=client.get('/providers/capabilities').json()
    assert next(c for c in coverage if c['provider']=='longbridge' and c['capability']=='market.quote')['validation']=='real'
    assert all(c['validation']=='unverified' for c in coverage if c['provider']!='longbridge')
    clock[0]=11
    app.state.providers.sdk_executor=lambda *a:(_ for _ in ()).throw(ProviderFault('NETWORK_ERROR'))
    expired=execute(client,mode='real')
    assert not expired['ok'] and 'provenance' not in expired
    save(client)
    assert all(c['validation']=='unverified' for c in client.get('/providers/capabilities').json())
    client.delete('/settings/providers/longbridge'); save(client)
    assert execute(client,mode='real')['code']=='CREDENTIAL_MISSING'
    authorize(client)
    assert execute(client,mode='real')['code']=='NETWORK_ERROR'  # no revived old revision cache

def test_account_never_cached_persisted_or_diagnosed(api):
    client,_,app,calls,_=api; save(client,'longbridge-account')
    authorize(client,'longbridge-account')
    for _ in range(2): assert execute(client,'longbridge-account','account.positions',mode='real')['ok']
    assert len(calls)==2 and not app.state.providers.cache
    assert '模拟持仓' not in client.get('/settings/diagnostics').text
    with sqlite3.connect(app.state.provider_settings.database.path) as db:
        assert '模拟持仓' not in '\n'.join(db.iterdump())

@pytest.mark.parametrize('values',[{'symbol':'AAPL.US;whoami'},{'symbol':'../AAPL.US'},{'symbol':'aapl.US'},
    {'count':True},{'count':101},{'capability':'submit_order'},{'start':'2025-01-01'},
    {'start':'2025-01-02','end':'2025-01-01'},{'report':'annual'},{'arbitrary':'x'}])
def test_read_boundary_rejects_injections_and_unsupported_options(values):
    with pytest.raises(ValidationError): ReadQuery.model_validate({'capability':'market.quote','symbol':'AAPL.US',**values})

@pytest.mark.parametrize('path',['longbridge.exe',r'C:\tools\other.exe',r'C:\tools\longbridge.exe\..\cmd.exe','C:\\tools\\longbridge.exe\n'])
def test_cli_path_boundary(path):
    with pytest.raises(ValidationError): ProviderConfiguration(cli_path=path)

@pytest.mark.parametrize('cap',list(SDK_METHODS))
def test_locked_sdk_dispatch_with_fake_responses(cap):
    import longbridge.openapi as real_sdk
    calls=[]; config_calls=[]
    class Config:
        @staticmethod
        def from_apikey(**kw): config_calls.append(kw); return object()
    sdk=SimpleNamespace(**{k:getattr(real_sdk,k) for k in ['QuoteContext','TradeContext','FundamentalContext','ContentContext',
        'MarketContext','CalendarContext','Period','AdjustType','Language','Market','CalcIndex','FinancialReportKind','FinancialReportPeriod','CalendarCategory']},Config=Config)
    cls,method=SDK_METHODS[cap]
    assert hasattr(getattr(real_sdk,cls),method)
    class Context:
        def __getattr__(self,name):
            assert hasattr(getattr(real_sdk,cls),name),name
            assert name not in ('submit_order','replace_order','cancel_order')
            def read(*args,**kw):
                calls.append((name,args,kw))
                if cap=='market.quote': return [{'symbol':'AAPL.US','last_done':'10','prev_close':'9','timestamp':'2024-01-16T21:00:00+00:00'}]
                if cap in ('company.profile','company.valuation'): return [{'symbol':'AAPL.US','name':'test'}]
                if cap=='account.positions': return {'channels':[{'positions':[{'symbol':'AAPL.US','quantity':'2','currency':'USD','cost_price':None}]}]}
                if cap=='account.assets': return [{'currency':'USD','net_assets':None,'cash_infos':[]}]
                if cap=='account.cashFlow': return [{'business_time':'2024-01-16T21:00:00+00:00','balance':'10','currency':'USD'}]
                return authored_data(query(cap,event_type='report'))
            return read
    q=query(cap,event_type='report')
    if cap=='research.events': q.symbol=None
    result=execute_sdk(snap(),q,sdk=sdk,context_factory=lambda name,c:Context())
    assert result is not None and len(calls)==1
    assert config_calls[0]['enable_print_quote_packages'] is False
    assert config_calls[0]['http_url']=='https://openapi.longbridge.com'
    if cap=='account.positions': assert result[0]['cost_price'] is None and result[0]['market_value'] is None
    if cap=='account.assets': assert result[0]['net_assets'] is None
    assert SENTINEL not in json.dumps(result)

def test_sdk_dates_financial_period_and_native_missing_no_network():
    s=ProviderSnapshot('longbridge',ProviderConfiguration(),1,{})
    with pytest.raises(ProviderFault,match='凭证'): execute_sdk(s,query())
    # Real worker process must reject missing credentials before creating a context.
    with pytest.raises(ProviderFault) as e: sdk_process(s,query(mode='real'))
    assert e.value.code=='CREDENTIAL_MISSING'
    import longbridge.openapi as sdk
    assert hasattr(sdk.QuoteContext,'history_candlesticks_by_date')
    assert hasattr(sdk.FinancialReportPeriod,'QuarterlyFull') and hasattr(sdk.CalendarCategory,'MacroData')
    assert 'Config' not in sdk_fields()

def test_cli_exact_readonly_arrays_and_bounded_projection(tmp_path,monkeypatch):
    assert arguments(query('account.accounts'))==['auth','status','--format','json']
    assert arguments(query('account.portfolio'))==['portfolio','--format','json']
    event=query('research.events',start=date(2025,1,1),end=date(2025,1,2),event_type='financial',count=5)
    assert arguments(event)==['finance-calendar','financial','--count','5','--symbol','AAPL.US','--start','2025-01-01','--end','2025-01-02','--format','json']
    with pytest.raises(ProviderFault): arguments(query())
    exe=tmp_path/'longbridge.exe'; exe.write_bytes(b'fixture executable never launched')
    snapshot=snap(cli_path=str(exe)); calls=[]
    def executor(argv,**kw):
        calls.append((argv,kw)); return {'account':{'account_no':'fixture-account','name':'test'},'access_token':SENTINEL}
    result=execute_cli(snapshot,query('account.accounts'),executor=executor)
    assert result==[{'id':'fixture-account','name':'test','region':None}]
    assert calls[0][0]==[str(exe),'auth','status','--format','json']
    assert SENTINEL not in json.dumps(calls) and 'LONGBRIDGE_APP_KEY' not in calls[0][1]['env']

@pytest.mark.parametrize('cap',['account.portfolio','research.events','company.financials'])
def test_cli_baseline_wire_shapes_preflight_and_public_projection(tmp_path,cap):
    exe=tmp_path/'longbridge.exe'; exe.write_bytes(b'not launched')
    calls=[]
    q=query(cap,report='2024Q1' if cap=='company.financials' else None)
    bodies={
        'account.portfolio':{'overview':{'currency':'USD','total_asset':'100','total_cash':'10','market_cap':'90'},
            'market_accounts':{'HK':{'currency':'HKD','balance':'3','debug':SENTINEL}},
            'holdings':[{'symbol':'AAPL.US','quantity':'1','cost_price':None,'currency':'USD','debug':SENTINEL}]},
        'research.events':{'list':[{'infos':[{'id':'fixture-event','datetime':'2024-01-01','counter_name':'test',
            'ext':{'local_date':'2024-01-01','date_zone':'(美东)','financial_report':{'market_time':'after'}},
            'status':'announced','debug':SENTINEL}]}]},
        'company.financials':{'symbol':'AAPL.US','report':'2024Q1','list':{'IS':{'indicators':[{'title':'Revenue','debug':SENTINEL,'accounts':[{'name':'sales','debug':SENTINEL,'values':[{'value':None,'debug':SENTINEL}]}]}]},'debug':SENTINEL}}
    }
    def executor(argv,**kw):
        calls.append(argv)
        return {'account':{'account_no':'fixture-account'}} if len(calls)==1 else bodies[cap]
    data=execute_cli(snap(cli_path=str(exe)),q,executor=executor)
    assert len(calls)==2 and calls[0][1:]==['auth','status','--format','json']
    assert SENTINEL not in json.dumps(data)
    if cap=='account.portfolio':
        assert data['total_assets']==100 and data['cash']==10
        assert data['accounts'][0]['currency']=='HKD' and data['holdings'][0]['cost_price'] is None
    if cap=='research.events':
        assert data[0]['id']=='fixture-event' and data[0]['status']=='announced'
        assert data[0]['ext']==bodies[cap]['list'][0]['infos'][0]['ext']
        assert data[0]['occurred_at'] is None
    if cap=='company.financials': assert calls[1][1:]==['financial-report','AAPL.US','--kind','ALL','--report','2024Q1','--format','json']

def test_cli_missing_session_does_not_issue_query(tmp_path):
    exe=tmp_path/'longbridge.exe'; exe.write_bytes(b'not launched'); calls=[]
    def executor(argv,**kw): calls.append(argv); return {'authenticated':False}
    with pytest.raises(ProviderFault) as e: execute_cli(snap(cli_path=str(exe)),query('account.portfolio'),executor=executor)
    assert e.value.code=='CLI_AUTH_REQUIRED' and len(calls)==1

def test_sdk_date_query_uses_history_with_explicit_window():
    import longbridge.openapi as sdk
    calls=[]
    class Context:
        def history_candlesticks_by_date(self,*args): calls.append(args); return []
    execute_sdk(snap(),query('market.kline',start=date(2024,1,1),end=date(2024,1,2),period='5m'),sdk=sdk,context_factory=lambda *a:Context())
    assert calls==[('AAPL.US',sdk.Period.Min_5,sdk.AdjustType.NoAdjust,date(2024,1,1),date(2024,1,2))]

def massive_response(cap):
    if cap=='market.quote': return {'ticker':{'ticker':'AAPL','lastTrade':{'p':10,'t':1705438800000000000},'prevDay':{'c':9}}}
    if cap=='company.profile': return {'results':{'ticker':'AAPL','name':'Apple','currency_name':'usd','api_key':SENTINEL}}
    return {'results':[{'t':1705438800000,'o':9,'h':11,'l':8,'c':10,'v':100}]}

@pytest.mark.parametrize('cap',['market.quote','market.kline','company.profile'])
def test_massive_header_auth_mapping_and_unknown_latency(cap):
    calls=[]
    def handler(request): calls.append(request); return httpx.Response(200,json=massive_response(cap))
    data=MassiveProvider(httpx.MockTransport(handler)).execute(snap('massive'),query(cap))
    assert len(calls)==1 and calls[0].headers['Authorization']=='Bearer '+MASSIVE_KEY
    assert calls[0].url.host=='api.massive.com' and MASSIVE_KEY not in str(calls[0].url)
    assert SENTINEL not in json.dumps(data)
    if cap=='market.kline': assert data[0]['timestamp']==1705438800 and calls[0].url.params['adjusted']=='false'
    if cap=='market.quote': assert data['last_price']==10 and data['price_basis']=='last_trade'

@pytest.mark.parametrize('status,code,state',[(401,'AUTH_FAILED','failed'),(403,'ACCESS_DENIED','restricted'),(429,'RATE_LIMITED','failed'),(500,'PROVIDER_ERROR','failed'),(302,'PROVIDER_ERROR','failed')])
def test_massive_errors_no_retry_or_fixture_fallback(status,code,state):
    calls=[]
    def handler(r): calls.append(r); return httpx.Response(status,text=SENTINEL)
    with pytest.raises(ProviderFault) as e: MassiveProvider(httpx.MockTransport(handler)).execute(snap('massive'),query())
    assert (e.value.code,e.value.state)==(code,state) and len(calls)==1 and SENTINEL not in str(e.value)

@pytest.mark.parametrize('body',[b'not json',b'[]',b'{"ticker":{"ticker":"WRONG"}}',b'{"ticker":{"ticker":"AAPL","lastTrade":{"p":NaN,"t":1},"prevDay":{"c":9}}}',b'x'*262145],ids=['invalid-json','array','wrong-symbol','nan','oversize'])
def test_massive_bad_responses(body):
    with pytest.raises(ProviderFault): MassiveProvider(httpx.MockTransport(lambda r:httpx.Response(200,content=body))).execute(snap('massive'),query())

def test_massive_unsupported_and_timeout():
    p=MassiveProvider(httpx.MockTransport(lambda r:(_ for _ in ()).throw(httpx.ReadTimeout(SENTINEL))))
    with pytest.raises(ProviderFault) as e: p.execute(snap('massive'),query())
    assert e.value.code=='TIMEOUT' and SENTINEL not in str(e.value)
    with pytest.raises(ProviderFault) as e: p.execute(snap('massive'),ReadQuery(capability='market.quote',symbol='700.HK'))
    assert e.value.code=='UNSUPPORTED_MARKET'

@pytest.mark.parametrize('code,state',[(403201,'failed'),(401003,'failed'),(403205,'restricted'),(429001,'failed')])
def test_official_sdk_error_mapping_no_raw_message(code,state):
    e=RuntimeError(SENTINEL); e.code=code
    safe=classify(e); assert safe.state==state and SENTINEL not in str(safe)

def test_secret_redaction_in_keys_values_and_foreign_objects():
    assert public_json({'opaque-123':'opaque-123','access_token':SENTINEL},('opaque-123',SENTINEL))=={'[已脱敏]':'[已脱敏]'}
    with pytest.raises(ProviderFault): public_json(SimpleNamespace(api_key=SENTINEL))
    with pytest.raises(ProviderFault): public_json(float('nan'))

def test_sdk_local_timestamps_preserve_instant_and_other_naive_data_is_rejected():
    epoch=1705438800
    local=datetime.fromtimestamp(epoch)
    expected=datetime.fromtimestamp(epoch,timezone.utc).isoformat()
    with pytest.raises(ProviderFault): public_json({'timestamp':local})
    assert public_json([{'timestamp':local}],sdk_local_datetime=True)==[{'timestamp':expected}]
    assert public_json(datetime.fromtimestamp(epoch,timezone.utc))==expected

def test_sdk_quote_boundary_accepts_native_local_timestamp():
    import longbridge.openapi as sdk
    epoch=1705438800
    class Context:
        def quote(self,symbols):
            return [{'symbol':symbols[0],'last_done':'10','prev_close':'9',
                     'timestamp':datetime.fromtimestamp(epoch)}]
    result=execute_sdk(snap(),query(),sdk=sdk,context_factory=lambda *args:Context())
    assert result['timestamp']==datetime.fromtimestamp(epoch,timezone.utc).isoformat()
    assert result['last_price']==10

@pytest.mark.parametrize('scenario',['timeout','cancel','overflow','badjson'])
def test_owned_process_deadline_cancel_size_and_reaping(monkeypatch,scenario):
    import research_trail.provider_process as module
    original=module.subprocess.Popen; children=[]
    def record(*a,**kw):
        assert kw['shell'] is False and kw['stderr']==module.subprocess.DEVNULL
        child=original(*a,**kw); children.append(child); return child
    monkeypatch.setattr(module.subprocess,'Popen',record)
    stop=threading.Event()
    timer=threading.Timer(.15,stop.set) if scenario=='cancel' else None
    if timer: timer.start()
    code='import time;time.sleep(10)' if scenario in ('timeout','cancel') else "print('x'*300000)" if scenario=='overflow' else "print('invalid')"
    started=time.monotonic()
    try:
        with pytest.raises(ProviderFault) as e: run_process([sys.executable,'-c',code],timeout=.2 if scenario=='timeout' else 2,stop=stop)
        assert e.value.code=={'timeout':'TIMEOUT','cancel':'CANCELLED','overflow':'RESPONSE_LIMIT','badjson':'INVALID_RESPONSE'}[scenario]
    finally:
        if timer: timer.cancel()
    assert time.monotonic()-started<4 and len(children)==1 and children[0].poll() is not None

def test_environment_drops_provider_keys_and_proxy(monkeypatch):
    for k in ('LONGBRIDGE_APP_KEY','MASSIVE_API_KEY','HTTPS_PROXY','LONGBRIDGE_ENABLE_OVERNIGHT','OPENAI_API_KEY'): monkeypatch.setenv(k,SENTINEL)
    assert SENTINEL not in json.dumps(safe_environment())

def test_windows_job_owner_crash_terminates_query_child(tmp_path):
    import os
    import subprocess
    import ctypes
    from ctypes import wintypes
    child_file=tmp_path/'child.pid'
    # This helper uses the production run_process, then is killed by its exact owned PID.
    code="from research_trail.provider_process import run_process;import sys;run_process([sys.executable,'-c',\"import os,time;from pathlib import Path;Path(sys.argv[1]).write_text(str(os.getpid()));time.sleep(30)\".replace('import os,time','import os,time,sys'),sys.argv[1]],timeout=30)"
    owner=subprocess.Popen([sys.executable,'-c',code,str(child_file)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
                           creationflags=subprocess.CREATE_NO_WINDOW)
    handle=None
    api=ctypes.WinDLL('kernel32',use_last_error=True)
    api.OpenProcess.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD]; api.OpenProcess.restype=wintypes.HANDLE
    api.WaitForSingleObject.argtypes=[wintypes.HANDLE,wintypes.DWORD]; api.WaitForSingleObject.restype=wintypes.DWORD
    api.CloseHandle.argtypes=[wintypes.HANDLE]
    try:
        deadline=time.monotonic()+5
        while not child_file.exists() and time.monotonic()<deadline: time.sleep(.025)
        assert child_file.exists()
        handle=api.OpenProcess(0x100000,False,int(child_file.read_text()))
        assert handle
        owner.kill(); owner.wait(timeout=3)
        assert api.WaitForSingleObject(handle,3000)==0
    finally:
        if owner.poll() is None: owner.kill(); owner.wait(timeout=3)
        if handle: api.CloseHandle(handle)

def test_local_verification_default_no_request_readonly_and_sanitized(api):
    client,vault,app,_,_=api; path=app.state.provider_settings.database.path
    assert verify(path,'massive',vault=vault)['queries_started']==0
    save(client,'massive'); client.put('/settings/providers/massive/credential',json={'api_key':SENTINEL})
    before=path.read_bytes(); calls=[]
    def executor(s,q,stop): calls.append(q); return {'symbol':'AAPL.US','last_price':10}
    result=verify(path,'massive',vault=vault,executor=executor)
    assert result['reason']=='CONFIGURED_REQUIRES_EXPLICIT_RUN' and not calls
    result=verify(path,'massive',execute=True,vault=vault,executor=executor)
    assert result['real_validation']=='passed' and len(calls)==1 and not calls[0].use_cache
    assert 'last_price' not in json.dumps(result) and SENTINEL not in json.dumps(result) and path.read_bytes()==before

def test_unknown_provider_capability_and_auth_are_rejected(api):
    client,*_=api
    assert client.post('/providers/trading/query',json={'capability':'submit_order'}).status_code==422
    assert client.post('/providers/longbridge/query',json={'capability':'account.positions'}).json()['state']=='unsupported'
    assert client.get('/settings/providers',headers={'X-ResearchTrail-Token':'wrong'}).status_code==401
