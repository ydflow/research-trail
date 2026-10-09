"""Deterministic acceptance: never contacts a model or market service."""
from copy import deepcopy
from decimal import Decimal
import json
import threading
import time
from types import SimpleNamespace
from uuid import uuid4
import httpx
import pytest
from fastapi.testclient import TestClient
from research_trail.app import create_app
from research_trail.models import ResearchComparisonRecord
from research_trail.research_evaluation import ResearchEvaluationService
from research_trail.research_evaluation_contracts import DIMENSIONS, ResearchQualityInput
from research_trail.report_synthesis import FixedReportSynthesizer, validate, validate_forecast_time
from research_trail.report_contracts import ReportForecast
from research_trail.report_facts import packet
from research_trail.report_output import diff, markdown
from research_trail.outcome_engine import aggregate
from research_trail.outcome_contracts import WeightParameters
from research_trail.evaluation import EvaluationError
from research_trail.research_store import ResearchError
from test_settings import TOKEN, HEADERS, Vault
from test_research import start, settled
from test_reports import report, finished

@pytest.fixture
def api(tmp_path):
    app=create_app(TOKEN,database_path=tmp_path/'quality.sqlite3',credential_vault=Vault())
    with TestClient(app,headers=HEADERS) as client:
        run=start(client);settled(client,run)
        yield client,app,run

def create(client,run,**extra):
    body=dict(request_id=str(uuid4()),run_id=run,mode='offline',models=['authored-a','authored-b'],**extra)
    response=client.post('/evaluation/research',json=body)
    assert response.status_code==200,response.text
    return response.json(),body

def done(client,identity):
    deadline=time.monotonic()+4
    while time.monotonic()<deadline:
        view=client.get('/evaluation/research/'+identity).json()
        if view['status']!='running':return view
        time.sleep(.01)
    raise AssertionError('comparison did not settle')

def rating(view,index=0,score=3):
    ev=view['candidates'][index]['document']['evidence'][0]['id']
    return dict(request_id=str(uuid4()),candidate=index,expected_version=0,
                ratings={d:dict(score=score,reason='原创测试评审理由，不是实际投资判断。',evidence_ids=[ev]) for d in DIMENSIONS})

def test_offline_same_data_idempotency_review_and_no_fake_score(api):
    c,app,run=api;view,body=create(c,run);identity=view['id']
    assert view['quality_delta'] is None and view['status']=='not_run'
    assert c.post('/evaluation/research',json=body).json()==view
    assert c.post('/evaluation/research/'+identity+'/reviews',json=rating({**view,'candidates':[{'document':{'evidence':[{'id':'x'}]}}]*2})).status_code==409
    c.post('/evaluation/research/'+identity+'/start');view=done(c,identity)
    assert view['status']=='completed' and view['quality_status']=='not_reviewed' and view['quality_delta'] is None
    assert all(x['requests_started']==0 for x in view['candidates'])
    assert view['candidates'][0]['document']==view['candidates'][1]['document']
    assert c.post('/evaluation/research/'+identity+'/start').json()==view
    first=rating(view);response=c.post('/evaluation/research/'+identity+'/reviews',json=first)
    assert response.status_code==200 and response.json()['quality_delta'] is None
    assert c.post('/evaluation/research/'+identity+'/reviews',json=first).json()==response.json()
    second=rating(view,1,2);response=c.post('/evaluation/research/'+identity+'/reviews',json=second)
    result=response.json();assert result['quality_status']=='quality_failed' and result['quality_delta']==pytest.approx(-.2)
    assert len(result['candidates'][0]['reviews'])==1
    first['request_id']=str(uuid4())
    assert c.post('/evaluation/research/'+identity+'/reviews',json=first).status_code==409
    reopened=ResearchEvaluationService(app.state.research_evaluation.database,app.state.research.store,app.state.settings)
    assert reopened.get(identity).model_dump(mode='json')==result
    reopened.close()

def test_partial_or_fabricated_rubric_rejected(api):
    c,_,run=api;view,_=create(c,run);c.post('/evaluation/research/'+view['id']+'/start');view=done(c,view['id'])
    body=rating(view);body['ratings'].pop('fact_accuracy')
    assert c.post('/evaluation/research/'+view['id']+'/reviews',json=body).status_code==422
    body=rating(view);body['ratings']['fact_accuracy']['evidence_ids']=['invented']
    assert c.post('/evaluation/research/'+view['id']+'/reviews',json=body).status_code==409
    assert c.get('/evaluation/research/'+view['id']).json()['quality_delta'] is None

def test_cancel_and_restart_never_execute_or_score(api):
    c,app,run=api;view,_=create(c,run);identity=view['id']
    cancelled=c.post('/evaluation/research/'+identity+'/cancel').json()
    assert cancelled['status']=='cancelled' and cancelled['quality_status']=='invalid'
    assert c.post('/evaluation/research/'+identity+'/start').json()==cancelled
    view,_=create(c,run);identity=view['id'];db=app.state.research_evaluation.database
    with db.write() as session:
        row=session.get(ResearchComparisonRecord,identity);row.status='running'
        data=deepcopy(row.payload);data['status']='running';data['candidates'][0]['status']='running';row.payload=data
    reopened=ResearchEvaluationService(db,app.state.research.store,app.state.settings)
    recovered=reopened.get(identity)
    assert recovered.status=='run_error' and recovered.candidates[0].code=='APPLICATION_RESTARTED'
    assert recovered.quality_delta is None and not reopened.work
    reopened.close()

