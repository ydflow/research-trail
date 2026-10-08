"""Frozen research opinions, actual subsequent observations and weight versions."""
from alembic import op
import sqlalchemy as sa
revision = '0018_outcomes'
down_revision = '0017_evaluation'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('outcome_opinions', sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('report_id', sa.String(36), sa.ForeignKey('research_reports.id'), nullable=False),
        sa.Column('horizon', sa.String(2), nullable=False), sa.Column('payload', sa.JSON(), nullable=False),
        sa.UniqueConstraint('report_id', 'horizon'))
    op.create_table('outcome_attempts', sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('opinion_id', sa.String(36), sa.ForeignKey('outcome_opinions.id'), nullable=False),
        sa.Column('request_id', sa.String(36), unique=True, nullable=False),
        sa.Column('status', sa.String(20), nullable=False), sa.Column('payload', sa.JSON(), nullable=False))
    for status in ('running', 'evaluated'):
        op.create_index('ix_outcome_one_'+status, 'outcome_attempts', ['opinion_id'], unique=True, sqlite_where=sa.text("status = '"+status+"'"))
    op.create_table('outcome_policy_versions', sa.Column('version', sa.Integer(), primary_key=True),
        sa.Column('request_id', sa.String(36), unique=True), sa.Column('request_hash', sa.String(64)), sa.Column('payload', sa.JSON(), nullable=False))
    op.create_table('outcome_policy_state', sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('current_version', sa.Integer(), sa.ForeignKey('outcome_policy_versions.version'), nullable=False), sa.CheckConstraint('id = 1'))
    op.create_table('outcome_performance_snapshots', sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('fingerprint', sa.String(64), unique=True, nullable=False), sa.Column('payload', sa.JSON(), nullable=False))

def downgrade():
    raise RuntimeError('研究结果及参数历史不自动降级；参数回滚使用追加版本。')
