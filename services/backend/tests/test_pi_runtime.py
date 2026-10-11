"""Real pi internal lifecycle integration; transport faults are named explicitly."""
import asyncio
import ctypes
from concurrent.futures import ThreadPoolExecutor
from dataclasses import FrozenInstanceError, replace
import json
import queue
import subprocess
import sys
import threading
import time
from types import SimpleNamespace

from fastapi.testclient import TestClient
import httpx
import pytest

from research_trail.agent import AgentRunner
from research_trail.app import create_app
from research_trail.conversation import StartRun, RunDTO
from research_trail.lifecycle import Timing
from research_trail.openai_provider import ModelConfiguration
from research_trail.pi_bridge import Pipe
from research_trail.pi_runtime import PiRuntime
from research_trail.store import ActiveRun, RunStopped
from test_pi_bridge import NODE, RecordingProvider, stub
from test_pi_model_bridge import assistant, tool

TOKEN = 'pi-runtime-offline-token-' * 4
HEADERS = {'X-ResearchTrail-Token': TOKEN}


def until(read, predicate, seconds=8):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        value = read()
        if predicate(value): return value
        time.sleep(.01)
    pytest.fail('Internal pi lifecycle did not reach the bounded completion condition')


@pytest.fixture
def env(tmp_path):
    provider = RecordingProvider()
    path = tmp_path / '内部 pi 生命周期.sqlite3'
    app = create_app(TOKEN, provider, database_path=path)
    with TestClient(app, headers=HEADERS) as client:
        yield SimpleNamespace(app=app, client=client, provider=provider, path=path,
                              store=app.state.store, manager=app.state.manager, bridges={})


def session(env):
    return env.store.create_session('internal pi experiment').id


def runtime(env, **options):
    class TracedRuntime(PiRuntime):
        # Diagnostics owned by the test, not a second runtime/event store.
        def create(self, run_id):
            b = super().create(run_id)
            env.bridges[run_id] = b
            return b
    return TracedRuntime(env.manager.runner.tools, NODE, **options)


def terminal(env, sid, record, expected):
    result = until(lambda: env.store.run(sid, record.id), lambda r: r.status != 'running')
    until(lambda: record.id in env.manager.work, lambda active: not active)
    assert result.status == expected, result
    assert result.completed_at is not None
    events = env.store.events(sid, record.id).events
    assert [e.sequence for e in events] == list(range(1, len(events) + 1))
    assert all(e.run_id == record.id and e.session_id == sid for e in events)
    assert sum(e.type == 'run_completed' for e in events) == 1
    assert sum(e.type == 'message_completed' for e in events) == 1
    assert sum(e.type == 'error' for e in events) == int(expected in {'failed', 'timed_out', 'interrupted'})
    assert events[-1].type == 'run_completed'
    messages = [m for m in env.store.messages(sid) if m.run_id == record.id]
    assert len(messages) == 2 and messages[-1].content == result.answer
    if record.id in env.bridges:
        b = env.bridges[record.id]
        assert b.run_id == record.id and (b.process is None or b.process.poll() is not None)
    return result, events


class ModelGate:
    """Deterministic MockTransport, with cancellation-aware HTTP gate."""
    def __init__(self, stage=1, message=None):
        self.stage, self.message = stage, message
        self.entered, self.release, self.aborted = (threading.Event() for _ in range(3))
        self.requests = []
        self.transport = httpx.MockTransport(self.handle)

    async def handle(self, request):
        body = json.loads(request.content)
        self.requests.append((body, request.headers['Authorization']))
        if len(self.requests) == self.stage:
            self.entered.set()
            try:
                while not self.release.is_set(): await asyncio.sleep(.005)
            except asyncio.CancelledError:
                self.aborted.set()
                raise
        message = self.message or (assistant(content='fixture 模拟数据 AAPL.US 189.43 USD')
                                   if body['messages'][-1]['role'] == 'tool' else assistant([tool()]))
        return httpx.Response(200, json={'choices': [dict(message=message, finish_reason='tool_calls' if message['tool_calls'] else 'stop')]})


def mock_runtime(env, gate, **options):
    return runtime(env, configuration=ModelConfiguration('https://offline.invalid/v1', 'offline-model', 'offline-key'),
                   transport=gate.transport, **options)


