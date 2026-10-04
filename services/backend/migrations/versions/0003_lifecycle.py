"""Allow active runs and enforce one active run and one message per role."""
from alembic import op
import sqlalchemy as sa

revision = "0003_lifecycle"
down_revision = "0002_agent"
branch_labels = None
depends_on = None


def upgrade():
    table = sa.Table("runs", sa.MetaData(), autoload_with=op.get_bind())
    for constraint in table.constraints:
        if isinstance(constraint, sa.CheckConstraint) and constraint.name is None:
            constraint.name = "ck_runs_last_sequence"
    with op.batch_alter_table("runs", copy_from=table) as batch:
        batch.alter_column("completed_at", existing_type=sa.String(40), nullable=True)
    op.create_index("ix_runs_one_active_per_session", "runs", ["session_id"], unique=True,
                    sqlite_where=sa.text("status = 'running'"))
    op.create_index("ix_messages_one_role_per_run", "messages", ["run_id", "role"], unique=True)


def downgrade():
    # A downgrade cannot safely reinterpret active/new terminal states.
    raise RuntimeError("运行生命周期迁移不提供自动降级；请使用已验证的备份。")
