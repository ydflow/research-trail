"""Explicit offline-only pi runner. Never imported by the production app factory.

Python admits whole batches using the existing ToolRegistry, and owns all business
events. Pipe sequence numbers are private transport state, not Store/SSE cursors.
"""
from collections import Counter
import json
import math
import os
from pathlib import Path
import queue
import re
import subprocess
import threading
import time
from types import SimpleNamespace
from uuid import uuid4

from .agent import AgentOutcome
from .conversation import ErrorPayload, ToolSuccess
from .store import RunStopped
from .tools import ToolExecutionError, ToolRegistry

ROOT = Path(__file__).resolve().parents[3]
MAX_FRAME, MAX_MESSAGES, MAX_ARGUMENT = 131072, 256, 4096
IDENTITY = re.compile(r"[A-Za-z0-9_-]{1,128}\Z")
ALLOWED_TOOLS = frozenset({"market_quote", "market_kline"})
OBSERVATIONS = frozenset({"agent_start", "assistant_batches", "tool_execution_start", "tool_execution_end", "agent_end"})


class BridgeError(Exception):
    def __init__(self, code="PI_PROTOCOL"):
        self.code = code
        super().__init__(code)


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise BridgeError()
        result[key] = value
    return result


def strict_json(raw):
    try:
        result = json.loads(raw, object_pairs_hook=unique, parse_constant=lambda _: (_ for _ in ()).throw(BridgeError()))
        def depth(value, level=0):
            if level > 32:
                raise BridgeError()
            if isinstance(value, float) and not math.isfinite(value): raise BridgeError()
            if isinstance(value, dict):
                for v in value.values(): depth(v, level + 1)
            elif isinstance(value, list):
                for v in value: depth(v, level + 1)
        depth(result)
        return result
    except (ValueError, UnicodeError, RecursionError):
        raise BridgeError() from None


