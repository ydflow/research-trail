"""Step16: fixed-first report acceptance and isolated live protocol simulation."""
from contextlib import contextmanager
from copy import deepcopy
import json
import threading
import time
from types import SimpleNamespace
import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from research_trail.app import create_app
from research_trail.provider_service import authored_data
from research_trail.provider_errors import ProviderFault
from research_trail.report_synthesis import FixedReportSynthesizer, validate
from research_trail.report_facts import resolve_pointer, result_hash
from research_trail.report_contracts import ReportGenerate
from research_trail.research_store import ResearchError
from test_settings import TOKEN, HEADERS, Vault
from test_research import start, settled

SECRET='test-only-report-key-never-persist'

@pytest.fixture
def api(tmp_path):
    @contextmanager
    def make(executor=authored_data, fixed_factory=FixedReportSynthesizer, timeout=120, transport=None, path=None):
        app=create_app(TOKEN,database_path=path or tmp_path/'reports.sqlite3',credential_vault=Vault(),
            provider_options={'simulated_executor':executor},openai_transport=transport,
            report_options={'fixed_factory':fixed_factory,'timeout_seconds':timeout})
        with TestClient(app,headers=HEADERS) as c: yield c,app
    return make

def report(c,run_id,mode='fixed'):
    response=c.post(f'/research/runs/{run_id}/reports',json={'mode':mode})
    assert response.status_code==200,response.text
    return response.json()['id']

def finished(c,identity):
    deadline=time.monotonic()+4
    while time.monotonic()<deadline:
        job=c.get('/research/reports/'+identity).json()
        if job['status']!='generating': return job
        time.sleep(0.01)
    raise AssertionError('Report did not settle')

def collected(c,**values):
    identity=start(c,**values)
    settled(c,identity)
    return identity

def configure(c):
    assert c.put('/settings/connections/model',json={'endpoint':'https://model.invalid/v1','model':'offline-report'}).status_code==200
    assert c.put('/settings/connections/model/credential',json={'secret':SECRET}).status_code==200

def test_fixed_traceable_original_values_and_readable_export(api):
    calls=[]
    def executor(q): calls.append(q.capability); return authored_data(q)
    with api(executor) as (c,app):
        identity=collected(c,strategy='value')
        job=finished(c,report(c,identity)); doc=job['document']
        assert job['status']=='completed' and job['requests_started']==0
        assert doc['source_run_id']==identity and doc['source_mode']=='simulated'
        assert len(calls)==4
        for fact in doc['evidence']:
            original=c.get(f"/research/reports/{job['id']}/evidence/{fact['id']}")
            assert original.status_code==200,original.text
            raw=original.json()
            assert raw['evidence']==fact and raw['step_started_at'] and raw['step_completed_at']
            assert resolve_pointer(raw['result']['data'],fact['pointer'])==fact['value']
            assert result_hash(raw['result'])==fact['result_hash']
        gaps=doc['gaps']
        assert {'scope':'field','key':'company.profile/bps','code':'FIELD_MISSING'} in gaps
        assert any(g['code']=='NOT_PLANNED' for g in gaps)
        assert any(g['code']=='SKILL_NOT_IMPORTED' for g in gaps)
        output=c.get(f"/research/reports/{job['id']}/markdown").json()
        assert output['filename']==f"research-report-{job['id']}.md"
        assert all(t in output['content'] for t in ['## 摘要','## 风险','## 催化因素','## 多头论点','## 空头论点','## 数据缺口','SHA256','【事实】','【分析】','【预测】','不等于论断正确'])
        assert '/bps = ' not in output['content'] and 'pe\\_ttm\\_ratio = 20' in output['content']
        assert len(calls)==4  # report/evidence/export never recollect
        assert c.get(f"/research/reports/{job['id']}/evidence/ev-foreign").json()['detail']=='EVIDENCE_INVALID'
        assert c.get('/research/reports/../../secret').status_code!=200

