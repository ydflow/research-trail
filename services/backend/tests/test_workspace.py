"""Security views through authenticated Python APIs, not renderer-side business fixtures."""
from datetime import datetime, timezone
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import text
from research_trail.app import create_app
from research_trail.database import Database
from research_trail.provider_errors import ProviderFault
from research_trail.provider_service import authored_data
from research_trail.provider_normalize import public_json, sdk_fields
from research_trail.workspace_fixtures import fixture_executor
from research_trail.workspace_normalize import original_url, news, financials, bars, statuses, timestamp
from research_trail.provider_sdk import execute_sdk
from research_trail.provider_contracts import ReadQuery
from test_settings import Vault, TOKEN, HEADERS, SENTINEL
from test_providers import snap

VIEWS=('watchlist','overview','quote','kline','financials','news','status')

@pytest.mark.parametrize('view',VIEWS)
@pytest.mark.parametrize('case,expected',[('success','ready'),('missing','missing'),('failure','failed')])
def test_each_view_success_missing_and_provider_failure(tmp_path,view,case,expected):
    calls=[]; executor=fixture_executor(case)
    def simulation(query): calls.append(query); return executor(query)
    app=create_app(TOKEN,database_path=tmp_path/'workspace.sqlite3',credential_vault=Vault(),
        provider_options={'simulated_executor':simulation})
    with TestClient(app,headers=HEADERS) as client:
        response=client.post('/workspace/page',json={'view':view,'symbol':'AAPL.US'})
        assert response.status_code==200,response.text
        page=response.json(); assert page['status']==expected
        assert page['symbol']=='AAPL.US' and page['provider']=='longbridge' and page['mode']=='simulated'
        assert 1<=len(calls)<=4 and all(q.mode=='simulated' for q in calls)
        assert all(b['status']==expected for b in page['blocks'])
        if case=='success':
            assert all(b['provenance']['mode']=='simulated' and b['provenance']['transport']=='fixture' for b in page['blocks'])
            if view=='quote': assert page['blocks'][0]['metrics'][0]['value']==189.43
            if view=='watchlist': assert [b['symbol'] for b in page['blocks']]==['AAPL.US','NVDA.US','MSFT.US','TSLA.US']
            if view=='overview': assert any(m['value'] is None for m in page['blocks'][0]['metrics'])
            if view=='kline': assert page['blocks'][0]['bars'][-1]['close']==189.43
            if view=='financials': assert [r['value'] for r in page['blocks'][0]['financials']]==[1000,2000,0]
            if view=='news': assert page['blocks'][0]['news'][0]['url']=='https://example.com/research-trail-simulated-news?symbol=AAPL.US'
            if view=='status':
                assert page['blocks'][0]['markets'][0]['market']=='US'
                assert page['blocks'][0]['provenance']['market_time']==page['blocks'][0]['markets'][0]['market_time']
        elif case=='missing':
            assert all(not b['bars'] and not b['news'] and not b['financials'] and not b['markets'] and all(m['value'] is None for m in b['metrics']) for b in page['blocks'])
        else:
            assert all(b['code']=='NETWORK_ERROR' and b['provenance'] is None for b in page['blocks'])

def test_watchlist_selection_restart_empty_duplicate_and_bound(tmp_path):
    path=tmp_path/'watch.sqlite3'
    def app(): return create_app(TOKEN,database_path=path,credential_vault=Vault())
    with TestClient(app(),headers=HEADERS) as client:
        original=client.get('/workspace').json(); assert len(original['entries'])==4
        state=client.post('/workspace/watchlist',json={'symbol':'700.HK'}).json()
        assert state['entries'][-1]=={'symbol':'700.HK','name':'700.HK'}
        assert client.post('/workspace/watchlist',json={'symbol':'700.HK'}).json()==state
        selected=client.put('/workspace/selection',json={'symbol':'NVDA.US'}).json()
        assert selected['active_symbol']=='NVDA.US'
    with TestClient(app(),headers=HEADERS) as client:
        assert client.get('/workspace').json()==selected
        state=client.post('/workspace/watchlist/remove',json={'symbol':'NVDA.US'}).json()
        assert state['active_symbol']=='AAPL.US'
        for entry in state['entries']: client.post('/workspace/watchlist/remove',json={'symbol':entry['symbol']})
        assert client.get('/workspace').json()['active_symbol'] is None
    with TestClient(app(),headers=HEADERS) as client:
        assert client.get('/workspace').json()['entries']==[]
        assert client.post('/workspace/page',json={'view':'quote'}).json()['status']=='missing'
        for i in range(20): assert client.post('/workspace/watchlist',json={'symbol':f'X{i}.US'}).status_code==200
        assert client.post('/workspace/watchlist',json={'symbol':'OVER.US'}).status_code==409
        assert len(client.get('/workspace').json()['entries'])==20
        state=client.post('/workspace/page',json={'view':'watchlist','offset':16}).json()
        assert len(state['blocks'])==4 and all(b['code']=='NO_DATA' for b in state['blocks'])

