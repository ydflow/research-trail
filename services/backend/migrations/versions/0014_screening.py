"""Bounded screening history; additive, independent of report/thesis history."""
from alembic import op
import sqlalchemy as sa
revision = '0014_screening'
down_revision = '0013_theses'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('screening_runs',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('request_id',sa.String(36),nullable=False,unique=True),
        sa.Column('request_hash',sa.String(64),nullable=False),
        sa.Column('created_at',sa.String(40),nullable=False),sa.Column('payload',sa.JSON(),nullable=False))
    op.create_index('ix_screening_runs_created_at','screening_runs',['created_at'])

def downgrade():
    op.drop_table('screening_runs')
