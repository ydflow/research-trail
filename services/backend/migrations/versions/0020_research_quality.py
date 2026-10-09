"""Persist frozen model comparisons and append-only human rubric reviews."""
from alembic import op
import sqlalchemy as sa
revision = '0020_research_quality'
down_revision = '0019_model_reasoning'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('research_comparisons',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('request_id',sa.String(36),nullable=False,unique=True),
        sa.Column('request_hash',sa.String(64),nullable=False),sa.Column('created_at',sa.String(40),nullable=False),
        sa.Column('status',sa.String(20),nullable=False),sa.Column('payload',sa.JSON(),nullable=False),
        sa.Column('bundle',sa.JSON(),nullable=False))
    op.create_index('ix_research_comparisons_created_at','research_comparisons',['created_at'])

def downgrade():
    raise RuntimeError('Automatic downgrade is unsupported; restore a verified database backup.')
