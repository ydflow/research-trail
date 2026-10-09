"""ResearchTrail original regressions, fixed fixtures and mocked tracing protocols."""
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
import threading
import time
from uuid import uuid4
import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select,text
from research_trail.app import create_app
from research_trail.evaluation_cases import CASES
from research_trail.evaluation_engine import execute_case
from research_trail.models import EvaluationExperimentRecord, EvaluationTraceDeliveryRecord
from research_trail.evaluation_contracts import TraceUpload, TraceConfig
from research_trail.evaluation_contracts import TraceProbe,CaseResult
from test_settings import TOKEN,HEADERS,Vault

@pytest.fixture
def api(tmp_path):
    vault=Vault()
    @contextmanager
    def open(engine=None,transport=None,path=None):
        app=create_app(TOKEN,database_path=path or tmp_path/'evaluation.sqlite3',credential_vault=vault,
                       monitoring_options={'start':False},evaluation_options={'engine':engine} if engine else {},
                       trace_options={'transport':transport} if transport else {})
        with TestClient(app,headers=HEADERS) as client:yield client,app,vault
    return open

def create(c,cases=None,profile='baseline',**extra):
    body={'request_id':str(uuid4()),'name':'研迹原创离线实验','case_ids':cases or [x.id for x in CASES],'profile':profile,**extra}
    response=c.post('/evaluation/experiments',json=body);assert response.status_code==200,response.text
    return response.json()

def settled(c,identity):
    for _ in range(300):
        view=c.get('/evaluation/experiments/'+identity).json()
        if view['status']!='running':return view
        time.sleep(.02)
    raise AssertionError('offline experiment did not settle')

def run(c,cases=None,profile='baseline'):
    view=create(c,cases,profile);c.post('/evaluation/experiments/'+view['id']+'/start')
    return settled(c,view['id'])

def configure(c,provider):
    response=c.put('/evaluation/tracing/'+provider,json={'enabled':True,'endpoint':'https://trace.example','project':'test-project'})
    assert response.status_code==200
    body={'secret':'synthetic-private-api-key'}
    if provider=='langfuse':body['public_key']='synthetic-public-key'
    response=c.put('/evaluation/tracing/'+provider+'/credential',json=body);assert response.status_code==200,response.text

def upload(c,view,provider,**extra):
    preview=c.get(f"/evaluation/experiments/{view['id']}/tracing/{provider}/preview").json()
    body={'request_id':str(uuid4()),'digest':preview['digest'],'confirm_upload':True,**extra}
    return c.post(f"/evaluation/experiments/{view['id']}/tracing/{provider}/upload",json=body),body,preview

def test_original_catalog_and_not_run_does_not_execute_or_score(api):
    with api() as (c,app,_):
        catalog=c.get('/evaluation/cases').json();assert len(catalog)==12
        assert {x['origin'] for x in catalog}=={'research-trail'}
        assert {x['category'] for x in catalog}=={'normal','error','recovery','regression'}
        view=create(c);assert view['status']=='not_run' and view['score'] is None and view['validity']=='not_executed'
        assert all(r['status']=='not_run' and r['trace']==[] and r['score'] is None for r in view['results'])
        assert app.state.evaluation.work=={}
        assert c.get('/evaluation/cases',headers={'X-ResearchTrail-Token':'invalid'}).status_code==401

def test_all_original_cases_reproducible_and_errors_locate_actual_stage(api):
    with api() as (c,app,_):
        first=run(c);second=run(c)
        assert first['status']==second['status']=='passed' and first['score']==second['score']==1
        assert first['results']==second['results'] and first['suite_hash']==second['suite_hash']
        assert first['origin_counts']=={'research-trail':12} and first['model_requests']==0
        error=next(r for r in first['results'] if r['case_id']=='unknown-symbol')
        assert error['observed_status']=='failed' and error['failure_stage']=='tool-result' and error['score']==1
        seq=error['assertions'][0]['sequence'];assert next(e for e in error['trace'] if e['sequence']==seq)['kind']=='error'
        assert any(e['kind']=='tool_result' and e['payload']['result']['error']['code']=='UNKNOWN_SYMBOL' for e in error['trace'])
        replay=next(r for r in first['results'] if r['case_id']=='replay-no-tools');assert replay['tool_calls']==1
        assert c.get('/sessions').json()==[] and c.get('/research/runs').json()==[]

