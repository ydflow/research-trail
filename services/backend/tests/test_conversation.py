from concurrent.futures import ThreadPoolExecutor
import json
import sqlite3

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import event, text

from research_trail.app import create_app
from research_trail.database import Database
from research_trail.store import Store

TOKEN = "test-token-" * 4
HEADERS = {"X-ResearchTrail-Token": TOKEN}


def client(path):
    return TestClient(create_app(TOKEN, database_path=path), headers=HEADERS)


def create(c, title):
    response = c.post("/sessions", json={"title": title})
    assert response.status_code == 201
    return response.json()["id"]


def start(c, sid, value):
    response = c.post(f"/sessions/{sid}/runs", json={"input": value})
    assert response.status_code == 201
    return response.json()


def frames(response):
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    result = []
    for frame in response.text.split("\n\n"):
        if not frame:
            continue
        fields = frame.splitlines()
        value = json.loads(next(line[6:] for line in fields if line.startswith("data: ")))
        assert f"id: {value['run_id']}:{value['sequence']}" in fields
        assert f"event: {value['type']}" in fields
        result.append(value)
    return result


def test_sessions_isolation_restart_delete_cascade(tmp_path):
    path = tmp_path / "history.sqlite3"
    with client(path) as c:
        a, b = create(c, "甲会话"), create(c, "乙会话")
        ra, rb = start(c, a, "仅甲"), start(c, b, "仅乙")
        assert c.get(f"/sessions/{a}/messages").json()[0]["content"] == "仅甲"
        assert c.get(f"/sessions/{b}/messages").json()[0]["content"] == "仅乙"
        assert c.get(f"/sessions/{b}/runs/{ra['id']}").status_code == 404
        for suffix in ("events", "event-log"):
            assert c.get(f"/sessions/{b}/runs/{ra['id']}/{suffix}").status_code == 404
        assert [r["id"] for r in c.get(f"/sessions/{a}/runs").json()] == [ra["id"]]
    with client(path) as c:
        assert len(c.get("/sessions").json()) == 2
        assert c.get(f"/sessions/{a}").json()["message_count"] == 2
        assert c.get(f"/sessions/{a}/runs/{ra['id']}").json() == ra
        assert c.delete(f"/sessions/{a}").status_code == 204
        assert c.get(f"/sessions/{a}/messages").status_code == 404
        assert c.get(f"/sessions/{b}/runs/{rb['id']}").status_code == 200
    with sqlite3.connect(path) as db:
        for table in ("sessions", "messages", "runs", "events"):
            count = db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            assert count == {"sessions": 1, "messages": 2, "runs": 1, "events": 7}[table]
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []


def test_sse_persisted_order_cursor_and_replay(tmp_path):
    path = tmp_path / "events.sqlite3"
    with client(path) as c:
        sid = create(c, "事件")
        run = start(c, sid, "固定测试")
        base = f"/sessions/{sid}/runs/{run['id']}"
        events = frames(c.get(base + "/events"))
        assert [e["sequence"] for e in events] == list(range(1, 8))
        assert [e["type"] for e in events] == ["run_started", "message_started", "status", "text_delta", "text_delta", "message_completed", "run_completed"]
        assert "".join(e["payload"]["text"] for e in events if e["type"] == "text_delta") == run["answer"]
        with sqlite3.connect(path) as db:
            for e in events:
                row = db.execute("SELECT envelope FROM events WHERE run_id=? AND sequence=?", (run["id"], e["sequence"])).fetchone()
                assert json.loads(row[0]) == e
        assert frames(c.get(base + "/events", headers={"Last-Event-ID": run["id"] + ":4"})) == events[4:]
        assert frames(c.get(base + "/events?after_sequence=7")) == []
        assert c.get(base + "/events?after_sequence=8").status_code == 400
        assert c.get(base + "/events", headers={"Last-Event-ID": "another:1"}).status_code == 400
        assert c.get(base + "/events", headers={"Last-Event-ID": run["id"] + ":" + "9" * 5000}).status_code == 400
        assert c.get(base + "/events?after_sequence=-1").status_code == 422
        assert c.get(base + "/event-log?after_sequence=2&limit=2").json() == {"events": events[2:4], "last_sequence": 7}
        assert frames(c.get(base + "/events")) == events
        assert c.get(f"/sessions/{sid}").json()["message_count"] == 2
    with client(path) as c:
        assert frames(c.get(base + "/events?after_sequence=3")) == events[3:]


