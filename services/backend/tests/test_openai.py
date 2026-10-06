"""Simulated Chat Completions through the real adapter/runner/store; no external calls."""
import asyncio
from copy import deepcopy
import json
import threading
import time

from fastapi.testclient import TestClient
import httpx
import pytest
from sqlalchemy import text

from research_trail.app import create_app
from research_trail.conversation import LIVE_MODEL_LABEL
from research_trail.database import Database
from research_trail.market import FixtureMarketProvider
from research_trail.openai_provider import ModelConfiguration, ModelError, OpenAIModelProvider
from research_trail.settings import ConnectionInput
from research_trail.store import Store

TOKEN = "openai-offline-test-" * 4
HEADERS = {"X-ResearchTrail-Token": TOKEN}
SECRET = "test-only-model-secret-never-serialize"


class Vault:
    def __init__(self):
        self.values = {}

    def get(self, key):
        return self.values.get(key)

    def set(self, key, value):
        self.values[key] = value

    def delete(self, key):
        self.values.pop(key, None)


class Data(FixtureMarketProvider):
    def __init__(self):
        self.calls = []

    def snapshot(self, symbol):
        self.calls.append(symbol)
        return super().snapshot(symbol)


def call(identity="call_1", name="market_quote", arguments='{"symbol":"AAPL.US"}'):
    return {"id": identity, "type": "function", "function": {"name": name, "arguments": arguments}}


def response(*calls, answer="依据工具：模拟数据，非实时行情。"):
    message = {"role": "assistant", "content": None if calls else answer}
    if calls:
        message["tool_calls"] = list(calls)
    return httpx.Response(200, json={"choices": [{"finish_reason": "tool_calls" if calls else "stop", "message": message}]})


@pytest.fixture
def setup(tmp_path):
    clients = []

    def start(handler, **limits):
        data, vault, requests = Data(), Vault(), []

        async def exchange(request):
            assert request.method == "POST" and str(request.url) == "https://model.invalid/v1/chat/completions"
            assert request.headers["authorization"] == "Bearer " + SECRET
            body = json.loads(request.content)
            requests.append(deepcopy(body))
            value = handler(body, len(requests))
            return await value if hasattr(value, "__await__") else value

        path = tmp_path / f"model-{len(clients)}.sqlite3"
        app = create_app(TOKEN, data, database_path=path, credential_vault=vault,
                         openai_transport=httpx.MockTransport(exchange))
        client = TestClient(app, headers=HEADERS)
        client.__enter__()
        clients.append(client)
        config = {"endpoint": "https://model.invalid/v1", "model": "offline-test-model", "requires_credential": True, **limits}
        assert client.put("/settings/connections/model", json=config).status_code == 200
        assert client.put("/settings/connections/model/credential", json={"secret": SECRET}).status_code == 200
        sid = client.post("/sessions", json={"title": "模拟协议验收"}).json()["id"]
        return client, app, sid, data, requests, path

    yield start
    for client in reversed(clients):
        client.__exit__(None, None, None)


def begin(client, sid, **body):
    result = client.post(f"/sessions/{sid}/runs", json={"input": "查询AAPL.US行情", "kind": "openai_agent", **body})
    assert result.status_code == 201
    return result.json()


def finish(client, sid, record):
    deadline = time.monotonic() + 5
    while record["status"] == "running" and time.monotonic() < deadline:
        time.sleep(0.01)
        record = client.get(f"/sessions/{sid}/runs/{record['id']}").json()
    assert record["status"] != "running"
    events = client.get(f"/sessions/{sid}/runs/{record['id']}/event-log").json()["events"]
    assert [e["sequence"] for e in events] == list(range(1, len(events) + 1))
    assert sum(e["type"] == "run_completed" for e in events) == 1
    assert "".join(e["payload"]["text"] for e in events if e["type"] == "text_delta") == record["answer"]
    return record, events


