"""Step17 atomic checkpoint, explicit resume and no implicit model consumption."""
from contextlib import contextmanager
import json
import threading
import time
from uuid import uuid4
import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from research_trail.app import create_app
from research_trail.provider_service import authored_data
from research_trail.report_facts import result_hash
from research_trail.report_synthesis import FixedReportSynthesizer
from research_trail.research_contracts import ResearchInput
from test_settings import TOKEN, HEADERS, Vault
from test_research import start, settled
from test_reports import report, finished, configure

@pytest.fixture
def api(tmp_path):
    vault=Vault(); path=tmp_path/'recovery.sqlite3'
    @contextmanager
    def make(executor=authored_data,transport=None,provider_options=None):
        app=create_app(TOKEN,database_path=path,credential_vault=vault,openai_transport=transport,
            provider_options=provider_options or {'simulated_executor':executor})
        with TestClient(app,headers=HEADERS) as c: yield c,app,vault
    return make

def action(c,identity,operation,key=None):
    return c.post(f'/research/runs/{identity}/{operation}',json={'request_id':key or str(uuid4())})

def checkpoint(c,identity):
    r=c.get(f'/research/runs/{identity}/checkpoint'); assert r.status_code==200,r.text; return r.json()

def test_resume_reuses_success_bytes_and_timestamps_after_reopen_no_model(api):
    gate=threading.Event(); entered=threading.Event(); calls=[]
    def execute(q):
        calls.append(q.capability)
        if len(calls)==2: entered.set(); gate.wait(5)
        return authored_data(q)
    with api(execute) as (c,app,_):
        identity=start(c,strategy='value',concurrency=1); assert entered.wait(2)
        old=c.get('/research/runs/'+identity).json()['steps'][0]
        raw=c.get(f"/research/runs/{identity}/data/{old['capability']}").json()
        app.state.research.close(); gate.set()
        for call in app.state.research.calls: call.thread.join(1)
    with api(execute) as (c,app,_):
        original=c.get('/research/runs/'+identity).json()
        assert original['status']=='interrupted' and original['succeeded']==1
        cp=checkpoint(c,identity)
        assert cp['stage']=='collection_interrupted' and cp['resume_allowed']
        assert cp['reuse_capabilities']==[old['capability']] and len(cp['remaining_capabilities'])==3
        model_calls=[]; app.state.reports.model_factory=lambda:model_calls.append('unexpected')
        key=str(uuid4()); resumed=action(c,identity,'resume',key)
        assert resumed.status_code==200,resumed.text
        final=settled(c,identity)
        assert final['status']=='collected' and final['generation']==1 and final['id']==identity
        assert final['steps'][0]==old
        assert c.get(f"/research/runs/{identity}/data/{old['capability']}").json()==raw
        assert calls.count(old['capability'])==1 and model_calls==[]
        assert action(c,identity,'resume',key).json()==final
        assert action(c,identity,'resume').json()==final
        assert len(c.get('/research/runs').json())==1 and c.get('/research/reports').json()==[]
        job=finished(c,report(c,identity))
        facts=[f for f in job['document']['evidence'] if f['capability']==old['capability']]
        assert facts and all(f['result_hash']==result_hash(raw['result']) for f in facts)
        assert checkpoint(c,identity)['stage']=='completed'

def test_restart_is_new_plan_new_id_preserves_old_and_is_idempotent(api):
    calls=[]
    def execute(q): calls.append(q.capability); return authored_data(q)
    with api(execute) as (c,app,_):
        identity=start(c,strategy='value'); old=settled(c,identity); old_report=finished(c,report(c,identity))
        assert c.put('/settings/providers/longbridge',json={'enabled':True}).status_code==200
        key=str(uuid4()); response=action(c,identity,'restart',key); assert response.status_code==200,response.text
        newer=settled(c,response.json()['id'])
        assert newer['id']!=identity and newer['parent_run_id']==identity and newer['generation']==0
        assert newer['plan']['provider_revision']!=old['plan']['provider_revision']
        assert len(calls)==8 and c.get('/research/runs/'+identity).json()==old
        assert c.get('/research/reports/'+old_report['id']).json()==old_report
        assert action(c,identity,'restart',key).json()==newer and len(calls)==8
        assert action(c,identity,'abandon',key).json()['detail']=='ACTION_ID_CONFLICT'
    with api(execute) as (c,_,_):
        assert action(c,identity,'restart',key).json()['id']==newer['id']
        assert len(calls)==8

