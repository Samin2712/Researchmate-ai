"""Encrypted personal AI credentials and account selection."""
from alembic import op
from app.models.ai_provider import AICredential, AISelection

revision = '0011_ai_providers'
down_revision = '0010_email_verification'
branch_labels = None
depends_on = None


def upgrade():
    AICredential.__table__.create(op.get_bind(), checkfirst=True)
    AISelection.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    AISelection.__table__.drop(op.get_bind(), checkfirst=True)
    AICredential.__table__.drop(op.get_bind(), checkfirst=True)
