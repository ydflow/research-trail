"""Immutable event-source snapshots; existing research/report evidence stays intact."""
from alembic import op
import sqlalchemy as sa
revision = '0015_calendar'
down_revision = '0014_screening'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('calendar_snapshots',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('request_id',sa.String(36),nullable=False,unique=True),
        sa.Column('request_hash',sa.String(64),nullable=False),sa.Column('saved_at',sa.String(40),nullable=False),
        sa.Column('payload',sa.JSON(),nullable=False),sa.Column('checksum',sa.String(64),nullable=False))
    op.create_index('ix_calendar_snapshots_saved_at','calendar_snapshots',['saved_at'])

def downgrade(): op.drop_table('calendar_snapshots')
