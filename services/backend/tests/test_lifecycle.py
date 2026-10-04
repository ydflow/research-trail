import json
import os
import queue
import subprocess
import sys
import sqlite3
import threading
import time

import httpx
import pytest


@pytest.fixture
def servers():
    processes = []

    def start():
        token = os.urandom(32).hex()
        process = subprocess.Popen(
            [sys.executable, "-m", "research_trail"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, env={**os.environ, "RESEARCH_TRAIL_TOKEN": token},
        )
        processes.append(process)
        lines = queue.Queue()
        threading.Thread(target=lambda: lines.put(process.stdout.readline()), daemon=True).start()
        ready = json.loads(lines.get(timeout=10))
        port = ready["port"]
        url = f"http://127.0.0.1:{port}/health"
        with httpx.Client(trust_env=False, timeout=1) as client:
            for _ in range(50):
                try:
                    if client.get(url, headers={"X-ResearchTrail-Token": token}).status_code == 200:
                        break
                except httpx.TransportError:
                    time.sleep(0.1)
            else:
                pytest.fail("backend did not become healthy")
        return process, token, url

    yield start
    for process in processes:
        if process.poll() is None:
            process.stdin.close()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


def test_random_ports_instance_tokens_and_owned_shutdown(servers):
    first, first_token, first_url = servers()
    second, second_token, second_url = servers()
    assert first_url != second_url
    with httpx.Client(trust_env=False, timeout=2) as client:
        assert client.get(first_url).status_code == 401
        assert client.get(first_url, headers={"X-ResearchTrail-Token": second_token}).status_code == 401
        first.stdin.write("shutdown\n")
        first.stdin.flush()
        assert first.wait(timeout=5) == 0
        assert second.poll() is None
        assert client.get(second_url, headers={"X-ResearchTrail-Token": second_token}).status_code == 200
        with pytest.raises(httpx.TransportError):
            client.get(first_url, headers={"X-ResearchTrail-Token": first_token})


def test_owner_pipe_eof_stops_server(servers):
    process, _token, _url = servers()
    process.stdin.close()
    assert process.wait(timeout=5) == 0


def test_real_sse_persist_before_send_and_process_restart(servers):
    process, token, health_url = servers()
    with httpx.Client(trust_env=False, timeout=3, headers={"X-ResearchTrail-Token": token}) as client:
        base = health_url.removesuffix("/health")
        sid = client.post(base + "/sessions", json={"title": "进程重启"}).json()["id"]
        run = client.post(f"{base}/sessions/{sid}/runs", json={"input": "网络事件"}).json()
        events = []
        with client.stream("GET", f"{base}/sessions/{sid}/runs/{run['id']}/events") as response:
            assert response.status_code == 200
            for line in response.iter_lines():
                if not line.startswith("data: "):
                    continue
                envelope = json.loads(line[6:])
                with sqlite3.connect(os.environ["RESEARCH_TRAIL_DB_PATH"]) as db:
                    saved = db.execute("SELECT envelope FROM events WHERE run_id=? AND sequence=?",
                                       (run["id"], envelope["sequence"])).fetchone()
                    assert json.loads(saved[0]) == envelope
                events.append(envelope)
        assert [e["sequence"] for e in events] == list(range(1, 8))
    process.stdin.close()
    assert process.wait(timeout=5) == 0
    replacement, next_token, next_url = servers()
    with httpx.Client(trust_env=False, timeout=3, headers={"X-ResearchTrail-Token": next_token}) as client:
        base = next_url.removesuffix("/health")
        assert client.get(f"{base}/sessions/{sid}/messages").json()[0]["content"] == "网络事件"
        replay = client.get(f"{base}/sessions/{sid}/runs/{run['id']}/event-log?after_sequence=4").json()
        assert replay["events"] == events[4:]
        assert replacement.poll() is None
