from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import delete, func, select

from .conversation import EVENT_ADAPTER, MODEL_LABEL, EventPage, MessageDTO, RunDTO, SessionDTO
from .agent import AgentRunner, AgentOutcome
from .database import Database
from .models import EventRecord, MessageRecord, RunRecord, SessionRecord

FIXTURE_PARTS = ("固定通信测试事件。", "未调用模型或行情。")


def now():
    return datetime.now(timezone.utc).isoformat()


class MissingRecord(Exception):
    pass


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

    def start_fixture(self, session_id, text):
        return self._start_run(session_id, text)

    def start_agent(self, session_id, text, runner: AgentRunner):
        return self._start_run(session_id, text, runner)

    def _start_run(self, session_id, text, runner: AgentRunner | None = None):
        # Only bounded, synchronous offline runs in this step. Events are captured at
        # each action, then all records commit together before any response/SSE.
        with self.database.write() as db:
            session = self.require_session(db, session_id)
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
            if runner is None:
                emit("status", {"phase": "working", "detail": "固定测试事件；没有Agent或模型调用。"})
                outcome = AgentOutcome("".join(FIXTURE_PARTS), "completed")
                parts = FIXTURE_PARTS
            else:
                outcome = runner.run(text, emit)
                parts = (outcome.answer,)
            for part in parts:
                emit("text_delta", {"text": part}, True)
            emit("message_completed", {}, True)
            emit("run_completed", {"stop_reason": "error" if outcome.status == "failed" else "completed"})
            completed = now()
            record = RunRecord(id=run_id, session_id=session_id, kind="fake_agent" if runner else "fixture",
                               status=outcome.status, input=text, answer=outcome.answer,
                               model_label=MODEL_LABEL if runner else None,
                               error=outcome.error.model_dump(mode="json") if outcome.error else None,
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

    def events(self, session_id, run_id, after_sequence=0, limit=500):
        with self.database.sessions() as db:
            run = self.require_run(db, session_id, run_id)
            if after_sequence > run.last_sequence:
                raise ValueError("事件游标超出已持久化序号。")
            rows = db.scalars(select(EventRecord).where(EventRecord.run_id == run_id,
                              EventRecord.session_id == session_id, EventRecord.sequence > after_sequence)
                              .order_by(EventRecord.sequence).limit(limit)).all()
            return EventPage(events=[EVENT_ADAPTER.validate_python(row.envelope) for row in rows], last_sequence=run.last_sequence)
