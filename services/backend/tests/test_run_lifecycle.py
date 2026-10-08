"""Deterministic control gates plus real owned-process crash/restart proof."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
import json
import os
from pathlib import Path
import queue
import sqlite3
import subprocess
import sys
import threading
import time

from fastapi.testclient import TestClient
import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from research_trail.app import create_app
from research_trail.conversation import ErrorPayload
from research_trail.database import Database
from research_trail.lifecycle import Timing
from research_trail.market import FixtureMarketProvider
from research_trail.model_provider import FakeModelProvider
from research_trail.store import RunStopped, Store

TOKEN = "lifecycle-test-only-" * 4
HEADERS = {"X-ResearchTrail-Token": TOKEN}


class Provider(FixtureMarketProvider):
    def __init__(self):
        self.calls = []

    def snapshot(self, symbol):
        self.calls.append(symbol)
        return super().snapshot(symbol)


def until(read, predicate, seconds=5):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        result = read()
        if predicate(result):
            return result
        time.sleep(0.01)
    pytest.fail("运行未在限时内达到期望状态")


def session(c):
    return c.post("/sessions", json={"title": "生命周期"}).json()["id"]


def start(c, sid, scenario="delayed"):
    response = c.post(f"/sessions/{sid}/runs", json={"input": "查询AAPL.US行情", "kind": "fake_agent", "scenario": scenario})
    assert response.status_code == 201
    return response.json()


def events(c, sid, rid):
    return c.get(f"/sessions/{sid}/runs/{rid}/event-log").json()["events"]


def terminal(c, sid, rid):
    return until(lambda: c.get(f"/sessions/{sid}/runs/{rid}").json(), lambda r: r["status"] != "running")


def proof(c, sid, record):
    trace = events(c, sid, record["id"])
    assert [e["sequence"] for e in trace] == list(range(1, len(trace) + 1))
    assert [e["type"] for e in trace].count("run_completed") == 1
    assert [e["type"] for e in trace].count("message_completed") == 1
    assert trace[-1]["type"] == "run_completed"
    assert record["completed_at"] is not None
    history = c.get(f"/sessions/{sid}/messages").json()
    own = [m for m in history if m["run_id"] == record["id"]]
    assert len(own) == 2 and [m["role"] for m in own] == ["user", "assistant"]
    assert own[-1]["content"] == record["answer"]
    return trace


def test_cancel_is_idempotent_stops_delay_and_retains_partial(tmp_path):
    provider = Provider()
    app = create_app(TOKEN, provider, database_path=tmp_path / "cancel.sqlite3")
    with TestClient(app, headers=HEADERS) as c:
        sid = session(c); record = start(c, sid); rid = record["id"]
        assert record["status"] == "running" and record["completed_at"] is None
        until(lambda: events(c, sid, rid), lambda es: any(e["type"] == "tool_started" for e in es))
        work = app.state.manager.work[rid]
        app.state.store.append_running(sid, rid, "text_delta", {"text": "已保存的部分说明"})
        cancelled = c.post(f"/sessions/{sid}/runs/{rid}/cancel").json()
        work.thread.join(2)
        assert not work.thread.is_alive()
        assert cancelled["status"] == "cancelled" and cancelled["answer"].startswith("已保存的部分说明")
        trace = proof(c, sid, cancelled)
        assert not any(e["type"] == "tool_result" for e in trace)
        assert next(e for e in trace if e["type"] == "cancelled")["payload"]["partial"]["text"] == "已保存的部分说明"
        assert c.post(f"/sessions/{sid}/runs/{rid}/cancel").json() == cancelled
        assert events(c, sid, rid) == trace and provider.calls == []
        with pytest.raises(RunStopped):
            app.state.store.append_running(sid, rid, "text_delta", {"text": "迟到成功"})
        # A new explicit run is permitted; cancelling the old run cannot cancel it.
        new = start(c, sid, "normal")
        c.post(f"/sessions/{sid}/runs/{rid}/cancel")
        assert terminal(c, sid, new["id"])["status"] == "completed"
        assert provider.calls == ["AAPL.US"]


def test_tool_timeout_settles_before_provider_and_cancel_cannot_overwrite(tmp_path):
    provider = Provider()
    timings = {"timeout": Timing(delay=1, tool_timeout=0.03)}
    with TestClient(create_app(TOKEN, provider, database_path=tmp_path / "timeout.sqlite3", run_timings=timings), headers=HEADERS) as c:
        sid = session(c); record = start(c, sid, "timeout")
        result = terminal(c, sid, record["id"])
        assert result["status"] == "timed_out" and result["error"]["code"] == "TOOL_TIMEOUT"
        trace = proof(c, sid, result)
        assert trace[-1]["payload"]["stop_reason"] == "timeout"
        assert provider.calls == [] and not any(e["type"] == "tool_result" for e in trace)
        assert c.post(f"/sessions/{sid}/runs/{record['id']}/cancel").json() == result


@pytest.mark.parametrize("winner", ["cancelled", "timed_out", "completed"])
def test_late_blocking_tool_cannot_append_after_winning_terminal(tmp_path, winner):
    entered, release = threading.Event(), threading.Event()

    class GateProvider(Provider):
        def snapshot(self, symbol):
            entered.set()
            assert release.wait(4)
            return super().snapshot(symbol)

    provider = GateProvider()
    app = create_app(TOKEN, provider, database_path=tmp_path / "gate.sqlite3",
                     run_timings={"normal": Timing(tool_timeout=0.1 if winner == "timed_out" else 3)})
    try:
        with TestClient(app, headers=HEADERS) as c:
            sid = session(c); record = start(c, sid, "normal"); rid = record["id"]
            assert entered.wait(2)
            work = app.state.manager.work[rid]
            if winner == "cancelled":
                result = c.post(f"/sessions/{sid}/runs/{rid}/cancel").json()
            elif winner == "timed_out":
                result = terminal(c, sid, rid)
            else:
                release.set(); result = terminal(c, sid, rid)
            trace = proof(c, sid, result)
            release.set(); work.thread.join(2)
            assert not work.thread.is_alive()
            assert result["status"] == winner
            assert events(c, sid, rid) == trace
            assert c.post(f"/sessions/{sid}/runs/{rid}/cancel").json() == result
            assert any(e["type"] == "tool_result" for e in trace) == (winner == "completed")
    finally:
        release.set()


def test_terminal_three_way_race_is_guarded_by_database(tmp_path):
    db = Database(tmp_path / "race.sqlite3"); db.migrate(); store = Store(db)
    try:
        sid = store.create_session("竞争").id
        for _ in range(8):
            record = store.begin_agent(sid, "竞争运行")
            barrier = threading.Barrier(3)

            def contender(status):
                barrier.wait(timeout=2)
                error = ErrorPayload(code="TOOL_TIMEOUT", message="超时") if status == "timed_out" else None
                return store.finish(sid, record.id, status, status, error)

            with ThreadPoolExecutor(max_workers=3) as pool:
                outcomes = list(pool.map(contender, ["cancelled", "timed_out", "completed"]))
            assert len({r.status for r in outcomes}) == 1
            assert len({r.answer for r in outcomes}) == 1
            trace = store.events(sid, record.id).events
            assert [e.type for e in trace].count("run_completed") == 1
            assert [e.type for e in trace].count("message_completed") == 1
            assert len([m for m in store.messages(sid) if m.run_id == record.id]) == 2
            assert store.active_runs() == []
    finally:
        db.close()


@pytest.mark.parametrize("phase", ["plan", "respond"])
def test_overall_timeout_stops_late_model_and_preserves_saved_tools(tmp_path, phase, monkeypatch):
    entered, release = threading.Event(), threading.Event()

    class GateModel(FakeModelProvider):
        def plan(self, prompt):
            if phase == "plan":
                entered.set(); assert release.wait(10)
            return super().plan(prompt)

        def respond(self, data):
            entered.set(); assert release.wait(10)
            return super().respond(data)

    provider = Provider()
    app = create_app(TOKEN, provider, model_provider=GateModel(), database_path=tmp_path / "model-timeout.sqlite3",
                     run_timings={"normal": Timing(run_timeout=30)})
    try:
        with TestClient(app, headers=HEADERS) as c:
            manager = app.state.manager
            real_timer = manager.timer
            deferred = []

            def phase_timer(work, seconds, code):
                if code == "RUN_TIMEOUT":
                    deferred.append(work)
                    return None
                return real_timer(work, seconds, code)

            # Test the timeout in the requested model phase, rather than race
            # the preceding tool/SQLite writes against a 100ms wall clock.
            monkeypatch.setattr(manager, "timer", phase_timer)
            sid = session(c); record = start(c, sid, "normal")
            assert entered.wait(5)
            work = app.state.manager.work[record["id"]]
            assert deferred == [work]
            real_timer(work, 0, "RUN_TIMEOUT")
            result = terminal(c, sid, record["id"])
            assert result["status"] == "timed_out" and result["error"]["code"] == "RUN_TIMEOUT"
            trace = proof(c, sid, result)
            assert any(e["type"] == "tool_result" for e in trace) == (phase == "respond")
            assert provider.calls == (["AAPL.US"] if phase == "respond" else [])
            release.set(); work.thread.join(2)
            assert events(c, sid, record["id"]) == trace
    finally:
        release.set()


def test_delete_cancels_active_session_before_cascade_and_preserves_other_session(tmp_path):
    provider = Provider(); app = create_app(TOKEN, provider, database_path=tmp_path / "delete.sqlite3")
    with TestClient(app, headers=HEADERS) as c:
        a, b = session(c), session(c)
        record = start(c, a); rid = record["id"]
        until(lambda: events(c, a, rid), lambda es: any(e["type"] == "tool_started" for e in es))
        work = app.state.manager.work[rid]
        assert c.post(f"/sessions/{a}/runs", json={"input": "第二个", "kind": "fake_agent"}).status_code == 409
        assert c.post(f"/sessions/{a}/runs", json={"input": "固定测试"}).status_code == 409
        assert c.post(f"/sessions/{b}/runs/{rid}/cancel").status_code == 404
        before_delete = []
        original = app.state.store.delete_session

        def observe(sid):
            before_delete.append(app.state.store.run(sid, rid).status)
            original(sid)

        app.state.store.delete_session = observe
        assert c.delete(f"/sessions/{a}").status_code == 204
        work.thread.join(2)
        assert before_delete == ["cancelled"] and provider.calls == [] and not work.thread.is_alive()
        assert c.get(f"/sessions/{a}/runs/{rid}").status_code == 404
        assert c.get(f"/sessions/{b}").status_code == 200
        assert app.state.store.active_runs() == []
        with app.state.store.database.engine.connect() as connection:
            for table in ("runs", "messages", "events"):
                assert connection.scalar(text(f"SELECT COUNT(*) FROM {table} WHERE session_id=:sid"), {"sid": a}) == 0


def test_graceful_shutdown_interrupts_and_reopen_never_reexecutes(tmp_path):
    path = tmp_path / "shutdown.sqlite3"; provider = Provider()
    app = create_app(TOKEN, provider, database_path=path)
    with TestClient(app, headers=HEADERS) as c:
        sid = session(c); record = start(c, sid); rid = record["id"]
        until(lambda: events(c, sid, rid), lambda es: any(e["type"] == "tool_started" for e in es))
    with TestClient(create_app(TOKEN, provider, database_path=path), headers=HEADERS) as c:
        result = c.get(f"/sessions/{sid}/runs/{rid}").json()
        assert result["status"] == "interrupted" and result["error"]["code"] == "BACKEND_INTERRUPTED"
        trace = proof(c, sid, result)
        assert c.post(f"/sessions/{sid}/runs/{rid}/cancel").json() == result
        assert events(c, sid, rid) == trace and provider.calls == []


def test_live_database_owner_is_not_interrupted_by_another_backend(tmp_path):
    path = tmp_path / "owner.sqlite3"
    with TestClient(create_app(TOKEN, database_path=path), headers=HEADERS) as first:
        sid = session(first); record = start(first, sid)
        with pytest.raises(RuntimeError, match="另一本机服务"):
            with TestClient(create_app(TOKEN, database_path=path)):
                pass
        assert first.get(f"/sessions/{sid}/runs/{record['id']}").json()["status"] == "running"


def test_crashed_running_record_preserves_partial_and_migration_constraints(tmp_path):
    path = tmp_path / "recover.sqlite3"; db = Database(path); db.migrate(); store = Store(db)
    sid = store.create_session("旧运行").id; record = store.begin_agent(sid, "不可自动执行")
    store.append_running(sid, record.id, "text_delta", {"text": "崩溃前保存内容"})
    with pytest.raises(IntegrityError):
        with db.write() as connection:
            connection.execute(text("UPDATE runs SET last_sequence=0 WHERE id=:rid"), {"rid": record.id})
    db.close(); provider = Provider()
    with TestClient(create_app(TOKEN, provider, database_path=path), headers=HEADERS) as c:
        result = c.get(f"/sessions/{sid}/runs/{record.id}").json()
        assert result["status"] == "interrupted" and result["answer"].startswith("崩溃前保存内容")
        proof(c, sid, result); assert provider.calls == []


def test_real_backend_force_exit_and_restart_settles_saved_run(tmp_path):
    path = tmp_path / "process.sqlite3"; processes = []

    def launch():
        process = subprocess.Popen([sys.executable, "-m", "research_trail"], stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                   env={**os.environ, "RESEARCH_TRAIL_TOKEN": TOKEN, "RESEARCH_TRAIL_DB_PATH": str(path)})
        processes.append(process)
        lines = queue.Queue()
        threading.Thread(target=lambda: lines.put(process.stdout.readline()), daemon=True).start()
        ready = lines.get(timeout=10)
        assert ready, process.stderr.read()
        port = json.loads(ready)["port"]
        client = httpx.Client(base_url=f"http://127.0.0.1:{port}", headers=HEADERS, timeout=3, trust_env=False)
        until(lambda: client.get("/health"), lambda r: r.status_code == 200)
        return process, client

    try:
        process, c = launch()
        with closing(c):
            sid = session(c); record = start(c, sid); rid = record["id"]
            saved = until(lambda: events(c, sid, rid), lambda es: any(e["type"] == "tool_started" for e in es))
            with sqlite3.connect(path) as connection:
                assert connection.execute("SELECT status FROM runs WHERE id=?", (rid,)).fetchone()[0] == "running"
            process.kill(); process.wait(5)
        replacement, c = launch()
        with closing(c):
            result = c.get(f"/sessions/{sid}/runs/{rid}").json()
            assert result["status"] == "interrupted"
            trace = proof(c, sid, result)
            assert trace[:len(saved)] == saved
            assert not any(e["type"] == "tool_result" for e in trace)
            assert c.get(f"/sessions/{sid}/runs").json() == [result]
            new = start(c, sid, "normal")
            assert terminal(c, sid, new["id"])["status"] == "completed"
            assert events(c, sid, rid) == trace
        replacement.stdin.close(); assert replacement.wait(5) == 0
    finally:
        for process in processes:
            if process.poll() is None:
                process.kill(); process.wait(5)
