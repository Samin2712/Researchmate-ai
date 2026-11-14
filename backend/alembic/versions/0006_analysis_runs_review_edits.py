"""Add analysis_runs and review_edits tables for comparison matrix and literature review."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0006_analysis_runs_review_edits'
down_revision = '0005_durable_evidence_pdf'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types (PostgreSQL) or use VARCHAR (SQLite)
    connection = op.get_bind()
    dialect_name = connection.dialect.name
    # Earlier data-preserving migrations bootstrap current model metadata.
    if sa.inspect(connection).has_table('analysis_runs') and sa.inspect(connection).has_table('review_edits'):
        return

    if dialect_name == 'postgresql':
        # Create enum types for PostgreSQL
        analysis_kind_enum = postgresql.ENUM('comparison', 'literature_review', name='analysiskind', create_type=True)
        analysis_kind_enum.create(connection, checkfirst=True)

        analysis_status_enum = postgresql.ENUM('pending', 'extracting', 'synthesizing', 'completed', 'failed', 'cancelled', name='analysisstatus', create_type=True)
        analysis_status_enum.create(connection, checkfirst=True)

    # Create analysis_runs table
    op.create_table(
        'analysis_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(50) if dialect_name == 'sqlite' else postgresql.ENUM('comparison', 'literature_review', name='analysiskind', create_type=False), nullable=False),
        sa.Column('status', sa.String(50) if dialect_name == 'sqlite' else postgresql.ENUM('pending', 'extracting', 'synthesizing', 'completed', 'failed', 'cancelled', name='analysisstatus', create_type=False), nullable=False),
        sa.Column('document_ids', sa.JSON(), nullable=False),
        sa.Column('document_revisions', sa.JSON(), nullable=True),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('stage', sa.String(50), nullable=True),
        sa.Column('progress_percent', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('result', sa.JSON(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('prompt_version', sa.String(20), nullable=True),
        sa.Column('schema_version', sa.String(20), nullable=True),
        sa.Column('model_provider', sa.String(50), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    op.create_index('ix_analysis_runs_id', 'analysis_runs', ['id'])
    op.create_index('ix_analysis_runs_user_id', 'analysis_runs', ['user_id'])
    op.create_index('ix_analysis_runs_kind', 'analysis_runs', ['kind'])
    op.create_index('ix_analysis_runs_status', 'analysis_runs', ['status'])
    op.create_index('ix_analysis_runs_created_at', 'analysis_runs', ['created_at'])

    # Create review_edits table
    op.create_table(
        'review_edits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('analysis_run_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('edited_content', sa.Text(), nullable=False),
        sa.Column('citation_ids', sa.JSON(), nullable=True),
        sa.Column('user_modified_citations', sa.JSON(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['analysis_run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    op.create_index('ix_review_edits_id', 'review_edits', ['id'])
    op.create_index('ix_review_edits_analysis_run_id', 'review_edits', ['analysis_run_id'])


def downgrade():
    op.drop_index('ix_review_edits_analysis_run_id', table_name='review_edits')
    op.drop_index('ix_review_edits_id', table_name='review_edits')
    op.drop_table('review_edits')

    op.drop_index('ix_analysis_runs_created_at', table_name='analysis_runs')
    op.drop_index('ix_analysis_runs_status', table_name='analysis_runs')
    op.drop_index('ix_analysis_runs_kind', table_name='analysis_runs')
    op.drop_index('ix_analysis_runs_user_id', table_name='analysis_runs')
    op.drop_index('ix_analysis_runs_id', table_name='analysis_runs')
    op.drop_table('analysis_runs')

    # Drop enum types if PostgreSQL
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        sa.Enum(name='analysisstatus').drop(connection, checkfirst=True)
        sa.Enum(name='analysiskind').drop(connection, checkfirst=True)