def test_real_pi_fake_store_business_identity_and_default_unchanged(env, monkeypatch):
    frames = []
    original = Pipe.send
    def capture(pipe, *args, **options):
        frames.append((pipe.run_id, pipe.attempt_id))
        return original(pipe, *args, **options)
    monkeypatch.setattr(Pipe, 'send', capture)
    sid = session(env)
    record = runtime(env).start(env.manager, sid, '查询AAPL.US行情')
    result, events = terminal(env, sid, record, 'completed')
    b = env.bridges[record.id]
    assert set(frames) == {(record.id, b.attempt_id)}
    assert b.process.args[-2:] == [record.id, b.attempt_id]
    assert b.proof['ready']['agent'] == 'Agent'
    assert b.model_calls == 2 and b.execution_count == 1 and env.provider.calls == ['AAPL.US']
    started = next(e for e in events if e.type == 'tool_started')
    ended = next(e for e in events if e.type == 'tool_result')
    assert started.payload.call_id == ended.payload.call_id
    assert b.history[2]['tool_calls'][0]['id'] == b.history[3]['tool_call_id']
    assert result.kind == 'fake_agent' and '模拟数据' in result.answer
    assert isinstance(env.manager.runner, AgentRunner)
    with pytest.raises(ValueError): b.run('cannot replay', lambda *_: None)
    with pytest.raises(RunStopped): env.store.append_running(sid, record.id, 'text_delta', {'text': 'late'})
    assert env.store.events(sid, record.id).events == events
    # Existing public contract rejects an engine selector and still uses AgentRunner.
    assert StartRun.model_fields['kind'].annotation == RunDTO.model_fields['kind'].annotation
    assert env.client.post(f'/sessions/{sid}/runs', json={'input': 'query', 'kind': 'pi_agent'}).status_code == 422
    default = env.client.post(f'/sessions/{sid}/runs', json={'input': '查询NVDA.US行情', 'kind': 'fake_agent'}).json()
    until(lambda: env.store.run(sid, default['id']), lambda r: r.status != 'running')
    assert default['id'] not in env.bridges and env.provider.calls == ['AAPL.US', 'NVDA.US']


def test_mock_snapshot_at_start_and_new_run_gets_new_configuration(env, monkeypatch):
    gate = ModelGate()
    current = [ModelConfiguration('https://old.invalid/v1', 'old-model', 'old-key')]
    reads, frames = [], []
    def configuration():
        reads.append(current[0])
        return current[0]
    r = runtime(env, configuration=configuration, transport=gate.transport)
    original = Pipe.send
    def capture(pipe, kind, payload, request_id=None):
        frames.append(json.dumps(payload, ensure_ascii=False))
        return original(pipe, kind, payload, request_id)
    monkeypatch.setattr(Pipe, 'send', capture)
    sid = session(env)
    first = r.start(env.manager, sid, '查询AAPL.US行情')
    assert reads == [current[0]]  # Snapshot happened before start returned.
    old = current[0]
    current[0] = replace(old, base_url='https://new.invalid/v1', model='new-model', api_key='new-key')
    assert gate.entered.wait(3)
    current[0] = replace(current[0], request_timeout=4)
    gate.release.set()
    terminal(env, sid, first, 'completed')
    second = r.start(env.manager, sid, '查询AAPL.US行情')
    terminal(env, sid, second, 'completed')
    a, b = env.bridges[first.id], env.bridges[second.id]
    assert a.model is not b.model and a.process.pid != b.process.pid and a.attempt_id != b.attempt_id
    assert a.model._snapshot == old and b.model._snapshot == current[0]
    assert [body['model'] for body, _ in gate.requests] == ['old-model', 'old-model', 'new-model', 'new-model']
    assert [header for _, header in gate.requests] == ['Bearer old-key'] * 2 + ['Bearer new-key'] * 2
    assert len(reads) == 2 and a.model.requests_started == b.model.requests_started == 2
    assert all(s not in ''.join(frames) for s in ('old-key', 'new-key', 'old-model', 'new-model', 'Authorization', '.invalid'))
    with pytest.raises(FrozenInstanceError): a.model._snapshot.model = 'mutated'
    assert env.provider.calls == ['AAPL.US', 'AAPL.US']


def test_two_sessions_independent_fake_models_workers_and_cancellation(env):
    entered = {symbol: threading.Event() for symbol in ('AAPL.US', 'NVDA.US')}
    release, finished = threading.Event(), threading.Event()
    original = env.provider.snapshot
    def blocked(symbol):
        entered[symbol].set()
        assert release.wait(5)
        try: return original(symbol)
        finally: finished.set()
    env.provider.snapshot = blocked
    r = runtime(env)
    a, b = session(env), session(env)
    try:
        one = r.start(env.manager, a, '查询AAPL.US行情')
        two = r.start(env.manager, b, '查询NVDA.US行情')
        assert all(g.wait(3) for g in entered.values())
        x, y = env.bridges[one.id], env.bridges[two.id]
        assert x.model is not y.model and x.process.pid != y.process.pid and x.attempt_id != y.attempt_id
        env.manager.cancel(a, one.id)
        _, frozen = terminal(env, a, one, 'cancelled')
        release.set()
        terminal(env, b, two, 'completed')
        assert finished.wait(1)
        assert env.store.events(a, one.id).events == frozen and x.model_calls == 1 and y.model_calls == 2
        assert x.execution_count == y.execution_count == 1
    finally: release.set()


