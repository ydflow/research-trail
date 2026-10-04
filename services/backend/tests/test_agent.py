import json
import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from research_trail.agent import AgentRunner
from research_trail.app import create_app
from research_trail.conversation import MODEL_LABEL, ToolArguments, ToolCall
from research_trail.database import Database
from research_trail.market import FixtureMarketProvider
from research_trail.model_provider import FakeModelProvider
from research_trail.store import Store
from research_trail.tools import ToolExecutionError, ToolRegistry, market_tools

TOKEN = "agent-test-token-" * 4
HEADERS = {"X-ResearchTrail-Token": TOKEN}


class RecordingDataProvider(FixtureMarketProvider):
    def __init__(self):
        self.calls = []

    def snapshot(self, symbol):
        self.calls.append(symbol)
        return super().snapshot(symbol)


def create(c, title="规则测试"):
    return c.post("/sessions", json={"title": title}).json()["id"]


def run(c, sid, text):
    response = c.post(f"/sessions/{sid}/runs", json={"input": text, "kind": "fake_agent"})
    assert response.status_code == 201
    record = response.json()
    events = c.get(f"/sessions/{sid}/runs/{record['id']}/event-log").json()["events"]
    assert record["model_label"] == MODEL_LABEL
    assert record["kind"] == "fake_agent"
    assert [e["sequence"] for e in events] == list(range(1, record["last_sequence"] + 1))
    assert {e["run_id"] for e in events} == {record["id"]}
    assert {e["session_id"] for e in events} == {sid}
    assert [e["type"] for e in events].count("run_completed") == 1
    assert "".join(e["payload"]["text"] for e in events if e["type"] == "text_delta") == record["answer"]
    return record, events


@pytest.mark.parametrize(("prompt", "tool", "symbol", "kind"), [
    ("查询AAPL.US行情", "market.quote", "AAPL.US", "quote"),
    ("查看NVDA.US的K线", "market.kline", "NVDA.US", "kline"),
    (" 查询msft.us的行情。 ", "market.quote", "MSFT.US", "quote"),
    ("查看TSLA.US的K线", "market.kline", "TSLA.US", "kline"),
])
def test_rule_uses_python_tools_and_persists_proof(tmp_path, prompt, tool, symbol, kind):
    provider = RecordingDataProvider()
    path = tmp_path / "agent.sqlite3"
    with TestClient(create_app(TOKEN, provider, database_path=path), headers=HEADERS) as c:
        sid = create(c)
        record, events = run(c, sid, prompt)
        assert record["status"] == "completed" and record["error"] is None
        assert provider.calls == [symbol]
        assert [e["type"] for e in events] == ["run_started", "message_started", "status", "tool_started", "tool_result", "text_delta", "message_completed", "run_completed"]
        started, result = events[3]["payload"], events[4]["payload"]
        assert started["name"] == result["name"] == tool
        assert started["call_id"] == result["call_id"]
        assert started["input"] == {"symbol": symbol}
        data = result["result"]["data"]
        assert result["result"]["ok"] is True and data["kind"] == kind
        assert data["data_label"] == "模拟数据" and data["source"] == "fixture"
        assert data["market_time"] == "2024-01-16T21:00:00Z"
        price = data["quote"]["last_price"] if kind == "quote" else data["klines"][-1]["close"]
        assert f"{price:.2f}" in record["answer"]
        assert "非实时行情" in record["answer"]
        if kind == "kline":
            assert len(data["klines"]) == 10
        with sqlite3.connect(path) as db:
            saved = db.execute("SELECT envelope FROM events WHERE run_id=? ORDER BY sequence", (record["id"],)).fetchall()
            assert [json.loads(row[0]) for row in saved] == events
        for _ in range(2):
            sse = c.get(f"/sessions/{sid}/runs/{record['id']}/events?after_sequence=3")
            assert sse.status_code == 200 and "event: tool_started" in sse.text
        assert provider.calls == [symbol]
        assert c.get(f"/sessions/{sid}").json()["message_count"] == 2
    with TestClient(create_app(TOKEN, provider, database_path=path), headers=HEADERS) as c:
        assert c.get(f"/sessions/{sid}/runs/{record['id']}").json() == record
        assert c.get(f"/sessions/{sid}/runs/{record['id']}/event-log").json()["events"] == events
        assert provider.calls == [symbol]


