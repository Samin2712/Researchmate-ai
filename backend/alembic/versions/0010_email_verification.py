"""Require email verification for new password registrations; preserve legacy accounts."""
from alembic import op
from app.models.user import EmailVerification

revision = '0010_email_verification'
down_revision = '0009_account_security'
branch_labels = None
depends_on = None


def upgrade():
    EmailVerification.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    EmailVerification.__table__.drop(op.get_bind(), checkfirst=True)