def test_config_delete_recreate_same_revision_still_blocks_resume(api):
    gate=threading.Event(); entered=threading.Event(); count=0
    def execute(q):
        nonlocal count
        count+=1
        if count==2: entered.set(); gate.wait(5)
        return authored_data(q)
    with api(execute) as (c,app,_):
        c.put('/settings/providers/longbridge',json={'enabled':True})
        identity=start(c,strategy='value',concurrency=1); assert entered.wait(2)
        app.state.research.close(); gate.set()
        for call in app.state.research.calls: call.thread.join(1)
    with api(execute) as (c,_,_):
        old=c.get('/research/runs/'+identity).json()
        assert c.delete('/settings/providers/longbridge').status_code==200
        changed=c.put('/settings/providers/longbridge',json={'enabled':True,'region':'cn'})
        assert changed.status_code==200 and changed.json()['revision']==old['plan']['provider_revision']
        cp=checkpoint(c,identity)
        assert cp['code']=='CONFIG_CHANGED' and not cp['resume_allowed']
        assert action(c,identity,'resume').json()['detail']=='CONFIG_CHANGED'
        assert c.get('/research/runs/'+identity).json()==old and count==2

@pytest.mark.parametrize('damage,code',[
    ("DELETE FROM research_steps WHERE run_id=:id AND ordinal=1",'EVIDENCE_MISSING'),
    ("DELETE FROM research_checkpoints WHERE run_id=:id",'CHECKPOINT_MISSING'),
    ("UPDATE research_checkpoints SET checksum='bad' WHERE run_id=:id",'CHECKPOINT_INVALID'),
    ("UPDATE research_steps SET result='{}' WHERE run_id=:id AND ordinal=1",'EVIDENCE_CHANGED')])
def test_missing_or_changed_checkpoint_evidence_is_blocked_not_repaired(api,damage,code):
    with api() as (c,app,_):
        identity=start(c,strategy='value'); settled(c,identity)
        with app.state.store.database.write() as db: db.execute(text(damage),{'id':identity})
        cp=checkpoint(c,identity)
        assert cp['stage']=='blocked' and cp['code']==code and not cp['resume_allowed']
        assert cp['reuse_capabilities']==[]
        assert action(c,identity,'resume').json()['detail']==code
        assert c.post(f'/research/runs/{identity}/reports',json={}).json()['detail']==code
        abandoned=action(c,identity,'abandon'); assert abandoned.status_code==200
        assert abandoned.json()['abandoned_at'] is not None
        assert checkpoint(c,identity)['stage']=='abandoned'

def test_reports_interruption_resume_no_second_request_no_duplicate_versions(api):
    entered=threading.Event(); gate=threading.Event(); requests=[]
    def transport(req):
        requests.append(json.loads(req.content)); entered.set(); gate.wait(5)
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'role':'assistant','content':'{}'}}]})
    with api(transport=httpx.MockTransport(transport)) as (c,app,vault):
        identity=start(c,strategy='value'); settled(c,identity)
        original=finished(c,report(c,identity)); configure(c)
        key=str(uuid4()); response=c.post(f'/research/runs/{identity}/reports',json={'mode':'real','request_id':key})
        rid=response.json()['id']; assert entered.wait(2)
        assert app.state.reports.store.get(rid).request_uncertain
        app.state.reports.close(); gate.set(); app.state.reports.work.thread.join(2)
        interrupted=c.get('/research/reports/'+rid).json()
        assert interrupted['status']=='interrupted' and interrupted['document'] is None
        assert interrupted['request_uncertain'] and len(requests)==1
        vault.values.clear()  # externally lost native credential; no revision change
    with api(transport=httpx.MockTransport(transport)) as (c,app,_):
        assert c.get('/research/reports/'+rid).json()==interrupted
        cp=checkpoint(c,identity)
        assert cp['stage']=='awaiting_report' and cp['resume_allowed'] and cp['model_request_uncertain']
        assert 'MODEL_CREDENTIAL_MISSING' in cp['warnings']
        for _ in range(3): assert action(c,identity,'resume').status_code==200
        assert len(requests)==1 and len(c.get('/research/reports').json())==2
        assert c.get('/research/reports/'+original['id']).json()==original
        assert c.post(f'/research/runs/{identity}/reports',json={'mode':'real','request_id':key}).json()==interrupted
        assert c.post(f'/research/runs/{identity}/reports',json={'mode':'real'}).json()['detail']=='MODEL_CREDENTIAL_MISSING'
        assert len(c.get('/research/reports').json())==2 and len(requests)==1
        new=finished(c,report(c,identity))
        assert new['version']==3 and new['status']=='completed' and len(requests)==1

def test_report_request_replay_is_same_version_after_complete_and_reopen(api):
    with api() as (c,_,_):
        identity=start(c,strategy='value'); settled(c,identity); key=str(uuid4())
        response=c.post(f'/research/runs/{identity}/reports',json={'request_id':key}); final=finished(c,response.json()['id'])
        assert c.post(f'/research/runs/{identity}/reports',json={'request_id':key}).json()==final
        assert c.post(f'/research/runs/{identity}/reports',json={'request_id':key,'mode':'real'}).json()['detail']=='ACTION_ID_CONFLICT'
    with api() as (c,_,_):
        assert c.post(f'/research/runs/{identity}/reports',json={'request_id':key}).json()==final
        assert len(c.get('/research/reports').json())==1

