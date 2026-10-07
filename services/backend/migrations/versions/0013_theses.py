"""Append-only thesis versions and review evidence; existing reports remain intact."""
from alembic import op
import sqlalchemy as sa
revision = '0013_theses'
down_revision = '0012_checkpoints'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('investment_theses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('symbol', sa.String(20), nullable=False),
        sa.Column('origin_report_id', sa.String(36), sa.ForeignKey('research_reports.id'), nullable=False, unique=True),
        sa.Column('current_version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.String(40), nullable=False),
        sa.CheckConstraint('current_version >= 1'))
    op.create_table('thesis_versions',
        sa.Column('thesis_id', sa.String(36), sa.ForeignKey('investment_theses.id'), primary_key=True),
        sa.Column('version', sa.Integer(), primary_key=True),
        sa.Column('origin', sa.String(10), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_at', sa.String(40), nullable=False),
        sa.Column('report_id', sa.String(36), sa.ForeignKey('research_reports.id'), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False), sa.Column('data_report', sa.JSON(), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False, unique=True),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.CheckConstraint('version >= 1'))
    op.create_table('thesis_reviews',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('thesis_id', sa.String(36), nullable=False),
        sa.Column('base_version', sa.Integer(), nullable=False), sa.Column('new_version', sa.Integer()),
        sa.Column('kind', sa.String(12), nullable=False), sa.Column('status', sa.String(12), nullable=False),
        sa.Column('code', sa.String(80)), sa.Column('comparison', sa.String(12)), sa.Column('judgment', sa.String(20)),
        sa.Column('reason', sa.Text(), nullable=False), sa.Column('created_at', sa.String(40), nullable=False),
        sa.Column('report_id', sa.String(36), sa.ForeignKey('research_reports.id')),
        sa.Column('evaluation_id', sa.String(36), sa.ForeignKey('thesis_reviews.id'), unique=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('request_id', sa.String(36), nullable=False, unique=True),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.ForeignKeyConstraint(['thesis_id', 'base_version'], ['thesis_versions.thesis_id', 'thesis_versions.version']),
        sa.ForeignKeyConstraint(['thesis_id', 'new_version'], ['thesis_versions.thesis_id', 'thesis_versions.version']))
    op.create_index('ix_thesis_reviews_thesis_id', 'thesis_reviews', ['thesis_id'])

def downgrade():
    raise RuntimeError('论点及复审历史不自动降级。')