def test_same_session_active_constraint_does_not_create_another_runner(env):
    gate = ModelGate()
    r = mock_runtime(env, gate)
    sid = session(env)
    first = r.start(env.manager, sid, '查询AAPL.US行情')
    try:
        assert gate.entered.wait(3)
        with pytest.raises(ActiveRun): r.start(env.manager, sid, 'duplicate')
        assert list(env.bridges) == [first.id] and len(env.store.runs(sid)) == 1
        assert env.client.post(f'/sessions/{sid}/runs', json={'input': 'duplicate', 'kind': 'fake_agent'}).status_code == 409
        env.manager.cancel(sid, first.id)
        terminal(env, sid, first, 'cancelled')
        assert gate.aborted.wait(1) and env.provider.calls == []
    finally: gate.release.set()


def test_concurrent_mock_runs_use_separate_snapshots_and_model_contexts(env):
    gates = {name: ModelGate() for name in ('model-one', 'model-two')}
    async def handle(request):
        return await gates[json.loads(request.content)['model']].handle(request)
    current = [ModelConfiguration('https://offline.invalid', 'model-one', 'key-one')]
    r = runtime(env, configuration=lambda: current[0], transport=httpx.MockTransport(handle))
    a, b = session(env), session(env)
    try:
        one = r.start(env.manager, a, '查询AAPL.US行情')
        current[0] = replace(current[0], model='model-two', api_key='key-two')
        two = r.start(env.manager, b, '查询AAPL.US行情')
        assert all(g.entered.wait(3) for g in gates.values())
        x, y = env.bridges[one.id], env.bridges[two.id]
        assert x.history is not y.history and x.pending_results is not y.pending_results
        assert x.model is not y.model and x.attempt_id != y.attempt_id and x.process.pid != y.process.pid
        env.manager.cancel(a, one.id)
        for g in gates.values(): g.release.set()
        terminal(env, a, one, 'cancelled')
        terminal(env, b, two, 'completed')
        assert x.model_calls == 1 and x.execution_count == 0
        assert y.model_calls == 2 and y.execution_count == 1 and env.provider.calls == ['AAPL.US']
        assert gates['model-one'].requests[0][1] == 'Bearer key-one'
        assert all(header == 'Bearer key-two' for _, header in gates['model-two'].requests)
    finally:
        for g in gates.values(): g.release.set()


@pytest.mark.parametrize('winner', ['cancelled', 'completed', 'race'])
def test_cancel_completion_competition_has_one_terminal_no_extra_calls(env, winner):
    gate = ModelGate(stage=2)
    sid = session(env)
    record = mock_runtime(env, gate).start(env.manager, sid, '查询AAPL.US行情')
    try:
        assert gate.entered.wait(3)
        if winner == 'cancelled':
            env.manager.cancel(sid, record.id); gate.release.set()
        elif winner == 'completed':
            gate.release.set()
            until(lambda: env.store.run(sid, record.id), lambda r: r.status == 'completed')
            env.manager.cancel(sid, record.id)
        else:
            with ThreadPoolExecutor(2) as pool:
                futures = [pool.submit(env.manager.cancel, sid, record.id), pool.submit(gate.release.set)]
                for future in futures: future.result()
        saved = until(lambda: env.store.run(sid, record.id), lambda r: r.status != 'running')
        assert saved.status in ({'completed', 'cancelled'} if winner == 'race' else {winner})
        result, events = terminal(env, sid, record, saved.status)
        assert env.manager.cancel(sid, record.id) == result
        assert env.store.events(sid, record.id).events == events
        assert env.provider.calls == ['AAPL.US'] and env.bridges[record.id].execution_count == 1
        assert env.bridges[record.id].model_calls == 2 and len(gate.requests) == 2
    finally: gate.release.set()


