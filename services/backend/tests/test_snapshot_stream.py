import json
import os
import queue
import subprocess
import sys
import threading

from fastapi.testclient import TestClient
import httpx
import pytest
from sqlalchemy import event

from research_trail.app import create_app
from research_trail.database import Database
from research_trail.store import Store
from research_trail.market import FixtureMarketProvider
from research_trail.model_provider import FakeModelProvider

TOKEN = 'snapshot-stream-test-' * 3
HEADERS = {'X-ResearchTrail-Token': TOKEN}


def test_snapshot_is_scoped_read_only_and_has_exact_event_waterlines(tmp_path):
    with TestClient(create_app(TOKEN, database_path=tmp_path / 'snapshot.sqlite3'), headers=HEADERS) as c:
        a = c.post('/sessions', json={'title': '甲'}).json()['id']
        b = c.post('/sessions', json={'title': '乙'}).json()['id']
        run = c.post(f'/sessions/{a}/runs', json={'input': '甲的输入'}).json()
        c.post(f'/sessions/{b}/runs', json={'input': '乙的输入'})
        saved = c.get(f'/sessions/{a}/snapshot').json()
        assert saved['session']['id'] == a and saved['session']['message_count'] == 2
        assert saved['runs'] == [run]
        assert [e['sequence'] for e in saved['events']] == list(range(1, run['last_sequence'] + 1))
        assert all(row['session_id'] == a for group in ('messages', 'runs', 'events') for row in saved[group])
        for _ in range(3):
            assert c.get(f'/sessions/{a}/snapshot').json() == saved
        assert c.get(f'/sessions/{a}/snapshot', headers={'X-ResearchTrail-Token': 'wrong'}).status_code == 401
        assert c.get('/sessions/missing/snapshot').status_code == 404


def test_snapshot_pins_one_wal_read_transaction_while_writer_finishes(tmp_path):
    db = Database(tmp_path / 'atomic.sqlite3'); db.migrate(); store = Store(db)
    sid = store.create_session('一致读').id
    old = store.start_fixture(sid, '旧内容')
    triggered = False
    results = []

    def concurrent_write(_conn, _cursor, statement, _params, _context, _many):
        nonlocal triggered
        if triggered or not statement.startswith('SELECT messages.'):
            return
        triggered = True
        writer = threading.Thread(target=lambda: results.append(store.start_fixture(sid, '读期间新内容')))
        writer.start(); writer.join(3)
        assert not writer.is_alive() and len(results) == 1

    event.listen(db.engine, 'after_cursor_execute', concurrent_write)
    try:
        saved = store.snapshot(sid)
        assert triggered
        assert saved.session.message_count == 2 and len(saved.messages) == 2
        assert [r.id for r in saved.runs] == [old.id]
        assert len(saved.events) == old.last_sequence == 7
        assert store.snapshot(sid).session.message_count == 4
    finally:
        event.remove(db.engine, 'after_cursor_execute', concurrent_write); db.close()


def test_snapshot_and_replay_never_execute_model_or_data_tools(tmp_path):
    import time

    class CountData(FixtureMarketProvider):
        calls = 0
        def snapshot(self, symbol):
            self.calls += 1
            return super().snapshot(symbol)

    class CountModel(FakeModelProvider):
        calls = 0
        def plan(self, prompt):
            self.calls += 1
            return super().plan(prompt)

    provider, model = CountData(), CountModel()
    with TestClient(create_app(TOKEN, provider, model_provider=model, database_path=tmp_path / 'no-reexecute.sqlite3'), headers=HEADERS) as c:
        sid = c.post('/sessions', json={'title': '只读历史'}).json()['id']
        run = c.post(f'/sessions/{sid}/runs', json={'input': '查询AAPL.US行情', 'kind': 'fake_agent'}).json()
        path = f"/sessions/{sid}/runs/{run['id']}"
        deadline = time.monotonic() + 3
        while c.get(path).json()['status'] == 'running' and time.monotonic() < deadline:
            time.sleep(0.01)
        saved = c.get(f'/sessions/{sid}/snapshot').json()
        assert saved['runs'][0]['status'] == 'completed'
        for _ in range(3):
            assert c.get(f'/sessions/{sid}/snapshot').json() == saved
            assert c.get(path + '/events?follow=true').status_code == 200
        assert provider.calls == model.calls == 1


