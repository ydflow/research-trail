"""Repeatable offline P2-09 measurements; intentionally outside the CI budget.

Run with services/backend/.venv/Scripts/python.exe scripts/stability-performance.py
bench|repeat --output <outside-repository-directory> [--count 20] [--pressure].
"""
import argparse
import itertools
import json
import os
from pathlib import Path
import platform
import statistics
import subprocess
import sys
import threading
import time
import tracemalloc
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / 'services/backend'
sys.path.insert(0, str(BACKEND))


def seed(store, count, title='离线长期会话'):
    """Fixed content, IDs, timestamps, no models, providers or real accounts."""
    from unittest.mock import patch
    ids = itertools.count(1)
    with patch('research_trail.store.uuid4', side_effect=lambda: UUID(int=next(ids))), \
            patch('research_trail.store.now', return_value='2024-01-16T21:00:00+00:00'):
        sid = store.create_session(title).id
        for index in range(count):
            store.start_fixture(sid, f'离线研究问题 {index:04d} ' + '证据与来源核对。' * 30)
    return sid


def summary(values):
    return dict(median=statistics.median(values), minimum=min(values), maximum=max(values))


def bench(output, large=False):
    from research_trail.database import Database
    from research_trail.store import Store
    from research_trail.session_capacity import json_units, wire_json
    rows = []
    for count in ((1, 10, 25, 50, 100, 1000) if large else (1, 10, 25, 50, 100)):
        db = Database(output / f'load-{count}.sqlite3'); db.migrate()
        store = Store(db); sid = seed(store, count)
        for _ in range(2): store.snapshot(sid)
        tracemalloc.start()
        elapsed, serialize = [], []
        for _ in range(7):
            begin = time.perf_counter(); snap = store.snapshot(sid)
            elapsed.append((time.perf_counter() - begin) * 1000)
            begin = time.perf_counter(); payload = snap.model_dump(mode='json'); raw = wire_json(payload)
            serialize.append((time.perf_counter() - begin) * 1000)
        retained, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        rows.append(dict(runs=count, messages=len(snap.messages), events=len(snap.events),
            snapshot_ms=summary(elapsed), serialization_ms=summary(serialize),
            utf8_bytes=len(raw.encode('utf-8')), utf16_units=json_units(payload),
            traced_retained_bytes=retained, traced_peak_bytes=peak,
            sqlite_bytes=db.path.stat().st_size,
            checked_out_connections=db.engine.pool.checkedout()))
        if hasattr(store, 'history'):
            durations = []
            tracemalloc.start()
            for _ in range(7):
                begin=time.perf_counter(); page=store.history(sid)
                durations.append((time.perf_counter()-begin)*1000)
            retained, peak=tracemalloc.get_traced_memory();tracemalloc.stop()
            rows[-1]['initial_page']=dict(read_and_budget_check_ms=summary(durations),
                messages=len(page.messages),events=len(page.events),utf16_units=json_units(page.model_dump(mode='json')),
                traced_retained_bytes=retained,traced_peak_bytes=peak)
            complete_read, complete_wire = [], []
            tracemalloc.start()
            for _ in range(7):
                cursor=None; pages=0; read_ms=0; wire_ms=0; units=0
                message_ids, run_ids, event_ids = [], [], []
                while True:
                    begin=time.perf_counter(); part=store.history(sid,cursor)
                    read_ms+=(time.perf_counter()-begin)*1000
                    begin=time.perf_counter(); encoded=wire_json(part.model_dump(mode='json'))
                    wire_ms+=(time.perf_counter()-begin)*1000
                    units+=len(encoded.encode('utf-16-le'))//2; pages+=1
                    message_ids.extend(message.id for message in part.messages)
                    run_ids.extend(run.id for run in part.runs)
                    event_ids.extend((event.run_id,event.sequence) for event in part.events)
                    if not part.has_more: break
                    assert part.next_before_sequence is not None and (cursor is None or part.next_before_sequence<cursor)
                    cursor=part.next_before_sequence
                assert len(message_ids)==len(set(message_ids))==2*count
                assert len(run_ids)==len(set(run_ids))==count
                assert len(event_ids)==len(set(event_ids))==7*count
                assert set(message_ids)=={message.id for message in snap.messages}
                assert set(event_ids)=={(event.run_id,event.sequence) for event in snap.events}
                complete_read.append(read_ms);complete_wire.append(wire_ms)
            retained,peak=tracemalloc.get_traced_memory();tracemalloc.stop()
            rows[-1]['complete_paging']=dict(read_and_budget_check_ms=summary(complete_read),
                response_serialization_ms=summary(complete_wire),pages=pages,utf16_units_total=units,
                messages=len(message_ids),events=len(event_ids),no_duplicates_or_omissions=True,
                traced_retained_bytes=retained,traced_peak_bytes=peak,
                memory_method='Stream pages; retain identity lists for correctness, not all page DTOs')
        db.close()
    result = dict(environment=dict(python=sys.version, platform=platform.platform(),
        cpu_count=os.cpu_count(), samples=7, clock='perf_counter', memory='tracemalloc; Python allocations, not process RSS'), rows=rows)
    (output / 'performance.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))


def repeat(output, count, pressure):
    targets = [
        'tests/test_agent.py::test_model_provider_replaced_independently_and_error_is_terminal[respond]',
        'tests/test_reports.py::test_real_transport_cancel_timeout_keep_failure_without_fallback[timeout]',
    ]
    env = dict(os.environ, RESEARCH_TRAIL_OFFLINE='1', PYTHONUTF8='1',
               PYTHONPATH=str(ROOT / 'scripts/offline'), UV_OFFLINE='1')
    # Yielding CPU threads add scheduling contention without creating unbounded
    # processes or accessing the measured database. Same test deadlines remain.
    stop = threading.Event()
    def load():
        while not stop.is_set():
            sum(i * i for i in range(10000))
            stop.wait(0.001)
    workers = [threading.Thread(target=load) for _ in range(4)] if pressure else []
    for worker in workers: worker.start()
    rows = []
    try:
        for which, target in enumerate(targets):
            for index in range(count):
                begin = time.perf_counter()
                result = subprocess.run([sys.executable, '-m', 'pytest', '-q', target], cwd=BACKEND,
                    env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', timeout=60)
                (output / f'target-{which}-{index:02d}.log').write_text(result.stdout, encoding='utf-8')
                row = dict(target=target, iteration=index + 1, exit_code=result.returncode,
                           seconds=time.perf_counter() - begin)
                rows.append(row); print(json.dumps(row), flush=True)
    finally:
        stop.set()
        for worker in workers: worker.join()
        (output / 'repetitions.json').write_text(json.dumps(dict(pressure=pressure, rows=rows), indent=2), encoding='utf-8')
    return int(any(row['exit_code'] for row in rows))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['bench', 'repeat', 'seed'])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--count', type=int, default=20)
    parser.add_argument('--pressure', action='store_true')
    parser.add_argument('--large', action='store_true', help='Include 1000 runs / 7000 saved events')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if ROOT in args.output.resolve().parents:
        parser.error('Store private load databases and logs outside the repository')
    if args.count < 20 and args.operation == 'repeat': parser.error('At least 20 independent runs per case')
    if args.operation == 'bench': bench(args.output, args.large)
    elif args.operation == 'seed':
        from research_trail.database import Database
        from research_trail.store import Store
        database=Database(args.output/'history.sqlite3');database.migrate()
        try: print(json.dumps(dict(session_id=seed(Store(database), args.count), database=str(database.path))))
        finally: database.close()
    else: sys.exit(repeat(args.output, args.count, args.pressure))
