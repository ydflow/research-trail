"""Step12 hand calculations, transactional import/undo, isolation, real adapter contracts.
All account/CSV values here are authored fixtures. No credential or real account queries.
"""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from alembic import command
from alembic.config import Config
from research_trail.app import create_app
from research_trail.database import Database
from research_trail.portfolio_contracts import PortfolioSnapshot, HoldingInput, CashInput, CsvPreviewInput, ImportConfirm
from research_trail.portfolio_calculate import calculate
from research_trail.portfolio_csv import parse_csv, HEADER
from research_trail.provider_service import authored_data
from research_trail.provider_errors import ProviderFault
from test_settings import Vault, TOKEN, HEADERS, SENTINEL

CSV=','.join(HEADER)+'\nholding,AAPL.US,USD,2,100,120,\ncash,,USD,,,,100'

def client(path,**options): return TestClient(create_app(TOKEN,database_path=path,credential_vault=Vault(),**options),headers=HEADERS)
def pid(c,kind='manual'): return next(p['id'] for p in c.get('/portfolios').json() if p['kind']==kind)
def post(c,route,p,**body): return c.post('/portfolios/'+route,json={'portfolio_id':p,**body})
def preview(c,p,csv=CSV):
    r=post(c,'preview',p,csv_text=csv); assert r.status_code==200,r.text
    return r.json()
def commit(c,p,csv=CSV):
    d=preview(c,p,csv); assert d['can_import'],d
    r=post(c,'confirm',p,draft_id=d['draft_id']); assert r.status_code==200,r.text
    return r.json()

def test_hand_calculation_preview_import_restart_undo(tmp_path):
    db=tmp_path/'local.sqlite3'
    with client(db) as c:
        p=pid(c); before=post(c,'view',p).json(); d=preview(c,p)
        assert post(c,'view',p).json()==before and d['valuation']['currencies'][0]['assets']=='340'
        saved=post(c,'confirm',p,draft_id=d['draft_id']).json()
        h=saved['holdings'][0]
        assert [h[k] for k in ('quantity','cost','market_value','pnl','pnl_percent')]==['2','200','240','40','20']
        assert saved['currencies'][0]['cash']=='100' and saved['revision']==1
    with client(db) as c:
        assert post(c,'view',p).json()==saved
        undone=post(c,'undo',p,batch_id=saved['undo_batch']).json()
        assert undone['status']=='empty' and undone['revision']==2 and undone['undo_batch'] is None
        assert commit(c,p)['currencies'][0]['assets']=='340'  # Undo permits importing the same content again.

def test_fractional_exact_and_missing_inputs_by_currency():
    snap=PortfolioSnapshot(holdings=[HoldingInput(symbol='AAPL.US',currency='USD',quantity='0.3',cost_price='0.1',market_price='0.2'),
        HoldingInput(symbol='700.HK',currency='HKD',quantity='2',cost_price='10',market_price=None)],
        cash=[CashInput(currency='USD',amount='0'),CashInput(currency='HKD',amount='100')])
    hs,b=calculate(snap); b={c.currency:c for c in b}
    assert hs[0].cost=='0.03' and hs[0].market_value=='0.06' and hs[0].pnl=='0.03'
    assert b['USD'].assets=='0.06' and b['HKD'].assets is None and b['HKD'].known_market_value=='0'
    assert b['HKD'].cost=='20' and b['HKD'].pnl is None
    # Without a cash row, assets remain unknown even if all prices are present.
    hs,b=calculate(PortfolioSnapshot(holdings=snap.holdings[:1])); assert b[0].cash is None and b[0].assets is None
    hs,b=calculate(PortfolioSnapshot(holdings=[HoldingInput(symbol='AAPL.US',currency='USD',quantity='0',cost_price='0',market_price='0')],cash=[CashInput(currency='USD',amount='-10')]))
    assert hs[0].pnl=='0' and hs[0].pnl_percent is None and b[0].assets=='-10'
    assert calculate(PortfolioSnapshot())==([],[])

