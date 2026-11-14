"""Bootstrap fresh and legacy databases without deleting user data."""
from alembic import op
from app.core.schema import upgrade_schema
revision = "0002_collections_citations"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    upgrade_schema(op.get_bind())

def downgrade():
    raise RuntimeError("Data-preserving bootstrap cannot be downgraded; restore a backup.")