def test_partial_supported_provider_switch_and_real_failure_no_simulation(tmp_path):
    called=[]; simulated=[]
    def sdk(snapshot,query,stop):
        called.append((snapshot.provider,query.capability))
        if query.capability=='company.valuation': raise ProviderFault('ACCESS_DENIED','restricted')
        return authored_data(query)
    def fake(query): simulated.append(query.capability); return authored_data(query)
    with TestClient(create_app(TOKEN,database_path=tmp_path/'real.sqlite3',credential_vault=Vault(),
            provider_options={'sdk_executor':sdk,'simulated_executor':fake}),headers=HEADERS) as client:
        for view in VIEWS:
            page=client.post('/workspace/page',json={'view':view,'mode':'real','symbol':'NVDA.US'}).json()
            assert page['status']=='failed' and all(b['code']=='PROVIDER_UNCONFIGURED' for b in page['blocks'])
        assert not called and not simulated
        client.put('/settings/providers/longbridge',json={})
        client.put('/settings/providers/longbridge/credential',json={'app_key':SENTINEL+'a','app_secret':SENTINEL+'b','access_token':SENTINEL+'c'})
        page=client.post('/workspace/page',json={'view':'overview','mode':'real','symbol':'NVDA.US'}).json()
        assert page['status']=='partial' and page['blocks'][0]['status']=='ready' and page['blocks'][1]['status']=='restricted'
        assert page['blocks'][0]['provenance']['transport']=='sdk' and page['blocks'][0]['provenance']['mode']=='real'
        assert not simulated and len(called)==2
        for view in ('financials','news','status'):
            page=client.post('/workspace/page',json={'view':view,'provider':'massive','symbol':'NVDA.US'}).json()
            assert page['status']=='failed' and page['blocks'][0]['code']=='UNSUPPORTED_CAPABILITY'
        page=client.post('/workspace/page',json={'view':'overview','provider':'massive','symbol':'NVDA.US'}).json()
        assert page['status']=='partial' and page['blocks'][0]['provenance']['provider']=='massive'
        assert page['blocks'][1]['code']=='UNSUPPORTED_CAPABILITY'

def test_original_news_links_missing_time_and_unsafe_url():
    url='https://news.example.com/a?id=10&from=source#story'
    item=news([{'id':'one','title':'原始标题','url':url}])[0]
    assert item.url==url and item.published_at is None and item.source=='news.example.com'
    for url in ('javascript:alert(1)','file:///secret','data:text/plain,a','https://user:pass@host/a','https://a/\n','https://a\\@b/news'):
        assert original_url(url) is None
    assert news([{'title':None,'url':None,'published_at':None}])[0].url is None

def test_news_runtime_type_missing_in_sdk_stub_serializes_only_whitelist():
    import longbridge.openapi as sdk
    assert all(hasattr(sdk.NewsItem,k) for k in sdk_fields()['NewsItem'])
    cls=type('NewsItem',(),dict(id='n',title='SDK fixture',description='summary',url='https://example.com/n',
        published_at=1705438800,comments_count=0,likes_count=0,shares_count=0,api_key=SENTINEL))
    def factory(name,config):
        from types import SimpleNamespace
        assert name=='ContentContext'
        return SimpleNamespace(news=lambda symbol:[cls()])
    raw=execute_sdk(snap(),ReadQuery(capability='research.news',symbol='AAPL.US'),context_factory=factory)
    assert raw[0]['url']=='https://example.com/n' and SENTINEL not in json.dumps(raw)
    assert news(raw)[0].published_at==datetime(2024,1,16,21,0,tzinfo=timezone.utc)

