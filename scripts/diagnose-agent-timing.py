"""Trace the unchanged pytest respond case, with optional controlled SQLite contention.

Use the backend venv Python. Logs/isolated databases must stay outside the repo.
This diagnostic plugin is never loaded by the application or default CI.
"""
import argparse
from contextlib import ExitStack, contextmanager
import json
import os
from pathlib import Path
import platform
import sqlite3
import subprocess
import sys
import threading
import time
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
TARGET = 'tests/test_agent.py::test_model_provider_replaced_independently_and_error_is_terminal[respond]'


def child(output, mode):
    os.chdir(ROOT / 'services/backend')
    sys.path.insert(0, str(ROOT / 'services/backend'))
    import pytest
    from sqlalchemy import event
    from sqlalchemy.engine import Engine
    from research_trail.agent import AgentRunner
    from research_trail.database import Database
    from research_trail.lifecycle import RunManager
    from research_trail.store import Store

    rows, managers, works, stores = [], [], [], []
    lock = threading.Lock()
    origin = time.perf_counter_ns()
    active = False
    begin_attempt, controlled_observed = threading.Event(), threading.Event()
    control_errors = []
    controlled = False

    def trace(kind, **data):
        with lock:
            rows.append(dict(ns=time.perf_counter_ns()-origin, kind=kind,
                thread=threading.current_thread().name, thread_id=threading.get_ident(), **data))

    start, execute, runner = RunManager.start, RunManager.execute, AgentRunner.run
    write, finish, read, events, join = Database.write, Store.finish, Store.run, Store.events, threading.Thread.join

    def traced_start(self, *args, **kwargs):
        nonlocal active
        active = True; managers.append(self); stores.append(self.store)
        trace('manager_start_enter')
        result = start(self, *args, **kwargs)
        trace('manager_start_return', run_id=result.id, status=result.status)
        return result

    def traced_execute(self, work, *args):
        works.append(work); trace('worker_enter', run_id=work.run_id)
        try: return execute(self, work, *args)
        finally: trace('execute_return', work_removed=work.run_id not in self.work, stop=work.stop.is_set())

    def traced_runner(self, *args, **kwargs):
        trace('runner_enter')
        result = runner(self, *args, **kwargs)
        trace('runner_return', status=result.status, code=result.error.code if result.error else None)
        return result

    @contextmanager
    def traced_write(self):
        if not active:
            with write(self) as db: yield db
            return
        started = time.perf_counter_ns(); trace('transaction_enter')
        try:
            with write(self) as db:
                trace('transaction_acquired', acquire_ns=time.perf_counter_ns()-started)
                yield db
                trace('transaction_body_done')
            # This is AFTER Database.write's real session.commit has returned.
            trace('transaction_commit_return')
        except BaseException as error:
            trace('transaction_error', error_type=type(error).__name__); raise

    def before_sql(_conn, _cursor, statement, _parameters, _context, _many):
        if active and statement.strip().upper() == 'BEGIN IMMEDIATE':
            trace('write_lock_attempt')
            if controlled and threading.current_thread().name.startswith('agent-run-'):
                begin_attempt.set()

    def traced_read(self, sid, rid):
        trace('store_read_enter', run_id=rid)
        result = read(self, sid, rid)
        trace('store_read_return', status=result.status, last_sequence=result.last_sequence,
              worker_alive=any(w.thread and w.thread.is_alive() for w in works))
        return result

    def traced_finish(self, sid, rid, *args, **kwargs):
        nonlocal controlled
        trace('finish_enter', requested_status=args[0] if args else kwargs['status'])
        observer = None
        if mode == 'commit-contention' and not controlled:
            controlled = True
            blocker = sqlite3.connect(self.database.path, timeout=5, check_same_thread=False)
            blocker.execute('BEGIN IMMEDIATE'); trace('external_write_lock_held')
            def observe():
                try:
                    assert begin_attempt.wait(5), 'Worker never attempted the terminal write'
                    current = self.run(sid, rid)
                    assert current.status == 'running', 'Uncommitted terminal must not be visible'
                    trace('controlled_read_running_before_commit')
                    controlled_observed.set()
                except BaseException as error:
                    control_errors.append(type(error).__name__)
                finally:
                    blocker.commit(); blocker.close(); trace('external_write_lock_released')
            observer = threading.Thread(target=observe, name='diagnostic-wal-reader')
            observer.start()
        try:
            result = finish(self, sid, rid, *args, **kwargs)
            trace('finish_return_after_commit', status=result.status, last_sequence=result.last_sequence)
            return result
        finally:
            if observer: observer.join(5)

    def traced_events(self, *args, **kwargs):
        result = events(self, *args, **kwargs)
        trace('event_log_read', events=[e.model_dump(mode='json') for e in result.events])
        return result

    def traced_join(self, timeout=None):
        owned = self.name.startswith('agent-run-')
        if owned: trace('worker_join_enter', timeout=timeout, alive=self.is_alive())
        result = join(self, timeout)
        if owned: trace('worker_join_return', alive=self.is_alive())
        return result

    event.listen(Engine, 'before_cursor_execute', before_sql)
    try:
        with ExitStack() as stack:
            for owner, name, replacement in [(RunManager,'start',traced_start),(RunManager,'execute',traced_execute),
                    (AgentRunner,'run',traced_runner),(Database,'write',traced_write),(Store,'finish',traced_finish),
                    (Store,'run',traced_read),(Store,'events',traced_events),(threading.Thread,'join',traced_join)]:
                stack.enter_context(patch.object(owner, name, replacement))
            code = int(pytest.main(['-q', TARGET, '--basetemp', str(output/'pytest-data')]))
    finally: event.remove(Engine, 'before_cursor_execute', before_sql)
    for work in works:
        if work.thread: work.thread.join(5)
        for timer in work.timers: timer.join(1)
    cleanup = dict(worker_alive=[bool(w.thread and w.thread.is_alive()) for w in works],
        timer_alive=[t.is_alive() for w in works for t in w.timers], work_retained=[len(m.work) for m in managers],
        checked_out=[s.database.engine.pool.checkedout() for s in stores])
    trace('cleanup_observed', **cleanup)
    ordered = sorted(rows, key=lambda row: row['ns'])
    terminal = next((r['events'] for r in reversed(ordered) if r['kind']=='event_log_read'), [])
    proof = (code == 0 and len(works)==1 and not control_errors and
        not any(cleanup['worker_alive']+cleanup['timer_alive']+cleanup['work_retained']+cleanup['checked_out']) and
        sum(e['type']=='run_completed' for e in terminal)==1 and
        [e['sequence'] for e in terminal]==list(range(1,len(terminal)+1)) and
        (mode!='commit-contention' or controlled_observed.is_set()))
    result = dict(mode=mode, pytest_exit=code, proof_pass=proof, control_errors=control_errors,
        environment=dict(python=sys.version, platform=platform.platform(), cpu_count=os.cpu_count()), timeline=ordered)
    (output/'timeline.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return 0 if proof else 1


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--mode',choices=['normal','pressure','commit-contention'],default='normal')
    parser.add_argument('--count',type=int,default=20)
    parser.add_argument('--child',action='store_true',help=argparse.SUPPRESS)
    args=parser.parse_args(); destination=args.output.resolve()
    if destination==ROOT or ROOT in destination.parents: parser.error('Output must be outside the repository')
    destination.mkdir(parents=True,exist_ok=True)
    if args.child: sys.exit(child(destination,args.mode))
    if args.count<20: parser.error('Use at least 20 independent case executions')
    env=dict(os.environ,RESEARCH_TRAIL_OFFLINE='1',PYTHONUTF8='1',PYTHONPATH=str(ROOT/'scripts/offline'))
    stop=threading.Event()
    def pressure():
        while not stop.is_set():
            sum(i*i for i in range(10000)); stop.wait(0.001)
    threads=[threading.Thread(target=pressure) for _ in range(4)] if args.mode=='pressure' else []
    for thread in threads: thread.start()
    results=[]
    try:
        for index in range(args.count):
            folder=destination/f'case-{index+1:02d}'; folder.mkdir(exist_ok=True)
            run=subprocess.run([sys.executable,__file__,'--child','--mode',args.mode,'--output',str(folder)],
                cwd=ROOT/'services/backend',env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=60)
            (folder/'pytest.log').write_bytes(run.stdout)
            result=dict(iteration=index+1,exit_code=run.returncode)
            results.append(result);print(json.dumps(result),flush=True)
    finally:
        stop.set()
        for thread in threads: thread.join()
        (destination/'summary.json').write_text(json.dumps(dict(mode=args.mode,results=results),indent=2),encoding='utf-8')
    sys.exit(int(any(r['exit_code'] for r in results)))