def test_simulated_account_import_provenance_and_undo_do_not_invent_market_time(tmp_path):
    with client(tmp_path/'p.sqlite3') as c:
        p=pid(c,'simulated'); original=post(c,'view',p).json()
        assert original['source']=='authored-fixture' and original['market_time']=='2024-01-16T21:00:00+00:00'
        d=preview(c,p,CSV.replace(',120,',',140,'))
        assert d['valuation']['source']=='csv-snapshot' and d['valuation']['market_time'] is None
        assert d['valuation']['updated_at'] is None and d['valuation']['undo_batch'] is None
        saved=post(c,'confirm',p,draft_id=d['draft_id']).json()
        assert saved['kind']=='simulated' and saved['source']=='csv-snapshot' and saved['market_time'] is None
        reverted=post(c,'undo',p,batch_id=saved['undo_batch']).json()
        assert reverted['source']=='authored-fixture' and reverted['market_time']==original['market_time']
        assert reverted['currencies']==original['currencies']

@pytest.mark.parametrize('row,code',[
    ('holding,AAPL.US,USD,-1,100,120,','INVALID_ROW'),
    ('holding,AAPL.US,USD,NaN,100,120,','INVALID_ROW'),
    ('holding,AAPL.US,USD,1e2,100,120,','INVALID_ROW'),
    ('holding,AAPL.US,USD,=1+2,100,120,','INVALID_ROW'),
    ('holding,AAPL;BAD.US,USD,2,100,120,','INVALID_ROW'),
    ('holding,AAPL.US,usd,2,100,120,','INVALID_ROW'),
    ('holding,AAPL.US,USD,0.1234567,100,120,','INVALID_ROW'),
    ('holding,AAPL.US,USD,2,-100,120,','INVALID_ROW'),
    ('holding,AAPL.US,USD,2,100,120,10','INVALID_ROW'),
    ('cash,AAPL.US,USD,,,,100','INVALID_ROW'),
    ('cash,,USD,,,,','INVALID_ROW'),
    ('trade,AAPL.US,USD,2,100,120,','INVALID_ROW'),
    ('holding,AAPL.US,USD,2,100','COLUMN_COUNT'),
    ('holding,"AAPL.US,USD,2,100,120,','CSV_SYNTAX'),
])
def test_invalid_rows_never_import_and_do_not_echo(tmp_path,row,code):
    with client(tmp_path/'p.sqlite3') as c:
        p=pid(c); before=post(c,'view',p).json()
        d=preview(c,p,','.join(HEADER)+'\n'+row)
        assert not d['can_import'] and d['draft_id'] is None and d['issues'][0]['code']==code
        assert row not in json.dumps(d['issues']) and post(c,'view',p).json()==before

@pytest.mark.parametrize('body,code',[
    ('symbol,currency,quantity\nAAPL.US,USD,2','HEADER'),
    (','.join(HEADER)+',amount\n','HEADER'),
    (','.join(HEADER)+'\n','EMPTY'),
    (CSV+'\nholding,AAPL.US,USD,1,1,1,','DUPLICATE_ROW'),
    (CSV+'\ncash,,USD,,,,10','DUPLICATE_ROW'),
    (','.join(HEADER)+'\n'+'\n'.join(f'holding,X{i}.US,USD,1,1,1,' for i in range(101)),'ROW_LIMIT'),
    (CSV+'\x00','FILE_LIMIT'),
])
def test_csv_bounds_and_duplicate_rows(body,code):
    snapshot,issues=parse_csv(body); assert any(i.code==code for i in issues)
    assert len(snapshot.holdings)<=100