def test_real_consent_configuration_freeze_and_protocol_call_count(api):
    c,app,run=api
    assert c.post('/evaluation/research',json=dict(request_id=str(uuid4()),run_id=run,mode='real',models=['a','b'])).status_code==422
    c.put('/settings/connections/model',json={'endpoint':'https://fixture.example/v1','model':'primary'})
    c.put('/settings/connections/model/credential',json={'secret':'synthetic-credential'})
    bundle=packet(app.state.research.store,run);output=FixedReportSynthesizer().synthesize(bundle,None,None);calls=[]
    def handler(request):
        body=json.loads(request.content);calls.append(body['model'])
        wire=json.loads(body['messages'][1]['content'])['data'];wire['evidence']=[SimpleNamespace(**f) for f in wire['evidence']]
        answer=FixedReportSynthesizer().synthesize(wire,None,None)
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'role':'assistant','content':json.dumps(answer,ensure_ascii=False)}}]})
    app.state.research_evaluation.transport=httpx.MockTransport(handler)
    response=c.post('/evaluation/research',json=dict(request_id=str(uuid4()),run_id=run,mode='real',models=['a','b'],consent=True))
    assert response.status_code==200;view=response.json();assert not calls
    identity=view['id'];c.post('/evaluation/research/'+identity+'/start');view=done(c,identity)
    assert view['status']=='completed' and calls==['a','b'] and sum(x['requests_started'] for x in view['candidates'])==2
    assert view['quality_delta'] is None
    for _ in range(3):c.get('/evaluation/research/'+identity);c.post('/evaluation/research/'+identity+'/start')
    assert calls==['a','b']
    assert app.state.settings.model_configuration().model=='primary'
    view,_=create(c,run)
    assert c.get('/evaluation/research/rubric').json()['version']==view['rubric_version']

def test_validation_failure_localizes_stage_and_blocks_quality(api):
    c,app,run=api
    class Bad:
        def synthesize(self,*args):return {'stance':'invented'}
    app.state.research_evaluation.synthesizer_factory=lambda *_:Bad()
    view,_=create(c,run);c.post('/evaluation/research/'+view['id']+'/start');view=done(c,view['id'])
    assert view['status']=='run_error' and view['quality_status']=='invalid' and view['quality_delta'] is None
    assert all(r['failure_stage']=='report-validation' and r['code']=='REPORT_SCHEMA_INVALID' for r in view['candidates'])

def test_forecast_requires_price_and_valid_time_and_diff(api):
    c,app,run=api;bundle=packet(app.state.research.store,run)
    output=FixedReportSynthesizer().synthesize(bundle,None,None)
    price=next(f for f in bundle['evidence'] if f.capability=='market.quote' and f.pointer=='/last_price')
    output['forecast']=dict(probability=.65,horizon='1m',event='stance-match-v1',basis='相关证据支持条件式判断。',evidence_ids=[price.id])
    synthesis=validate(output,bundle['evidence'])
    with pytest.raises(ResearchError,match='FORECAST_TIME_UNUSABLE'):validate_forecast_time(synthesis,bundle,'2020-01-01T00:00:00Z')
    with pytest.raises(ResearchError,match='FORECAST_TIME_UNUSABLE'):validate_forecast_time(synthesis,bundle,'2030-01-01T00:00:00Z')
    invalid=deepcopy(output);invalid['forecast']['evidence_ids']=['invented']
    with pytest.raises(ResearchError,match='EVIDENCE_INVALID'):validate(invalid,bundle['evidence'])
    for value in (-.01,1.01,True,float('nan')):
        with pytest.raises(Exception):ReportForecast.model_validate(dict(output['forecast'],probability=value))
    from research_trail.report_contracts import ReportJob
    a=ReportJob.model_validate(finished(c,report(c,run)));b=a.model_copy(deep=True)
    b.id=str(uuid4());b.document.synthesis.forecast=synthesis.forecast
    changes=diff(a,b).changes
    assert any(x.kind=='confidence' and x.before is None and '.65' in x.after for x in changes)
    assert '预测概率（未经校准）' in markdown(b).content

def test_probability_calibration_uses_only_valid_samples():
    def pair(index,p,status='evaluated'):
        return (SimpleNamespace(confidence=p,probability_event='stance-match-v1'),
                SimpleNamespace(id=str(index),status=status,direction_correct=True,return_percent='10'))
    parameters=WeightParameters()
    result=aggregate([pair(i,Decimal('.8')) for i in range(29)]+[pair(30,None)]+[pair(31,Decimal('.9'),'pending')],parameters)
    assert result['probability_samples']==29 and result['brier_score'] is None and result['calibration_bins']==[]
    result=aggregate([pair(i,Decimal('.8')) for i in range(30)],parameters)
    assert Decimal(result['brier_score'])==Decimal('.04') and not result['probability_insufficient']
    assert result['calibration_bins'][4]['observed_frequency']=='1'
    assert result['calibration_bins'][0]['mean_probability'] is None