def test_neutral_normalization_does_not_invent_numbers_bars_or_market_status():
    assert financials({'list':{'IS':{'indicators':[{'accounts':[{'name':'营业收入','values':[{'year':2023,'value':None}]}]}]}}})[0].value is None
    assert bars([{'timestamp':None,'open':None}])==[]
    with pytest.raises(ProviderFault): bars([{'timestamp':1705438800,'open':1,'high':1,'low':5,'close':2,'volume':0}])
    rows=statuses({'market_time':[{'market':'US','trade_status':3,'timestamp':'0'}]},'US')
    assert rows[0].status=='状态代码 3（含义未知）' and rows[0].market_time is None
    assert statuses({'market_time':[{'market':'HK','status':'Closed'}]},'US')==[]
    with pytest.raises(ProviderFault): timestamp(False)

def test_authenticated_scope_strict_inputs_no_raw_error(tmp_path):
    app=create_app(TOKEN,database_path=tmp_path/'auth.sqlite3',credential_vault=Vault())
    with TestClient(app) as client:
        assert client.get('/workspace').status_code==401
        assert client.post('/workspace/page',json={'view':'quote'}).status_code==401
        for body in ({'view':'portfolio'},{'view':'quote','provider':'longbridge-account'},
            {'view':'quote','symbol':'AAPL.US;whoami'},{'view':'quote','offset':True},{'view':'quote','secret':SENTINEL}):
            r=client.post('/workspace/page',json=body,headers=HEADERS)
            assert r.status_code==422 and SENTINEL not in r.text
        assert client.post('/workspace/watchlist',json={'symbol':'../secret'},headers=HEADERS).status_code==422

def test_upgrade_0006_keeps_old_sessions_profiles_and_provider_config(tmp_path):
    from alembic import command
    from alembic.config import Config
    from research_trail.watchlist import WatchlistStore
    path=tmp_path/'old.sqlite3'; db=Database(path)
    cfg=Config(str(Path(__file__).parents[1]/'alembic.ini'))
    with db.engine.connect() as con: db.migration_transaction(con,lambda:command.upgrade(cfg,'0006_data_providers'),cfg)
    from research_trail.store import Store
    old_store=Store(db); session=old_store.create_session('升级前既有会话'); before=old_store.snapshot(session.id)
    with db.engine.begin() as con:
        con.exec_driver_sql("INSERT INTO profile VALUES (1,'keep-user','balanced')")
        con.exec_driver_sql("INSERT INTO data_providers VALUES ('massive','{}',NULL,1)")
    db.migrate(); db.migrate(); store=WatchlistStore(db)
    assert Store(db).snapshot(session.id).model_dump()==before.model_dump()
    with db.engine.connect() as con:
        assert con.scalar(text('SELECT version_num FROM alembic_version'))=='0015_calendar'
        assert con.scalar(text('SELECT display_name FROM profile'))=='keep-user'
        assert con.scalar(text('SELECT provider FROM data_providers'))=='massive'
        assert not con.exec_driver_sql('PRAGMA foreign_key_check').all()
    db.close()

def test_concurrent_adds_are_serialized_without_duplicates(tmp_path):
    with TestClient(create_app(TOKEN,database_path=tmp_path/'concurrent.sqlite3',credential_vault=Vault()),headers=HEADERS) as client:
        def add(i): return client.post('/workspace/watchlist',json={'symbol':f'X{i%8}.US'})
        with ThreadPoolExecutor(max_workers=4) as pool: assert all(r.status_code==200 for r in pool.map(add,range(24)))
        state=client.get('/workspace').json(); symbols=[r['symbol'] for r in state['entries']]
        assert len(symbols)==12 and len(set(symbols))==12 and state['revision']==8