def exact(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise BridgeError()


def worker_environment():
    # No inherited PATH, home/config dirs, credentials, DB path, proxy or NODE_OPTIONS.
    return {key: value for key, value in os.environ.items()
            if key.upper() in {"SYSTEMROOT", "WINDIR", "SYSTEMDRIVE", "COMSPEC", "TEMP", "TMP"}}


class Pipe:
    def __init__(self, process, run_id, attempt_id):
        self.process, self.run_id, self.attempt_id = process, run_id, attempt_id
        self.received, self.sent, self.seen = 0, 0, set()
        self.inbox, self.outbox = queue.Queue(16), queue.Queue(8)
        self.closed = threading.Event()
        self.threads = [threading.Thread(target=job, daemon=True, name="pi-pipe")
                        for job in (self.read, self.write, self.drain)]
        for thread in self.threads: thread.start()

    def publish(self, item):
        while not self.closed.is_set():
            try:
                self.inbox.put(item, timeout=0.02)
                return
            except queue.Full: pass

    def read(self):
        try:
            while not self.closed.is_set():
                line = self.process.stdout.readline(MAX_FRAME + 1)
                if not line:
                    self.publish(BridgeError("PI_WORKER_EXIT")); return
                if len(line) > MAX_FRAME or not line.endswith(b"\n"):
                    raise BridgeError()
                self.publish(strict_json(line.decode("utf-8")))
        except Exception:
            self.publish(BridgeError())

    def write(self):
        try:
            while not self.closed.is_set():
                try: line = self.outbox.get(timeout=0.02)
                except queue.Empty: continue
                self.process.stdin.write(line); self.process.stdin.flush()
        except (OSError, ValueError):
            self.publish(BridgeError("PI_WORKER_EXIT"))

    def drain(self):
        # Discard diagnostics, bounded chunks; never copy arbitrary stderr into logs/events.
        try:
            while not self.closed.is_set() and self.process.stderr.read(1024): pass
        except (OSError, ValueError): pass

    def send(self, kind, payload, request_id=None):
        self.sent += 1
        message = dict(version=1, request_id=request_id or str(uuid4()), run_id=self.run_id,
                       attempt_id=self.attempt_id, sequence=self.sent, type=kind, payload=payload)
        line = (json.dumps(message, ensure_ascii=False, allow_nan=False) + "\n").encode("utf-8")
        if len(line) > MAX_FRAME or self.sent > MAX_MESSAGES: raise BridgeError()
        try: self.outbox.put_nowait(line)
        except queue.Full: raise BridgeError() from None

    def validate(self, message):
        if isinstance(message, BridgeError): raise message
        exact(message, ("version", "request_id", "run_id", "attempt_id", "sequence", "type", "payload"))
        identity = message["request_id"]
        if (type(message["version"]) is not int or message["version"] != 1 or
            message["run_id"] != self.run_id or message["attempt_id"] != self.attempt_id or
            type(message["sequence"]) is not int or message["sequence"] != self.received + 1 or
            message["sequence"] > MAX_MESSAGES or not isinstance(identity, str) or
            not IDENTITY.fullmatch(identity) or identity in self.seen or
            not isinstance(message["type"], str) or not isinstance(message["payload"], dict)):
            raise BridgeError()
        self.received += 1; self.seen.add(identity)
        return message

    def close(self):
        try: self.send("shutdown", {})
        except (BridgeError, OSError): pass
        try: self.process.wait(timeout=0.25)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            try: self.process.wait(timeout=0.25)
            except subprocess.TimeoutExpired:
                self.process.kill(); self.process.wait(timeout=1)
        self.closed.set()
        for thread in self.threads: thread.join(0.25)
        for stream in (self.process.stdin, self.process.stdout, self.process.stderr):
            try: stream.close()
            except OSError: pass  # Windows broken pipe flush after a worker crash.


class PiOfflineBridge:
    """One attempt, no retry/fallback. Only explicit fixture quote/kline test use.

    Fake batches are model fixtures, not pre-approved tools. The real pi Agent
    emits them; Python independently admits and executes the complete batch.
    """
    def __init__(self, tools: ToolRegistry, *, node: Path, batches, worker=None,
                 max_calls=8, response_timeout=3.0, run_id=None):
        self.tools, self.node, self.batches = tools, Path(node), batches
        self.worker = Path(worker) if worker else ROOT / "packages/pi-worker/worker.mjs"
        if not self.node.is_absolute() or not self.node.is_file() or not self.worker.is_absolute():
            raise ValueError("Explicit absolute Node and Worker paths required")
        if type(max_calls) is not int or not 1 <= max_calls <= 8 or not 0.05 <= response_timeout <= 10:
            raise ValueError("Invalid bridge limits")
        self.max_calls, self.response_timeout = max_calls, response_timeout
        # Parent's tool limit must expire before the Worker's result-RPC limit.
        self.tool_timeout = min(2.0, response_timeout * 0.8)
        self.run_id = run_id or str(uuid4())
        if not IDENTITY.fullmatch(self.run_id): raise ValueError("Invalid run ID")
        self.model = SimpleNamespace(label="pi 离线验证／假模型")
        self.observations, self.proof, self.execution_count = Counter(), {}, 0
        self.process = None
        self._used = False

    def admit(self, calls, used, calls_used, rounds, checkpoint):
        checkpoint()
        if not isinstance(calls, list) or not calls: raise BridgeError()
        if rounds >= self.max_calls or calls_used + len(calls) > self.max_calls:
            raise BridgeError("TOOL_LIMIT")
        ids, validated = set(), []
        for item in calls:
            exact(item, ("id", "name", "arguments"))
            identity, name, raw = item["id"], item["name"], item["arguments"]
            if not isinstance(identity, str) or not IDENTITY.fullmatch(identity) or identity in used or identity in ids:
                raise BridgeError("MODEL_RESPONSE_INVALID")
            ids.add(identity)
            if not isinstance(name, str) or name not in ALLOWED_TOOLS:
                raise BridgeError("UNKNOWN_TOOL")
            if not isinstance(raw, str) or len(raw.encode("utf-8")) > MAX_ARGUMENT:
                raise BridgeError("INVALID_ARGUMENT")
            try: arguments = strict_json(raw)
            except BridgeError: raise BridgeError("INVALID_ARGUMENT") from None
            validated.append((identity, name, self.tools.decode(name, arguments)))
        # Commit admission only after ALL names/IDs/parameters/budgets pass.
        checkpoint()
        used.update(ids)
        return validated

    def run(self, text, emit, *, before_tool=lambda: None, after_tool=lambda: None, stop=None, deadline=None):
        if self._used: raise ValueError("Bridge attempts cannot be retried/replayed")
        self._used = True
        stop = stop if stop is not None else threading.Event()
        deadline = deadline if deadline is not None else time.monotonic() + 15
        pipe = None
        def checkpoint():
            if stop.is_set(): raise RunStopped()
            if time.monotonic() >= deadline: raise BridgeError("RUN_TIMEOUT")
        def receive(until):
            while True:
                checkpoint()
                if time.monotonic() >= until: raise BridgeError("PI_RESPONSE_TIMEOUT")
                try: return pipe.validate(pipe.inbox.get(timeout=min(0.02, max(0.001, until - time.monotonic()))))
                except queue.Empty:
                    if self.process.poll() is not None: raise BridgeError("PI_WORKER_EXIT")
        def observe(message):
            if message["type"] != "observation": return False
            exact(message["payload"], ("event",))
            event = message["payload"]["event"]
            if event not in OBSERVATIONS: raise BridgeError()
            self.observations[event] += 1
            return True
        try:
            checkpoint()
            args = [str(self.node), "--require", str(ROOT / "scripts/offline/network.cjs"),
                    str(self.worker), self.run_id, str(uuid4())]
            self.process = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                            env=worker_environment(), cwd=self.worker.parent, shell=False,
                                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            pipe = Pipe(self.process, self.run_id, args[-1])
            ready = receive(time.monotonic() + self.response_timeout)
            if ready["type"] != "ready" or ready["payload"] != {"package":"@earendil-works/pi-agent-core", "version":"1.1.0", "agent":"Agent", "tool_execution":"sequential"}:
                raise BridgeError("PI_HANDSHAKE")
            self.proof["ready"] = ready["payload"]
            emit("status", {"phase":"working", "detail":"pi 1.1.0 离线验证；Python 批次准入，只读模拟行情。"})
            tools = [{key: f["function"][key] for key in ("name", "description", "parameters")}
                     for f in self.tools.definitions() if f["function"]["name"] in ALLOWED_TOOLS]
            pipe.send("start", dict(tools=tools, batches=self.batches, rpc_timeout_ms=math.ceil(self.response_timeout * 1000),
                                    run_timeout_ms=min(120000, max(50, math.ceil((deadline-time.monotonic())*1000)))))
            used, calls_used, rounds, approved, token, cursor = set(), 0, 0, [], None, 0
            while True:
                message = receive(time.monotonic() + self.response_timeout)
                kind, payload = message["type"], message["payload"]
                if observe(message): continue
                if kind == "tool_batch":
                    exact(payload, ("calls",))
                    if cursor != len(approved): raise BridgeError()
                    approved = self.admit(payload["calls"], used, calls_used, rounds, checkpoint)
                    calls_used += len(approved); rounds += 1; cursor = 0; token = str(uuid4())
                    pipe.send("batch_permit", {"token":token}, message["request_id"])
                elif kind == "tool_request":
                    exact(payload, ("token", "ordinal", "call_id", "name"))
                    if cursor >= len(approved) or payload != {"token":token, "ordinal":cursor, "call_id":approved[cursor][0], "name":approved[cursor][1]} or type(payload["ordinal"]) is not int:
                        raise BridgeError()
                    _, _, call = approved[cursor]; cursor += 1  # Consume before dispatch; never retry.
                    checkpoint(); before_tool(); checkpoint()
                    call_id = str(uuid4())
                    emit("tool_started", {"call_id":call_id, "name":call.name, "input":call.arguments.model_dump()})
                    result_queue = queue.Queue(1)
                    def execute():
                        try:
                            checkpoint()
                            result_queue.put((True, self.tools.execute(call)))
                        except Exception as error: result_queue.put((False, error))
                    self.execution_count += 1
                    threading.Thread(target=execute, daemon=True, name="pi-read-only-tool").start()
                    tool_deadline = min(deadline, time.monotonic() + self.tool_timeout)
                    while True:
                        checkpoint()
                        if self.process.poll() is not None: raise BridgeError("PI_WORKER_EXIT")
                        if time.monotonic() >= tool_deadline: raise BridgeError("TOOL_TIMEOUT")
                        # Any extra request while a tool is pending is a protocol violation.
                        try:
                            extra = pipe.validate(pipe.inbox.get_nowait())
                            if not observe(extra): raise BridgeError()
                        except queue.Empty: pass
                        try: ok, value = result_queue.get(timeout=0.01); break
                        except queue.Empty: pass
                    checkpoint(); after_tool(); checkpoint()
                    if not ok:
                        if isinstance(value, ToolExecutionError): raise value
                        raise BridgeError("PROVIDER_ERROR")
                    result = ToolSuccess(data=value).model_dump(mode="json")
                    if result["data"].get("source") != "fixture": raise BridgeError("INVALID_RESULT")
                    emit("tool_result", {"call_id":call_id, "name":call.name, "result":result})
                    pipe.send("tool_result", {"result":result}, message["request_id"])
                elif kind == "engine_end":
                    exact(payload, ("ok", "answer", "stats"))
                    if cursor != len(approved) or payload["ok"] is not True or not isinstance(payload["answer"], str) or not 0 < len(payload["answer"]) <= 4000:
                        raise BridgeError("PI_ENGINE_FAILED")
                    stats = payload["stats"]
                    exact(stats, (*OBSERVATIONS, "stream_calls", "results_seen"))
                    if any(type(n) is not int or not 0 <= n <= MAX_MESSAGES for n in stats.values()) or any(stats[k] != self.observations[k] for k in OBSERVATIONS) or stats["results_seen"] != self.execution_count:
                        raise BridgeError()
                    self.proof["stats"] = stats
                    checkpoint()
                    return AgentOutcome(payload["answer"], "completed")
                else: raise BridgeError()
        except RunStopped:
            if pipe:
                try: pipe.send("cancel", {})
                except BridgeError: pass
            raise
        except (BridgeError, ToolExecutionError, OSError) as error:
            if stop.is_set(): raise RunStopped()  # Cancellation wins over a concurrent pipe error.
            code = error.error.code if isinstance(error, ToolExecutionError) else error.code if isinstance(error, BridgeError) else "PI_WORKER_START"
            public = ErrorPayload(code=code, message="pi 离线桥接失败；未自动重试，已执行工具保留。")
            emit("error", public.model_dump(mode="json"))
            return AgentOutcome(public.message, "timed_out" if code in {"RUN_TIMEOUT", "TOOL_TIMEOUT", "PI_RESPONSE_TIMEOUT"} else "failed", public)
        finally:
            if pipe: pipe.close()
