"""Add provider metadata, reset tokens, and persistent authentication limits."""
from alembic import op
from app.models.user import UserAuth, PasswordReset, AuthRateLimit

revision = '0009_account_security'
down_revision = '0008_learning_assistance'
branch_labels = None
depends_on = None


def upgrade():
    for model in (UserAuth, PasswordReset, AuthRateLimit):
        model.__table__.create(op.get_bind(), checkfirst=True)


def downgrade():
    for model in (PasswordReset, AuthRateLimit, UserAuth):
        model.__table__.drop(op.get_bind(), checkfirst=True)
