"""Persist bounded optional model reasoning settings; preserve existing connections."""
from alembic import op
import sqlalchemy as sa

revision = '0019_model_reasoning'
down_revision = '0018_outcomes'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('connections', sa.Column('reasoning_effort', sa.String(12), nullable=False, server_default='default'))

def downgrade():
    # Removing the only copy of a configured option requires an explicit backup.
    raise RuntimeError('Automatic downgrade is unsupported; restore a verified database backup.')
