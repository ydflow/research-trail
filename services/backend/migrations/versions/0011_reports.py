"""Append-only structured reports; collection history remains independent."""
from alembic import op
import sqlalchemy as sa
revision = '0011_reports'
down_revision = '0010_research'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('research_reports',
        sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('run_id',sa.String(36),sa.ForeignKey('research_runs.id'),nullable=False),
        sa.Column('version',sa.Integer(),nullable=False),sa.Column('symbol',sa.String(20),nullable=False),
        sa.Column('mode',sa.String(10),nullable=False),sa.Column('status',sa.String(20),nullable=False),
        sa.Column('code',sa.String(80)),sa.Column('started_at',sa.String(40),nullable=False),
        sa.Column('completed_at',sa.String(40)),sa.Column('requests_started',sa.Integer(),nullable=False),
        sa.Column('document',sa.JSON(none_as_null=True)),sa.UniqueConstraint('run_id','version'),
        sa.CheckConstraint('version >= 1'),sa.CheckConstraint("mode IN ('fixed','real')"),
        sa.CheckConstraint("status IN ('generating','completed','failed','cancelled','interrupted')"),
        sa.CheckConstraint("(status = 'completed' AND document IS NOT NULL) OR (status != 'completed' AND document IS NULL)"))
    op.create_index('ix_research_reports_run_id','research_reports',['run_id'])
    op.create_index('ix_report_one_active','research_reports',['status'],unique=True,sqlite_where=sa.text("status = 'generating'"))

def downgrade():
    raise RuntimeError('报告历史不自动降级。')
