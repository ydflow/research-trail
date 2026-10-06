"""Private portfolio snapshots in the ignored local runtime database."""
from alembic import op
import sqlalchemy as sa
revision = '0008_portfolios'
down_revision = '0007_security_workspace'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('portfolio_accounts', sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('name',sa.String(80),nullable=False), sa.Column('kind',sa.String(20),nullable=False),
        sa.CheckConstraint("kind IN ('manual','simulated','read_only')"))
    op.create_table('portfolios',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('account_id',sa.String(36),sa.ForeignKey('portfolio_accounts.id'),nullable=False),
        sa.Column('name',sa.String(40),nullable=False),sa.Column('snapshot',sa.JSON(),nullable=False),
        sa.Column('revision',sa.Integer(),nullable=False),sa.Column('updated_at',sa.String(40),nullable=True),
        sa.Column('current_batch',sa.String(36),nullable=True),sa.CheckConstraint('revision >= 0'))
    op.create_table('portfolio_imports',sa.Column('id',sa.String(36),primary_key=True),
        sa.Column('portfolio_id',sa.String(36),sa.ForeignKey('portfolios.id'),nullable=False,index=True),
        sa.Column('fingerprint',sa.String(64),nullable=False),sa.Column('before_snapshot',sa.JSON(),nullable=False),
        sa.Column('previous_batch',sa.String(36),nullable=True),sa.Column('active',sa.Boolean(),nullable=False))

def downgrade():
    raise RuntimeError('组合与导入历史不自动降级。')