def test_abandon_stops_live_report_retains_completed_evidence_and_blocks_new(api):
    entered=threading.Event(); gate=threading.Event()
    class Slow(FixedReportSynthesizer):
        def synthesize(self,*args): entered.set(); gate.wait(5); return super().synthesize(*args)
    with api() as (c,app,_):
        identity=start(c,strategy='value'); settled(c,identity); original=finished(c,report(c,identity))
        app.state.reports.fixed_factory=Slow; rid=report(c,identity); assert entered.wait(2)
        assert action(c,identity,'resume').json()['detail']=='REPORT_ACTIVE'
        assert action(c,identity,'restart').json()['detail']=='REPORT_ACTIVE'
        key=str(uuid4()); response=action(c,identity,'abandon',key)
        assert response.status_code==200 and response.json()['abandoned_at']
        assert action(c,identity,'abandon',key).json()==response.json()
        job=c.get('/research/reports/'+rid).json()
        assert job['status']=='cancelled' and job['code']=='RESEARCH_ABANDONED' and job['document'] is None
        gate.set(); app.state.reports.work.thread.join(1)
        assert c.get('/research/reports/'+rid).json()==job
        assert c.get('/research/reports/'+original['id']).json()==original
        fact=original['document']['evidence'][0]
        assert c.get(f"/research/reports/{original['id']}/evidence/{fact['id']}").status_code==200
        assert c.post(f'/research/runs/{identity}/reports',json={}).json()['detail']=='RESEARCH_ABANDONED'
        assert action(c,identity,'resume').json()['detail']=='RESEARCH_ABANDONED'

def test_resume_launches_new_generation_while_old_work_is_still_cleaning_up(api):
    from research_trail.research import Work
    with api() as (c,app,_):
        plan=app.state.research.plan(ResearchInput(symbol='AAPL.US',strategy='value'))
        identity=app.state.research.store.begin(plan)
        app.state.research.store.finish(identity,'interrupted','BACKEND_INTERRUPTED')
        old=Work(identity,plan); old.stop.set(); app.state.research.work=old
        assert action(c,identity,'resume').status_code==200
        final=settled(c,identity)
        assert final['status']=='collected' and final['generation']==1
        assert len(c.get('/research/runs').json())==1

def test_generation_fence_prevents_old_coordinator_writing_resumed_run(api):
    with api() as (c,app,_):
        plan=app.state.research.plan(ResearchInput(symbol='AAPL.US',strategy='value'))
        identity=app.state.research.store.begin(plan)
        app.state.research.store.finish(identity,'interrupted','BACKEND_INTERRUPTED')
        app.state.research.store.resume(identity,str(uuid4()))
        cap=plan.reads[0].capability
        assert not app.state.research.store.step(identity,cap,'failed','STALE',generation=0)
        app.state.research.store.finish(identity,'failed','STALE',generation=0)
        assert c.get('/research/runs/'+identity).json()['status']=='fetching'
        assert app.state.research.store.validate_checkpoint(identity)

def test_recovery_actions_require_auth_uuid_and_valid_request_id(api):
    with api() as (c,_,_):
        identity=start(c,strategy='value'); settled(c,identity)
        for operation in ('resume','restart','abandon'):
            assert c.post(f'/research/runs/{identity}/{operation}',json={'request_id':'../../private'}).status_code==422
        assert c.get('/research/runs/not-a-uuid/checkpoint').status_code==404
        assert c.get('/research/runs/'+identity+'/checkpoint',headers={'X-ResearchTrail-Token':'wrong'}).status_code==401

def test_real_resume_checks_external_credential_loss_then_continues_saved_plan(api):
    entered=threading.Event(); gate=threading.Event(); calls=[]
    def sdk(snapshot,q,stop):
        calls.append(q.capability)
        if len(calls)==2: entered.set(); gate.wait(5)
        return authored_data(q)
    options={'sdk_executor':sdk,'cli_executor':sdk}
    with api(provider_options=options) as (c,app,vault):
        assert c.put('/settings/providers/longbridge',json={'enabled':True}).status_code==200
        r=c.put('/settings/providers/longbridge/credential',json={'app_key':'test-app','app_secret':'test-secret','access_token':'test-access'})
        assert r.status_code==200,r.text
        revision=r.json()['revision']
        for cap in ('company.profile','company.valuation','company.financials','company.dividends'):
            app.state.providers.health[('longbridge',cap,revision)]={'validation':'real'}
        identity=start(c,strategy='value',concurrency=1,mode='real'); assert entered.wait(2)
        app.state.research.close(); gate.set()
        for call in app.state.research.calls: call.thread.join(1)
        saved=dict(vault.values); vault.values.clear()
    with api(provider_options=options) as (c,app,vault):
        cp=checkpoint(c,identity)
        assert cp['code']=='CREDENTIAL_MISSING' and not cp['resume_allowed']
        assert action(c,identity,'resume').json()['detail']=='CREDENTIAL_MISSING' and len(calls)==2
        vault.values.update(saved)
        cp=checkpoint(c,identity)
        assert cp['resume_allowed'] and 'REAL_READINESS_RECHECK_ON_RESUME' in cp['warnings']
        assert action(c,identity,'resume').status_code==200
        final=settled(c,identity)
        assert final['status']=='collected' and final['succeeded']==4
        assert calls.count('company.profile')==1 and len(calls)==5

