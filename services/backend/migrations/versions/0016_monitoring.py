"""Opt-in application-lifetime monitoring, durable occurrences and cursors."""
from alembic import op
import sqlalchemy as sa
revision='0016_monitoring'
down_revision='0015_calendar'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('monitoring_rules',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('request_id',sa.String(36),nullable=False,unique=True),
        sa.Column('request_hash',sa.String(64),nullable=False),sa.Column('created_at',sa.String(40),nullable=False),
        sa.Column('revision',sa.Integer(),nullable=False),sa.Column('payload',sa.JSON(),nullable=False),
        sa.Column('state',sa.JSON(),nullable=False))
    op.create_table('monitoring_runs',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('rule_id',sa.String(36),sa.ForeignKey('monitoring_rules.id'),nullable=False),
        sa.Column('occurrence',sa.String(100),nullable=False),sa.Column('started_at',sa.String(40),nullable=False),
        sa.Column('completed_at',sa.String(40)),sa.Column('status',sa.String(20),nullable=False),
        sa.Column('code',sa.String(80)),sa.Column('notified',sa.Boolean(),nullable=False),
        sa.Column('notification_status',sa.String(20),nullable=False),
        sa.Column('payload',sa.JSON(),nullable=False),sa.UniqueConstraint('rule_id','occurrence'),
        sa.CheckConstraint("status IN ('running','triggered','quiet','failed','interrupted','skipped')"))
    op.create_index('ix_monitoring_runs_started_at','monitoring_runs',['started_at'])
    op.create_table('monitoring_research_actions',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('run_id',sa.String(36),sa.ForeignKey('monitoring_runs.id'),nullable=False),
        sa.Column('symbol',sa.String(20),nullable=False),sa.Column('status',sa.String(20),nullable=False),
        sa.Column('research_id',sa.String(36),sa.ForeignKey('research_runs.id')),
        sa.Column('code',sa.String(80)),sa.UniqueConstraint('run_id','symbol'))

def downgrade():
    op.drop_table('monitoring_research_actions')
    op.drop_table('monitoring_runs')
    op.drop_table('monitoring_rules')