@pytest.mark.parametrize('scope', ['run', 'model', 'tool'])
def test_timeout_layers_keep_correct_error_and_discard_late_results(env, scope):
    gate = ModelGate()
    released, finished, entered = (threading.Event() for _ in range(3))
    options = {'timing': Timing(run_timeout=1.5), 'model_timeout': 2} if scope == 'run' else {'model_timeout': .2}
    if scope == 'tool':
        original = env.provider.snapshot
        def blocked(symbol):
            entered.set(); released.wait(5)
            try: return original(symbol)
            finally: finished.set()
        env.provider.snapshot = blocked
        r = runtime(env, timing=Timing(tool_timeout=.15))
    else: r = mock_runtime(env, gate, **options)
    sid = session(env)
    record = r.start(env.manager, sid, '查询AAPL.US行情')
    try:
        assert (entered if scope == 'tool' else gate.entered).wait(3)
        result, events = terminal(env, sid, record, 'timed_out')
        assert result.error.code == {'run': 'RUN_TIMEOUT', 'model': 'MODEL_TIMEOUT', 'tool': 'TOOL_TIMEOUT'}[scope]
        assert not any(e.type == 'tool_result' for e in events)
        released.set(); gate.release.set()
        if scope == 'tool': assert finished.wait(1)
        else: assert gate.aborted.wait(1) and env.provider.calls == []
        assert env.store.events(sid, record.id).events == events
        assert env.manager.cancel(sid, record.id) == result
    finally: released.set(); gate.release.set()


def test_provider_deadline_winning_model_timer_is_still_model_timeout(env, monkeypatch):
    from research_trail.openai_provider import OpenAIModelProvider, ModelError
    gate, raw_errors = ModelGate(), []
    original_get, original_complete = queue.Queue.get, OpenAIModelProvider.complete
    def delayed_delivery(q, *args, **options):
        # Deterministic scheduler interleaving: the existing HTTP adapter's
        # deadline is observed before the bridge's model timer loop resumes.
        if q.maxsize == 1 and threading.current_thread().name.startswith('agent-run-') and options.get('timeout') == .01:
            return original_get(q, timeout=.5)
        return original_get(q, *args, **options)
    def complete(model, *args, **options):
        try: return original_complete(model, *args, **options)
        except ModelError as error:
            raw_errors.append(error.error.code)
            raise
    monkeypatch.setattr(queue.Queue, 'get', delayed_delivery)
    monkeypatch.setattr(OpenAIModelProvider, 'complete', complete)
    sid = session(env)
    record = mock_runtime(env, gate, model_timeout=.15).start(env.manager, sid, '查询AAPL.US行情')
    try:
        result, events = terminal(env, sid, record, 'timed_out')
        assert raw_errors == ['RUN_TIMEOUT']  # Actual complete/_request, not a fake error.
        assert result.error.code == 'MODEL_TIMEOUT'
        assert gate.aborted.wait(1) and env.provider.calls == []
        assert env.bridges[record.id].model_calls == 1 and env.bridges[record.id].execution_count == 0
        assert not any(e.type == 'tool_started' for e in events)
    finally: gate.release.set()


@pytest.mark.parametrize('fault', ['creation', 'invalid_runner', 'node_start', 'crash', 'unresponsive'])
def test_start_and_worker_failures_settle_once_without_fallback(env, tmp_path, monkeypatch, fault):
    import research_trail.pi_bridge as module
    gate = ModelGate()
    options = {}
    if fault == 'unresponsive': options = dict(worker=stub(tmp_path, 'hang'), response_timeout=.3, model_timeout=.1, timing=Timing(tool_timeout=.2))
    r = mock_runtime(env, gate, **options)
    if fault == 'node_start':
        def fail(*args, **options): raise OSError('private-start-path-and-key')
        monkeypatch.setattr(module.subprocess, 'Popen', fail)
    sid = session(env)
    if fault in {'creation', 'invalid_runner'}:
        def factory(_):
            if fault == 'creation': raise ValueError('private-config-and-key')
            return None
        record = env.manager.start(sid, 'input', 'normal', runner_factory=factory)
    else:
        record = r.start(env.manager, sid, '查询AAPL.US行情')
        if fault == 'crash':
            assert gate.entered.wait(3)
            env.bridges[record.id].process.kill()
    try:
        result, events = terminal(env, sid, record, 'timed_out' if fault == 'unresponsive' else 'failed')
        assert result.error.code == {'creation': 'RUNNER_CREATE_FAILED', 'invalid_runner': 'RUNNER_CREATE_FAILED',
                                     'node_start': 'PI_WORKER_START', 'crash': 'PI_WORKER_EXIT', 'unresponsive': 'PI_RESPONSE_TIMEOUT'}[fault]
        assert env.provider.calls == []
        assert 'private-' not in json.dumps([e.model_dump(mode='json') for e in events])
        gate.release.set()
        assert env.store.events(sid, record.id).events == events
        assert isinstance(env.manager.runner, AgentRunner)
    finally: gate.release.set()