def test_changed_model_identity_warns_and_resume_does_not_create_model(api):
    with api() as (c,app,_):
        identity=start(c,strategy='value'); settled(c,identity); configure(c)
        from research_trail.report_facts import packet
        old_identity=app.state.settings.model_identity()
        rid=app.state.reports.store.begin(packet(app.state.research.store,identity),'real',model_identity=old_identity)
        app.state.reports.store.before_call(rid)
        app.state.reports.store.finish(rid,'interrupted','BACKEND_INTERRUPTED')
        assert c.put('/settings/connections/model',json={'endpoint':'https://model.invalid/v1','model':'changed-offline-model'}).status_code==200
        cp=checkpoint(c,identity)
        assert cp['stage']=='awaiting_report' and 'MODEL_CONFIG_CHANGED' in cp['warnings']
        calls=[]; app.state.reports.model_factory=lambda: calls.append('unexpected')
        assert action(c,identity,'resume').status_code==200 and calls==[]
        assert len(c.get('/research/reports').json())==1

def test_0011_upgrade_bootstraps_existing_evidence_without_rewriting_reports(api,tmp_path):
    from pathlib import Path
    from alembic import command
    from alembic.config import Config
    from research_trail.database import Database
    with api() as (c,_,_):
        identity=start(c,strategy='value'); run=settled(c,identity); job=finished(c,report(c,identity))
        results={s['capability']:c.get(f"/research/runs/{identity}/data/{s['capability']}").json()['result'] for s in run['steps']}
    path=tmp_path/'legacy.sqlite3'; db=Database(path)
    cfg=Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
    cfg.set_main_option('script_location',str(Path(__file__).resolve().parents[1]/'migrations'))
    with db.engine.connect() as conn:
        db.migration_transaction(conn,lambda:command.upgrade(cfg,'0011_reports'),cfg)
    legacy_plan=dict(run['plan']); legacy_plan.pop('provider_identity')
    with db.write() as tx:
        tx.execute(text('INSERT INTO research_runs(id,status,plan,started_at,completed_at) VALUES (:id,:status,:plan,:started_at,:completed_at)'),
            {**{k:run[k] for k in ('id','status','started_at','completed_at')},'plan':json.dumps(legacy_plan)})
        for s in run['steps']:
            tx.execute(text('INSERT INTO research_steps(run_id,capability,ordinal,status,code,started_at,completed_at,result) VALUES (:run_id,:capability,:ordinal,:status,:code,:started_at,:completed_at,:result)'),
                {**{k:s[k] for k in ('capability','ordinal','status','code','started_at','completed_at')},'run_id':identity,'result':json.dumps(results[s['capability']])})
        tx.execute(text('INSERT INTO research_reports(id,run_id,version,symbol,mode,status,code,started_at,completed_at,requests_started,document) VALUES (:id,:run_id,:version,:symbol,:mode,:status,:code,:started_at,:completed_at,:requests_started,:document)'),
            {**{k:job[k] for k in ('id','run_id','version','symbol','mode','status','code','started_at','completed_at','requests_started')},'document':json.dumps(job['document'])})
    db.migrate(); db.migrate(); db.close()
    app=create_app(TOKEN,database_path=path,credential_vault=Vault())
    with TestClient(app,headers=HEADERS) as c:
        new=c.get('/research/reports/'+job['id']).json()
        assert new==job
        assert checkpoint(c,identity)['stage']=='completed'
        for fact in new['document']['evidence']:
            assert c.get(f"/research/reports/{job['id']}/evidence/{fact['id']}").status_code==200
        with app.state.store.database.engine.connect() as conn:
            assert conn.exec_driver_sql('PRAGMA foreign_key_check').all()==[]
            assert conn.scalar(text('SELECT cause FROM research_checkpoints WHERE run_id=:id'),{'id':identity})=='legacy-migration'
            app.state.store.database.migration_transaction(conn,lambda:command.check(cfg),cfg)
