"""Persist sessions, messages, runs and event envelopes.

Revision ID: 0001_conversation
Revises: None
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_conversation"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("sessions", sa.Column("id", sa.String(36), primary_key=True),
                    sa.Column("title", sa.String(80), nullable=False),
                    sa.Column("created_at", sa.String(40), nullable=False),
                    sa.Column("updated_at", sa.String(40), nullable=False))
    op.create_index("ix_sessions_updated_at", "sessions", ["updated_at"])
    op.create_table("runs", sa.Column("id", sa.String(36), primary_key=True),
                    sa.Column("session_id", sa.String(36), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
                    sa.Column("kind", sa.String(20), nullable=False), sa.Column("status", sa.String(20), nullable=False),
                    sa.Column("input", sa.Text(), nullable=False), sa.Column("answer", sa.Text(), nullable=False),
                    sa.Column("assistant_message_id", sa.String(36), nullable=False),
                    sa.Column("started_at", sa.String(40), nullable=False), sa.Column("completed_at", sa.String(40), nullable=False),
                    sa.Column("last_sequence", sa.Integer(), nullable=False),
                    sa.UniqueConstraint("id", "session_id"), sa.CheckConstraint("last_sequence >= 1"))
    op.create_index("ix_runs_session_id", "runs", ["session_id"])
    op.create_table("messages", sa.Column("id", sa.String(36), primary_key=True),
                    sa.Column("session_id", sa.String(36), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
                    sa.Column("run_id", sa.String(36), nullable=False), sa.Column("role", sa.String(20), nullable=False),
                    sa.Column("sequence", sa.Integer(), nullable=False),
                    sa.Column("content", sa.Text(), nullable=False), sa.Column("created_at", sa.String(40), nullable=False),
                    sa.ForeignKeyConstraint(["run_id", "session_id"], ["runs.id", "runs.session_id"], ondelete="CASCADE"),
                    sa.CheckConstraint("role IN ('user', 'assistant')"),
                    sa.UniqueConstraint("session_id", "sequence"), sa.CheckConstraint("sequence >= 1"))
    op.create_index("ix_messages_session_id", "messages", ["session_id"])
    op.create_index("ix_messages_run_id", "messages", ["run_id"])
    op.create_table("events", sa.Column("run_id", sa.String(36), primary_key=True),
                    sa.Column("sequence", sa.Integer(), primary_key=True),
                    sa.Column("session_id", sa.String(36), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
                    sa.Column("type", sa.String(40), nullable=False), sa.Column("timestamp", sa.String(40), nullable=False),
                    sa.Column("envelope", sa.JSON(), nullable=False),
                    sa.ForeignKeyConstraint(["run_id", "session_id"], ["runs.id", "runs.session_id"], ondelete="CASCADE"),
                    sa.CheckConstraint("sequence >= 1"))
    op.create_index("ix_events_session_id", "events", ["session_id"])


def downgrade():
    for table in ("events", "messages", "runs", "sessions"):
        op.drop_table(table)