@pytest.mark.parametrize('operation', ['delete', 'shutdown'])
def test_delete_shutdown_close_worker_and_suppress_late_model(env, operation, monkeypatch):
    gate = ModelGate()
    sid = session(env)
    record = mock_runtime(env, gate).start(env.manager, sid, '查询AAPL.US行情')
    assert gate.entered.wait(3)
    work = env.manager.work[record.id]
    saved = []
    if operation == 'delete':
        original = env.store.delete_session
        def observe(identity):
            saved.append(env.store.run(identity, record.id).status)
            return original(identity)
        monkeypatch.setattr(env.store, 'delete_session', observe)
        env.manager.delete_session(sid)
        assert saved == ['cancelled']
        assert env.client.get(f'/sessions/{sid}').status_code == 404
    else:
        env.manager.shutdown()
        _, saved = terminal(env, sid, record, 'interrupted')
        with pytest.raises(RuntimeError): runtime(env).start(env.manager, session(env), 'closed')
    work.thread.join(2)
    assert not work.thread.is_alive() and env.bridges[record.id].process.poll() is not None
    assert gate.aborted.wait(1) and env.provider.calls == []
    gate.release.set()
    if operation == 'shutdown': assert env.store.events(sid, record.id).events == saved
    assert env.store.active_runs() == []


def test_completed_pi_sse_resume_and_repeated_replay_are_read_only(env):
    sid = session(env)
    record = runtime(env).start(env.manager, sid, '查询AAPL.US行情')
    _, events = terminal(env, sid, record, 'completed')
    path = f'/sessions/{sid}/runs/{record.id}'
    first = env.client.get(path + '/events')
    first_ids = [line[4:] for line in first.text.splitlines() if line.startswith('id: ')]
    assert first_ids == [f'{record.id}:{e.sequence}' for e in events]
    # Simulate a consumer that consumed only four events before disconnecting.
    # Real socket disconnect/reconnect is covered by the unchanged SSE suite.
    resumed = env.client.get(path + '/events?follow=true', headers={'Last-Event-ID': first_ids[3]})
    assert resumed.status_code == 200
    assert [line[4:] for line in resumed.text.splitlines() if line.startswith('id: ')] == [f'{record.id}:{e.sequence}' for e in events[4:]]
    for _ in range(2):
        assert env.client.get(path + '/event-log').status_code == 200
        assert env.client.get(path + '/events').status_code == 200
    assert env.client.get(path + '/events', headers={'Last-Event-ID': 'other:1'}).status_code == 400
    assert env.bridges[record.id].model_calls == 2 and env.bridges[record.id].execution_count == 1
    assert env.provider.calls == ['AAPL.US'] and env.store.events(sid, record.id).events == events


def test_wrong_batch_under_manager_remains_zero_execution(env):
    gate = ModelGate(message=assistant([tool(), tool('bad', arguments='{"symbol":"invalid"}')]))
    gate.release.set()
    sid = session(env)
    record = mock_runtime(env, gate).start(env.manager, sid, '查询AAPL.US行情')
    result, events = terminal(env, sid, record, 'failed')
    assert result.error.code == 'INVALID_ARGUMENT' and env.provider.calls == []
    assert env.bridges[record.id].execution_count == 0
    assert not any(e.type == 'tool_started' for e in events)


def test_cancelled_previous_tool_timer_cannot_timeout_next_tool(env):
    # Deterministic callback interleaving, no scheduling sleep or widened budget.
    gate = ModelGate()
    sid = session(env)
    record = mock_runtime(env, gate).start(env.manager, sid, '查询AAPL.US行情')
    try:
        assert gate.entered.wait(3)
        work = env.manager.work[record.id]
        with env.manager.lock:
            first = env.manager.timer(work, 2, 'TOOL_TIMEOUT')
            env.manager.after_tool(work)
            second = env.manager.timer(work, 2, 'TOOL_TIMEOUT')
            env.manager.timeout(work, 'TOOL_TIMEOUT', first)
            assert env.store.run(sid, record.id).status == 'running' and work.tool_timer is second
            env.manager.after_tool(work)
        env.manager.cancel(sid, record.id)
        terminal(env, sid, record, 'cancelled')
    finally: gate.release.set()


