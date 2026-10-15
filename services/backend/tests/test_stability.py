"""Deterministic scheduling interleavings; no wall-clock sleeps to win races."""
import threading

import httpx
import pytest

from research_trail.agent import AgentOutcome
from research_trail.database import Database
from research_trail.conversation import ErrorPayload
from research_trail.lifecycle import RunManager, Timing
from research_trail.model_provider import FakeModelProvider
from research_trail.store import Store
from test_reports import api, collected, configure, finished, report


class Clock:
    def __init__(self): self.value = 10000.0
    def monotonic(self): return self.value


def test_agent_late_success_cannot_beat_unscheduled_deadline_timer(tmp_path, monkeypatch):
    from research_trail import lifecycle
    clock = Clock(); monkeypatch.setattr(lifecycle, 'time', clock)
    class Late:
        model = FakeModelProvider()
        def run(self, *_args, **_kwargs):
            clock.value += 2
            return AgentOutcome('迟到的成功', 'completed')
    database = Database(tmp_path / 'late.sqlite3'); database.migrate()
    store = Store(database); sid = store.create_session('受控调度').id
    manager = RunManager(store, Late())
    try:
        run = manager.start(sid, '离线', 'normal', timing=Timing(run_timeout=1))
        with manager.lock: work = manager.work.get(run.id)
        if work: work.thread.join(1); assert not work.thread.is_alive()
        saved = store.run(sid, run.id)
        assert saved.status == 'timed_out' and saved.error.code == 'RUN_TIMEOUT'
        events = store.events(sid, run.id).events
        assert [e.type for e in events].count('run_completed') == 1
        assert events[-1].payload.stop_reason == 'timeout'
        assert '迟到的成功' not in saved.answer and not manager.work
        assert database.engine.pool.checkedout() == 0
    finally:
        # Restore the real module before shutdown's bounded joins.
        monkeypatch.undo(); manager.shutdown(); database.close()


def test_report_validation_cannot_publish_after_deadline(api, monkeypatch):
    from research_trail import reports
    clock = Clock()
    with api(timeout=0.15) as (c, app):
        identity = collected(c, strategy='value')
        validate = reports.validate
        def delayed_validation(*args):
            result = validate(*args); clock.value += 1; return result
        monkeypatch.setattr(reports, 'time', clock)
        monkeypatch.setattr(reports, 'validate', delayed_validation)
        job = finished(c, report(c, identity))
        assert job['status'] == 'failed' and job['code'] == 'REPORT_TIMEOUT'
        assert job['document'] is None and job['requests_started'] == 0
        app.state.reports.work.coordinator.join(1)
        assert not app.state.reports.work.coordinator.is_alive()


def test_report_deadline_before_http_entry_has_zero_requests(api, monkeypatch):
    from research_trail import reports, openai_provider
    clock = Clock(); entered = threading.Event()
    async def handler(_request):
        entered.set(); raise AssertionError('Expired requests must not enter transport')
    with api(timeout=0.15, transport=httpx.MockTransport(handler)) as (c, app):
        configure(c); identity = collected(c, strategy='value')
        original = app.state.reports.store.before_call
        def slow_commit(*args):
            result = original(*args); clock.value += 1; return result
        monkeypatch.setattr(reports, 'time', clock)
        monkeypatch.setattr(openai_provider, 'time', clock)
        monkeypatch.setattr(app.state.reports.store, 'before_call', slow_commit)
        job = finished(c, report(c, identity, 'real'))
        assert job['status'] == 'failed' and job['document'] is None
        assert job['requests_started'] == 0 and not entered.is_set()
        app.state.reports.work.thread.join(1)
        assert not app.state.reports.work.thread.is_alive()


@pytest.mark.parametrize('winner', ['cancelled', 'timed_out', 'interrupted', 'failed'])
def test_terminal_transaction_rejects_late_success(tmp_path, winner):
    database = Database(tmp_path / 'terminal.sqlite3'); database.migrate()
    store = Store(database); sid = store.create_session('唯一终态').id
    run = store.begin_agent(sid, '离线')
    store.finish(sid, run.id, winner, '先到的终态',
                 None if winner == 'cancelled' else ErrorPayload(code='TEST_TERMINAL', message='离线终态'))
    first = store.snapshot(sid)
    store.finish(sid, run.id, 'completed', '迟到成功')
    assert store.snapshot(sid) == first
    assert [event.type for event in first.events].count('run_completed') == 1
    assert [event.sequence for event in first.events] == list(range(1, len(first.events) + 1))
    assert database.engine.pool.checkedout() == 0
    database.close()
