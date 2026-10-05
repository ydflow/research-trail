"""Non-sensitive model limits; retain existing configs and conversation histories."""
from alembic import op
import sqlalchemy as sa

revision = "0005_model_limits"
down_revision = "0004_settings"
branch_labels = None
depends_on = None


def upgrade():
    for name, default in (("max_tool_rounds", "8"), ("run_timeout_seconds", "120"), ("request_timeout_seconds", "30")):
        op.add_column("connections", sa.Column(name, sa.Integer(), nullable=False, server_default=default))


def downgrade():
    raise RuntimeError("模型配置迁移不提供自动降级；请使用已验证的备份。")