def test_cancel_before_worker_launch_does_not_start_model_or_tool(env, monkeypatch):
    entered, release = threading.Event(), threading.Event()
    original = env.manager.execute
    def delayed(work, text):
        entered.set()
        assert release.wait(3)
        return original(work, text)
    monkeypatch.setattr(env.manager, 'execute', delayed)
    sid = session(env)
    record = runtime(env).start(env.manager, sid, '查询AAPL.US行情')
    try:
        assert entered.wait(1)
        env.manager.cancel(sid, record.id)
        release.set()
        terminal(env, sid, record, 'cancelled')
        b = env.bridges[record.id]
        assert b.process is None and b.model_calls == b.execution_count == 0 and env.provider.calls == []
    finally: release.set()


@pytest.mark.parametrize('thread_kind,code', [('agent-run-', 'WORKER_START_FAILED'), ('pi-pipe', 'PI_WORKER_START')])
def test_thread_creation_failure_cleans_owned_run_and_child(env, monkeypatch, thread_kind, code):
    original = threading.Thread.start
    def fail(thread):
        if thread.name.startswith(thread_kind): raise RuntimeError('private-thread-configuration')
        return original(thread)
    monkeypatch.setattr(threading.Thread, 'start', fail)
    sid = session(env)
    record = runtime(env).start(env.manager, sid, '查询AAPL.US行情')
    result, _ = terminal(env, sid, record, 'failed')
    assert result.error.code == code and env.provider.calls == []
    b = env.bridges[record.id]
    assert b.model_calls == b.execution_count == 0


@pytest.mark.parametrize('phase', ['construct', 'start_second', 'start_third'])
def test_partial_pipe_creation_failure_closes_child_and_started_threads(env, monkeypatch, phase):
    original_init, original_start = threading.Thread.__init__, threading.Thread.start
    created, started = [], []
    def construct(thread, *args, **options):
        if options.get('name') == 'pi-pipe':
            if phase == 'construct' and len(created) == 1:
                raise RuntimeError('private-thread-construction')
            original_init(thread, *args, **options)
            created.append(thread)
        else: original_init(thread, *args, **options)
    def start(thread):
        if thread.name == 'pi-pipe':
            fail_at = {'start_second': 2, 'start_third': 3}.get(phase)
            if fail_at == len(started) + 1:
                raise RuntimeError('private-partial-start')
            started.append(thread)
        return original_start(thread)
    monkeypatch.setattr(threading.Thread, '__init__', construct)
    monkeypatch.setattr(threading.Thread, 'start', start)
    sid = session(env)
    record = runtime(env).start(env.manager, sid, '查询AAPL.US行情')
    b = env.bridges[record.id]
    try:
        result, events = terminal(env, sid, record, 'failed')
        assert result.error.code == 'PI_WORKER_START'
        assert not any(t.is_alive() for t in started)
        assert b.process is not None and b.model_calls == b.execution_count == 0
        assert env.provider.calls == [] and 'private-' not in json.dumps([e.model_dump(mode='json') for e in events])
    finally:
        # The regression also cleans the child when run against the old bug.
        if b.process is not None and b.process.poll() is None:
            b.process.kill(); b.process.wait(5)
            for stream in (b.process.stdin, b.process.stdout, b.process.stderr): stream.close()


def test_factory_rejects_runner_without_model_label_before_execution(env):
    called = []
    def run(*args, **options):
        called.append(True)
        raise RunStopped()
    sid = session(env)
    record = env.manager.start(sid, 'input', 'normal',
        runner_factory=lambda _: SimpleNamespace(run=run, model=object()))
    result, _ = terminal(env, sid, record, 'failed')
    assert result.error.code == 'RUNNER_CREATE_FAILED' and called == []
    assert env.provider.calls == []


@pytest.mark.parametrize('fault', ['nonfinite', 'mutable', 'raises'])
def test_bad_configuration_snapshot_fails_saved_run_before_node_launch(env, fault):
    def configuration():
        if fault == 'raises': raise RuntimeError('private-vault-error')
        config = ModelConfiguration('https://offline.invalid', 'offline', 'offline-key')
        return replace(config, request_timeout=float('nan')) if fault == 'nonfinite' else replace(config, model=['mutable'])
    r = runtime(env, configuration=configuration, transport=httpx.MockTransport(lambda _: pytest.fail('must not request model')))
    sid = session(env)
    record = r.start(env.manager, sid, '查询AAPL.US行情')
    result, _ = terminal(env, sid, record, 'failed')
    assert result.error.code == 'RUNNER_CREATE_FAILED' and record.id not in env.bridges
    assert env.provider.calls == [] and 'private-' not in result.answer