def test_multiround_returns_tool_data_and_shares_events_with_fake(setup):
    def model(body, n):
        assert body["model"] == "offline-test-model" and body["stream"] is False
        assert {t["function"]["name"] for t in body["tools"]} == {"market_quote", "market_kline", "portfolio_risk", "stocks_compare"}
        assert all(t["function"]["parameters"]["additionalProperties"] is False for t in body["tools"])
        if n == 1:
            assert [m["role"] for m in body["messages"]] == ["system", "user"]
            return response(call())
        tool = json.loads(body["messages"][-1]["content"])
        assert body["messages"][-1]["tool_call_id"] == ("call_1" if n == 2 else "call_2")
        assert tool["ok"] is True and tool["data"]["data_label"] == "模拟数据"
        if n == 2:
            assert tool["data"]["quote"]["last_price"] == 189.43
            return response(call("call_2", "market_kline", '{"symbol":"NVDA.US"}'))
        assert tool["data"]["kind"] == "kline" and tool["data"]["symbol"] == "NVDA.US"
        return response(answer="两轮工具已返回；模拟数据，非实时。")

    c, app, sid, data, requests, path = setup(model)
    record, events = finish(c, sid, begin(c, sid))
    assert record["kind"] == "openai_agent" and record["model_label"] == LIVE_MODEL_LABEL
    assert record["status"] == "completed" and len(requests) == 3
    assert data.calls == ["AAPL.US", "NVDA.US"]
    assert [e["payload"]["name"] for e in events if e["type"] == "tool_started"] == ["market.quote", "market.kline"]
    saved = c.get(f"/sessions/{sid}/snapshot").json()
    # Snapshot/finite SSE are reads, never additional model requests.
    assert c.get(f"/sessions/{sid}/runs/{record['id']}/events").status_code == 200
    assert c.get(f"/sessions/{sid}/snapshot").json() == saved and len(requests) == 3
    fake, fake_events = finish(c, sid, begin(c, sid, kind="fake_agent"))
    assert fake["status"] == "completed" and data.calls[-1] == "AAPL.US" and len(requests) == 3
    assert {e["type"] for e in fake_events} == {e["type"] for e in events}
    assert c.get("/settings/connections").json()[1]["status"] == "unconfigured"


@pytest.mark.parametrize(("status", "code", "retryable"), [(401, "MODEL_AUTH_FAILED", False), (403, "MODEL_AUTH_FAILED", False),
                         (429, "MODEL_RATE_LIMIT", True), (500, "MODEL_HTTP_ERROR", True), (302, "MODEL_HTTP_ERROR", False)])
def test_http_failures_are_safe_terminal_without_retry(setup, caplog, status, code, retryable):
    c, app, sid, data, requests, path = setup(lambda body, n: httpx.Response(status, text=SECRET,
                                                       headers={"location": "https://other.invalid/"}))
    record, events = finish(c, sid, begin(c, sid))
    assert record["status"] == "failed" and record["error"]["code"] == code
    assert record["error"]["retryable"] is retryable
    assert len(requests) == 1 and data.calls == []
    assert SECRET not in json.dumps([record, events, c.get("/settings/diagnostics").json()]) + caplog.text
    assert SECRET.encode() not in path.read_bytes()


@pytest.mark.parametrize("bad", ["not-json", "large", "empty", "length", "wrong-role", "two-choices", "non-object", "empty-tool-object", "false-tools"])
def test_abnormal_responses_do_not_execute_tools(setup, bad):
    def model(body, n):
        if bad == "not-json": return httpx.Response(200, text=SECRET)
        if bad == "large": return httpx.Response(200, content=b" " * (256 * 1024 + 1))
        if bad == "empty": return response(answer="")
        if bad == "non-object": return httpx.Response(200, json=[])
        content = {"choices": [{"finish_reason": "stop", "message": {"role": "assistant", "content": "reply"}}]}
        if bad == "length": content["choices"][0]["finish_reason"] = "length"
        if bad == "wrong-role": content["choices"][0]["message"]["role"] = "user"
        if bad == "two-choices": content["choices"] *= 2
        if bad == "empty-tool-object": content["choices"][0]["message"]["tool_calls"] = {}
        if bad == "false-tools": content["choices"][0]["message"]["tool_calls"] = False
        return httpx.Response(200, json=content)
    c, app, sid, data, requests, path = setup(model)
    record, events = finish(c, sid, begin(c, sid))
    assert record["status"] == "failed" and data.calls == []
    assert record["error"]["code"] == ("MODEL_RESPONSE_LIMIT" if bad == "large" else "MODEL_RESPONSE_INVALID")
    assert SECRET not in json.dumps([record, events])


