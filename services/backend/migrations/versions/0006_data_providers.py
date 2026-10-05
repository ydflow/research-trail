"""Only non-sensitive provider profiles and opaque credential references."""
from alembic import op
import sqlalchemy as sa
revision = '0006_data_providers'
down_revision = '0005_model_limits'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('data_providers', sa.Column('provider', sa.String(30), primary_key=True),
        sa.Column('configuration', sa.JSON(), nullable=False), sa.Column('credential_ref', sa.String(36), nullable=True),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.CheckConstraint("provider IN ('longbridge','longbridge-account','massive')"),
        sa.CheckConstraint('revision >= 1'))

def downgrade():
    raise RuntimeError('只读Provider配置迁移不自动降级。')