def test_unrequested_model_stop_cannot_leave_running_record_without_work(env):
    def stopped(_): raise RunStopped()
    r = runtime(env, configuration=ModelConfiguration('https://offline.invalid', 'offline', 'offline-key'),
                transport=httpx.MockTransport(stopped))
    sid = session(env)
    record = r.start(env.manager, sid, '查询AAPL.US行情')
    try:
        until(lambda: record.id in env.manager.work, lambda active: not active)
        assert env.store.run(sid, record.id).status == 'failed'
        result, _ = terminal(env, sid, record, 'failed')
        assert result.error.code == 'RUN_STOPPED' and env.provider.calls == []
    finally:
        if env.store.run(sid, record.id).status == 'running': env.manager.cancel(sid, record.id)


def test_late_noncooperative_fake_model_result_cannot_pollute_cancelled_store(env, monkeypatch):
    from research_trail.model_provider import FakeModelProvider
    entered, release, finished = (threading.Event() for _ in range(3))
    original = FakeModelProvider.plan
    def blocked(model, text):
        entered.set()
        assert release.wait(4)
        try: return original(model, text)
        finally: finished.set()
    monkeypatch.setattr(FakeModelProvider, 'plan', blocked)
    sid = session(env)
    record = runtime(env).start(env.manager, sid, '查询AAPL.US行情')
    try:
        assert entered.wait(3)
        env.manager.cancel(sid, record.id)
        _, events = terminal(env, sid, record, 'cancelled')
        release.set()
        assert finished.wait(1)
        assert env.store.events(sid, record.id).events == events and env.provider.calls == []
        assert env.bridges[record.id].model_calls == 1 and env.bridges[record.id].execution_count == 0
    finally: release.set()


@pytest.mark.parametrize('status,code', [(401, 'MODEL_AUTH_FAILED'), (429, 'MODEL_RATE_LIMIT'), (500, 'MODEL_HTTP_ERROR')])
def test_model_failure_after_tool_keeps_one_result_and_never_retries(env, status, code):
    requests = []
    def handler(request):
        body = json.loads(request.content); requests.append(body)
        if len(requests) == 1:
            return httpx.Response(200, json={'choices': [dict(message=assistant([tool()]), finish_reason='tool_calls')]})
        assert body['messages'][-1]['role'] == 'tool'
        return httpx.Response(status, json={'error': 'private-error-sentinel'})
    r = runtime(env, configuration=ModelConfiguration('https://offline.invalid', 'offline', 'offline-key'),
                transport=httpx.MockTransport(handler))
    sid = session(env)
    record = r.start(env.manager, sid, '查询AAPL.US行情')
    result, events = terminal(env, sid, record, 'failed')
    assert result.error.code == code and env.provider.calls == ['AAPL.US']
    assert env.bridges[record.id].execution_count == 1 and len(requests) == 2
    assert sum(e.type == 'tool_result' for e in events) == 1
    assert 'private-error-sentinel' not in result.answer


def test_graceful_pi_shutdown_reopen_is_interrupted_without_requests(tmp_path):
    provider, gate = RecordingProvider(), ModelGate()
    path = tmp_path / 'pi-shutdown.sqlite3'
    app = create_app(TOKEN, provider, database_path=path)
    with TestClient(app, headers=HEADERS):
        sid = app.state.store.create_session('shutdown').id
        r = PiRuntime(app.state.manager.runner.tools, NODE,
                      configuration=ModelConfiguration('https://offline.invalid', 'offline', 'offline-key'), transport=gate.transport)
        record = r.start(app.state.manager, sid, '查询AAPL.US行情')
        assert gate.entered.wait(3)
        work = app.state.manager.work[record.id]
        bridge = work.runner
        app.state.store.append_running(sid, record.id, 'text_delta', {'text': '已保存的部分内容'})
    assert bridge.process.poll() is not None and not work.thread.is_alive() and gate.aborted.wait(1)
    try:
        with TestClient(create_app(TOKEN, provider, database_path=path), headers=HEADERS) as client:
            result = client.get(f'/sessions/{sid}/runs/{record.id}').json()
            assert result['status'] == 'interrupted' and result['answer'].startswith('已保存的部分内容')
            assert result['error']['code'] == 'BACKEND_INTERRUPTED'
            trace = client.get(f'/sessions/{sid}/runs/{record.id}/event-log').json()['events']
            assert sum(e['type'] == 'run_completed' for e in trace) == 1
            assert client.post(f'/sessions/{sid}/runs/{record.id}/cancel').json() == result
            assert len(gate.requests) == 1 and provider.calls == []
            assert client.get(f'/sessions/{sid}/runs/{record.id}/event-log').json()['events'] == trace
    finally: gate.release.set()