@pytest.mark.parametrize('profile,expected',[('missing-disclosure','quality_failed'),('wrong-fact','quality_failed'),('missing-tool','quality_failed'),('provider-failure','run_error')])
def test_quality_failure_separate_from_unexpected_execution_error(api,profile,expected):
    with api() as (c,_,__):
        view=run(c,['quote-aapl'],profile);assert view['status']==expected
        assert view['results'][0]['failure_stage'] and view['results'][0]['code']
        assert view['score']==(None if expected=='run_error' else 0)
        assert view['validity']==('invalid' if expected=='run_error' else 'valid')

@pytest.mark.parametrize('changes,code',[(dict(case_ids=[]),422),(dict(case_ids=['quote-aapl','quote-aapl']),422),(dict(case_ids=['upstream-not-imported']),409),(dict(profile='paid-live-model'),422)])
def test_invalid_selection_never_creates_experiment(api,changes,code):
    with api() as (c,_,__):
        body={'request_id':str(uuid4()),'name':'invalid','case_ids':['quote-aapl'],**changes}
        assert c.post('/evaluation/experiments',json=body).status_code==code
        assert c.get('/evaluation/experiments').json()==[]

def test_request_replay_and_content_conflict_summary_has_no_raw_trajectory(api):
    with api() as (c,_,__):
        view=create(c,['quote-aapl']);body=view['input']
        assert c.post('/evaluation/experiments',json=body).json()==view
        assert c.post('/evaluation/experiments',json={**body,'name':'changed'}).status_code==409
        history=c.get('/evaluation/experiments').json();assert len(history)==1 and 'results' not in history[0] and 'cases' not in history[0]

def test_concurrent_start_single_execution_and_cancellation_discards_late_result(api):
    entered=threading.Event();release=threading.Event();calls=[]
    def slow(case,profile,stop):
        calls.append(case.id);entered.set();release.wait(3);return execute_case(case,profile,threading.Event())
    with api(slow) as (c,_,__):
        view=create(c,['quote-aapl','quote-msft']);path='/evaluation/experiments/'+view['id']
        with ThreadPoolExecutor(2) as pool:list(pool.map(lambda _:c.post(path+'/start'),range(2)))
        assert entered.wait(1) and calls==['quote-aapl']
        other=create(c,['quote-aapl']);assert c.post('/evaluation/experiments/'+other['id']+'/start').status_code==409
        cancel=c.post(path+'/cancel').json();assert cancel['status']=='cancelled' and cancel['score'] is None
        release.set();assert settled(c,view['id'])['score'] is None
        assert c.post(path+'/start').json()['status']=='cancelled' and calls==['quote-aapl']

def test_cancel_before_start_has_no_tools_or_score(api):
    with api() as (c,app,_):
        view=create(c,['quote-aapl']);view=c.post('/evaluation/experiments/'+view['id']+'/cancel').json()
        assert view['status']=='cancelled' and view['score'] is None and view['results'][0]['trace']==[]
        assert app.state.evaluation.work=={}

def test_restart_retains_results_and_marks_crash_pending_invalid(api):
    with api() as (c,app,_):
        passed=run(c,['quote-aapl']);pending=create(c,['quote-msft'])
        with app.state.store.database.write() as db:
            row=db.get(EvaluationExperimentRecord,pending['id']);payload=deepcopy(row.payload)
            payload['status']='running';payload['results'][0]['status']='running';row.payload=payload;row.status='running'
    with api() as (c,app,_):
        view=c.get('/evaluation/experiments/'+pending['id']).json()
        assert view['status']=='run_error' and view['score'] is None and view['validity']=='invalid'
        assert view['results'][0]['code']=='APPLICATION_RESTARTED' and app.state.evaluation.work=={}
        assert c.get('/evaluation/experiments/'+passed['id']).json()==passed

def test_immutable_baseline_real_regression_and_incomparable_cases(api):
    with api() as (c,_,__):
        pending=create(c,['quote-aapl']);body={'request_id':str(uuid4()),'name':'baseline','experiment_id':pending['id']}
        assert c.post('/evaluation/baselines',json=body).status_code==409
        passed=run(c,['quote-aapl']);body['experiment_id']=passed['id']
        baseline=c.post('/evaluation/baselines',json=body).json()
        assert c.post('/evaluation/baselines',json=body).json()==baseline
        assert c.post('/evaluation/baselines',json={**body,'name':'mutated'}).status_code==409
        bad=run(c,['quote-aapl'],'wrong-fact')
        comparison=c.get('/evaluation/experiments/'+bad['id'],params={'baseline_id':baseline['id']}).json()['comparison']
        assert comparison['comparable'] and comparison['delta']==-1 and comparison['regressed_cases']==['quote-aapl']
        different=run(c,['quote-msft']);comparison=c.get('/evaluation/experiments/'+different['id'],params={'baseline_id':baseline['id']}).json()['comparison']
        assert not comparison['comparable'] and comparison['delta'] is None
        invalid=run(c,['quote-aapl'],'provider-failure');comparison=c.get('/evaluation/experiments/'+invalid['id'],params={'baseline_id':baseline['id']}).json()['comparison']
        assert not comparison['comparable'] and comparison['delta'] is None

