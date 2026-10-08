from sqlalchemy import CheckConstraint, ForeignKey, ForeignKeyConstraint, Index, Integer, JSON, String, Text, UniqueConstraint, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ResearchRecord(Base):
    __tablename__ = 'research_runs'
    __table_args__ = (
        CheckConstraint("status IN ('fetching','collected','partial','failed','cancelled','interrupted')"),
        Index('ix_research_one_active', 'status', unique=True, sqlite_where=text("status = 'fetching'")),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    status: Mapped[str] = mapped_column(String(20))
    plan: Mapped[dict] = mapped_column(JSON)
    started_at: Mapped[str] = mapped_column(String(40), index=True)
    completed_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    generation: Mapped[int] = mapped_column(Integer, default=0, server_default=text('0'))
    parent_run_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    abandoned_at: Mapped[str | None] = mapped_column(String(40), nullable=True)


class ResearchCheckpointRecord(Base):
    __tablename__ = 'research_checkpoints'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey('research_runs.id'), index=True)
    created_at: Mapped[str] = mapped_column(String(40))
    cause: Mapped[str] = mapped_column(String(80))
    payload: Mapped[dict] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64))
    valid: Mapped[bool]


class ResearchActionRecord(Base):
    __tablename__ = 'research_actions'
    request_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey('research_runs.id'), index=True)
    operation: Mapped[str] = mapped_column(String(10))
    target_run_id: Mapped[str] = mapped_column(ForeignKey('research_runs.id'))
    created_at: Mapped[str] = mapped_column(String(40))


class ResearchStepRecord(Base):
    __tablename__ = 'research_steps'
    __table_args__ = (
        UniqueConstraint('run_id', 'ordinal'),
        CheckConstraint('ordinal >= 1'),
        CheckConstraint("status IN ('queued','running','success','failed','unavailable','timed_out','cancelled','interrupted')"),
        CheckConstraint("(status = 'success' AND result IS NOT NULL) OR (status != 'success' AND result IS NULL)"),
    )
    run_id: Mapped[str] = mapped_column(ForeignKey('research_runs.id', ondelete='CASCADE'), primary_key=True)
    capability: Mapped[str] = mapped_column(String(80), primary_key=True)
    ordinal: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20))
    code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    started_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    completed_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    result: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), nullable=True)


class SkillPreference(Base):
    __tablename__ = 'skill_preferences'
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    enabled: Mapped[bool]


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


class WatchlistRecord(Base):
    __tablename__ = 'watchlist'
    __table_args__ = (CheckConstraint('position >= 0'),)
    symbol: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    position: Mapped[int] = mapped_column(Integer)


class WorkspaceRecord(Base):
    __tablename__ = 'security_workspace'
    __table_args__ = (CheckConstraint('id = 1'), CheckConstraint('revision >= 0'))
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    active_symbol: Mapped[str | None] = mapped_column(String(20), nullable=True)
    revision: Mapped[int] = mapped_column(Integer)