@pytest.mark.parametrize(("name", "arguments", "code"), [("shell_exec", '{"symbol":"AAPL.US"}', "UNKNOWN_TOOL"),
                          ("market_quote", '{"symbol":"0700.HK"}', "INVALID_ARGUMENT"),
                          ("market_quote", '{"symbol":"AAPL.US","path":"private"}', "INVALID_ARGUMENT"),
                          ("market_quote", '{"symbol":"AAPL.US","symbol":"NVDA.US"}', "INVALID_ARGUMENT"),
                          ("market_quote", '[]', "INVALID_ARGUMENT"), ("market_quote", SECRET, "INVALID_ARGUMENT")])
def test_whole_batch_validated_before_any_execution(setup, name, arguments, code):
    c, app, sid, data, requests, path = setup(lambda body, n: response(call(), call("call_bad", name, arguments)))
    record, events = finish(c, sid, begin(c, sid))
    assert record["status"] == "failed" and record["error"]["code"] == code
    assert data.calls == [] and not any(e["type"].startswith("tool_") for e in events)
    assert SECRET not in json.dumps([record, events])


def test_default_limit_eight_is_effective_and_not_nine_executions(setup):
    c, app, sid, data, requests, path = setup(lambda body, n: response(call(f"call_{n}")))
    record, events = finish(c, sid, begin(c, sid))
    assert record["error"]["code"] == "TOOL_LIMIT"
    assert len(data.calls) == 8 and len(requests) == 9
    assert sum(e["type"] == "tool_result" for e in events) == 8


def test_batch_cannot_bypass_total_limit_and_final_reply_is_allowed(setup):
    c, app, sid, data, requests, path = setup(lambda body, n: response(call(), call("second")), max_tool_rounds=1)
    record, _ = finish(c, sid, begin(c, sid))
    assert record["error"]["code"] == "TOOL_LIMIT" and data.calls == [] and len(requests) == 1
    c2, app2, sid2, data2, requests2, path2 = setup(lambda body, n: response(call()) if n == 1 else response(), max_tool_rounds=1)
    record2, _ = finish(c2, sid2, begin(c2, sid2))
    assert record2["status"] == "completed" and len(data2.calls) == 1 and len(requests2) == 2


def test_duplicate_id_cannot_repeat_tool_execution(setup):
    c, app, sid, data, requests, path = setup(lambda body, n: response(call("same_id")))
    record, _ = finish(c, sid, begin(c, sid))
    assert record["error"]["code"] == "MODEL_RESPONSE_INVALID" and data.calls == ["AAPL.US"]


@pytest.mark.parametrize(("action", "code"), [("cancel", None), ("request-timeout", "MODEL_TIMEOUT"), ("run-timeout", "RUN_TIMEOUT")])
def test_blocked_http_is_cancelled_and_worker_exits(setup, action, code):
    entered, closed = threading.Event(), threading.Event()
    async def blocked(body, n):
        entered.set()
        try:
            await asyncio.sleep(30)
            return response(call())
        finally:
            closed.set()
    limits = {"run_timeout_seconds": 1 if action == "run-timeout" else 3,
              "request_timeout_seconds": 1 if action == "request-timeout" else 3}
    c, app, sid, data, requests, path = setup(blocked, **limits)
    record = begin(c, sid)
    assert entered.wait(2)
    if action == "cancel":
        cancelled = c.post(f"/sessions/{sid}/runs/{record['id']}/cancel").json()
        assert cancelled["status"] == "cancelled"
    record, events = finish(c, sid, record)
    assert closed.wait(1)
    deadline = time.monotonic() + 1
    while app.state.manager.work and time.monotonic() < deadline:
        time.sleep(0.01)
    assert not app.state.manager.work and data.calls == [] and len(requests) == 1
    assert record["status"] == ("cancelled" if action == "cancel" else "timed_out")
    assert (record["error"]["code"] if record["error"] else None) == code
    time.sleep(0.08)
    assert c.get(f"/sessions/{sid}/runs/{record['id']}/event-log").json()["events"] == events