def test_versions_survive_restart_and_actual_diff_uses_changed_collected_values(api):
    pe=20
    def executor(q):
        data=authored_data(q)
        if q.capability=='company.valuation': data['pe_ttm_ratio']=pe
        return data
    with api(executor) as (c,app):
        identity=collected(c,strategy='value'); first=finished(c,report(c,identity)); second=finished(c,report(c,identity))
        assert (first['version'],second['version'])==(1,2)
        assert c.post('/research/report-diff',json={'before_id':first['id'],'after_id':second['id']}).json()['changes']==[]
        pe=25
        newer=collected(c,strategy='value'); third=finished(c,report(c,newer))
        difference=c.post('/research/report-diff',json={'before_id':first['id'],'after_id':third['id']}).json()
        assert len(difference['changes'])==1
        change=difference['changes'][0]
        assert (change['key'],change['before'],change['after'])==('company.valuation/pe_ttm_ratio','20','25')
        for rid,key in [(first['id'],'before_evidence'),(third['id'],'after_evidence')]:
            assert c.get(f"/research/reports/{rid}/evidence/{change[key]}").status_code==200
        assert c.get('/research/reports/'+first['id']).json()==first
        assert c.post('/research/report-diff',json={'before_id':first['id'],'after_id':first['id']}).json()['detail']=='DIFF_REQUIRES_TWO_REPORTS'
        other=finished(c,report(c,collected(c,symbol='MSFT.US')))
        assert c.post('/research/report-diff',json={'before_id':first['id'],'after_id':other['id']}).json()['detail']=='DIFF_INCOMPATIBLE_SOURCES'
        with app.state.store.database.engine.connect() as db:
            assert db.scalar(text('SELECT count(*) FROM research_reports'))==4
            assert db.scalar(text('SELECT count(*) FROM runs'))==0
    with api(executor) as (c,app):
        assert c.get('/research/reports/'+first['id']).json()==first
        assert len(c.get('/research/reports',params={'run_id':identity}).json())==2

def test_partial_failed_and_empty_collection_gates(api):
    def executor(q):
        if q.capability=='company.financials': raise ProviderFault('NETWORK_ERROR')
        return authored_data(q)
    with api(executor) as (c,_):
        job=finished(c,report(c,collected(c,strategy='value')))
        assert job['document']['collection_status']=='partial'
        assert {'scope':'capability','key':'company.financials','code':'NETWORK_ERROR'} in job['document']['gaps']
        assert not any(f['capability']=='company.financials' for f in job['document']['evidence'])
        failed=collected(c,mode='real')
        assert c.post(f'/research/runs/{failed}/reports',json={}).json()['detail']=='NO_COLLECTED_DATA'
    with api(lambda _: {}) as (c,_):
        identity=collected(c,strategy='value')
        assert c.post(f'/research/runs/{identity}/reports',json={}).json()['detail']=='NO_USABLE_FACT'

@pytest.mark.parametrize('value',['P/E 999','目标价三百','earnings thirteen','收益50%','利润翻番','预计双位数','现金两元','隐形\u200b文本'])
def test_model_prose_cannot_invent_numbers_or_hidden_content(api,value):
    class Invalid(FixedReportSynthesizer):
        def synthesize(self,*args):
            out=super().synthesize(*args); out['summary'][1]['text']=value; return out
    with api(fixed_factory=Invalid) as (c,_):
        job=finished(c,report(c,collected(c,strategy='value')))
        assert job['status']=='failed' and job['document'] is None
        assert job['code'] in ('UNSUPPORTED_NUMERIC_CLAIM','REPORT_CONTENT_INVALID')
        assert c.get(f"/research/reports/{job['id']}/markdown").json()['detail']=='REPORT_NOT_READY'

@pytest.mark.parametrize('mutation,code',[
    (lambda out: out['summary'][0].update(text='模型声称是真实行情'), 'FACT_PROSE_FORBIDDEN'),
    (lambda out: out['summary'][0].update(evidence_ids=['ev-not-collected']), 'EVIDENCE_INVALID'),
    (lambda out: out.update(confidence=1), 'REPORT_SCHEMA_INVALID'),
    (lambda out: out['catalysts'][0].update(kind='analysis'), 'REPORT_CLAIM_KIND_INVALID'),
    (lambda out: out.update(risks=[]), 'REPORT_SCHEMA_INVALID')])
