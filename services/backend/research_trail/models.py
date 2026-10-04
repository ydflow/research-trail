from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Integer, JSON, String, Text, UniqueConstraint
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
    __table_args__ = (UniqueConstraint("id", "session_id"), CheckConstraint("last_sequence >= 1"))
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
    completed_at: Mapped[str] = mapped_column(String(40))
    last_sequence: Mapped[int] = mapped_column(Integer)


class MessageRecord(Base):
    __tablename__ = "messages"
    __table_args__ = (
        ForeignKeyConstraint(["run_id", "session_id"], ["runs.id", "runs.session_id"], ondelete="CASCADE"),
        CheckConstraint("role IN ('user', 'assistant')"),
        UniqueConstraint("session_id", "sequence"), CheckConstraint("sequence >= 1"),
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