def test_semantic_duplicate_reordered_header_bom_and_account_isolation(tmp_path):
    with client(tmp_path/'p.sqlite3') as c:
        p=pid(c); simulation=post(c,'view',pid(c,'simulated')).json()
        saved=commit(c,p)
        changed='\ufeffamount,market_price,cost_price,quantity,currency,symbol,record_type\n100,,,,USD,,cash\n,120.000,100.0,2.0,USD,AAPL.US,holding'
        d=preview(c,p,changed); assert d['duplicate'] and not d['can_import']
        assert saved==post(c,'view',p).json() and simulation==post(c,'view',pid(c,'simulated')).json()
        other=c.post('/portfolios',json={'name':'另一CSV组合'}).json()['id']
        assert commit(c,other)['currencies'][0]['assets']=='340'
        assert post(c,'undo',other,batch_id=saved['undo_batch']).status_code==409
        ro=pid(c,'read_only')
        assert post(c,'preview',ro,csv_text=CSV).status_code==409
        assert post(c,'confirm',ro,draft_id=str(uuid4())).status_code==409
        assert post(c,'undo',ro,batch_id=saved['undo_batch']).status_code==409
        assert c.post('/portfolios',json={'name':'其他券商','kind':'read_only'}).status_code==409

def test_undo_stack_latest_only_and_restart_draft_not_retained(tmp_path):
    db=tmp_path/'p.sqlite3'
    with client(db) as c:
        p=pid(c); a=commit(c,p); b=commit(c,p,CSV.replace(',120,',',150,'))
        assert b['currencies'][0]['assets']=='400'
        assert post(c,'undo',p,batch_id=a['undo_batch']).status_code==409
        reverted=post(c,'undo',p,batch_id=b['undo_batch']).json(); assert reverted['currencies']==a['currencies']
        assert post(c,'undo',p,batch_id=a['undo_batch']).json()['status']=='empty'
        d=preview(c,p)
    with client(db) as c:
        assert post(c,'confirm',p,draft_id=d['draft_id']).status_code==409
        assert post(c,'view',p).json()['status']=='empty'

def test_draft_expiry_and_stale_after_undo(tmp_path):
    app=create_app(TOKEN,database_path=tmp_path/'p.sqlite3',credential_vault=Vault())
    with TestClient(app,headers=HEADERS) as c:
        clock=[0]; app.state.portfolios.clock=lambda:clock[0]
        p=pid(c); d=preview(c,p); clock[0]=600
        assert post(c,'confirm',p,draft_id=d['draft_id']).status_code==409
        a=commit(c,p); d=preview(c,p,CSV.replace(',120,',',140,'))
        post(c,'undo',p,batch_id=a['undo_batch'])
        assert post(c,'confirm',p,draft_id=d['draft_id']).status_code==409

def test_concurrent_confirmation_exactly_one_commit(tmp_path):
    app=create_app(TOKEN,database_path=tmp_path/'p.sqlite3',credential_vault=Vault())
    with TestClient(app,headers=HEADERS) as c:
        p=pid(c); d=preview(c,p)
        def confirm(_): return post(c,'confirm',p,draft_id=d['draft_id']).status_code
        with ThreadPoolExecutor(max_workers=2) as pool: results=list(pool.map(confirm,range(2)))
        assert sorted(results)==[200,409]
        assert post(c,'view',p).json()['revision']==1

def configure(c):
    c.put('/settings/providers/longbridge-account',json={})
    c.put('/settings/providers/longbridge-account/credential',json={'app_key':SENTINEL+'a','app_secret':SENTINEL+'b','access_token':SENTINEL+'c'})