def test_feedback_append_replay_and_restart_without_changing_scores(api):
    with api() as (c,_,__):
        view=run(c,['quote-aapl']);path='/evaluation/experiments/'+view['id']+'/feedback'
        body={'request_id':str(uuid4()),'case_id':'quote-aapl','judgment':'disagree','reason':'需要人工检查资料完整性'}
        note=c.post(path,json=body).json();assert c.post(path,json=body).json()==note
        assert c.post(path,json={**body,'reason':'changed'}).status_code==409
        assert c.post(path,json={**body,'request_id':str(uuid4()),'case_id':'not-selected'}).status_code==404
        assert c.post(path,json={**body,'request_id':str(uuid4()),'reason':'  '}).status_code==422
        assert c.get('/evaluation/experiments/'+view['id']).json()==view
    with api() as (c,_,__):assert c.get(path).json()==[note]

@pytest.mark.parametrize('output',[{'status':'passed','score':1},{'status':'quality_failed','score':1},{'status':'run_error','score':.5},{'status':'passed','score':float('nan')}])
def test_invalid_evaluator_output_cannot_generate_headline_scores(api,output):
    def invalid(case,profile,stop):return {'case_id':case.id,**output}
    with api(invalid) as (c,_,__):
        view=run(c,['quote-aapl']);assert view['status']=='run_error' and view['score'] is None
        assert view['results'][0]['code']=='EVALUATOR_ERROR'

@pytest.mark.parametrize('provider',['langsmith','langfuse'])
def test_disabled_no_network_and_offline_blocks_even_configured_credentials(api,monkeypatch,provider):
    monkeypatch.setenv('RESEARCH_TRAIL_OFFLINE','1')
    with api() as (c,_,__):
        assert all(not x['enabled'] and not x['credential_present'] for x in c.get('/evaluation/tracing').json())
        view=run(c,['quote-aapl']);configure(c,provider)
        monkeypatch.setattr(httpx,'Client',lambda **_:pytest.fail('offline evaluation tried network'))
        response=c.post('/evaluation/tracing/'+provider+'/probe',json={'confirm_connection':True})
        assert response.status_code==409 and response.json()['detail']=='OFFLINE_TRACING_BLOCKED'
        response,_,preview=upload(c,view,provider);assert response.status_code==409
        assert c.get('/evaluation/tracing/deliveries').json()==[] and preview['payload']

@pytest.mark.parametrize('provider',['langsmith','langfuse'])
def test_mock_protocol_preview_minimal_and_durable_single_upload(api,provider):
    calls=[]
    def transport(request):
        calls.append(request)
        if request.method=='GET':return httpx.Response(200,json=[] if provider=='langsmith' else {'data':[]})
        return httpx.Response(200,json={} if provider=='langfuse' else None)
    with api(transport=httpx.MockTransport(transport)) as (c,app,vault):
        configure(c,provider);view=run(c,['quote-aapl','unknown-symbol'])
        c.post('/evaluation/experiments/'+view['id']+'/feedback',json={'request_id':str(uuid4()),'case_id':'quote-aapl','judgment':'needs-review','reason':'private-account-user-text'})
        assert c.post('/evaluation/tracing/'+provider+'/probe',json={'confirm_connection':True}).json()['status']=='connected'
        response,body,preview=upload(c,view,provider);assert response.status_code==200 and response.json()['status']=='uploaded'
        encoded=json.dumps(preview['payload']);assert all(s not in encoded for s in ('synthetic-private-api-key','private-account-user-text','查询AAPL.US','189.43','tool-input','credential'))
        path=f"/evaluation/experiments/{view['id']}/tracing/{provider}/upload"
        assert c.post(path,json=body).json()==response.json()
        assert c.post(path,json={**body,'request_id':str(uuid4())}).json()==response.json()
        assert len([r for r in calls if r.method=='POST'])==1
        post=next(r for r in calls if r.method=='POST')
        assert post.url.path==('/runs' if provider=='langsmith' else '/api/public/otel/v1/traces')
        if provider=='langsmith':assert post.headers['x-api-key']=='synthetic-private-api-key'
        else:assert post.headers['authorization'].startswith('Basic ') and post.headers['x-langfuse-ingestion-version']=='4'
        assert json.loads(post.content)==preview['payload']
        assert 'synthetic-private-api-key' not in str(c.get('/evaluation/tracing').json())
    with api(transport=httpx.MockTransport(transport)) as (c,_,__):
        assert c.post(path,json=body).json()['status']=='uploaded' and len([r for r in calls if r.method=='POST'])==1