def test_network_failure_and_reflected_key_are_redacted(setup, caplog):
    def failure(body, n):
        raise httpx.ConnectError(SECRET)
    c, app, sid, data, requests, path = setup(failure)
    record, events = finish(c, sid, begin(c, sid))
    assert record["error"]["code"] == "MODEL_NETWORK_ERROR"
    c2, app2, sid2, data2, requests2, path2 = setup(lambda body, n: response(answer="reflection: " + SECRET))
    record2, events2 = finish(c2, sid2, begin(c2, sid2))
    assert record2["status"] == "completed" and "[已脱敏]" in record2["answer"]
    assert SECRET not in json.dumps([record, events, record2, events2]) + caplog.text
    for suffix in ("", "-wal", "-shm"):
        file = path2.parent / (path2.name + suffix)
        if file.exists():
            assert SECRET.encode() not in file.read_bytes()


def test_inflight_run_keeps_atomic_configuration_snapshot(setup):
    entered, release = threading.Event(), threading.Event()
    async def model(body, n):
        if n == 1:
            entered.set()
            while not release.is_set():
                await asyncio.sleep(0.01)
            return response(call())
        return response(call("second_call"))
    c, app, sid, data, requests, path = setup(model, max_tool_rounds=1)
    record = begin(c, sid)
    assert entered.wait(2)
    try:
        assert c.put("/settings/connections/model", json={"endpoint": "https://other.invalid/v1", "model": "new-model", "max_tool_rounds": 2}).status_code == 200
        assert c.put("/settings/connections/model/credential", json={"secret": "test-only-new-key"}).status_code == 200
    finally:
        release.set()
    record, _ = finish(c, sid, record)
    assert record["error"]["code"] == "TOOL_LIMIT" and data.calls == ["AAPL.US"]
    assert len(requests) == 2 and all(r["model"] == "offline-test-model" for r in requests)


def test_cancel_closes_actual_loopback_http_socket(tmp_path):
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    entered, disconnected = threading.Event(), threading.Event()

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, *args):
            pass

        def do_POST(self):
            self.rfile.read(int(self.headers["Content-Length"]))
            assert self.path == "/v1/chat/completions" and self.headers["Authorization"] == "Bearer " + SECRET
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", "20")
            self.end_headers(); self.wfile.flush()
            entered.set()
            self.connection.settimeout(3)
            try:
                if self.rfile.read(1) == b"":
                    disconnected.set()
            except OSError:
                pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        app = create_app(TOKEN, database_path=tmp_path / "socket.sqlite3", credential_vault=Vault())
        with TestClient(app, headers=HEADERS) as c:
            assert c.put("/settings/connections/model", json={"endpoint": f"http://127.0.0.1:{server.server_port}/v1", "model": "socket-test"}).status_code == 200
            assert c.put("/settings/connections/model/credential", json={"secret": SECRET}).status_code == 200
            sid = c.post("/sessions", json={"title": "本机HTTP取消"}).json()["id"]
            record = begin(c, sid)
            assert entered.wait(2)
            assert c.post(f"/sessions/{sid}/runs/{record['id']}/cancel").json()["status"] == "cancelled"
            assert disconnected.wait(2)
            finished, _ = finish(c, sid, record)
            assert finished["status"] == "cancelled"
    finally:
        server.shutdown(); server.server_close(); thread.join(2)


def test_missing_configuration_never_falls_back_to_fake(setup):
    c, app, sid, data, requests, path = setup(lambda body, n: response())
    c.delete("/settings/connections/model/credential")
    record, _ = finish(c, sid, begin(c, sid))
    assert record["status"] == "failed" and record["error"]["code"] == "MODEL_CREDENTIAL_MISSING"
    c.delete("/settings/connections/model")
    record, _ = finish(c, sid, begin(c, sid))
    assert record["error"]["code"] == "MODEL_UNCONFIGURED" and data.calls == [] and requests == []
    assert c.post(f"/sessions/{sid}/runs", json={"input": "query", "kind": "openai_agent", "scenario": "delayed"}).status_code == 422


