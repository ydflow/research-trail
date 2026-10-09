"""Step18: append-only decisions, actual collected comparisons, honest missing data."""
from copy import deepcopy
from uuid import uuid4
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import text
import pytest
from test_reports import api, collected, report, finished
from research_trail.provider_service import authored_data
from research_trail.provider_errors import ProviderFault

def uid(): return str(uuid4())

def source(c, **values):
    return finished(c, report(c, collected(c, **values)))

def thesis(c, job):
    r = c.post('/theses', json=dict(report_id=job['id'], request_id=uid()))
    assert r.status_code == 200, r.text
    return r.json()

def evaluate(c, t, job=None, **extra):
    body = dict(request_id=uid(), expected_version=t['current_version'], report_id=job['id'] if job else None, **extra)
    r = c.post(f"/theses/{t['id']}/evaluate", json=body)
    assert r.status_code == 200, r.text
    return r.json()

def test_conversion_keeps_report_actual_evidence_and_no_extra_calls(api):
    calls=[]
    def executor(q): calls.append(q.capability); return authored_data(q)
    with api(executor) as (c,app):
        job=source(c,strategy='value'); t=thesis(c,job)
        assert t['current_version']==1 and len(t['versions'])==1 and not t['reviews']
        assert t['current']['data_report']==job and t['current']['origin']=='report'
        assert t['current']['content']['stance']==job['document']['synthesis']['stance']
        assert len(calls)==4 and c.get('/theses').json()[0]['id']==t['id']
        assert thesis(c,job)['id']==t['id']
        for f in t['current']['data_report']['document']['evidence']:
            assert c.get(f"/research/reports/{job['id']}/evidence/{f['id']}").status_code==200
        assert c.get('/research/reports/'+job['id']).json()==job

def test_edit_versions_idempotency_conflicts_and_restart(api):
    with api() as (c,app):
        job=source(c,strategy='value'); t=thesis(c,job); path=app.state.theses.database.path
        original=deepcopy(t['current']); content=deepcopy(original['content']); content['summary']='用户更新判断'
        body=dict(request_id=uid(),expected_version=1,content=content,reason='补充风险解释，未取得新数据')
        endpoint=f"/theses/{t['id']}/edit"
        updated=c.post(endpoint,json=body); assert updated.status_code==200,updated.text
        updated=updated.json(); assert updated['current_version']==2 and len(updated['versions'])==2
        assert updated['current']['reason']==body['reason'] and updated['current']['data_report']==job
        assert c.get(f"/theses/{t['id']}/versions/1").json()==original
        assert c.post(endpoint,json=body).json()['current_version']==2
        assert c.post(endpoint,json={**body,'reason':'更换同请求内容'}).json()['detail']=='THESIS_REQUEST_CONFLICT'
        assert c.post(endpoint,json={**body,'request_id':uid()}).json()['detail']=='THESIS_VERSION_CONFLICT'
        assert c.post(endpoint,json={**body,'expected_version':2,'request_id':uid(),'reason':'  '}).status_code==422
    with api(path=path) as (c,app):
        assert c.get('/theses/'+t['id']).json()==updated
        assert c.get(f"/theses/{t['id']}/versions/1").json()==original

def test_new_data_review_saves_reason_snapshots_and_immutable_old_versions(api):
    pe=20; calls=[]
    def executor(q):
        calls.append(q.capability); value=authored_data(q)
        if q.capability=='company.valuation': value['pe_ttm_ratio']=pe
        return value
    with api(executor) as (c,app):
        before=source(c,strategy='value'); t=thesis(c,before); old=deepcopy(t['current'])
        pe=25; after=source(c,strategy='value'); e=evaluate(c,t,after)
        assert e['status']=='ready' and e['comparison']=='changed' and e['judgment'] is None
        delta=next(x for x in e['difference']['changes'] if x['key']=='company.valuation/pe_ttm_ratio')
        assert (delta['before'],delta['after'])==('20','25')
        assert e['baseline_report']==before and e['candidate_report']==after
        content=deepcopy(old['content']); content['stance']='neutral'; content['summary']='估值变化后待观察'
        body=dict(request_id=uid(),expected_version=1,evaluation_id=e['id'],judgment='weakened',reason='新的估值事实使我降低原偏多判断',content=content)
        endpoint=f"/theses/{t['id']}/judge"; r=c.post(endpoint,json=body); assert r.status_code==200,r.text
        view=r.json(); assert view['current_version']==2 and view['current']['data_report']==after
        judged=next(x for x in view['reviews'] if x['kind']=='judgment')
        audit=c.get(f"/theses/{t['id']}/reviews/{judged['id']}").json()
        assert audit['evaluation_id']==e['id'] and audit['judgment']=='weakened' and audit['reason']==body['reason']
        assert audit['base_version']==1 and audit['new_version']==2 and audit['candidate_report']==after
        assert c.get(f"/theses/{t['id']}/versions/1").json()==old
        assert c.get(f"/theses/{t['id']}/reviews/{e['id']}").json()==e
        assert c.post(endpoint,json=body).json()==view and len(calls)==8
        for job,ref in ((before,delta['before_evidence']),(after,delta['after_evidence'])):
            assert c.get(f"/research/reports/{job['id']}/evidence/{ref}").status_code==200