def test_claim_contract_rejects_fabricated_facts_unknown_refs_and_extra_fields(api,mutation,code):
    class Invalid(FixedReportSynthesizer):
        def synthesize(self,*args):
            out=super().synthesize(*args); mutation(out); return out
    with api(fixed_factory=Invalid) as (c,_):
        job=finished(c,report(c,collected(c,strategy='value')))
        assert job['status']=='failed' and job['code']==code

def test_nonnumeric_ordinary_compounds_normalize_but_real_quantities_still_fail():
    evidence=[SimpleNamespace(id='ev-actual',capability='company.profile')]
    bundle={'evidence':evidence}
    out=FixedReportSynthesizer().synthesize(bundle,None,0)
    out['summary'][1]['text']='进一步核对口径是否一致，不能只关注单一来源。'
    saved=validate(out,evidence)
    assert saved.summary[1].text=='继续核对口径是否吻合，不能只关注单独来源。'
    out['summary'][1]['text']='进一步预计市价一百。'
    with pytest.raises(ResearchError,match='UNSUPPORTED_NUMERIC_CLAIM'): validate(out,evidence)

def test_tampered_raw_result_is_not_misrepresented_as_original(api):
    with api() as (c,app):
        job=finished(c,report(c,collected(c,strategy='value'))); fact=job['document']['evidence'][0]
        with app.state.store.database.write() as db:
            db.execute(text('UPDATE research_steps SET result=:value WHERE run_id=:id AND capability=:cap'),
                {'value':json.dumps({'ok':True,'provider':'longbridge','capability':fact['capability'],'data':{'name':'altered'},'provenance':c.get(f"/research/runs/{fact['run_id']}/data/{fact['capability']}").json()['result']['provenance']}),'id':fact['run_id'],'cap':fact['capability']})
        assert c.get(f"/research/reports/{job['id']}/evidence/{fact['id']}").json()['detail']=='EVIDENCE_CHANGED'

def test_projection_bounds_nulls_and_markdown_source_escape(api):
    def executor(q):
        if q.capability=='company.profile': return {'a/b~c':'[bad](https://example.com) <script>','missing':None,'many':list(range(50))}
        return authored_data(q)
    with api(executor) as (c,_):
        job=finished(c,report(c,collected(c,strategy='value')))
        facts=[f for f in job['document']['evidence'] if f['capability']=='company.profile']
        assert len(facts)==24 and facts[0]['pointer']=='/a~1b~0c'
        assert any(g['code']=='FACT_PROJECTION_LIMIT' for g in job['document']['gaps'])
        assert c.get(f"/research/reports/{job['id']}/evidence/{facts[0]['id']}").status_code==200
        md=c.get(f"/research/reports/{job['id']}/markdown").json()['content']
        assert '<script>' not in md and '[bad](https://example.com)' not in md and '&lt;script&gt;' in md

@pytest.mark.parametrize('action',['cancel','timeout','close'])
def test_late_noncooperative_generation_cannot_overwrite_terminal_or_old_report(api,action):
    entered=threading.Event(); gate=threading.Event()
    class Delayed(FixedReportSynthesizer):
        def synthesize(self,*args):
            entered.set(); gate.wait(3); return super().synthesize(*args)
    with api(timeout=0.08 if action=='timeout' else 120) as (c,app):
        identity=collected(c,strategy='value'); old=finished(c,report(c,identity))
        app.state.reports.fixed_factory=Delayed
        current=report(c,identity); assert entered.wait(1)
        assert c.post(f'/research/runs/{identity}/reports',json={}).json()['detail']=='REPORT_ACTIVE'
        if action=='cancel': c.post(f'/research/reports/{current}/cancel')
        if action=='close': app.state.reports.close()
        terminal=finished(c,current)
        assert terminal['status']=={'cancel':'cancelled','timeout':'failed','close':'interrupted'}[action]
        if action!='close': assert c.post(f'/research/runs/{identity}/reports',json={}).json()['detail']=='REPORT_DRAINING'
        gate.set()
        app.state.reports.work.thread.join(1)
        assert c.get('/research/reports/'+current).json()==terminal
        assert c.get('/research/reports/'+old['id']).json()==old