def test_stale_preview_and_config_changes_never_send(api):
    calls=[]
    with api(transport=httpx.MockTransport(lambda r:(calls.append(r),httpx.Response(200,json=None))[1])) as (c,_,__):
        configure(c,'langsmith');view=run(c,['quote-aapl']);preview=c.get(f"/evaluation/experiments/{view['id']}/tracing/langsmith/preview").json()
        c.put('/evaluation/tracing/langsmith',json={'enabled':True,'endpoint':'https://changed.example','project':'test-project'})
        response=c.post(f"/evaluation/experiments/{view['id']}/tracing/langsmith/upload",json={'request_id':str(uuid4()),'digest':preview['digest'],'confirm_upload':True})
        assert response.status_code==409 and response.json()['detail']=='TRACE_PREVIEW_CHANGED' and calls==[]

def test_network_timeout_uncertain_not_retried_after_restart(api):
    calls=[]
    def timeout(request):calls.append(request);raise httpx.ReadTimeout('raw secret must not be returned')
    with api(transport=httpx.MockTransport(timeout)) as (c,_,__):
        configure(c,'langsmith');view=run(c,['quote-aapl']);response,body,_=upload(c,view,'langsmith')
        assert response.json()['status']=='uncertain' and 'raw secret' not in response.text and len(calls)==1
    with api(transport=httpx.MockTransport(timeout)) as (c,_,__):
        response=c.post(f"/evaluation/experiments/{view['id']}/tracing/langsmith/upload",json=body)
        assert response.json()['status']=='uncertain' and len(calls)==1

def test_langfuse_partial_rejection_and_redirect_are_failures(api):
    for response,expected in [(httpx.Response(200,json={'partialSuccess':{'rejectedSpans':1}}),'TRACE_PARTIAL_REJECTED'),
                              (httpx.Response(302,headers={'location':'https://untrusted.example'}),'TRACE_HTTP_302')]:
        with api(transport=httpx.MockTransport(lambda r:response)) as (c,_,__):
            configure(c,'langfuse');view=run(c,['quote-aapl']);upload_response,_,__=upload(c,view,'langfuse')
            assert upload_response.json()['status']=='failed' and upload_response.json()['code']==expected

@pytest.mark.parametrize('endpoint',['https://user:pass@example.com','https://example.com?q=private','https://example.com/path','http://example.com','https://example.com/#private'])
def test_tracing_endpoints_reject_credential_query_path_and_cleartext_remote(api,endpoint):
    with api() as (c,_,__):assert c.put('/evaluation/tracing/langsmith',json={'endpoint':endpoint}).status_code==422

def test_credential_deletion_external_removal_and_no_plaintext_database(api):
    with api() as (c,app,vault):
        configure(c,'langfuse');assert c.get('/evaluation/tracing').json()[1]['credential_present']
        with app.state.store.database.engine.connect() as db:
            assert 'synthetic-private-api-key' not in str(db.execute(text('SELECT * FROM evaluation_trace_config')).all())
        vault.values.clear()
        view=c.get('/evaluation/tracing').json()[1];assert not view['credential_present'] and view['code']=='TRACE_CREDENTIAL_MISSING'
        configure(c,'langfuse')
        c.delete('/evaluation/tracing/langfuse/credential')
        view=c.get('/evaluation/tracing').json()[1];assert not view['credential_present'] and not view['enabled']

def test_system_vault_failure_is_safe_and_no_plaintext_fallback(api):
    with api() as (c,app,vault):
        c.put('/evaluation/tracing/langsmith',json={'enabled':True,'endpoint':'https://trace.example'})
        vault.fail=True
        response=c.put('/evaluation/tracing/langsmith/credential',json={'secret':'synthetic-never-store-plaintext'})
        assert response.status_code==503 and 'synthetic' not in response.text
        vault.fail=False
        with app.state.store.database.engine.connect() as db:
            assert 'synthetic-never-store-plaintext' not in str(db.execute(text('SELECT * FROM evaluation_trace_config')).all())

