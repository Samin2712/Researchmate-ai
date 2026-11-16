"""Add learning assistance: explanation_mode, default_explanation_mode, document_questions, document_glossary."""
from alembic import op
import sqlalchemy as sa

revision = '0008_learning_assistance'
down_revision = '0007_gaps_disagreements'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)

    # 1. Add explanation_mode to chat_messages if not exists
    if inspector.has_table('chat_messages'):
        columns = {c['name'] for c in inspector.get_columns('chat_messages')}
        if 'explanation_mode' not in columns:
            op.add_column(
                'chat_messages',
                sa.Column('explanation_mode', sa.String(length=32), nullable=False, server_default='standard')
            )

    # 2. Add default_explanation_mode to user_profiles if not exists
    if inspector.has_table('user_profiles'):
        columns = {c['name'] for c in inspector.get_columns('user_profiles')}
        if 'default_explanation_mode' not in columns:
            op.add_column(
                'user_profiles',
                sa.Column('default_explanation_mode', sa.String(length=32), nullable=True, server_default='standard')
            )

    # 3. Create document_questions table
    if not inspector.has_table('document_questions'):
        op.create_table(
            'document_questions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('document_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
            sa.Column('document_revision', sa.String(length=64), nullable=True),
            sa.Column('prompt_version', sa.String(length=32), nullable=False, server_default='v1'),
            sa.Column('model_provider', sa.String(length=64), nullable=True),
            sa.Column('model_name', sa.String(length=100), nullable=True),
            sa.Column('questions', sa.JSON(), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('document_id', 'document_revision', 'prompt_version', name='uq_doc_questions_rev')
        )
        op.create_index('ix_document_questions_id', 'document_questions', ['id'])
        op.create_index('ix_document_questions_document_id', 'document_questions', ['document_id'])
        op.create_index('ix_document_questions_user_id', 'document_questions', ['user_id'])
        op.create_index('ix_document_questions_status', 'document_questions', ['status'])

    # 4. Create document_glossary table
    if not inspector.has_table('document_glossary'):
        op.create_table(
            'document_glossary',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('document_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('document_revision', sa.String(length=64), nullable=True),
            sa.Column('term', sa.String(length=255), nullable=False),
            sa.Column('context', sa.Text(), nullable=True),
            sa.Column('explanation', sa.Text(), nullable=False),
            sa.Column('grounded_in_paper', sa.Boolean(), nullable=False, server_default='1'),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='grounded'),
            sa.Column('source_quote', sa.Text(), nullable=True),
            sa.Column('page_number', sa.Integer(), nullable=True),
            sa.Column('prompt_version', sa.String(length=32), nullable=False, server_default='v1'),
            sa.Column('model_provider', sa.String(length=64), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('document_id', 'term', 'document_revision', 'prompt_version', name='uq_doc_glossary_term')
        )
        op.create_index('ix_document_glossary_id', 'document_glossary', ['id'])
        op.create_index('ix_document_glossary_document_id', 'document_glossary', ['document_id'])
        op.create_index('ix_document_glossary_user_id', 'document_glossary', ['user_id'])
        op.create_index('ix_document_glossary_term', 'document_glossary', ['term'])


def downgrade():
    op.drop_table('document_glossary')
    op.drop_table('document_questions')
    op.drop_column('user_profiles', 'default_explanation_mode')
    op.drop_column('chat_messages', 'explanation_mode')