def test_api_authentication_and_new_migration_preserve_old_data(api):
    c,app,run=api
    assert c.get('/evaluation/research',headers={'X-ResearchTrail-Token':'invalid'}).status_code==401
    db=app.state.research_evaluation.database;db.migrate();db.migrate()
    assert app.state.research.store.get(run).id==run

def test_ordinary_compounds_do_not_disable_numeric_claim_guard(api):
    _,app,run=api;bundle=packet(app.state.research.store,run)
    output=FixedReportSynthesizer().synthesize(bundle,None,None)
    output['bull_case'][0]['text']='年度涨幅积累一定动量，相关事实提供一定支撑，成交量较前一交易日缩减。'
    validated=validate(output,bundle['evidence'])
    assert '一定' not in validated.bull_case[0].text
    for text in ('股价一定上涨。','预计涨幅两成。','盈利增长20%。'):
        output['bull_case'][0]['text']=text
        with pytest.raises(ResearchError,match='UNSUPPORTED_NUMERIC_CLAIM'):validate(output,bundle['evidence'])

def test_response_truncation_preserves_diagnostics_without_quality_score(api):
    c,app,run=api
    c.put('/settings/connections/model',json={'endpoint':'https://fixture.example/v1','model':'primary'})
    c.put('/settings/connections/model/credential',json={'secret':'synthetic-credential'})
    app.state.research_evaluation.transport=httpx.MockTransport(lambda request:httpx.Response(200,json={
        'choices':[{'finish_reason':'length','message':{'role':'assistant','content':None,'reasoning_content':'PRIVATE'}}]}))
    view=c.post('/evaluation/research',json=dict(request_id=str(uuid4()),run_id=run,mode='real',models=['a','b'],consent=True,reasoning_effort='low')).json()
    c.post('/evaluation/research/'+view['id']+'/start');view=done(c,view['id'])
    assert view['quality_delta'] is None and view['quality_status']=='invalid'
    assert all(x['failure_stage']=='model-response' and x['requests_started']==1 for x in view['candidates'])
    assert all(x['response_diagnostics']=={'finish_reason':'length','content_present':False} for x in view['candidates'])
    assert 'PRIVATE' not in json.dumps(view)

def test_cancel_retains_in_flight_request_count_and_never_replays(api):
    c,app,run=api;entered=threading.Event();release=threading.Event();calls=[]
    c.put('/settings/connections/model',json={'endpoint':'https://fixture.example/v1','model':'primary'})
    c.put('/settings/connections/model/credential',json={'secret':'synthetic-credential'})
    def handler(request):
        calls.append(json.loads(request.content)['model']);entered.set();release.wait(3)
        return httpx.Response(200,json={'choices':[{'finish_reason':'stop','message':{'role':'assistant','content':'{}'}}]})
    app.state.research_evaluation.transport=httpx.MockTransport(handler)
    view=c.post('/evaluation/research',json=dict(request_id=str(uuid4()),run_id=run,mode='real',models=['a','b'],consent=True)).json()
    try:
        c.post('/evaluation/research/'+view['id']+'/start');assert entered.wait(2)
        cancelled=c.post('/evaluation/research/'+view['id']+'/cancel').json()
        assert cancelled['candidates'][0]['requests_started']==1 and cancelled['candidates'][0]['request_uncertain']
        assert cancelled['candidates'][1]['requests_started']==0
        assert c.post('/evaluation/research/'+view['id']+'/start').json()==cancelled
    finally:release.set()
    assert calls==['a']

def test_live_aliases_restore_exact_ids_and_reject_invented_alias(api):
    from research_trail.report_synthesis import LiveReportSynthesizer
    _,app,run=api;bundle=packet(app.state.research.store,run)
    class Model:
        invalid=False
        def complete(self,messages,*args,**kwargs):
            wire=json.loads(messages[1]['content'])['data']
            assert wire['evidence'][0]['id']=='f001' and all(f['id'].startswith('f') for f in wire['evidence'])
            wire['evidence']=[SimpleNamespace(**f) for f in wire['evidence']]
            output=FixedReportSynthesizer().synthesize(wire,None,None)
            if self.invalid:output['risks'][0]['evidence_ids']=['f9999']
            return {'content':json.dumps(output),'tool_calls':[]}
    model=Model();live=LiveReportSynthesizer(model)
    output=validate(live.synthesize(bundle,None,None),bundle['evidence'])
    assert output.summary[0].evidence_ids==[bundle['evidence'][0].id]
    model.invalid=True
    with pytest.raises(ResearchError,match='EVIDENCE_INVALID'):live.synthesize(bundle,None,None)