@pytest.fixture
def live_client(tmp_path):
    process = subprocess.Popen([sys.executable, '-m', 'research_trail'], stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                               env={**os.environ, 'RESEARCH_TRAIL_TOKEN': TOKEN,
                                    'RESEARCH_TRAIL_DB_PATH': str(tmp_path / 'live.sqlite3')})
    client = None
    try:
        lines = queue.Queue()
        threading.Thread(target=lambda: lines.put(process.stdout.readline()), daemon=True).start()
        ready = json.loads(lines.get(timeout=10))
        client = httpx.Client(base_url=f"http://127.0.0.1:{ready['port']}", headers=HEADERS, trust_env=False, timeout=5)
        yield client
        client.close(); client = None
        process.stdin.close()
        assert process.wait(5) == 0
    finally:
        if client: client.close()
        if process.poll() is None: process.kill(); process.wait(5)


def data_events(response):
    assert response.status_code == 200
    assert response.headers['content-type'].startswith('text/event-stream')
    for line in response.iter_lines():
        if line.startswith('data: '):
            yield json.loads(line[6:])


def start_delayed(c):
    sid = c.post('/sessions', json={'title': '真实SSE'}).json()['id']
    run = c.post(f'/sessions/{sid}/runs', json={'input': '查询AAPL.US行情', 'kind': 'fake_agent', 'scenario': 'delayed'}).json()
    return sid, run['id']


def test_live_stream_disconnect_replays_committed_cancel_from_last_received_id(live_client):
    c = live_client; sid, rid = start_delayed(c)
    path = f'/sessions/{sid}/runs/{rid}'
    first = []
    with c.stream('GET', path + '/events?follow=true') as response:
        for item in data_events(response):
            first.append(item)
            assert c.get(path + '/event-log').json()['events'][item['sequence'] - 1] == item
            if item['type'] == 'tool_started': break
    assert [item['sequence'] for item in first] == [1, 2, 3, 4]
    cancelled = c.post(path + '/cancel').json()
    assert cancelled['status'] == 'cancelled'
    with c.stream('GET', path + '/events?follow=true&after_sequence=2', headers={'Last-Event-ID': f'{rid}:4'}) as response:
        assert response.headers['x-researchtrail-run-status'] == 'cancelled'
        assert int(response.headers['x-researchtrail-last-sequence']) == cancelled['last_sequence']
        tail = list(data_events(response))
    assert [item['sequence'] for item in tail] == list(range(5, cancelled['last_sequence'] + 1))
    assert first + tail == c.get(path + '/event-log').json()['events']
    assert len(c.get(f'/sessions/{sid}/snapshot').json()['messages']) == 2
    assert not any(item['type'] == 'tool_result' for item in tail)
    with c.stream('GET', path + f"/events?follow=true&after_sequence={cancelled['last_sequence']}") as response:
        assert list(data_events(response)) == []


def test_snapshot_then_live_subscription_delivers_future_committed_results(live_client):
    c = live_client; sid, rid = start_delayed(c)
    saved = c.get(f'/sessions/{sid}/snapshot').json()
    run = saved['runs'][0]
    assert run['status'] == 'running'
    tail = []
    path = f'/sessions/{sid}/runs/{rid}'
    with c.stream('GET', path + f"/events?follow=true&after_sequence={run['last_sequence']}") as response:
        for item in data_events(response):
            tail.append(item)
            # An HTTP reader can already observe every event before it is sent.
            assert c.get(path + '/event-log').json()['events'][item['sequence'] - 1] == item
    assert [item['sequence'] for item in tail] == list(range(run['last_sequence'] + 1, 9))
    assert tail[-1]['type'] == 'run_completed'
    final = c.get(f'/sessions/{sid}/snapshot').json()
    assert final['runs'][0]['status'] == 'completed' and len(final['messages']) == 2
    assert saved['events'] + tail == final['events']
    assert c.get(f'/sessions/{sid}/snapshot').json() == final  # Reading never starts another tool/run.
