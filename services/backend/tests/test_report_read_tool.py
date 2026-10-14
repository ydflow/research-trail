"""Opt-in report tools use persisted evidence, never provider/model network."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
import json
import threading
import time
from uuid import uuid4
import subprocess
import sys

import pytest
from pydantic import ValidationError
from research_trail.conversation import ReportContextRef, ReportReadArguments, ToolCall
from research_trail.lifecycle import Timing
from research_trail.models import ReportRecord, MessageRecord, ResearchRecord
from research_trail.report_read_tool import VerifiedReport, BoundReportRead, bound_runner
from research_trail.research_store import ResearchError
from research_trail.store import RunStopped
from research_trail.tools import ToolExecutionError
from research_trail.session_capacity import wire_json
from sqlalchemy import select
from test_reports import api, collected, finished, report


@pytest.fixture
def saved(api):
    with api() as (c, app):
        source = collected(c, strategy='value')
        job = finished(c, report(c, source))
        assert job['status'] == 'completed'
        sid = c.post('/sessions', json={'title':'报告研究'}).json()['id']
        yield c, app, sid, ReportContextRef(report_id=job['id'], source_run_id=source)


def send(c, sid, ref, **extra):
    return c.post(f'/sessions/{sid}/runs', json={'input':'读取关联报告', 'kind':'fake_agent',
        'research_context':ref.model_dump(), **extra})


def terminal(c, sid, rid):
    end = time.monotonic() + 5
    while time.monotonic() < end:
        value = c.get(f'/sessions/{sid}/runs/{rid}').json()
        if value['status'] != 'running': return value
        time.sleep(.01)
    pytest.fail('bound report run did not settle')


def scope(app, sid, ref):
    verified = VerifiedReport.prepare(app.state.reports, ref)
    record = app.state.store.begin_agent(sid, '报告读取', research_context=ref, binding_validate=verified.validate)
    return BoundReportRead(verified, app.state.store, sid, record.id), record


def test_real_tool_consumption_persistent_ids_and_readonly_history(saved):
    c, app, sid, ref = saved
    def forbid(*args): raise AssertionError('report read must never query provider')
    app.state.providers.query = forbid
    response = send(c, sid, ref)
    assert response.status_code == 201, response.text
    value = terminal(c, sid, response.json()['id'])
    assert value['status'] == 'completed' and ref.report_id in value['answer']
    snapshot = c.get(f'/sessions/{sid}/snapshot').json()
    events = snapshot['events']
    started = next(e for e in events if e['type']=='run_started')
    assert started['payload']['research_context'] == ref.model_dump()
    calls = [e for e in events if e['type']=='tool_started']
    assert len(calls)==1 and calls[0]['payload']['name']=='research.report.read'
    data = next(e for e in events if e['type']=='tool_result')['payload']['result']['data']
    assert data['report_id']==ref.report_id and data['source_run_id']==ref.source_run_id
    assert data['returned']==16 and data['total']==37 and data['omitted_facts']==21
    assert data['facts'][0]['id'] in value['answer'] and str(data['facts'][0]['value']) in value['answer']
    assert next(item['text'] for item in data['saved_summary'] if item['kind']=='analysis') in value['answer']
    assert len(wire_json(data).encode('utf-8')) < 24576
    for fact in data['facts']:
        original = c.get(f'/research/reports/{ref.report_id}/evidence/{fact["id"]}').json()
        assert original['evidence']==fact
    assert c.get(f'/sessions/{sid}/snapshot').json()==snapshot
    stream = c.get(f'/sessions/{sid}/runs/{value["id"]}/events').text
    assert 'research.report.read' in stream and 'research_context' in stream
    assert c.get(f'/sessions/{sid}/runs/{value["id"]}/event-log').json()['events']==events


@pytest.mark.parametrize('kind,scenario', [('fixture','normal'),('openai_agent','normal'),('fake_agent','delayed'),('fake_agent','timeout')])
def test_unsupported_start_is_rejected_before_run(saved, kind, scenario):
    c, app, sid, ref = saved
    response = send(c,sid,ref,kind=kind,scenario=scenario)
    assert response.status_code == 422 and response.json()['detail']=='REPORT_CONTEXT_UNSUPPORTED'
    assert app.state.store.snapshot(sid).runs == [] and app.state.manager.work == {}


@pytest.mark.parametrize('change', ['foreign_run','unknown_report','real_source','real_synthesizer','not_ready','crypto','value','pointer','ordinal','hash','missing','oversize'])
def test_bad_saved_bindings_create_no_run(saved, change):
    c, app, sid, ref = saved
    if change=='foreign_run': ref=ref.model_copy(update={'source_run_id':str(uuid4())})
    elif change=='unknown_report': ref=ref.model_copy(update={'report_id':str(uuid4())})
    else:
        with app.state.store.database.write() as db:
            row=db.get(ReportRecord,ref.report_id)
            doc=deepcopy(row.document)
            if change=='real_synthesizer': row.mode='real'
            elif change=='not_ready': row.status='failed'; row.code='TEST'
            elif change=='real_source': doc['source_mode']='real'
            elif change=='crypto': doc['symbol']='BTC/USDT'
            elif change=='missing': doc['evidence']=[]
            elif change=='oversize': doc['evidence']*=11
            else:
                field={'value':'value','pointer':'pointer','ordinal':'ordinal','hash':'result_hash'}[change]
                doc['evidence'][0][field]={'value':'fabricated','pointer':'/fake','ordinal':999,'hash':'0'*64}[change]
            row.document=None if change=='not_ready' else doc
    response=send(c,sid,ref)
    assert response.status_code in (404,409), response.text
    assert app.state.store.snapshot(sid).runs==[] and app.state.manager.work=={}


def test_tool_scope_rejects_foreign_ids_and_cross_session(saved):
    c, app, sid, ref=saved
    bound, record=scope(app,sid,ref)
    args=ReportReadArguments(**ref.model_dump())
    for field in ('report_id','source_run_id'):
        foreign=args.model_copy(update={field:str(uuid4())})
        with pytest.raises(ToolExecutionError) as error: bound.read(foreign)
        assert error.value.error.code=='REPORT_CONTEXT_MISMATCH'
    other=app.state.store.create_session('another').id
    with pytest.raises(RunStopped): BoundReportRead(bound.verified,app.state.store,other,record.id).read(args)
    registry=bound_runner(bound.verified,app.state.store,sid,record.id).tools
    assert [d['function']['name'] for d in registry.definitions()]==['research_report_read']
    assert registry.definitions()[0]['function']['parameters']['properties']['report_id']['enum']==[ref.report_id]
    with pytest.raises(ToolExecutionError): registry.decode('market_quote',{'symbol':'AAPL.US'})
    assert set(app.state.manager.runner.tools._handlers)=={'market.quote','market.kline','portfolio.risk','stocks.compare'}


@pytest.mark.parametrize('args', [{'evidence_limit':33},{'evidence_limit':True},{'evidence_offset':384},{'evidence_offset':'0'},{'url':'https://invalid'},{'report_id':'bad'}])
def test_strict_tool_arguments(args):
    with pytest.raises(ValidationError): ReportReadArguments(report_id=str(uuid4()),source_run_id=str(uuid4()),**{k:v for k,v in args.items() if k!='report_id'}) if 'report_id' not in args else ReportReadArguments(source_run_id=str(uuid4()),**args)


def test_explicit_pages_and_omissions_are_truthful(saved):
    c, app, sid, ref=saved
    bound,_=scope(app,sid,ref)
    first=bound.read(ReportReadArguments(**ref.model_dump(),evidence_limit=32))
    last=bound.read(ReportReadArguments(**ref.model_dump(),evidence_offset=32))
    assert first.returned==32 and first.next_offset==32
    assert last.returned==5 and last.next_offset is None
    assert {f.id for f in first.facts}.isdisjoint({f.id for f in last.facts})
    ids={f.id for f in last.facts}
    assert all(set(c.evidence_ids)<=ids for c in last.saved_summary)
    assert last.omitted_summary+len(last.saved_summary)<=4
    assert last.source_mode=='simulated' and last.synthesizer_mode=='fixed'


@pytest.mark.parametrize('ending', ['cancelled','timed_out','deleted','changed'])
def test_finished_or_changed_scope_cannot_emit_late_success(saved, ending):
    c,app,sid,ref=saved
    bound,record=scope(app,sid,ref)
    if ending=='changed':
        with app.state.store.database.write() as db:
            row=db.get(ReportRecord,ref.report_id); doc=deepcopy(row.document); doc['synthesis']['summary'][0]['text']='changed'; row.document=doc
        with pytest.raises(ToolExecutionError) as error: bound.read(ReportReadArguments(**ref.model_dump()))
        assert error.value.error.code=='EVIDENCE_CHANGED'
    else:
        from research_trail.conversation import ErrorPayload
        app.state.store.finish(sid,record.id,'timed_out' if ending=='timed_out' else 'cancelled',error=ErrorPayload(code='TIMEOUT',message='test') if ending=='timed_out' else None)
        if ending=='deleted': app.state.store.delete_session(sid)
        with pytest.raises(RunStopped): bound.read(ReportReadArguments(**ref.model_dump()))


def test_single_call_limit_even_with_repeating_model(saved):
    c,app,sid,ref=saved
    bound,record=scope(app,sid,ref)
    runner=bound_runner(bound.verified,app.state.store,sid,record.id)
    class Repeat:
        label='规则演示／假模型'
        def complete(self,*args): return {'role':'assistant','content':None,'tool_calls':[{'id':str(uuid4()),'type':'function','function':{'name':'research_report_read','arguments':ReportReadArguments(**ref.model_dump()).model_dump_json()}}]}
    runner.model=Repeat()
    events=[]
    outcome=runner.run('读取报告',lambda kind,payload:events.append((kind,payload)))
    assert outcome.error.code=='TOOL_LIMIT'
    assert sum(kind=='tool_started' for kind,_ in events)==1


def test_oversized_actual_report_page_fails_without_truncating_facts(api):
    from research_trail.provider_service import authored_data
    def executor(query):
        data=authored_data(query)
        if query.capability=='company.profile': data={('x'*500)+str(i):'😀'*256 for i in range(24)}
        return data
    with api(executor) as (c,app):
        source=collected(c,strategy='value');job=finished(c,report(c,source))
        assert job['status']=='completed',job
        sid=app.state.store.create_session('large').id
        ref=ReportContextRef(report_id=job['id'],source_run_id=source)
        bound,_=scope(app,sid,ref)
        with pytest.raises(ToolExecutionError) as error: bound.read(ReportReadArguments(**ref.model_dump()))
        assert error.value.error.code=='TOOL_RESULT_TOO_LARGE'
        assert len(app.state.reports.completed(ref.report_id).document.evidence)>=24


@pytest.mark.parametrize('action',['cancel','delete','timeout'])
def test_real_manager_stops_blocked_report_reader_and_rejects_late_events(saved, monkeypatch, action):
    c,app,sid,ref=saved
    entered=threading.Event();release=threading.Event()
    original=BoundReportRead.read
    def wait_read(self,args):
        entered.set();assert release.wait(3);return original(self,args)
    monkeypatch.setattr(BoundReportRead,'read',wait_read)
    if action=='timeout': monkeypatch.setattr(app.state.manager,'timings',{**app.state.manager.timings,'normal':Timing(tool_timeout=.05)})
    response=send(c,sid,ref);assert response.status_code==201
    rid=response.json()['id'];assert entered.wait(2)
    if action=='cancel': c.post(f'/sessions/{sid}/runs/{rid}/cancel')
    elif action=='delete': c.delete(f'/sessions/{sid}')
    else: assert terminal(c,sid,rid)['status']=='timed_out'
    release.set()
    deadline=time.monotonic()+3
    while app.state.manager.work and time.monotonic()<deadline:time.sleep(.01)
    assert app.state.manager.work=={}
    if action=='delete': assert c.get(f'/sessions/{sid}/snapshot').status_code==404
    else:
        trace=c.get(f'/sessions/{sid}/runs/{rid}/event-log').json()['events']
        assert not any(e['type']=='tool_result' for e in trace)
        assert len([e for e in trace if e['type']=='run_completed'])==1
        assert terminal(c,sid,rid)['status']==('cancelled' if action=='cancel' else 'timed_out')


def test_bound_context_capacity_rejects_api_start_without_model_or_run(saved):
    from research_trail.session_capacity import SESSION_CONTEXT_THRESHOLD
    c,app,sid,ref=saved
    seed=app.state.store.start_fixture(sid,'seed')
    with app.state.store.database.write() as db:
        row=db.scalar(select(MessageRecord).where(MessageRecord.session_id==sid,MessageRecord.role=='user'))
        row.content='😀'*SESSION_CONTEXT_THRESHOLD
    before=app.state.store.snapshot(sid).model_dump(mode='json')
    response=send(c,sid,ref)
    assert response.status_code==409 and 'SESSION_CONTEXT_CAPACITY' in response.json()['detail']
    assert app.state.store.snapshot(sid).model_dump(mode='json')==before and app.state.manager.work=={}


def test_report_run_history_survives_reopen_without_report_or_provider_execution(api, tmp_path):
    path=tmp_path/'persist.sqlite3'
    with api(path=path) as (c,app):
        source=collected(c,strategy='value');job=finished(c,report(c,source))
        sid=app.state.store.create_session('history').id
        ref=ReportContextRef(report_id=job['id'],source_run_id=source)
        response=send(c,sid,ref);terminal(c,sid,response.json()['id'])
        snapshot=c.get(f'/sessions/{sid}/snapshot').json()
    def forbid(*args):raise AssertionError('history must remain read only')
    with api(executor=forbid,path=path) as (c,app):
        app.state.reports.evidence=forbid
        assert c.get(f'/sessions/{sid}/snapshot').json()==snapshot
        assert c.get(f'/sessions/{sid}/runs/{response.json()["id"]}/event-log').json()['events']==snapshot['events']


@pytest.mark.parametrize('first',['calendar_contracts','report_contracts','capabilities','conversation'])
def test_cold_import_order_keeps_standalone_cli_contracts_available(first):
    command=f'import research_trail.{first}; from research_trail.app import create_app; assert create_app("offline-test-only"*4).openapi()["components"]["schemas"]["ToolArguments"]["properties"]["symbol"]["pattern"] == r"^[A-Z0-9]{{1,6}}\\.US$"'
    outcome=subprocess.run([sys.executable,'-c',command],capture_output=True,text=True,timeout=10)
    assert outcome.returncode==0,outcome.stderr


def test_changed_report_after_tool_returns_is_rejected_by_commit_guard(saved, monkeypatch):
    c,app,sid,ref=saved
    original=BoundReportRead.read
    def changed(self,args):
        data=original(self,args)
        with app.state.store.database.write() as db:
            row=db.get(ReportRecord,ref.report_id);doc=deepcopy(row.document)
            doc['synthesis']['summary'][0]['text']='changed after read';row.document=doc
        return data
    monkeypatch.setattr(BoundReportRead,'read',changed)
    response=send(c,sid,ref);assert response.status_code==201
    value=terminal(c,sid,response.json()['id'])
    assert value['status']=='failed' and value['error']['code']=='EVIDENCE_CHANGED'
    trace=c.get(f'/sessions/{sid}/runs/{value["id"]}/event-log').json()['events']
    assert len([e for e in trace if e['type']=='tool_started'])==1
    assert not any(e['type']=='tool_result' for e in trace)


def test_changed_source_generation_invalidates_frozen_binding(saved):
    c,app,sid,ref=saved
    bound,_=scope(app,sid,ref)
    with app.state.store.database.write() as db:
        row=db.get(ResearchRecord,ref.source_run_id);row.generation+=1
    with pytest.raises(ToolExecutionError) as error:bound.read(ReportReadArguments(**ref.model_dump()))
    assert error.value.error.code=='EVIDENCE_CHANGED'


@pytest.mark.parametrize('change',['report','generation','deleted'])
def test_saved_tool_result_cannot_complete_after_report_changes_before_final_commit(saved, monkeypatch, change):
    from research_trail.report_read_tool import BoundReportFake
    c,app,sid,ref=saved
    original=BoundReportFake.complete
    def change_after_reply(self,messages,tools,stop,deadline):
        response=original(self,messages,tools,stop,deadline)
        if messages[-1]['role']=='tool':
            if change=='deleted':
                # Reports have other business references; simulate disappearance
                # at the read boundary without bypassing SQLite foreign keys.
                def missing(identity): raise ResearchError('REPORT_NOT_FOUND')
                monkeypatch.setattr(app.state.reports,'completed',missing)
            else:
                with app.state.store.database.write() as db:
                    if change=='generation':
                        row=db.get(ResearchRecord,ref.source_run_id);row.generation+=1
                    else:
                        row=db.get(ReportRecord,ref.report_id);doc=deepcopy(row.document)
                        doc['synthesis']['summary'][0]['text']='changed after model reply';row.document=doc
        return response
    monkeypatch.setattr(BoundReportFake,'complete',change_after_reply)
    response=send(c,sid,ref);assert response.status_code==201
    value=terminal(c,sid,response.json()['id'])
    assert value['status']=='failed'
    assert value['error']['code']==('REPORT_NOT_FOUND' if change=='deleted' else 'EVIDENCE_CHANGED')
    trace=c.get(f'/sessions/{sid}/runs/{value["id"]}/event-log').json()['events']
    assert len([e for e in trace if e['type']=='tool_result' and e['payload']['result']['ok']])==1
    assert len([e for e in trace if e['type']=='run_completed'])==1
    assert trace[-1]['payload']['stop_reason']=='error'
    assert not any(e['type']=='text_delta' for e in trace)


def test_opt_in_reply_rejects_serialization_overflow_and_invalid_unicode_before_start(saved):
    from research_trail.report_read_tool import require_report_reply
    from research_trail.openai_provider import ModelError
    from research_trail.session_capacity import json_units
    with pytest.raises(ModelError) as error: require_report_reply('\x01'*4000)
    assert error.value.error.code=='MODEL_RESPONSE_INVALID'
    assert json_units({'text':'\x01'*4000})>8192
    c,app,sid,ref=saved
    payload={'input':'\ud800','kind':'fake_agent','research_context':ref.model_dump()}
    response=c.post(f'/sessions/{sid}/runs',content=json.dumps(payload,ensure_ascii=True),headers={'Content-Type':'application/json'})
    assert response.status_code==422
    assert [(item['type'], item['loc']) for item in response.json()['detail']]==[('string_unicode',['body','input'])]
    assert app.state.store.snapshot(sid).runs==[]
