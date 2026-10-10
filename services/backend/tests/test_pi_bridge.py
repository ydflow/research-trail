"""Real pi integration unless a test explicitly names a hostile transport stub."""
import json
from pathlib import Path
import shutil
import threading
import time

import pytest

from research_trail.agent import AgentRunner
from research_trail.market import FixtureMarketProvider
from research_trail.model_provider import FakeModelProvider
from research_trail.pi_bridge import (PiOfflineBridge, Pipe, BridgeError, MAX_FRAME,
                                     worker_environment, strict_json, ROOT)
from research_trail.store import RunStopped
from research_trail.tools import market_tools

NODE = Path(shutil.which("node") or "missing-node").resolve()


class RecordingProvider(FixtureMarketProvider):
    def __init__(self): self.calls = []
    def snapshot(self, symbol):
        self.calls.append(symbol)
        return super().snapshot(symbol)


def call(identity="quote_1", name="market_quote", arguments='{"symbol":"AAPL.US"}'):
    return dict(id=identity, name=name, arguments=arguments)


def bridge_for(batches=None, **options):
    provider = RecordingProvider()
    bridge = PiOfflineBridge(market_tools(provider), node=NODE,
        batches=[[call()]] if batches is None else batches, **options)
    return bridge, provider


def execute(bridge, **options):
    events = []
    outcome = bridge.run("offline", lambda kind, payload: events.append((kind, payload)), **options)
    assert bridge.process is None or bridge.process.poll() is not None
    assert not any(t.is_alive() and t.name == "pi-pipe" for t in threading.enumerate())
    return outcome, events


def test_real_pi_loop_and_result_round_trip():
    bridge, provider = bridge_for()
    outcome, events = execute(bridge)
    assert outcome.status == "completed", outcome
    assert provider.calls == ["AAPL.US"] and bridge.execution_count == 1
    assert '189.43' in outcome.answer and 'fixture' in outcome.answer and '模拟数据' in outcome.answer
    assert bridge.proof["ready"]["agent"] == "Agent"
    assert bridge.proof["stats"] == dict(agent_start=1, assistant_batches=1, tool_execution_start=1,
        tool_execution_end=1, agent_end=1, stream_calls=2, results_seen=1)
    assert [kind for kind, _ in events] == ["status", "tool_started", "tool_result"]
    with pytest.raises(ValueError): execute(bridge)  # Single attempt, never replay/retry.


@pytest.mark.parametrize("bad,code", [
    (call(arguments='{"symbol":"bad"}'), "INVALID_ARGUMENT"),
    (call(arguments='{"symbol":"AAPL.US","symbol":"NVDA.US"}'), "INVALID_ARGUMENT"),
    (call(arguments='not-json'), "INVALID_ARGUMENT"),
    (call(arguments='{"symbol":"AAPL.US","mode":"real"}'), "INVALID_ARGUMENT"),
    (call(name="shell_exec"), "UNKNOWN_TOOL"),
    (call(identity="invalid/id"), "MODEL_RESPONSE_INVALID"),
    (call(arguments='{"symbol":"' + 'a' * 4100 + '"}'), "INVALID_ARGUMENT"),
])
def test_real_pi_invalid_single_batch_executes_zero(bad, code):
    bridge, provider = bridge_for([[bad]])
    outcome, events = execute(bridge)
    assert outcome.error.code == code
    assert provider.calls == [] and bridge.execution_count == 0
    assert bridge.observations["assistant_batches"] == 1
    assert bridge.observations["tool_execution_start"] == 0
    assert "tool_started" not in [kind for kind, _ in events]


@pytest.mark.parametrize("bad", [call("bad", arguments='{"symbol":"bad"}'), call("bad", "unregistered"), call("quote_1")])
def test_real_pi_mixed_batch_atomic_admission(bad):
    bridge, provider = bridge_for([[call(), bad]])
    outcome, _ = execute(bridge)
    assert outcome.status == "failed"
    assert provider.calls == [] and bridge.execution_count == 0
    assert bridge.observations["tool_execution_start"] == 0


def test_real_pi_sequential_order():
    bridge, provider = bridge_for([[call(), call("quote_2", arguments='{"symbol":"NVDA.US"}')]])
    outcome, events = execute(bridge)
    assert outcome.status == "completed"
    assert provider.calls == ["AAPL.US", "NVDA.US"]
    assert [kind for kind, _ in events][1:] == ["tool_started","tool_result","tool_started","tool_result"]
    assert bridge.proof["stats"]["results_seen"] == 2


@pytest.mark.parametrize("batches,max_calls,code", [
    ([[call(),call("two")]],1,"TOOL_LIMIT"),
    ([[call()],[call("two"),call("three")]],2,"TOOL_LIMIT"),
    ([[call()],[call()]],8,"MODEL_RESPONSE_INVALID"),
])
def test_real_pi_budget_or_duplicate_later_batch_no_new_execution(batches, max_calls, code):
    bridge, provider = bridge_for(batches, max_calls=max_calls)
    outcome, _ = execute(bridge)
    assert outcome.error.code == code
    assert len(provider.calls) == (0 if len(batches) == 1 else 1)
    assert bridge.execution_count == len(provider.calls)