class PortfolioAccountRecord(Base):
    __tablename__ = 'portfolio_accounts'
    __table_args__ = (CheckConstraint("kind IN ('manual','simulated','read_only')"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    kind: Mapped[str] = mapped_column(String(20))


class PortfolioRecord(Base):
    __tablename__ = 'portfolios'
    __table_args__ = (CheckConstraint('revision >= 0'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey('portfolio_accounts.id'))
    name: Mapped[str] = mapped_column(String(40))
    snapshot: Mapped[dict] = mapped_column(JSON)
    revision: Mapped[int] = mapped_column(Integer)
    updated_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    current_batch: Mapped[str | None] = mapped_column(String(36), nullable=True)


class PortfolioImportRecord(Base):
    __tablename__ = 'portfolio_imports'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    portfolio_id: Mapped[str] = mapped_column(ForeignKey('portfolios.id'), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    before_snapshot: Mapped[dict] = mapped_column(JSON)
    previous_batch: Mapped[str | None] = mapped_column(String(36), nullable=True)
    active: Mapped[bool]


class ReportRecord(Base):
    __tablename__ = 'research_reports'
    __table_args__ = (UniqueConstraint('run_id', 'version'), CheckConstraint('version >= 1'),
        Index('ix_report_request','run_id','request_id',unique=True),
        Index('ix_report_one_active','status',unique=True,sqlite_where=text("status = 'generating'")),
        CheckConstraint("mode IN ('fixed','real')"),
        CheckConstraint("status IN ('generating','completed','failed','cancelled','interrupted')"),
        CheckConstraint("(status = 'completed' AND document IS NOT NULL) OR (status != 'completed' AND document IS NULL)"))
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey('research_runs.id'), index=True)
    version: Mapped[int] = mapped_column(Integer)
    symbol: Mapped[str] = mapped_column(String(20))
    mode: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(20))
    code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    started_at: Mapped[str] = mapped_column(String(40))
    completed_at: Mapped[str | None] = mapped_column(String(40), nullable=True)
    requests_started: Mapped[int] = mapped_column(Integer, default=0)
    document: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    model_identity: Mapped[str | None] = mapped_column(String(64), nullable=True)
    request_uncertain: Mapped[bool] = mapped_column(default=False, server_default=text('0'))


class ThesisRecord(Base):
    __tablename__ = 'investment_theses'
    __table_args__ = (CheckConstraint('current_version >= 1'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    symbol: Mapped[str] = mapped_column(String(20))
    origin_report_id: Mapped[str] = mapped_column(ForeignKey('research_reports.id'), unique=True)
    current_version: Mapped[int]
    created_at: Mapped[str] = mapped_column(String(40))


class ScreeningRecord(Base):
    __tablename__ = 'screening_runs'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[str] = mapped_column(String(40), index=True)
    payload: Mapped[dict] = mapped_column(JSON)


class MonitoringRuleRecord(Base):
    __tablename__ = 'monitoring_rules'
    id: Mapped[str] = mapped_column(String(36),primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36),unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[str] = mapped_column(String(40))
    revision: Mapped[int] = mapped_column(Integer,default=0)
    payload: Mapped[dict] = mapped_column(JSON)
    state: Mapped[dict] = mapped_column(JSON)


class MonitoringRunRecord(Base):
    __tablename__ = 'monitoring_runs'
    __table_args__ = (UniqueConstraint('rule_id','occurrence'),
        CheckConstraint("status IN ('running','triggered','quiet','failed','interrupted','skipped')"))
    id: Mapped[str] = mapped_column(String(36),primary_key=True)
    rule_id: Mapped[str] = mapped_column(ForeignKey('monitoring_rules.id'))
    occurrence: Mapped[str] = mapped_column(String(100))
    started_at: Mapped[str] = mapped_column(String(40),index=True)
    completed_at: Mapped[str | None] = mapped_column(String(40),nullable=True)
    status: Mapped[str] = mapped_column(String(20))
    code: Mapped[str | None] = mapped_column(String(80),nullable=True)
    notified: Mapped[bool] = mapped_column(default=False)
    notification_status: Mapped[str] = mapped_column(String(20),default='none')
    payload: Mapped[dict] = mapped_column(JSON)


class MonitoringResearchRecord(Base):
    __tablename__ = 'monitoring_research_actions'
    __table_args__ = (UniqueConstraint('run_id','symbol'),)
    id: Mapped[str] = mapped_column(String(36),primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey('monitoring_runs.id'))
    symbol: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    research_id: Mapped[str | None] = mapped_column(ForeignKey('research_runs.id'),nullable=True)
    code: Mapped[str | None] = mapped_column(String(80),nullable=True)


class CalendarSnapshotRecord(Base):
    __tablename__ = 'calendar_snapshots'
    id: Mapped[str] = mapped_column(String(36),primary_key=True)
    request_id: Mapped[str] = mapped_column(String(36),unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
    saved_at: Mapped[str] = mapped_column(String(40),index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64))


class ThesisVersionRecord(Base):
    __tablename__ = 'thesis_versions'
    __table_args__ = (CheckConstraint('version >= 1'),)
    thesis_id: Mapped[str] = mapped_column(ForeignKey('investment_theses.id'), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    origin: Mapped[str] = mapped_column(String(10))
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(40))
    report_id: Mapped[str] = mapped_column(ForeignKey('research_reports.id'))
    content: Mapped[dict] = mapped_column(JSON)
    data_report: Mapped[dict] = mapped_column(JSON)
    request_id: Mapped[str] = mapped_column(String(36), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))


class ThesisReviewRecord(Base):
    __tablename__ = 'thesis_reviews'
    __table_args__ = (
        ForeignKeyConstraint(['thesis_id', 'base_version'], ['thesis_versions.thesis_id', 'thesis_versions.version']),
        ForeignKeyConstraint(['thesis_id', 'new_version'], ['thesis_versions.thesis_id', 'thesis_versions.version']))
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    thesis_id: Mapped[str] = mapped_column(String(36), index=True)
    base_version: Mapped[int] = mapped_column(Integer)
    new_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    kind: Mapped[str] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(12))
    code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    comparison: Mapped[str | None] = mapped_column(String(12), nullable=True)
    judgment: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(40))
    report_id: Mapped[str | None] = mapped_column(ForeignKey('research_reports.id'), nullable=True)
    evaluation_id: Mapped[str | None] = mapped_column(ForeignKey('thesis_reviews.id'), unique=True, nullable=True)
    payload: Mapped[dict] = mapped_column(JSON)
    request_id: Mapped[str] = mapped_column(String(36), unique=True)
    request_hash: Mapped[str] = mapped_column(String(64))