@pytest.mark.parametrize('partial,expected',[(None,'failed'),({'rejectedSpans':'0'},'uploaded'),({'rejectedSpans':'1'},'failed'),({'rejectedSpans':'broken'},'failed')])
def test_otlp_ack_shapes_do_not_create_false_upload_success(api,partial,expected):
    with api(transport=httpx.MockTransport(lambda r:httpx.Response(200,json={'partialSuccess':partial}))) as (c,_,__):
        configure(c,'langfuse');view=run(c,['quote-aapl']);response,_,__=upload(c,view,'langfuse')
        assert response.status_code==200 and response.json()['status']==expected

def test_case_order_canonical_and_claim_crash_never_reuploads(api):
    calls=[]
    transport=httpx.MockTransport(lambda r:(calls.append(r),httpx.Response(200,json=None))[1])
    with api(transport=transport) as (c,app,_):
        first=run(c,['quote-aapl','quote-msft']);second=run(c,['quote-msft','quote-aapl'])
        assert first['suite_hash']==second['suite_hash'] and first['results']==second['results']
        configure(c,'langsmith');response,body,__=upload(c,first,'langsmith')
        with app.state.store.database.write() as db:
            row=db.get(EvaluationTraceDeliveryRecord,response.json()['id']);row.status='claimed';row.code='CLAIMED'
    with api(transport=transport) as (c,_,__):
        response=c.post(f"/evaluation/experiments/{first['id']}/tracing/langsmith/upload",json=body)
        assert response.json()['status']=='uncertain' and response.json()['code']=='APPLICATION_RESTARTED' and len(calls)==1

@pytest.mark.parametrize('confirmation',[False,1,'true',None])
def test_external_actions_require_literal_boolean_confirmation(confirmation):
    from pydantic import ValidationError
    with pytest.raises(ValidationError): TraceProbe(confirm_connection=confirmation)
    with pytest.raises(ValidationError): TraceUpload(request_id=uuid4(),digest='a'*64,confirm_upload=confirmation)

def test_minimal_projection_rejects_private_sequence_and_counts_replayed_calls():
    from research_trail.evaluation_trace import minimal_result
    result=CaseResult(case_id='replay-no-tools',tool_calls=1,trace=[{'kind':'tool_started','sequence':{'account':'synthetic-private'},'payload':{'name':'market.quote','args':'private'}}])
    safe=minimal_result(result)
    assert safe['tool_calls']==1 and safe['tools']==[{'name':'market.quote','sequence':None}]
    assert 'private' not in str(safe)

def test_pending_old_implementation_cannot_execute_under_frozen_baseline_hash(api):
    with api() as (c,app,_):
        pending=create(c,['quote-aapl']);app.state.evaluation.implementation_hash='changed-implementation'
        response=c.post('/evaluation/experiments/'+pending['id']+'/start')
        assert response.status_code==409 and 'EVALUATION_IMPLEMENTATION_CHANGED' in response.text
        unchanged=c.get('/evaluation/experiments/'+pending['id']).json()
        assert unchanged['status']=='not_run' and unchanged['score'] is None
        assert app.state.evaluation.work=={} and unchanged['results'][0]['trace']==[]

def test_upgrade_from_step21_preserves_existing_session_and_monitoring_rows(tmp_path):
    from alembic import command
    from alembic.config import Config
    from pathlib import Path
    from research_trail.database import Database
    from research_trail.store import Store
    db=Database(tmp_path/'step21.sqlite3')
    try:
        cfg=Config(str(Path(__file__).resolve().parents[1]/'alembic.ini'))
        with db.engine.connect() as connection:
            db.migration_transaction(connection,lambda:command.upgrade(cfg,'0016_monitoring'),cfg)
        store=Store(db);session=store.create_session('第21步保留会话')
        with db.engine.begin() as connection:
            connection.execute(text("INSERT INTO monitoring_rules (id,request_id,request_hash,payload,state,created_at,revision) VALUES (:id,:rid,'hash',:payload,:cursor,'2024-01-16',1)"),{'id':str(uuid4()),'rid':str(uuid4()),'payload':'{"name":"old-rule"}','cursor':'{"last":"fixed"}'})
            before=connection.execute(text('SELECT * FROM monitoring_rules')).all()
        db.migrate();db.migrate()
        assert store.sessions()[0].id==session.id
        with db.engine.connect() as connection:
            assert connection.execute(text('SELECT * FROM monitoring_rules')).all()==before
            assert connection.execute(text('SELECT version_num FROM alembic_version')).scalar()=='0019_model_reasoning'
            assert connection.execute(text('SELECT count(*) FROM evaluation_experiments')).scalar()==0
    finally:db.close()