@pytest.mark.parametrize('case,code', [('none','NEW_DATA_REQUIRED'),('same','FRESH_COLLECTION_REQUIRED'),('older','FRESH_COLLECTION_REQUIRED'),('mode','THESIS_SOURCE_INCOMPATIBLE'),('symbol','THESIS_SOURCE_INCOMPATIBLE')])
def test_missing_or_incompatible_new_data_never_fabricates_changed_conclusion(api,case,code):
    with api() as (c,app):
        earlier=source(c,strategy='value'); before=source(c,strategy='value'); t=thesis(c,before)
        candidate=None if case=='none' else earlier if case=='older' else before
        if case=='symbol': candidate=source(c,symbol='NVDA.US',strategy='value')
        if case=='mode':
            candidate=source(c,strategy='value')
            with app.state.theses.database.write() as db:
                from research_trail.models import ReportRecord
                row=db.get(ReportRecord,candidate['id']); data=deepcopy(row.document); data['source_mode']='real'; row.document=data
            candidate=c.get('/research/reports/'+candidate['id']).json()
        e=evaluate(c,t,candidate)
        assert e['status']=='unable' and e['code']==code and e['comparison'] is None and e['judgment'] is None
        assert '无法完成评估' in e['reason'] and c.get('/theses/'+t['id']).json()['current_version']==1
        assert c.post(f"/theses/{t['id']}/judge",json=dict(request_id=uid(),expected_version=1,evaluation_id=e['id'],judgment='unchanged',reason='测试',content=t['current']['content'])).json()['detail']=='THESIS_EVALUATION_UNAVAILABLE'

def test_partial_missing_fact_retains_saved_gap_not_unchanged(api):
    missing=False
    def executor(q):
        value=authored_data(q)
        if missing and q.capability=='company.valuation': value['pe_ttm_ratio']=None
        return value
    with api(executor) as (c,app):
        t=thesis(c,source(c,strategy='value')); missing=True
        e=evaluate(c,t,source(c,strategy='value'))
        assert e['status']=='unable' and e['code']=='MISSING_NEW_FACTS'
        assert 'company.valuation/pe_ttm_ratio' in e['missing_keys'] and e['comparison'] is None
        assert e['candidate_report']['document']['gaps'] and e['difference']['changes']

def test_fresh_equal_values_only_marks_comparable_data_unchanged(api):
    with api() as (c,app):
        t=thesis(c,source(c,strategy='value')); e=evaluate(c,t,source(c,strategy='value'))
        assert e['status']=='ready' and e['comparison']=='unchanged' and e['judgment'] is None
        assert '不等于投资论点已被证明' in e['reason'] and c.get('/theses/'+t['id']).json()['current_version']==1

def test_evidence_loss_blocks_conversion_and_review_commit(api):
    with api() as (c,app):
        t=thesis(c,source(c,strategy='value')); new=source(c,strategy='value'); e=evaluate(c,t,new)
        with app.state.theses.database.write() as db:
            db.execute(text("DELETE FROM research_steps WHERE run_id=:id AND capability='company.valuation'"),{'id':new['run_id']})
        assert c.post('/theses',json=dict(report_id=new['id'],request_id=uid())).status_code==409
        unable=evaluate(c,t,new); assert unable['status']=='unable' and unable['comparison'] is None
        r=c.post(f"/theses/{t['id']}/judge",json=dict(request_id=uid(),expected_version=1,evaluation_id=e['id'],judgment='unchanged',reason='测试',content=t['current']['content']))
        assert r.status_code==409 and c.get('/theses/'+t['id']).json()['current_version']==1

def test_concurrent_edit_single_version_and_auth_contract(api):
    with api() as (c,app):
        t=thesis(c,source(c,strategy='value')); endpoint=f"/theses/{t['id']}/edit"
        body=dict(request_id=uid(),expected_version=1,reason='一致请求',content=t['current']['content'])
        with ThreadPoolExecutor(max_workers=2) as pool:
            replies=list(pool.map(lambda _: c.post(endpoint,json=body),range(2)))
        assert all(x.status_code==200 for x in replies) and c.get('/theses/'+t['id']).json()['current_version']==2
        assert c.get('/theses',headers={'X-ResearchTrail-Token':'invalid'}).status_code==401
        assert c.get('/theses/not-a-uuid').status_code==404
        assert c.get(f"/theses/{t['id']}/versions/0").status_code==422
        assert c.post(endpoint,json={**body,'extra':'not permitted'}).status_code==422