def test_real_parent_force_exit_closes_pi_worker_and_restart_does_not_replay(tmp_path):
    # Actual Python parent + actual pi Node child, isolated DB, only MockTransport.
    script = '''
import asyncio, json, sys, threading
from pathlib import Path
import httpx
from research_trail.agent import AgentRunner
from research_trail.database import Database
from research_trail.lifecycle import RunManager, Timing, DatabaseLease
from research_trail.market import FixtureMarketProvider
from research_trail.model_provider import FakeModelProvider
from research_trail.openai_provider import ModelConfiguration
from research_trail.pi_runtime import PiRuntime
from research_trail.store import Store
from research_trail.tools import market_tools
db = Database(Path(sys.argv[1])); lease = DatabaseLease(db.path); db.migrate()
store = Store(db); tools = market_tools(FixtureMarketProvider())
manager = RunManager(store, AgentRunner(FakeModelProvider(), tools))
entered = threading.Event(); created = []
async def blocked(request):
    entered.set()
    await asyncio.sleep(60)
    raise AssertionError('parent must exit before response')
r = PiRuntime(tools, Path(sys.argv[2]),
    configuration=ModelConfiguration('https://offline.invalid', 'offline', 'offline-key'),
    transport=httpx.MockTransport(blocked), timing=Timing(tool_timeout=6, run_timeout=30),
    response_timeout=8, model_timeout=5)
sid = store.create_session('forced pi exit').id
def factory(rid):
    b = r.create(rid); created.append(b); return b
record = manager.start(sid, '查询AAPL.US行情', 'normal', runner_factory=factory,
    kind=r.kind, timing=r.timing)
assert entered.wait(5)
store.append_running(sid, record.id, 'text_delta', {'text':'崩溃前保存内容'})
print(json.dumps({'sid':sid,'rid':record.id,'pid':created[0].process.pid}), flush=True)
threading.Event().wait(60)
'''
    path = tmp_path / 'forced-pi.sqlite3'
    process = subprocess.Popen([sys.executable, '-u', '-c', script, str(path), str(NODE)],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    lines = queue.Queue(1)
    threading.Thread(target=lambda: lines.put(process.stdout.readline()), daemon=True).start()
    handle = None
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.OpenProcess.argtypes = [ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
    kernel.OpenProcess.restype = ctypes.c_void_p
    kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    kernel.TerminateProcess.argtypes = [ctypes.c_void_p, ctypes.c_uint]
    try:
        line = lines.get(timeout=10)
        assert line, process.stderr.read().decode('utf-8', errors='replace')
        identities = json.loads(line)
        handle = kernel.OpenProcess(0x100000 | 0x0001, False, identities['pid'])
        assert handle and kernel.WaitForSingleObject(handle, 0) == 258  # still running
        process.kill(); process.wait(5)
        assert kernel.WaitForSingleObject(handle, 5000) == 0  # stdin EOF shuts down pi
        provider = RecordingProvider()
        with TestClient(create_app(TOKEN, provider, database_path=path), headers=HEADERS) as client:
            base = f"/sessions/{identities['sid']}/runs/{identities['rid']}"
            saved = client.get(base).json()
            assert saved['status'] == 'interrupted' and saved['answer'].startswith('崩溃前保存内容')
            assert saved['error']['code'] == 'BACKEND_INTERRUPTED'
            trace = client.get(base + '/event-log').json()['events']
            assert sum(e['type'] == 'run_completed' for e in trace) == 1
            assert sum(e['type'] == 'message_completed' for e in trace) == 1
            assert client.get(base + '/events').status_code == 200
            assert client.get(base + '/event-log').json()['events'] == trace and provider.calls == []
    finally:
        if process.poll() is None: process.kill(); process.wait(5)
        if handle:
            if kernel.WaitForSingleObject(handle, 0) == 258:
                kernel.TerminateProcess(handle, 1); kernel.WaitForSingleObject(handle, 5000)
            kernel.CloseHandle(handle)
        process.stdout.close(); process.stderr.close()


@pytest.mark.parametrize('options', [
    {'model_timeout': 3}, {'timing': Timing(tool_timeout=3)},
    {'timing': Timing(delay=2)}, {'timing': Timing(run_timeout=0)},
    {'configuration': ModelConfiguration('https://offline.invalid', 'offline', 'offline-key')},
    {'transport': httpx.MockTransport(lambda _: httpx.Response(200))},
])
def test_internal_policy_rejects_wrong_timeout_or_live_transport_before_start(env, options):
    with pytest.raises(ValueError): runtime(env, **options)
    assert env.store.active_runs() == [] and env.bridges == {} and env.provider.calls == []
