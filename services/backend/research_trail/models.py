from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, JSON, String, Text, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SessionRecord(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[str] = mapped_column(String(40))
    updated_at: Mapped[str] = mapped_column(String(40), index=True)


class RunRecord(Base):
    __tablename__ = "runs"
    __table_args__ = (UniqueConstraint("id", "session_id"), CheckConstraint("last_sequence >= 1", name="ck_runs_last_sequence"),
                     Index("ix_runs_one_active_per_session", "session_id", unique=True,
                           sqlite_where=text("status = 'running'")))
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    model_label: Mapped[str | None] = mapped_column(String(40), nullable=True)
    error: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    input: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    assistant_message_id: Mapped[str] = mapped_column(String(36))
    started_at: Mapped[str] = mapped_column(String(40))
    completed_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    last_sequence: Mapped[int] = mapped_column(Integer)


class MessageRecord(Base):
    __tablename__ = "messages"
    __table_args__ = (
        ForeignKeyConstraint(["run_id", "session_id"], ["runs.id", "runs.session_id"], ondelete="CASCADE"),
        CheckConstraint("role IN ('user', 'assistant')"),
        UniqueConstraint("session_id", "sequence"), CheckConstraint("sequence >= 1"),
        Index("ix_messages_one_role_per_run", "run_id", "role", unique=True),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    run_id: Mapped[str] = mapped_column(String(36), index=True)
    role: Mapped[str] = mapped_column(String(20))
    sequence: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(40))


class EventRecord(Base):
    __tablename__ = "events"
    __table_args__ = (
        ForeignKeyConstraint(["run_id", "session_id"], ["runs.id", "runs.session_id"], ondelete="CASCADE"),
        CheckConstraint("sequence >= 1"),
    )
    run_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    sequence: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(40))
    timestamp: Mapped[str] = mapped_column(String(40))
    envelope: Mapped[dict] = mapped_column(JSON)


class ConnectionRecord(Base):
    __tablename__ = "connections"
    __table_args__ = (CheckConstraint("kind IN ('model','market','account','skills','runtime')"),
                     CheckConstraint("revision >= 1"))
    kind: Mapped[str] = mapped_column(String(20), primary_key=True)
    enabled: Mapped[bool]
    endpoint: Mapped[str] = mapped_column(String(200))
    model: Mapped[str] = mapped_column(String(80))
    requires_credential: Mapped[bool]
    fake_result: Mapped[str] = mapped_column(String(20))
    credential_ref: Mapped[str | None] = mapped_column(String(36), nullable=True)
    revision: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(String(40))
    checked_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    max_tool_rounds: Mapped[int] = mapped_column(Integer, default=8)
    run_timeout_seconds: Mapped[int] = mapped_column(Integer, default=120)
    request_timeout_seconds: Mapped[int] = mapped_column(Integer, default=30)


class DataProviderRecord(Base):
    __tablename__ = 'data_providers'
    __table_args__ = (CheckConstraint("provider IN ('longbridge','longbridge-account','massive')"),
                     CheckConstraint('revision >= 1'))
    provider: Mapped[str] = mapped_column(String(30), primary_key=True)
    configuration: Mapped[dict] = mapped_column(JSON)
    credential_ref: Mapped[str | None] = mapped_column(String(36), nullable=True)
    revision: Mapped[int] = mapped_column(Integer)


class ProfileRecord(Base):
    __tablename__ = "profile"
    __table_args__ = (CheckConstraint("id = 1"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_name: Mapped[str] = mapped_column(String(40))
    research_style: Mapped[str] = mapped_column(String(20))