def test_noncompleted_report_cannot_convert_and_review_evaluations_persist(api):
    with api() as (c,app):
        job=source(c,strategy='value'); t=thesis(c,job); path=app.state.theses.database.path
        from research_trail.report_facts import packet
        pending=app.state.reports.store.begin(packet(app.state.research.store,job['run_id']),'fixed')
        assert c.post('/theses',json=dict(report_id=pending,request_id=uid())).json()['detail']=='REPORT_NOT_READY'
        app.state.reports.store.finish(pending,'failed','TEST_FAILED')
        assert c.post('/theses',json=dict(report_id=pending,request_id=uid())).json()['detail']=='REPORT_NOT_READY'
        e=evaluate(c,t)
    with api(path=path) as (c,app): assert c.get(f"/theses/{t['id']}/reviews/{e['id']}").json()==e

def test_old_database_upgrade_preserves_reports_and_starts_without_auto_thesis(api):
    from pathlib import Path
    from alembic import command
    from alembic.config import Config
    with api() as (c,app):
        job=source(c,strategy='value'); path=app.state.theses.database.path
    # Build a pre-Step18 snapshot only after its app has closed. Step23's
    # test-created opinion/policy records do not exist in that legacy schema.
    from research_trail.database import Database
    legacy=Database(path)
    try:
        with legacy.engine.begin() as db:
            for name in ('outcome_performance_snapshots','outcome_policy_state','outcome_policy_versions','outcome_attempts','outcome_opinions','evaluation_trace_deliveries','evaluation_trace_config','evaluation_feedback','evaluation_baselines','evaluation_experiments','monitoring_research_actions','monitoring_runs','monitoring_rules','calendar_snapshots','screening_runs','thesis_reviews','thesis_versions','investment_theses'): db.execute(text('DROP TABLE '+name))
            db.execute(text('ALTER TABLE connections DROP COLUMN reasoning_effort'))
            db.execute(text("UPDATE alembic_version SET version_num='0012_checkpoints'"))
    finally:legacy.close()
    with api(path=path) as (c,app):
        assert c.get('/theses').json()==[] and c.get('/research/reports/'+job['id']).json()==job
        assert thesis(c,job)['current_version']==1
        with app.state.theses.database.engine.connect() as db:
            assert db.scalar(text('SELECT version_num FROM alembic_version'))=='0019_model_reasoning'
            assert not db.execute(text('PRAGMA foreign_key_check')).all()

@pytest.mark.parametrize('case',['cached','old-fetched'])
def test_stale_saved_facts_are_not_fresh_even_when_collection_is_new(api,case):
    with api() as (c,app):
        t=thesis(c,source(c,strategy='value'))
        stamps={f['capability']:f['fetched_at'] for f in t['current']['data_report']['document']['evidence']}
        query=app.state.providers.query
        def stale(*args,**kwargs):
            result=query(*args,**kwargs)
            if result.ok:
                if case=='cached': result.provenance.cached=True
                else:
                    from datetime import datetime
                    result.provenance.fetched_at=datetime.fromisoformat(stamps[result.capability])
            return result
        app.state.providers.query=stale
        e=evaluate(c,t,source(c,strategy='value'))
        assert e['status']=='unable' and e['code']=='STALE_NEW_DATA' and e['comparison'] is None

def test_evaluation_request_replay_and_edit_invalidates_old_review(api):
    with api() as (c,app):
        t=thesis(c,source(c,strategy='value')); new=source(c,strategy='value')
        body=dict(request_id=uid(),expected_version=1,report_id=new['id'])
        endpoint=f"/theses/{t['id']}/evaluate"; e=c.post(endpoint,json=body).json()
        assert e['status']=='ready' and c.post(endpoint,json=body).json()==e
        r=c.post(f"/theses/{t['id']}/edit",json=dict(request_id=uid(),expected_version=1,reason='手动修订',content=t['current']['content']))
        assert r.status_code==200
        r=c.post(f"/theses/{t['id']}/judge",json=dict(request_id=uid(),expected_version=2,evaluation_id=e['id'],reason='旧评估不能用于新版本',content=t['current']['content'],judgment='unchanged'))
        assert r.json()['detail']=='THESIS_VERSION_CONFLICT'
        assert c.get(f"/theses/{t['id']}/reviews/{e['id']}").json()==e
        assert c.get(f"/theses/{t['id']}/versions/9999999999999999999999999999999").status_code==404

def test_missing_report_attempt_keeps_requested_identity_and_cross_request_conflicts(api):
    with api() as (c,app):
        job=source(c,strategy='value'); key=uid()
        create=dict(report_id=job['id'],request_id=key); t=c.post('/theses',json=create).json()
        assert c.post(f"/theses/{t['id']}/edit",json=dict(request_id=key,expected_version=1,reason='跨操作重用请求',content=t['current']['content'])).json()['detail']=='THESIS_REQUEST_CONFLICT'
        absent=uid(); e=evaluate(c,t,{'id':absent})
        assert e['code']=='REPORT_NOT_FOUND' and e['requested_report_id']==absent and e['candidate_report'] is None
