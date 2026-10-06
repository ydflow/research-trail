"""Collection plans and individual results, independent of Agent messages/reports."""
from alembic import op
import sqlalchemy as sa
revision = '0010_research'
down_revision = '0009_skills'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('research_runs', sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('status', sa.String(20), nullable=False), sa.Column('plan', sa.JSON(), nullable=False),
        sa.Column('started_at', sa.String(40), nullable=False), sa.Column('completed_at', sa.String(40)),
        sa.CheckConstraint("status IN ('fetching','collected','partial','failed','cancelled','interrupted')"))
    op.create_index('ix_research_runs_started_at', 'research_runs', ['started_at'])
    op.create_index('ix_research_one_active', 'research_runs', ['status'], unique=True,
        sqlite_where=sa.text("status = 'fetching'"))
    op.create_table('research_steps',
        sa.Column('run_id', sa.String(36), sa.ForeignKey('research_runs.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('capability', sa.String(80), primary_key=True), sa.Column('ordinal', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False), sa.Column('code', sa.String(80)),
        sa.Column('started_at', sa.String(40)), sa.Column('completed_at', sa.String(40)),
        sa.Column('result', sa.JSON(none_as_null=True)), sa.UniqueConstraint('run_id', 'ordinal'),
        sa.CheckConstraint('ordinal >= 1'),
        sa.CheckConstraint("status IN ('queued','running','success','failed','unavailable','timed_out','cancelled','interrupted')"),
        sa.CheckConstraint("(status = 'success' AND result IS NOT NULL) OR (status != 'success' AND result IS NULL)"))

def downgrade():
    raise RuntimeError('研究计划和采集历史不自动降级。')