def test_repeat_migration_and_parallel_runs(tmp_path):
    database = Database(tmp_path / "parallel.sqlite3")
    try:
        database.migrate()
        store = Store(database)
        sid = store.create_session("并发").id
        with ThreadPoolExecutor(max_workers=4) as pool:
            runs = list(pool.map(lambda n: store.start_fixture(sid, str(n)), range(8)))
        database.migrate()
        database.migrate()
        assert store.session(sid).message_count == 16
        assert [m.sequence for m in store.messages(sid)] == list(range(1, 17))
        assert [m.role for m in store.messages(sid)] == ["user", "assistant"] * 8
        assert len({r.id for r in runs}) == 8
        for run in runs:
            assert [e.sequence for e in store.events(sid, run.id).events] == list(range(1, 8))
        with database.engine.connect() as connection:
            assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "0015_calendar"
            assert connection.exec_driver_sql("PRAGMA foreign_key_check").all() == []
    finally:
        database.close()


def test_run_write_failure_rolls_back_every_record(tmp_path):
    database = Database(tmp_path / "rollback.sqlite3")
    try:
        database.migrate()
        store = Store(database)
        sid = store.create_session("原子性").id

        def fail_events(_conn, _cursor, statement, _parameters, _context, _many):
            if statement.startswith("INSERT INTO events"):
                raise RuntimeError("injected persistence failure")

        event.listen(database.engine, "before_cursor_execute", fail_events)
        with pytest.raises(RuntimeError, match="injected"):
            store.start_fixture(sid, "不能产生半条运行")
        event.remove(database.engine, "before_cursor_execute", fail_events)
        assert store.messages(sid) == []
        assert store.runs(sid) == []
        assert store.session(sid).message_count == 0
        with database.engine.connect() as connection:
            assert connection.scalar(text("SELECT COUNT(*) FROM events")) == 0
    finally:
        database.close()


def test_contract_auth_validation_and_schema_export_no_database(tmp_path, monkeypatch):
    path = tmp_path / "must-not-exist" / "schema.sqlite3"
    monkeypatch.setenv("RESEARCH_TRAIL_DB_PATH", str(path))
    schema = create_app(TOKEN).openapi()
    assert not path.parent.exists()
    assert "discriminator" in schema["components"]["schemas"]["EventPage"]["properties"]["events"]["items"]
    with client(tmp_path / "validation.sqlite3") as c:
        assert c.get("/sessions", headers={"X-ResearchTrail-Token": "wrong"}).status_code == 401
        for body in ({"title": " "}, {"title": "x", "path": "anything"}):
            assert c.post("/sessions", json=body).status_code == 422
        sid = create(c, "验证")
        assert c.post(f"/sessions/{sid}/runs", json={"input": " "}).status_code == 422
        assert c.get("/sessions/missing").status_code == 404


def test_database_foreign_key_rejects_cross_session_messages(tmp_path):
    database = Database(tmp_path / "constraints.sqlite3")
    try:
        database.migrate()
        store = Store(database)
        a, b = store.create_session("甲").id, store.create_session("乙").id
        run = store.start_fixture(a, "约束")
        from sqlalchemy.exc import IntegrityError
        with pytest.raises(IntegrityError):
            with database.write() as db:
                db.execute(text("UPDATE messages SET session_id=:sid WHERE run_id=:rid"), {"sid": b, "rid": run.id})
        assert len(store.messages(a)) == 2
        assert store.messages(b) == []
    finally:
        database.close()
