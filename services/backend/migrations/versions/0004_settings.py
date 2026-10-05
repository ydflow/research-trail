"""Non-sensitive connection configuration and local profile only."""
from alembic import op
import sqlalchemy as sa

revision = "0004_settings"
down_revision = "0003_lifecycle"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("connections", sa.Column("kind", sa.String(20), primary_key=True),
                    sa.Column("enabled", sa.Boolean(), nullable=False),
                    sa.Column("endpoint", sa.String(200), nullable=False),
                    sa.Column("model", sa.String(80), nullable=False),
                    sa.Column("requires_credential", sa.Boolean(), nullable=False),
                    sa.Column("fake_result", sa.String(20), nullable=False),
                    sa.Column("credential_ref", sa.String(36), nullable=True),
                    sa.Column("revision", sa.Integer(), nullable=False),
                    sa.Column("status", sa.String(20), nullable=False),
                    sa.Column("reason", sa.String(40), nullable=False),
                    sa.Column("checked_at", sa.String(40), nullable=True),
                    sa.CheckConstraint("kind IN ('model','market','account','skills','runtime')"),
                    sa.CheckConstraint("revision >= 1"))
    op.create_table("profile", sa.Column("id", sa.Integer(), primary_key=True),
                    sa.Column("display_name", sa.String(40), nullable=False),
                    sa.Column("research_style", sa.String(20), nullable=False), sa.CheckConstraint("id = 1"))


def downgrade():
    raise RuntimeError("设置迁移不自动删除系统凭证；请使用已验证的备份与清理流程。")
