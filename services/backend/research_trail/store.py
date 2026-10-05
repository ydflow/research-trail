from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import delete, func, select

from .conversation import EVENT_ADAPTER, MODEL_LABEL, LIVE_MODEL_LABEL, ErrorPayload, EventPage, MessageDTO, RunDTO, SessionDTO, SessionSnapshot
from .database import Database
from .models import EventRecord, MessageRecord, RunRecord, SessionRecord

FIXTURE_PARTS = ("固定通信测试事件。", "未调用模型或行情。")


def now():
    return datetime.now(timezone.utc).isoformat()


class MissingRecord(Exception):
    pass


class ActiveRun(Exception):
    pass


class RunStopped(Exception):
    """Control flow: persisted terminal/deletion prevents late worker writes."""


class Store:
    def __init__(self, database: Database):
        self.database = database

    @staticmethod
    def require_session(db, session_id):
        record = db.get(SessionRecord, session_id)
        if record is None:
            raise MissingRecord("会话不存在或已删除。")
        return record

    @staticmethod
    def require_run(db, session_id, run_id):
        Store.require_session(db, session_id)
        record = db.get(RunRecord, run_id)
        if record is None or record.session_id != session_id:
            raise MissingRecord("运行不属于当前会话或已删除。")
        return record

    @staticmethod
    def session_dto(db, record):
        count = db.scalar(select(func.count()).select_from(MessageRecord).where(MessageRecord.session_id == record.id))
        return SessionDTO(id=record.id, title=record.title, created_at=record.created_at,
                          updated_at=record.updated_at, message_count=count)

    def create_session(self, title):
        with self.database.write() as db:
            timestamp = now()
            record = SessionRecord(id=str(uuid4()), title=title, created_at=timestamp, updated_at=timestamp)
            db.add(record)
            db.flush()
            result = self.session_dto(db, record)
        return result

    def sessions(self):
        with self.database.sessions() as db:
            rows = db.execute(select(SessionRecord, func.count(MessageRecord.id))
                              .outerjoin(MessageRecord, MessageRecord.session_id == SessionRecord.id)
                              .group_by(SessionRecord.id).order_by(SessionRecord.updated_at.desc(), SessionRecord.id)).all()
            return [SessionDTO(id=row.id, title=row.title, created_at=row.created_at,
                               updated_at=row.updated_at, message_count=count) for row, count in rows]

    def session(self, session_id):
        with self.database.sessions() as db:
            return self.session_dto(db, self.require_session(db, session_id))

    def delete_session(self, session_id):
        with self.database.write() as db:
            self.require_session(db, session_id)
            if db.scalar(select(RunRecord.id).where(RunRecord.session_id == session_id, RunRecord.status == "running")):
                raise ActiveRun("删除前必须取消活动运行。")
            db.execute(delete(SessionRecord).where(SessionRecord.id == session_id))

    def messages(self, session_id):
        with self.database.sessions() as db:
            self.require_session(db, session_id)
            rows = db.scalars(select(MessageRecord).where(MessageRecord.session_id == session_id)
                              .order_by(MessageRecord.sequence)).all()
            return [MessageDTO.model_validate(row) for row in rows]

    def runs(self, session_id):
        with self.database.sessions() as db:
            self.require_session(db, session_id)
            return [RunDTO.model_validate(row) for row in db.scalars(
                select(RunRecord).where(RunRecord.session_id == session_id).order_by(RunRecord.started_at.desc(), RunRecord.id))]

    def run(self, session_id, run_id):
        with self.database.sessions() as db:
            return RunDTO.model_validate(self.require_run(db, session_id, run_id))

    def snapshot(self, session_id):
        with self.database.sessions() as db:
            # sqlite3 legacy mode does not BEGIN on SELECT. Pin one WAL read
            # snapshot so message text and each run's event waterline agree.
            db.connection().exec_driver_sql("BEGIN")
            session = self.session_dto(db, self.require_session(db, session_id))
            messages = [MessageDTO.model_validate(row) for row in db.scalars(
                select(MessageRecord).where(MessageRecord.session_id == session_id).order_by(MessageRecord.sequence))]
            runs = [RunDTO.model_validate(row) for row in db.scalars(
                select(RunRecord).where(RunRecord.session_id == session_id).order_by(RunRecord.started_at.desc(), RunRecord.id))]
            events = [EVENT_ADAPTER.validate_python(row.envelope) for row in db.scalars(
                select(EventRecord).where(EventRecord.session_id == session_id).order_by(EventRecord.run_id, EventRecord.sequence))]
            return SessionSnapshot(session=session, messages=messages, runs=runs, events=events)

    def start_fixture(self, session_id, text):
        return self._start_run(session_id, text)

    def _start_run(self, session_id, text):
        # Retain the atomic step 3 fixture communication test, without Agent work.
        with self.database.write() as db:
            session = self.require_session(db, session_id)
            if db.scalar(select(RunRecord.id).where(RunRecord.session_id == session_id, RunRecord.status == "running")):
                raise ActiveRun("当前会话已有活动运行，请先取消或等待结束。")
            message_sequence = (db.scalar(select(func.max(MessageRecord.sequence))
                                .where(MessageRecord.session_id == session_id)) or 0) + 1
            run_id, user_id, assistant_id = (str(uuid4()) for _ in range(3))
            started = now()
            common = {"protocol_version": 1, "session_id": session_id, "run_id": run_id}
            events = []

            def emit(kind, payload, message=False):
                sequence = len(events) + 1
                data = {**common, "sequence": sequence, "type": kind, "timestamp": now(), "payload": payload}
                if message:
                    data["message_id"] = assistant_id
                envelope = EVENT_ADAPTER.validate_python(data).model_dump(mode="json")
                events.append(EventRecord(run_id=run_id, session_id=session_id, sequence=sequence,
                                          type=kind, timestamp=data["timestamp"], envelope=envelope))

            emit("run_started", {"input": text, "started_at": started})
            emit("message_started", {}, True)
            emit("status", {"phase": "working", "detail": "固定测试事件；没有Agent或模型调用。"})
            for part in FIXTURE_PARTS:
                emit("text_delta", {"text": part}, True)
            emit("message_completed", {}, True)
            emit("run_completed", {"stop_reason": "completed"})
            completed = now()
            record = RunRecord(id=run_id, session_id=session_id, kind="fixture",
                               status="completed", input=text, answer="".join(FIXTURE_PARTS),
                               model_label=None, error=None,
                               assistant_message_id=assistant_id,
                               started_at=started, completed_at=completed, last_sequence=len(events))
            db.add(record)
            db.flush()
            db.add_all([
                MessageRecord(id=user_id, session_id=session_id, run_id=run_id, sequence=message_sequence,
                              role="user", content=text, created_at=started),
                MessageRecord(id=assistant_id, session_id=session_id, run_id=run_id, role="assistant",
                              sequence=message_sequence + 1, content=record.answer, created_at=completed), *events,
            ])
            session.updated_at = completed
            db.flush()
            result = RunDTO.model_validate(record)
        return result

    @staticmethod
    def append_event(db, record, session, kind, payload, message=False):
        timestamp = now()
        record.last_sequence += 1
        data = {"protocol_version": 1, "session_id": record.session_id, "run_id": record.id,
                "sequence": record.last_sequence, "type": kind, "timestamp": timestamp, "payload": payload}
        if message:
            data["message_id"] = record.assistant_message_id
        envelope = EVENT_ADAPTER.validate_python(data).model_dump(mode="json")
        db.add(EventRecord(run_id=record.id, session_id=record.session_id, sequence=record.last_sequence,
                           type=kind, timestamp=timestamp, envelope=envelope))
        session.updated_at = timestamp

    def begin_agent(self, session_id, text, kind="fake_agent"):
        if kind not in ("fake_agent", "openai_agent"):
            raise ValueError("不是Agent运行类型")
        with self.database.write() as db:
            session = self.require_session(db, session_id)
            if db.scalar(select(RunRecord.id).where(RunRecord.session_id == session_id, RunRecord.status == "running")):
                raise ActiveRun("当前会话已有活动运行，请先取消或等待结束。")
            message_sequence = (db.scalar(select(func.max(MessageRecord.sequence))
                                .where(MessageRecord.session_id == session_id)) or 0) + 1
            started = now()
            record = RunRecord(id=str(uuid4()), session_id=session_id, kind=kind, status="running",
                               model_label=MODEL_LABEL if kind == "fake_agent" else LIVE_MODEL_LABEL, error=None, input=text, answer="",
                               assistant_message_id=str(uuid4()), started_at=started, completed_at=None,
                               last_sequence=0)
            self.append_event(db, record, session, "run_started", {"input": text, "started_at": started})
            self.append_event(db, record, session, "message_started", {}, True)
            db.add(record)
            db.flush([record])
            db.add_all([
                MessageRecord(id=str(uuid4()), session_id=session_id, run_id=record.id, sequence=message_sequence,
                              role="user", content=text, created_at=started),
                MessageRecord(id=record.assistant_message_id, session_id=session_id, run_id=record.id,
                              sequence=message_sequence + 1, role="assistant", content="", created_at=started),
            ])
            db.flush()
            result = RunDTO.model_validate(record)
        return result

    def append_running(self, session_id, run_id, kind, payload):
        if kind not in ("status", "text_delta", "tool_started", "tool_result"):
            raise ValueError("终态事件只能通过finish写入")
        with self.database.write() as db:
            try:
                record = self.require_run(db, session_id, run_id)
            except MissingRecord:
                raise RunStopped() from None
            if record.status != "running":
                raise RunStopped()
            session = self.require_session(db, session_id)
            self.append_event(db, record, session, kind, payload, kind == "text_delta")
            if kind == "text_delta":
                record.answer += payload["text"]
                db.get(MessageRecord, record.assistant_message_id).content = record.answer

    def finish(self, session_id, run_id, status, text="", error: ErrorPayload | None = None):
        if status not in ("completed", "failed", "cancelled", "timed_out", "interrupted"):
            raise ValueError("不是合法终态")
        with self.database.write() as db:
            record = self.require_run(db, session_id, run_id)
            # BEGIN IMMEDIATE serializes every contender. Only running -> terminal
            # can write a final message/event; retries return the winning record.
            if record.status == "running":
                session = self.require_session(db, session_id)
                assistant = db.get(MessageRecord, record.assistant_message_id)
                if error is not None:
                    self.append_event(db, record, session, "error", error.model_dump(mode="json"))
                if status == "cancelled":
                    self.append_event(db, record, session, "cancelled",
                                      {"reason": "user", "partial": {"text": record.answer}}, True)
                if text:
                    self.append_event(db, record, session, "text_delta", {"text": text}, True)
                    record.answer += text
                record.status, record.completed_at = status, now()
                record.error = error.model_dump(mode="json") if error else None
                assistant.content, assistant.created_at = record.answer, record.completed_at
                self.append_event(db, record, session, "message_completed", {}, True)
                reason = {"completed": "completed", "failed": "error", "cancelled": "cancelled",
                          "timed_out": "timeout", "interrupted": "interrupted"}[status]
                self.append_event(db, record, session, "run_completed", {"stop_reason": reason})
                db.flush()
            result = RunDTO.model_validate(record)
        return result

    def active_runs(self, session_id=None):
        with self.database.sessions() as db:
            query = select(RunRecord).where(RunRecord.status == "running")
            if session_id is not None:
                query = query.where(RunRecord.session_id == session_id)
            return [RunDTO.model_validate(row) for row in db.scalars(query)]

    def recover_interrupted(self):
        for record in self.active_runs():
            self.finish(record.session_id, record.id, "interrupted", f"\n{record.model_label or '固定测试'}：运行中断，请重新发起。",
                        ErrorPayload(code="BACKEND_INTERRUPTED", message="后端已退出；保存的内容保留，本次不自动重执行。"))

    def events(self, session_id, run_id, after_sequence=0, limit=500):
        with self.database.sessions() as db:
            run = self.require_run(db, session_id, run_id)
            if after_sequence > run.last_sequence:
                raise ValueError("事件游标超出已持久化序号。")
            rows = db.scalars(select(EventRecord).where(EventRecord.run_id == run_id,
                              EventRecord.session_id == session_id, EventRecord.sequence > after_sequence)
                              .order_by(EventRecord.sequence).limit(limit)).all()
            return EventPage(events=[EVENT_ADAPTER.validate_python(row.envelope) for row in rows], last_sequence=run.last_sequence)
