"""Real JSON/SQLite budget proof before report tools can grow a session."""
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
import json

import pytest
from sqlalchemy import select
from starlette.responses import JSONResponse

from research_trail.conversation import ErrorPayload, ReportContextRef, ReportReadToolData, ToolSuccess
from research_trail.report_contracts import ReportEvidence
from research_trail.database import Database
from research_trail.market import FixtureMarketProvider
from research_trail.models import MessageRecord
from research_trail.session_capacity import (json_units, require_capacity, utf16_units, wire_json,
    SessionContextCapacity, SESSION_CONTEXT_THRESHOLD, REPORT_RUN_RESERVE, LOCAL_RESPONSE_LIMIT)
from research_trail.store import ActiveRun, Store


@pytest.fixture
def store(tmp_path):
    database = Database(tmp_path / 'capacity.sqlite3')
    database.migrate()
    yield Store(database)
    database.close()


def context():
    return ReportContextRef(report_id=str(uuid4()), source_run_id=str(uuid4()))


@pytest.mark.parametrize('value', ['A', '研', '😀', '"\\\n\x01', '\u2028😀研'])
def test_count_matches_actual_response_utf16(value):
    data = {'text': value * 2000}
    wire = JSONResponse(data).body.decode('utf-8')
    assert wire == wire_json(data)
    assert json_units(data) == len(wire.encode('utf-16-le')) // 2


@pytest.mark.parametrize('extra', [-1, 0, 1])
def test_exact_gate_boundary(extra):
    data = {'x': 'a' * (SESSION_CONTEXT_THRESHOLD - json_units({'x': ''}) + extra)}
    assert json_units(data) == SESSION_CONTEXT_THRESHOLD + extra
    if extra > 0:
        with pytest.raises(SessionContextCapacity): require_capacity(data)
    else:
        require_capacity(data)
    assert SESSION_CONTEXT_THRESHOLD + REPORT_RUN_RESERVE + 32768 == LOCAL_RESPONSE_LIMIT


@pytest.mark.parametrize('status', ['completed', 'failed', 'timed_out', 'cancelled', 'interrupted'])
@pytest.mark.parametrize('text_kind', ['controls', 'emoji', 'escaped', 'mixed'])
def test_maximum_run_real_json_is_inside_reservation(store, status, text_kind):
    sid = store.create_session('😀' * 80).id
    before = json_units(store.snapshot(sid).model_dump(mode='json'))
    ref = context()
    inputs={'controls':'\x01'*2000,'emoji':'😀'*2000,'escaped':'"\\'*1000,'mixed':'😀"\\\x01'*500}
    answers={'controls':'"\\'*2000,'emoji':'😀'*4000,'escaped':'"\\'*2000,'mixed':'😀"\\\n'*1000}
    assert len(inputs[text_kind])==2000 and len(answers[text_kind])==4000
    from research_trail.report_read_tool import require_report_reply
    require_report_reply(answers[text_kind])
    record = store.begin_agent(sid, inputs[text_kind], research_context=ref)
    store.append_running(sid, record.id, 'status', {'phase': 'working', 'detail': '只读报告工具'})
    args = {**ref.model_dump(), 'evidence_offset': 0, 'evidence_limit': 32}
    call = str(uuid4())
    store.append_running(sid, record.id, 'tool_started', {'call_id': call, 'name': 'research.report.read', 'input': args})
    facts=[ReportEvidence(id='ev-'+f'{i:024x}',run_id=ref.source_run_id,capability='company.profile',ordinal=0,
        pointer='/'+'p'*250,value='a'*64,result_hash='a'*64,provider='longbridge',source_mode='simulated',fetched_at='2024-01-16T16:00:00Z') for i in range(32)]
    data=ReportReadToolData(**ref.model_dump(),symbol='AAPL.US',strategy='value',report_version=1,provider='longbridge',
        collection_status='collected',facts=facts,sources=[],gaps=[],saved_summary=[],evidence_offset=0,total=32,returned=32,
        omitted_facts=0,omitted_sources=1,omitted_gaps=0,omitted_summary=0,omitted_forecast=0)
    remaining=24576-len(wire_json(ToolSuccess(data=data).model_dump(mode='json')).encode('utf-8'))
    assert remaining >= 0
    for fact in data.facts:
        added=min(remaining,600-len(fact.pointer));fact.pointer+='p'*added;remaining-=added
    result=ToolSuccess(data=data).model_dump(mode='json')
    assert remaining==0 and len(wire_json(result).encode('utf-8')) == 24576
    store.append_running(sid, record.id, 'tool_result', {'call_id': call, 'name': 'research.report.read', 'result': result})
    error = ErrorPayload(code='TEST', message='终态') if status in ('failed', 'timed_out', 'interrupted') else None
    store.finish(sid, record.id, status, answers[text_kind], error)
    after = store.snapshot(sid).model_dump(mode='json')
    assert json_units(after) - before < REPORT_RUN_RESERVE
    # Verify the actual response encoder, not only Pydantic model_dump_json.
    assert utf16_units(JSONResponse(after).body.decode('utf-8')) < LOCAL_RESPONSE_LIMIT
    for event in after['events']:
        assert utf16_units(f"id: {event['run_id']}:{event['sequence']}\nevent: {event['type']}\ndata: {wire_json(event)}\n\n") < LOCAL_RESPONSE_LIMIT


def fill(store, sid, target):
    record = store.start_fixture(sid, 'padding')
    current = json_units(store.snapshot(sid).model_dump(mode='json'))
    with store.database.write() as db:
        row = db.scalar(select(MessageRecord).where(MessageRecord.session_id == sid, MessageRecord.role == 'user'))
        row.content += 'a' * (target - current)
    assert json_units(store.snapshot(sid).model_dump(mode='json')) == target
    return record


def test_overflow_creates_no_run_and_keeps_legacy_behavior(store):
    sid = store.create_session('capacity').id
    fill(store, sid, SESSION_CONTEXT_THRESHOLD + 1)
    before = store.snapshot(sid).model_dump(mode='json')
    with pytest.raises(SessionContextCapacity):
        store.begin_agent(sid, '读取报告', research_context=context())
    assert store.snapshot(sid).model_dump(mode='json') == before
    legacy = store.begin_agent(sid, '查询AAPL.US行情')
    assert legacy.status == 'running'


def test_atomic_competing_starts_allow_only_one_reserved_run(store):
    sid = store.create_session('concurrent').id
    fill(store, sid, SESSION_CONTEXT_THRESHOLD)
    def begin():
        try: return store.begin_agent(sid, '读取报告', research_context=context()).id
        except (ActiveRun, SessionContextCapacity): return None
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _: begin(), range(2)))
    assert sum(value is not None for value in outcomes) == 1
    assert len(store.active_runs(sid)) == 1


def test_rejected_binding_rolls_back_without_messages(store):
    sid = store.create_session('invalid').id
    def invalid(): raise ValueError('invalid report')
    with pytest.raises(ValueError): store.begin_agent(sid, '读取报告', research_context=context(), binding_validate=invalid)
    snapshot = store.snapshot(sid)
    assert snapshot.runs == snapshot.messages == snapshot.events == []
