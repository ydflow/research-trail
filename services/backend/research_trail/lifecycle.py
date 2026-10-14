"""Owned Python workers; SQLite is the authority for lifecycle and event order."""
from dataclasses import dataclass, field
from pathlib import Path
import os
import threading
import time

from .conversation import ErrorPayload
from .store import RunStopped, Store


class DatabaseLease:
    """One live service per conversation DB; never interrupt another live owner."""
    def __init__(self, path: Path):
        self.file = open(str(path) + ".owner.lock", "a+b")
        try:
            if os.fstat(self.file.fileno()).st_size == 0:
                self.file.write(b"0"); self.file.flush()
            self.file.seek(0)
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(self.file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            self.file.close()
            raise RuntimeError("该会话数据库正被另一本机服务使用，请关闭对应窗口或使用独立数据库。") from None

    def close(self):
        self.file.close()  # OS releases the lock even after a hard process exit.


@dataclass(frozen=True)
class Timing:
    delay: float = 0
    tool_timeout: float = 2
    run_timeout: float = 15


SCENARIOS = {"normal": Timing(), "delayed": Timing(3, 5), "timeout": Timing(2, 0.6)}


@dataclass
class Work:
    session_id: str
    run_id: str
    timing: Timing
    runner: object = None
    deadline: float = 0
    stop: threading.Event = field(default_factory=threading.Event)
    timers: list[threading.Timer] = field(default_factory=list)
    thread: threading.Thread | None = None
    tool_timer: threading.Timer | None = None


class RunManager:
    def __init__(self, store: Store, runner, timings=None):
        self.store, self.runner = store, runner
        self.timings = SCENARIOS if timings is None else timings
        self.lock = threading.RLock()
        self.work: dict[str, Work] = {}
        self.closed = False

    def timer(self, work, seconds, code):
        timer = threading.Timer(seconds, lambda: self.timeout(work, code, timer))
        timer.daemon = True
        work.timers.append(timer)
        if code == "TOOL_TIMEOUT":
            work.tool_timer = timer
        timer.start()
        return timer

    def start(self, session_id, text, scenario, *, runner=None, runner_factory=None, timing=None, kind="fake_agent", research_context=None, binding_validate=None):
        # Internal factories construct one runner after Store assigns the ID.
        # They only snapshot/create local objects, never start model/tool/Node IO.
        if runner is not None and runner_factory is not None:
            raise ValueError("Choose a runner or a runner factory, not both")
        with self.lock:
            if self.closed:
                raise RuntimeError("后端正在关闭。")
            timing = self.timings[scenario] if timing is None else timing
            record = self.store.begin_agent(session_id, text, kind, research_context=research_context, binding_validate=binding_validate)
            work = Work(session_id, record.id, timing, self.runner if runner is None else runner,
                        time.monotonic() + timing.run_timeout)
            self.work[record.id] = work
            try:
                if runner_factory is not None:
                    try:
                        work.runner = runner_factory(record.id)
                        label = getattr(getattr(work.runner, "model", None), "label", None)
                        if not callable(getattr(work.runner, "run", None)) or not isinstance(label, str) or not label.strip():
                            raise ValueError("Invalid runner")
                    except Exception:
                        record = self.settle(work, "failed", error=ErrorPayload(
                            code="RUNNER_CREATE_FAILED", message="内部实验Runner创建失败；未启动模型或工具。"))
                        self.work.pop(record.id, None)
                        return record
                self.timer(work, work.timing.run_timeout, "RUN_TIMEOUT")
                work.thread = threading.Thread(target=self.execute, args=(work, text), daemon=True,
                                               name=f"agent-run-{record.id}")
                work.thread.start()
            except Exception:
                record = self.settle(work, "failed", error=ErrorPayload(code="WORKER_START_FAILED", message="Agent工作线程启动失败。"))
                self.work.pop(record.id, None)
            return record

    def checkpoint(self, work):
        if work.stop.is_set() or self.closed:
            raise RunStopped()

    def emit(self, work, kind, payload):
        with self.lock:
            self.checkpoint(work)
            # Error is included once, atomically with the winning terminal state.
            if kind != "error":
                if kind == "status" and work.runner is self.runner:
                    payload = {**payload, "detail": payload["detail"] +
                               f" 模拟工具时序：延迟{work.timing.delay:g}秒，工具限时{work.timing.tool_timeout:g}秒。"}
                guard = getattr(work.runner, 'report_result_guard', None) if kind == 'tool_result' and payload['result']['ok'] else None
                self.store.append_running(work.session_id, work.run_id, kind, payload, result_guard=guard)

    def before_tool(self, work):
        with self.lock:
            self.checkpoint(work)
            work.tool_timer = self.timer(work, work.timing.tool_timeout, "TOOL_TIMEOUT")
        # Deterministic simulation delay, independently labelled in the UI.
        work.stop.wait(work.timing.delay)
        self.checkpoint(work)

    def after_tool(self, work):
        with self.lock:
            self.checkpoint(work)
            if work.tool_timer:
                work.tool_timer.cancel()
                work.tool_timer = None

    def execute(self, work, text):
        try:
            self.checkpoint(work)
            outcome = work.runner.run(text, lambda kind, payload: self.emit(work, kind, payload), stop=work.stop,
                                      deadline=work.deadline, before_tool=lambda: self.before_tool(work),
                                      after_tool=lambda: self.after_tool(work))
            with self.lock:
                self.checkpoint(work)
                self.settle(work, outcome.status, text=outcome.answer, error=outcome.error)
        except RunStopped:
            with self.lock:
                if not self.closed and not work.stop.is_set():
                    # A runner/provider may stop independently of Manager.
                    # Removing Work must never leave an orphan running record.
                    self.settle(work, "failed", error=ErrorPayload(
                        code="RUN_STOPPED", message="Runner意外停止；已保存内容保留，不自动重执行。"))
        except Exception as error:
            with self.lock:
                if not self.closed and not work.stop.is_set():
                    code = getattr(error, 'code', 'RUN_ERROR') if hasattr(work.runner, 'report_result_guard') else 'RUN_ERROR'
                    self.settle(work, "failed", error=ErrorPayload(code=code, message="Agent运行发生错误；保存报告或原始证据不可用。" if code != 'RUN_ERROR' else "Agent运行发生内部错误。"))
        finally:
            with self.lock:
                work.stop.set()
                for timer in work.timers:
                    timer.cancel()
                self.work.pop(work.run_id, None)

    def settle(self, work, status, text="", error=None):
        # Manager lock orders callbacks; Store's transaction is the final guard.
        guard = getattr(work.runner, 'report_result_guard', None) if status == 'completed' else None
        record = self.store.finish(work.session_id, work.run_id, status, text, error, result_guard=guard)
        work.stop.set()
        for timer in work.timers:
            timer.cancel()
        return record

    def timeout(self, work, code, timer=None):
        with self.lock:
            if self.closed or work.stop.is_set():
                return
            if code == "TOOL_TIMEOUT" and work.tool_timer is None:
                return
            if code == "TOOL_TIMEOUT" and timer is not None and work.tool_timer is not timer:
                return  # A cancelled previous tool timer cannot time out the next tool.
            error = ErrorPayload(code=code, message="只读工具超时。" if code == "TOOL_TIMEOUT" else "Agent运行达到整体时间限制。")
            self.settle(work, "timed_out", text=f"{work.runner.model.label}：{error.message}", error=error)

    def cancel(self, session_id, run_id):
        with self.lock:
            record = self.store.run(session_id, run_id)
            if record.status != "running":
                return record
            work = self.work.get(run_id)
            if work is not None:
                return self.settle(work, "cancelled", text=f"\n{record.model_label}：已取消，保存的内容保留。")
            return self.store.finish(session_id, run_id, "cancelled", f"\n{record.model_label or '固定测试'}：已取消。")

    def delete_session(self, session_id):
        with self.lock:
            self.store.session(session_id)
            for record in self.store.active_runs(session_id):
                self.cancel(session_id, record.id)
            self.store.delete_session(session_id)

    def shutdown(self):
        with self.lock:
            self.closed = True
            threads = [work.thread for work in self.work.values() if work.thread]
            for work in list(self.work.values()):
                if work.stop.is_set():
                    continue
                self.settle(work, "interrupted", f"\n{work.runner.model.label}：后端已退出，请重新发起。",
                            ErrorPayload(code="BACKEND_INTERRUPTED", message="后端关闭中断运行；保存内容保留，不自动重执行。"))
            self.store.recover_interrupted()
        deadline = time.monotonic() + 1
        for thread in threads:
            thread.join(max(0, deadline - time.monotonic()))
