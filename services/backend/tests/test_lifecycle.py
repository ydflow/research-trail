import json
import os
import queue
import subprocess
import sys
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