def test_remote_plaintext_and_disabled_configuration_cannot_send_key(setup):
    c, app, sid, data, requests, path = setup(lambda body, n: response())
    c.put("/settings/connections/model", json={"endpoint": "http://model.invalid/v1", "model": "demo-model"})
    record, _ = finish(c, sid, begin(c, sid))
    assert record["error"]["code"] == "MODEL_CONFIG_INVALID" and requests == []
    c.put("/settings/connections/model", json={"endpoint": "https://model.invalid/v1", "model": "demo-model", "enabled": False})
    record, _ = finish(c, sid, begin(c, sid))
    assert record["error"]["code"] == "MODEL_UNCONFIGURED" and requests == []


@pytest.mark.parametrize("field,value", [("max_tool_rounds", 0), ("max_tool_rounds", 33), ("max_tool_rounds", True),
                          ("run_timeout_seconds", 601), ("request_timeout_seconds", 0)])
def test_limits_reject_invalid_values(field, value):
    with pytest.raises(ValueError):
        ConnectionInput(**{field: value})


def test_live_verifier_missing_configuration_is_not_a_success(tmp_path):
    from research_trail.verify_live import verify
    path = tmp_path / "does-not-exist.sqlite3"
    assert verify(path, execute=True) == {"real_validation": "not_executed", "reason": "MODEL_UNCONFIGURED", "requests_started": 0}
    assert not path.exists()


def test_live_verifier_two_request_budget_and_daily_db_unchanged(setup, monkeypatch):
    from research_trail import verify_live
    c, app, sid, data, unused, path = setup(lambda body, n: response())
    before = c.get(f"/sessions/{sid}/snapshot").json()
    source_rows = c.get("/settings/connections").json()
    monkeypatch.setattr(verify_live, "WindowsCredentialVault", lambda: app.state.settings.vault)
    requests = []
    def simulated(request):
        body = json.loads(request.content); requests.append(body)
        assert request.headers["authorization"] == "Bearer " + SECRET
        if len(requests) == 1:
            return response(call())
        assert json.loads(body["messages"][-1]["content"])["data"]["quote"]["symbol"] == "AAPL.US"
        return response()
    monkeypatch.setattr(verify_live, "OpenAIModelProvider", lambda cfg: OpenAIModelProvider(cfg, transport=httpx.MockTransport(simulated)))
    assert verify_live.verify(path)["reason"] == "CONFIGURED_REQUIRES_EXPLICIT_RUN" and requests == []
    result = verify_live.verify(path, execute=True)
    assert result["real_validation"] == "passed" and result["requests_started"] == 2 and result["tool_results"] == 1
    assert SECRET not in json.dumps(result) and SECRET not in repr(verify_live.read_configuration(path)[0])
    assert c.get(f"/sessions/{sid}/snapshot").json() == before and c.get("/settings/connections").json() == source_rows


def test_migrate_step8_preserves_configs_profile_and_history(tmp_path):
    from alembic import command
    from alembic.config import Config
    from pathlib import Path
    db = Database(tmp_path / "old-step8.sqlite3")
    try:
        cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        with db.engine.connect() as connection:
            db.migration_transaction(connection, lambda: command.upgrade(cfg, "0004_settings"), cfg)
            connection.execute(text("INSERT INTO connections (kind,enabled,endpoint,model,requires_credential,fake_result,credential_ref,revision,status,reason,checked_at) VALUES ('model',1,'https://model.invalid/v1','old-model',0,'success',NULL,3,'ready','DEMO_OK','old-time')"))
            connection.execute(text("INSERT INTO profile VALUES (1,'old-profile','balanced')"))
            connection.commit()
        store = Store(db)
        sid = store.create_session("旧会话").id
        store.start_fixture(sid, "旧输入")
        before = store.snapshot(sid).model_dump()
        db.migrate(); db.migrate()
        assert store.snapshot(sid).model_dump() == before
        with db.engine.connect() as connection:
            row = connection.execute(text("SELECT * FROM connections")).mappings().one()
            assert row["model"] == "old-model" and row["revision"] == 3 and row["checked_at"] == "old-time"
            assert (row["max_tool_rounds"], row["run_timeout_seconds"], row["request_timeout_seconds"]) == (8, 120, 30)
            assert connection.scalar(text("SELECT display_name FROM profile")) == "old-profile"
    finally:
        db.close()
