"""Local evaluation snapshots, immutable baselines/feedback and opt-in tracing."""
from alembic import op
import sqlalchemy as sa
revision='0017_evaluation'
down_revision='0016_monitoring'
branch_labels=None
depends_on=None

def identity_columns():
    return [sa.Column('id',sa.String(36),primary_key=True),sa.Column('request_id',sa.String(36),nullable=False,unique=True),
            sa.Column('request_hash',sa.String(64),nullable=False),sa.Column('created_at',sa.String(40),nullable=False)]

def upgrade():
    op.create_table('evaluation_experiments',*identity_columns(),sa.Column('status',sa.String(20),nullable=False),sa.Column('payload',sa.JSON(),nullable=False))
    op.create_index('ix_evaluation_experiments_created_at','evaluation_experiments',['created_at'])
    op.create_index('ix_evaluation_one_active','evaluation_experiments',['status'],unique=True,sqlite_where=sa.text("status = 'running'"))
    for name in ('evaluation_baselines','evaluation_feedback'):
        op.create_table(name,*identity_columns(),sa.Column('experiment_id',sa.String(36),sa.ForeignKey('evaluation_experiments.id'),nullable=False),
                        sa.Column('payload',sa.JSON(),nullable=False))
    op.create_table('evaluation_trace_config',sa.Column('provider',sa.String(12),primary_key=True),sa.Column('payload',sa.JSON(),nullable=False),
                    sa.Column('credential_ref',sa.String(36)),sa.Column('revision',sa.Integer(),nullable=False),
                    sa.Column('status',sa.String(20),nullable=False),sa.Column('code',sa.String(80),nullable=False),sa.Column('checked_at',sa.String(40)))
    op.create_table('evaluation_trace_deliveries',*identity_columns(),sa.Column('provider',sa.String(12),nullable=False),
                    sa.Column('experiment_id',sa.String(36),sa.ForeignKey('evaluation_experiments.id'),nullable=False),
                    sa.Column('revision',sa.Integer(),nullable=False),sa.Column('digest',sa.String(64),nullable=False),
                    sa.Column('status',sa.String(20),nullable=False),sa.Column('code',sa.String(80),nullable=False),
                    sa.UniqueConstraint('provider','experiment_id','revision','digest'))

def downgrade():
    for name in ('evaluation_trace_deliveries','evaluation_trace_config','evaluation_feedback','evaluation_baselines','evaluation_experiments'):
        op.drop_table(name)