def test_cancel_before_launch():
    bridge, provider = bridge_for()
    stop = threading.Event(); stop.set()
    with pytest.raises(RunStopped): execute(bridge, stop=stop)
    assert bridge.process is None and provider.calls == []


@pytest.mark.parametrize("action", ["cancel", "deadline", "tool_timeout", "crash"])
def test_real_pi_pending_tool_late_result_cannot_emit(action):
    bridge, provider = bridge_for(response_timeout=1.5)
    entered, release, finished, stop = (threading.Event() for _ in range(4))
    original = bridge.tools.execute
    def blocked(c):
        entered.set(); release.wait(4)
        try: return original(c)
        finally: finished.set()
    bridge.tools.execute = blocked
    events, outcomes, errors = [], [], []
    deadline = time.monotonic() + (0.8 if action == "deadline" else 8)
    def task():
        try: outcomes.append(bridge.run("offline", lambda k,p: events.append((k,p)), stop=stop, deadline=deadline))
        except Exception as error: errors.append(error)
    worker = threading.Thread(target=task); worker.start()
    assert entered.wait(1.5)
    if action == "cancel": stop.set()
    elif action == "crash": bridge.process.kill()
    worker.join(3)
    assert not worker.is_alive() and bridge.process.poll() is not None
    snapshot = list(events)
    release.set(); assert finished.wait(1)
    assert events == snapshot and not any(k == "tool_result" for k,p in events)
    assert bridge.execution_count == 1  # Started read-only Python handler cannot be killed.
    if action == "cancel": assert len(errors) == 1 and isinstance(errors[0], RunStopped)
    else:
        assert not errors, errors
        assert outcomes[0].error.code == {"deadline":"RUN_TIMEOUT","tool_timeout":"TOOL_TIMEOUT","crash":"PI_WORKER_EXIT"}[action]


def stub(tmp_path, mode):
    # Transport unit fixture, explicitly NOT a pi implementation.
    path = tmp_path / "有 空格 worker.cjs"
    path.write_text('''
const [run_id,attempt_id]=process.argv.slice(2);
let sequence=0;
function m(type,payload={},request_id='id_'+(sequence+1)) {return {version:1,run_id,attempt_id,sequence:++sequence,type,payload,request_id};}
const ready=m('ready',{package:'@earendil-works/pi-agent-core',version:'1.1.0',agent:'Agent',tool_execution:'sequential'});
const mode=''' + json.dumps(mode) + ''';
if(mode==='crash') process.exit(17);
else if(mode==='hang') setInterval(()=>{},1000);
else if(mode==='malformed') process.stdout.write('not-json\\n');
else if(mode==='oversize') process.stdout.write('x'.repeat(131073));
else if(mode==='wrong_run') {ready.run_id='other';process.stdout.write(JSON.stringify(ready)+'\\n');}
else if(mode==='duplicate_key') process.stdout.write(JSON.stringify(ready).replace('"version":1','"version":1,"version":1')+'\\n');
else if(mode==='duplicate') {const line=JSON.stringify(ready)+'\\n';process.stdout.write(line+line);}
else if(mode==='unknown') {process.stdout.write(JSON.stringify(ready)+'\\n'+JSON.stringify(m('unknown'))+'\\n');}
else if(mode==='sequence') {process.stdout.write(JSON.stringify(ready)+'\\n');const v=m('tool_batch',{calls:[]});v.sequence=7;process.stdout.write(JSON.stringify(v)+'\\n');}
else if(mode==='request_reuse') {process.stdout.write(JSON.stringify(ready)+'\\n'+JSON.stringify(m('observation',{event:'agent_start'},ready.request_id))+'\\n');}
else if(mode==='duplicate_tool') {
 process.stdout.write(JSON.stringify(ready)+'\\n'); let buffer='';
 process.stdin.on('data',c=>{buffer+=c;let i;while((i=buffer.indexOf('\\n'))>=0){const v=JSON.parse(buffer.slice(0,i));buffer=buffer.slice(i+1);
 if(v.type==='start') process.stdout.write(JSON.stringify(m('tool_batch',{calls:[{id:'one',name:'market_quote',arguments:'{"symbol":"AAPL.US"}'}]}))+'\\n');
 if(v.type==='batch_permit') {const p={token:v.payload.token,ordinal:0,call_id:'one',name:'market_quote'};process.stdout.write(JSON.stringify(m('tool_request',p))+'\\n');}
 if(v.type==='tool_result') process.stdout.write(JSON.stringify(m('tool_request',{token:'old',ordinal:0,call_id:'one',name:'market_quote'}))+'\\n');
 }});
}
setInterval(()=>{},1000);
''', encoding="utf-8")
    return path


