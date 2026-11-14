"""Evidence notebook and source verification

Revision ID: 0004_evidence_notebook
Revises: 0003_citation_validation
Create Date: 2026-11-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0004_evidence_notebook'
down_revision = '0003_citation_validation'
branch_labels = None
depends_on = None


def upgrade() -> None:
    from app.core.schema import upgrade_schema
    upgrade_schema(op.get_bind())


def downgrade() -> None:
    op.drop_table('evidence_notes')
    op.drop_column('chunks', 'bbox')
    op.drop_column('chunks', 'char_end')
    op.drop_column('chunks', 'char_start')
    op.drop_column('chunks', 'page_label')
    op.drop_column('documents', 'content_hash')
