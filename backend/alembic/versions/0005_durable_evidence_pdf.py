"""Persist original PDFs on ephemeral hosts without requiring a paid disk."""
from alembic import op
from app.core.schema import upgrade_schema
revision = '0005_durable_evidence_pdf'
down_revision = '0004_evidence_notebook'
branch_labels = None
depends_on = None

def upgrade():
    upgrade_schema(op.get_bind())

def downgrade():
    raise RuntimeError('Restore a backup to preserve original PDFs.')
