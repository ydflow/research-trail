"""Persist watch symbols and current security; no provider responses or account data."""
from alembic import op
import sqlalchemy as sa
revision = '0007_security_workspace'
down_revision = '0006_data_providers'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('watchlist', sa.Column('symbol', sa.String(20), primary_key=True),
        sa.Column('name', sa.String(80), nullable=False), sa.Column('position', sa.Integer(), nullable=False),
        sa.CheckConstraint('position >= 0'))
    op.create_table('security_workspace', sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('active_symbol', sa.String(20), nullable=True), sa.Column('revision', sa.Integer(), nullable=False),
        sa.CheckConstraint('id = 1'), sa.CheckConstraint('revision >= 0'))

def downgrade():
    raise RuntimeError('证券工作区历史不自动降级。')
