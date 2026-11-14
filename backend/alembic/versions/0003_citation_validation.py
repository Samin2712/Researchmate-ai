"""Add structured authors and repair legacy metadata bootstrap omissions."""
from alembic import op
from app.core.schema import upgrade_schema
revision = "0003_citation_validation"
down_revision = "0002_collections_citations"
branch_labels = None
depends_on = None

def upgrade():
    upgrade_schema(op.get_bind())

def downgrade():
    raise RuntimeError("Restore a backup to preserve citation data when rolling back.")