def test_real_read_only_fake_sdk_isolation_ephemeral_restart_no_fallback(tmp_path):
    calls=[]; simulations=[]; fail=[False]
    def sdk(_snapshot,q,_stop):
        calls.append(q)
        if fail[0]: raise ProviderFault('ACCESS_DENIED','restricted')
        data=authored_data(q)
        if q.capability=='account.positions': data[0]['quantity']=3; data[0]['cost_price']=11
        if q.capability=='account.assets': data[0]['net_assets']=133
        return data
    def simulated(q): simulations.append(q); return authored_data(q)
    db=tmp_path/'private.sqlite3'; options={'sdk_executor':sdk,'simulated_executor':simulated}
    with client(db,provider_options=options) as c:
        p=pid(c,'read_only'); sim=post(c,'view',pid(c,'simulated')).json()
        assert post(c,'view',p).json()['status']=='unverified' and calls==[]
        assert post(c,'refresh',p).json()['status']=='unconfigured' and calls==[]
        configure(c); value=post(c,'refresh',p).json()
        assert value['status']=='partial' and value['holdings'][0]['cost']=='33'
        assert value['holdings'][0]['market_price'] is None and value['currencies'][0]['assets'] is None
        assert value['reported_net_assets']==[{'currency':'USD','amount':'133'}]
        assert len(calls)==2 and not simulations and all(q.mode=='real' and not q.use_cache for q in calls)
        assert len(value['provenance'])==2 and all(p['transport']=='sdk' for p in value['provenance'])
        assert sim==post(c,'view',pid(c,'simulated')).json()
        database=Database(db)
        with database.engine.connect() as conn:
            stored=json.loads(conn.scalar(text('SELECT snapshot FROM portfolios WHERE id=:id'),{'id':p}))
            assert stored=={'holdings':[],'cash':[]}
        database.close()
        fail[0]=True; value=post(c,'refresh',p).json()
        assert value['status']=='restricted' and value['code']=='ACCESS_DENIED' and value['holdings']==[]
        assert not simulations
        c.delete('/settings/providers/longbridge-account/credential')
        assert post(c,'view',p).json()['status']=='unverified'
    with client(db,provider_options=options) as c:
        assert post(c,'view',p).json()['status']=='unverified'

@pytest.mark.parametrize('case',['missing_currency','duplicate_position','duplicate_cash','bad_quantity'])
def test_malformed_real_account_response_explicit_failure(tmp_path,case):
    def sdk(_s,q,_stop):
        d=authored_data(q)
        if q.capability=='account.positions':
            if case=='missing_currency': d[0]['currency']=None
            if case=='duplicate_position': d.append(dict(d[0]))
            if case=='bad_quantity': d[0]['quantity']=-1
        if q.capability=='account.assets' and case=='duplicate_cash': d.append(dict(d[0]))
        return d
    with client(tmp_path/'p.sqlite3',provider_options={'sdk_executor':sdk}) as c:
        configure(c); value=post(c,'refresh',pid(c,'read_only')).json()
        assert value['code']=='INVALID_RESPONSE' and value['holdings']==[] and value['status']=='failed'

def test_auth_private_validation_errors_and_metadata_only_diagnostics(tmp_path):
    with client(tmp_path/'p.sqlite3') as c:
        p=pid(c)
        for route,body in [('view',{}),('preview',{'csv_text':CSV}),('confirm',{'draft_id':str(uuid4())}),('undo',{'batch_id':str(uuid4())}),('refresh',{})]:
            r=c.post('/portfolios/'+route,json={'portfolio_id':p,**body},headers={'X-ResearchTrail-Token':'wrong'})
            assert r.status_code==401
        private='PRIVATE_ACCOUNT_987654321'
        r=post(c,'preview',p,csv_text=private,unknown=private)
        assert r.status_code==422 and private not in r.text
        assert post(c,'view','../private').status_code==422
        commit(c,p); assert 'AAPL.US' not in c.get('/settings/diagnostics').text

def test_old_database_upgrade_preserves_history_and_model_schema(tmp_path):
    db=Database(tmp_path/'old.sqlite3'); cfg=Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
    with db.engine.connect() as conn:
        db.migration_transaction(conn,lambda:command.upgrade(cfg,'0007_security_workspace'),cfg)
        conn.execute(text("INSERT INTO profile (id,display_name,research_style) VALUES (1,'旧资料','balanced')")); conn.commit()
    db.migrate(); db.migrate()
    with db.engine.connect() as conn:
        assert conn.scalar(text('SELECT display_name FROM profile'))=='旧资料'
        assert conn.scalar(text('SELECT version_num FROM alembic_version'))=='0019_model_reasoning'
    with db.engine.connect() as conn: db.migration_transaction(conn,lambda:command.check(cfg),cfg)
    db.close()
