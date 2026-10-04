"""Persist fake-model identity and explicit run errors; retain step 3 histories."""
from alembic import op
import sqlalchemy as sa

revision = "0002_agent"
down_revision = "0001_conversation"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("runs", sa.Column("model_label", sa.String(40), nullable=True))
    op.add_column("runs", sa.Column("error", sa.JSON(none_as_null=True), nullable=True))


def downgrade():
    op.drop_column("runs", "error")
    op.drop_column("runs", "model_label")
