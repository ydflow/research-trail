"""Only persistent local user preference; capability health is not copied."""
from alembic import op
import sqlalchemy as sa
revision = '0009_skills'
down_revision = '0008_portfolios'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('skill_preferences', sa.Column('id', sa.String(80), primary_key=True),
                    sa.Column('enabled', sa.Boolean(), nullable=False))

def downgrade():
    raise RuntimeError('技能用户设置不自动降级。')