@pytest.mark.parametrize(("symbol", "prompt", "initial", "updated"), [
    ("AAPL.US", "查询AAPL.US行情", "189.43", "190.43"),
    ("NVDA.US", "查看NVDA.US的K线", "880.12", "881.12"),
])
def test_fixture_changes_answer_without_changing_model(tmp_path, monkeypatch, symbol, prompt, initial, updated):
    from research_trail import market
    provider, model = RecordingDataProvider(), FakeModelProvider()
    with TestClient(create_app(TOKEN, provider, model_provider=model, database_path=tmp_path / "changed.sqlite3"), headers=HEADERS) as c:
        sid = create(c)
        before, before_events = run(c, sid, prompt)
        assert initial in before["answer"]
        monkeypatch.setattr(market, "_EXAMPLES", tuple(
            (code, name, (*prices[:-1], float(updated))) if code == symbol else (code, name, prices)
            for code, name, prices in market._EXAMPLES))
        after, _ = run(c, sid, prompt)
        assert updated in after["answer"] and initial not in after["answer"]
        assert c.get(f"/market/snapshot/{symbol}").json()["quote"]["last_price"] == float(updated)
        assert c.get(f"/sessions/{sid}/runs/{before['id']}/event-log").json()["events"] == before_events
        assert c.get(f"/sessions/{sid}/runs/{before['id']}").json()["answer"] == before["answer"]


@pytest.mark.parametrize("prompt", ["你好", "买入AAPL.US", "查询AAPL.US和NVDA.US行情", "查看K线", "查询0700.HK行情"])
def test_unsupported_intent_has_scope_and_no_tool_call(tmp_path, prompt):
    provider = RecordingDataProvider()
    with TestClient(create_app(TOKEN, provider, database_path=tmp_path / "scope.sqlite3"), headers=HEADERS) as c:
        record, events = run(c, create(c), prompt)
        assert record["status"] == "completed" and record["error"] is None
        assert "当前规则演示只支持" in record["answer"]
        assert "查询AAPL.US行情" in record["answer"] and "查看NVDA.US的K线" in record["answer"]
        assert provider.calls == []
        assert not any(e["type"].startswith("tool_") for e in events)


@pytest.mark.parametrize("mode", ["unknown", "provider", "wrong_symbol", "invalid_data", "invalid_kline"])
def test_tool_failure_is_failed_run_not_success(tmp_path, mode):
    class BrokenProvider(RecordingDataProvider):
        def snapshot(self, symbol):
            if mode == "provider":
                self.calls.append(symbol)
                raise RuntimeError("private-provider-debug-text")
            result = super().snapshot("MSFT.US" if mode == "wrong_symbol" else symbol)
            if mode == "invalid_data":
                result.quote.last_price = float("nan")
            if mode == "invalid_kline":
                result.klines[1].timestamp = result.klines[0].timestamp
            return result

    provider = BrokenProvider()
    prompt = "查询ZZZZ.US行情" if mode == "unknown" else "查看NVDA.US的K线" if mode == "invalid_kline" else "查询AAPL.US行情"
    with TestClient(create_app(TOKEN, provider, database_path=tmp_path / "failure.sqlite3"), headers=HEADERS) as c:
        sid = create(c)
        record, events = run(c, sid, prompt)
        assert record["status"] == "failed"
        assert record["error"]["code"] == {"unknown": "UNKNOWN_SYMBOL", "provider": "PROVIDER_ERROR",
                                            "wrong_symbol": "INVALID_RESULT", "invalid_data": "PROVIDER_ERROR", "invalid_kline": "PROVIDER_ERROR"}[mode]
        assert "运行失败" in record["answer"]
        assert "private-provider-debug-text" not in json.dumps(record)
        result = next(e["payload"]["result"] for e in events if e["type"] == "tool_result")
        assert result == {"ok": False, "error": record["error"]}
        assert next(e["payload"] for e in events if e["type"] == "error") == record["error"]
        assert events[-1]["payload"] == {"stop_reason": "error"}
        assert c.get(f"/sessions/{sid}/messages").json()[-1]["content"] == record["answer"]


@pytest.mark.parametrize("phase", ["plan", "respond"])
def test_model_provider_replaced_independently_and_error_is_terminal(tmp_path, phase):
    class BrokenModel(FakeModelProvider):
        def plan(self, text):
            if phase == "plan":
                raise RuntimeError("model private text")
            return super().plan(text)

        def respond(self, data):
            raise RuntimeError("model private text")

    provider = RecordingDataProvider()
    with TestClient(create_app(TOKEN, provider, model_provider=BrokenModel(), database_path=tmp_path / "model.sqlite3"), headers=HEADERS) as c:
        record, events = run(c, create(c), "查询AAPL.US行情")
        assert record["status"] == "failed" and record["error"]["code"] == "MODEL_ERROR"
        assert provider.calls == ([] if phase == "plan" else ["AAPL.US"])
        assert events[-1]["payload"]["stop_reason"] == "error"
        if phase == "respond":
            assert next(e for e in events if e["type"] == "tool_result")["payload"]["result"]["ok"] is True