@pytest.mark.parametrize("mode,code", [
    ("crash","PI_WORKER_EXIT"), ("hang","PI_RESPONSE_TIMEOUT"),
    ("malformed","PI_PROTOCOL"), ("oversize","PI_PROTOCOL"),
    ("wrong_run","PI_PROTOCOL"), ("duplicate_key","PI_PROTOCOL"),
    ("duplicate","PI_PROTOCOL"), ("unknown","PI_PROTOCOL"),
    ("sequence","PI_PROTOCOL"), ("request_reuse","PI_PROTOCOL"),
    ("duplicate_tool","PI_PROTOCOL"),
])
def test_hostile_transport_units(tmp_path, mode, code):
    bridge, provider = bridge_for(worker=stub(tmp_path, mode), response_timeout=0.3)
    outcome, _ = execute(bridge)
    assert outcome.error.code == code, outcome
    assert len(provider.calls) == (1 if mode == "duplicate_tool" else 0)


def test_no_credentials_or_private_config_in_worker(monkeypatch):
    import research_trail.pi_bridge as module
    original = module.subprocess.Popen
    launches = []
    def capture(*args, **kwargs):
        launches.append(kwargs['env'])
        return original(*args, **kwargs)
    monkeypatch.setattr(module.subprocess, 'Popen', capture)
    for key in ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "RESEARCH_TRAIL_TOKEN", "RESEARCH_TRAIL_DB_PATH", "NODE_OPTIONS", "AWS_PROFILE", "USERPROFILE", "APPDATA"]:
        monkeypatch.setenv(key, "private-sentinel-not-for-worker")
    assert 'private-sentinel' not in json.dumps(worker_environment())
    bridge, _ = bridge_for()
    outcome, events = execute(bridge)
    assert outcome.status == "completed"
    assert len(launches) == 1 and 'private-sentinel' not in json.dumps(launches)
    assert 'private-sentinel' not in json.dumps([outcome.answer, events, bridge.proof])


def test_original_registry_and_default_app_agent_unchanged(tmp_path, monkeypatch):
    from research_trail.app import create_app
    from fastapi.testclient import TestClient
    provider = RecordingProvider()
    monkeypatch.setenv('RESEARCH_TRAIL_PI', '1')
    app = create_app("offline-token-" * 4, provider, database_path=tmp_path / 'default.sqlite3')
    with TestClient(app):
        assert isinstance(app.state.manager.runner, AgentRunner)
        assert not isinstance(app.state.manager.runner, PiOfflineBridge)
        registry = market_tools(provider)
        assert registry.execute(registry.decode('market_quote', {'symbol':'AAPL.US'})).quote.last_price == 189.43
        assert FakeModelProvider().label == app.state.manager.runner.model.label


@pytest.mark.parametrize("raw", ['{"a":1,"a":2}', '{"a":NaN}', '[' * 34 + '0' + ']' * 34])
def test_python_strict_json_bounds(raw):
    with pytest.raises(BridgeError): strict_json(raw)


@pytest.mark.parametrize("mode", ["completed", "cancelled", "timed_out", "failed"])
def test_explicit_override_store_terminal_and_replay_do_not_execute(tmp_path, mode):
    from fastapi.testclient import TestClient
    from research_trail.app import create_app
    from research_trail.lifecycle import Timing
    token = "pi-store-offline-token-" * 4
    app = create_app(token, database_path=tmp_path / 'pi-store.sqlite3')
    bridge, provider = bridge_for([[call(arguments='{"symbol":"bad"}')]] if mode == "failed" else None)
    with TestClient(app, headers={"X-ResearchTrail-Token":token}) as client:
        sid = client.post('/sessions', json={"title":"explicit pi test"}).json()['id']
        timing = Timing(delay=2,tool_timeout=3,run_timeout=1.5 if mode == "timed_out" else 5) if mode in {"cancelled","timed_out"} else Timing(run_timeout=5)
        record = app.state.manager.start(sid,'offline','normal',runner=bridge,timing=timing)
        rid = record.id
        limit = time.monotonic() + 5
        if mode == "cancelled":
            while not bridge.observations['tool_execution_start'] and time.monotonic() < limit: time.sleep(0.01)
            assert bridge.observations['tool_execution_start'] == 1
            app.state.manager.cancel(sid,rid)
        while (app.state.store.run(sid,rid).status == 'running' or rid in app.state.manager.work) and time.monotonic() < limit: time.sleep(0.01)
        terminal = app.state.store.run(sid,rid)
        assert terminal.status == mode
        assert bridge.process.poll() is not None
        trace = app.state.store.events(sid,rid).events
        assert [e.sequence for e in trace] == list(range(1,len(trace)+1))
        assert sum(e.type == 'run_completed' for e in trace) == 1
        assert sum(e.type == 'message_completed' for e in trace) == 1
        assert len(provider.calls) == (1 if mode == 'completed' else 0)
        for _ in range(2):
            assert client.get(f'/sessions/{sid}/runs/{rid}/event-log').status_code == 200
            assert client.get(f'/sessions/{sid}/runs/{rid}/events?after_sequence=0').status_code == 200
        assert app.state.manager.cancel(sid,rid) == terminal
        assert app.state.store.events(sid,rid).events == trace
        assert len(provider.calls) == (1 if mode == 'completed' else 0)
