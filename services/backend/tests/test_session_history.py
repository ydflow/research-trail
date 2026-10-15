"""Bounded whole-run history under the existing SQLite/SSE authority."""
from threading import Event, Thread
from uuid import uuid4

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import event, text

from research_trail.app import create_app
from research_trail.database import Database
from research_trail.session_capacity import json_units, LOCAL_RESPONSE_LIMIT, SessionContextCapacity
from research_trail.store import Store
from test_agent import TOKEN, HEADERS, RecordingDataProvider


@pytest.fixture
def history(tmp_path):
    database = Database(tmp_path / 'history.sqlite3'); database.migrate()
    store = Store(database); sid = store.create_session('分页').id
    for index in range(25): store.start_fixture(sid, f'研究 {index}')
    yield store, sid
    assert database.engine.pool.checkedout() == 0
    database.close()


@pytest.mark.parametrize('limit', [1, 3, 10])
def test_pages_have_every_message_run_and_event_once(history, limit):
    store, sid = history; before = store.snapshot(sid); cursor = None
    messages, runs, events = [], [], []
    while True:
        page = store.history(sid, cursor, limit)
        assert json_units(page.model_dump(mode='json')) <= LOCAL_RESPONSE_LIMIT
        assert [message.sequence for message in page.messages] == sorted(message.sequence for message in page.messages)
        for run in page.runs:
            saved = [event for event in page.events if event.run_id == run.id]
            assert [event.sequence for event in saved] == list(range(1, run.last_sequence + 1))
            assert len([m for m in page.messages if m.run_id == run.id]) == 2
        messages += page.messages; runs += page.runs; events += page.events
        if not page.has_more:
            assert page.next_before_sequence is None; break
        assert page.next_before_sequence < (cursor or 9007199254740991)
        cursor = page.next_before_sequence
    assert sorted(messages, key=lambda m: m.sequence) == before.messages
    assert sorted(runs, key=lambda r: r.id) == sorted(before.runs, key=lambda r: r.id)
    assert sorted(events, key=lambda e: (e.run_id, e.sequence)) == before.events


def test_new_runs_between_pages_do_not_shift_cursor_or_repeat(history):
    store, sid = history; original = store.snapshot(sid)
    head = store.history(sid, limit=10)
    late = store.start_fixture(sid, '并发写入的新运行')
    rest = store.history(sid, head.next_before_sequence, 10)
    tail = store.history(sid, rest.next_before_sequence, 10)
    assert {m.id for m in head.messages + rest.messages + tail.messages} == {m.id for m in original.messages}
    assert not any(run.id == late.id for run in head.runs + rest.runs + tail.runs)
    assert store.history(sid).runs[0].id == late.id


def test_page_transaction_pins_message_event_waterline_during_actual_writer(history):
    store, sid = history
    run = store.begin_agent(sid, '并发事件')
    entered, release = Event(), Event()
    def intercept(_connection, _cursor, statement, _parameters, _context, _many):
        if statement.startswith('SELECT messages.run_id'):
            entered.set(); assert release.wait(2)
    event.listen(store.database.engine, 'before_cursor_execute', intercept)
    result = []
    reader = Thread(target=lambda: result.append(store.history(sid)))
    try:
        reader.start(); assert entered.wait(2)
        store.append_running(sid, run.id, 'text_delta', {'text': '并发文字'})
        release.set(); reader.join(2); assert not reader.is_alive()
    finally:
        release.set(); reader.join(2); event.remove(store.database.engine, 'before_cursor_execute', intercept)
    page = result[0]
    saved = next(r for r in page.runs if r.id == run.id)
    assert saved.last_sequence == 2
    assert next(m for m in page.messages if m.id == run.assistant_message_id).content == ''
    continuation = store.events(sid, run.id, saved.last_sequence)
    assert [e.sequence for e in continuation.events] == [3]
    assert continuation.events[0].payload.text == '并发文字'
    store.finish(sid, run.id, 'completed')


def test_response_budget_reduces_whole_run_count_without_truncation(history):
    store, sid = history
    with store.database.write() as db:
        db.execute(text("UPDATE messages SET content=:value WHERE session_id=:sid"), dict(value='😀\\\n' * 12000, sid=sid))
    page = store.history(sid)
    assert 0 < len(page.runs) < 10 and page.has_more
    assert json_units(page.model_dump(mode='json')) <= LOCAL_RESPONSE_LIMIT
    assert all(m.content == '😀\\\n' * 12000 for m in page.messages)
    with store.database.write() as db:
        db.execute(text('UPDATE messages SET content=:value WHERE session_id=:sid'), dict(value='😀' * 150000, sid=sid))
    with pytest.raises(SessionContextCapacity): store.history(sid)


@pytest.mark.parametrize('params', [{'limit':0}, {'limit':11}, {'limit':'no'}, {'before_sequence':0},
    {'before_sequence':9007199254740992}, {'before_sequence':'1.5'}, {'url':'https://invalid'}])
def test_history_api_checks_token_identity_parameters_and_old_snapshot(tmp_path, params):
    provider = RecordingDataProvider()
    with TestClient(create_app(TOKEN, provider, database_path=tmp_path/'api.sqlite3'), headers=HEADERS) as c:
        sid = c.post('/sessions',json={'title':'只读'}).json()['id']
        c.app.state.store.start_fixture(sid,'已保存')
        assert c.get(f'/sessions/{sid}/history', params=params).status_code == 422
        assert c.get(f'/sessions/{sid}/history', headers={'X-ResearchTrail-Token':'wrong'}).status_code == 401
        assert c.get(f'/sessions/{uuid4()}/history').status_code == 404
        assert c.get('/sessions/not-uuid/history').status_code == 422
        assert c.get(f'/sessions/{sid}/history?limit=1&limit=2').status_code == 422
        old = c.get(f'/sessions/{sid}/snapshot').json()
        page = c.get(f'/sessions/{sid}/history').json()
        assert {key:page[key] for key in old} == old
        assert c.get(f'/sessions/{sid}/history?before_sequence=1').json()['messages'] == []
        assert provider.calls == [] and not c.app.state.manager.work
        assert c.get(f'/sessions/{sid}/snapshot').json() == old


def test_pages_restore_after_reopen_without_runner_or_provider(history):
    store, sid = history
    before = store.history(sid).model_dump(mode='json'); path=store.database.path
    store.database.close()
    other=Database(path)
    try: assert Store(other).history(sid).model_dump(mode='json') == before
    finally: other.close()