def test_registry_allowlist_arguments_and_explicit_public_error():
    provider = RecordingDataProvider()
    registry = market_tools(provider)
    with pytest.raises(ValueError):
        registry.register("shell.exec", lambda _: None)
    with pytest.raises(ValueError):
        registry.register("market.quote", lambda _: None)
    with pytest.raises(ValidationError):
        ToolCall(name="shell.exec", arguments={"symbol": "AAPL.US"})
    call = ToolCall.model_construct(name="market.quote", arguments=ToolArguments.model_construct(symbol="../health"))
    with pytest.raises(ToolExecutionError, match="股票参数") as failure:
        registry.execute(call)
    assert failure.value.error.code == "INVALID_ARGUMENT"
    assert provider.calls == []
    empty = ToolRegistry()
    with pytest.raises(ToolExecutionError, match="未注册"):
        empty.execute(ToolCall(name="market.quote", arguments={"symbol": "AAPL.US"}))
    empty.register("market.quote", lambda _: (_ for _ in ()).throw(ToolExecutionError("FIXTURE_UNAVAILABLE", "测试数据源不可用")))
    events = []
    outcome = AgentRunner(FakeModelProvider(), empty).run("查询AAPL.US行情", lambda kind, payload: events.append((kind, payload)))
    assert outcome.status == "failed" and outcome.error.message == "测试数据源不可用"
    assert events[-1] == ("error", outcome.error.model_dump())


def test_agent_session_isolation(tmp_path):
    with TestClient(create_app(TOKEN, database_path=tmp_path / "isolation.sqlite3"), headers=HEADERS) as c:
        a, b = create(c, "甲"), create(c, "乙")
        ra, _ = run(c, a, "查询AAPL.US行情")
        rb, _ = run(c, b, "查看NVDA.US的K线")
        assert c.get(f"/sessions/{b}/runs/{ra['id']}/events").status_code == 404
        assert c.get(f"/sessions/{a}/runs/{rb['id']}").status_code == 404
        assert "NVDA.US" not in json.dumps(c.get(f"/sessions/{a}/messages").json())
        assert c.delete(f"/sessions/{a}").status_code == 204
        assert c.get(f"/sessions/{b}/runs/{rb['id']}").json()["status"] == "completed"


def test_step3_database_upgrade_retains_history_and_adds_agent(tmp_path):
    seed = Database(tmp_path / "seed.sqlite3")
    seed.migrate()
    store = Store(seed)
    sid = store.create_session("旧会话").id
    old = store.start_fixture(sid, "第3步历史")
    events_before = store.events(sid, old.id).model_dump(mode="json")
    seed.close()
    with sqlite3.connect(seed.path) as db:
        db.row_factory = sqlite3.Row
        rows = {table: [dict(row) for row in db.execute(f"SELECT * FROM {table}")] for table in ("sessions", "runs", "messages", "events")}
    database = Database(tmp_path / "old.sqlite3")
    try:
        cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        with database.engine.connect() as connection:
            connection.exec_driver_sql("BEGIN IMMEDIATE")
            cfg.attributes["connection"] = connection
            command.upgrade(cfg, "0001_conversation")
            connection.commit()
        with sqlite3.connect(database.path) as db:
            for table, records in rows.items():
                for record in records:
                    if table == "runs":
                        record.pop("model_label"); record.pop("error")
                    columns = ','.join(record)
                    db.execute(f"INSERT INTO {table} ({columns}) VALUES ({','.join('?' for _ in record)})", tuple(record.values()))
        database.migrate()
        database.migrate()
        upgraded = Store(database)
        assert upgraded.run(sid, old.id).model_dump(mode="json") == old.model_dump(mode="json")
        assert upgraded.events(sid, old.id).model_dump(mode="json") == events_before
        assert upgraded.messages(sid)[0].content == "第3步历史"
        result = upgraded.start_agent(sid, "查询AAPL.US行情", AgentRunner(FakeModelProvider(), market_tools(FixtureMarketProvider())))
        assert result.status == "completed" and upgraded.session(sid).message_count == 4
    finally:
        database.close()