def test_restart_marks_generating_job_interrupted(api):
    with api() as (c,app):
        identity=collected(c,strategy='value')
        from research_trail.report_facts import packet
        job=app.state.reports.store.begin(packet(app.state.research.store,identity),'fixed')
    with api() as (c,_):
        restored=c.get('/research/reports/'+job).json()
        assert restored['status']=='interrupted' and restored['code']=='BACKEND_INTERRUPTED' and restored['document'] is None

@pytest.mark.parametrize('case',['valid','numbers','invalid-json','duplicate','tool','http-error','secret-echo'])
def test_live_protocol_isolated_single_request_no_fallback_no_market_adapter(api,case):
    requests=[]
    def handler(request):
        payload=json.loads(request.content); requests.append(payload)
        bundle=json.loads(payload['messages'][1]['content'])['data']
        bundle['evidence']=[SimpleNamespace(**f) for f in bundle['evidence']]
        out=FixedReportSynthesizer().synthesize(bundle,None,0)
        if case=='numbers': out['risks'][0]['text']='预计目标价999'
        if case=='secret-echo': out['risks'][0]['text']=SECRET
        content=json.dumps(out,ensure_ascii=False)
        if case=='invalid-json': content='```json\n'+content+'\n```'
        if case=='duplicate': content=content[:-1]+',"stance":"neutral"}'
        if case=='http-error': return httpx.Response(503,text=SECRET)
        msg={'role':'assistant','content':content}
        if case=='tool': msg['tool_calls']=[{'id':'call_1','type':'function','function':{'name':'market_quote','arguments':'{}'}}]
        return httpx.Response(200,json={'choices':[{'finish_reason':'tool_calls' if case=='tool' else 'stop','message':msg}]})
    with api(transport=httpx.MockTransport(handler)) as (c,app):
        configure(c); identity=collected(c,strategy='value')
        fixed=finished(c,report(c,identity))
        job=finished(c,report(c,identity,'real'))
        assert job['requests_started']==len(requests)==1
        assert requests[0]['max_tokens']==8192 and 'tools' not in requests[0]
        assert requests[0]['response_format']=={'type':'json_object'}
        assert job['mode']=='real' and SECRET not in json.dumps(job,ensure_ascii=False)
        assert job['status']==('completed' if case in ('valid','secret-echo') else 'failed')
        assert c.get('/research/reports/'+fixed['id']).json()==fixed
        assert c.get('/research/runs/'+identity).json()['status']=='collected'
        with app.state.store.database.engine.connect() as db:
            assert SECRET not in str(db.exec_driver_sql('select document,code from research_reports').all())

def test_real_configuration_failure_does_not_silently_generate_fixed_report(api):
    with api() as (c,_):
        identity=collected(c,strategy='value')
        response=c.post(f'/research/runs/{identity}/reports',json={'mode':'real'})
        assert response.status_code==409 and response.json()['detail']=='MODEL_UNCONFIGURED'
        assert c.get('/research/reports').json()==[]

@pytest.mark.parametrize('action',['cancel','timeout'])
def test_real_transport_cancel_timeout_keep_failure_without_fallback(api,action):
    import asyncio
    entered=threading.Event(); stopped=threading.Event()
    async def handler(_request):
        entered.set()
        try: await asyncio.sleep(5)
        finally: stopped.set()
        raise AssertionError('Should be cancelled')
    with api(timeout=0.15 if action=='timeout' else 120,transport=httpx.MockTransport(handler)) as (c,app):
        configure(c); identity=collected(c,strategy='value')
        current=report(c,identity,'real'); assert entered.wait(1)
        if action=='cancel': c.post(f'/research/reports/{current}/cancel')
        job=finished(c,current)
        assert job['status']==('cancelled' if action=='cancel' else 'failed')
        assert job['requests_started']==1 and job['document'] is None
        assert stopped.wait(1)
        app.state.reports.work.thread.join(1)
        assert c.get('/research/reports/'+current).json()==job
        assert len(c.get('/research/reports').json())==1
