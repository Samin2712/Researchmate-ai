"""Add candidate_reviews and project_briefs tables, and gap_analysis / disagreement enum values."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0007_gaps_disagreements'
down_revision = '0006_analysis_runs_review_edits'
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    dialect_name = connection.dialect.name
    inspector = sa.inspect(connection)

    # 1. Update PostgreSQL analysiskind enum
    if dialect_name == 'postgresql':
        connection.exec_driver_sql("ALTER TYPE analysiskind ADD VALUE IF NOT EXISTS 'gap_analysis'")
        connection.exec_driver_sql("ALTER TYPE analysiskind ADD VALUE IF NOT EXISTS 'disagreement'")

    # 2. Create candidate_reviews table
    if not inspector.has_table('candidate_reviews'):
        op.create_table(
            'candidate_reviews',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('analysis_run_id', sa.Integer(), nullable=False),
            sa.Column('candidate_id', sa.String(length=100), nullable=False),
            sa.Column('status', sa.String(length=50), nullable=True),
            sa.Column('comment', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['analysis_run_id'], ['analysis_runs.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('user_id', 'analysis_run_id', 'candidate_id', name='uq_user_run_candidate'),
        )
        op.create_index('ix_candidate_reviews_id', 'candidate_reviews', ['id'])
        op.create_index('ix_candidate_reviews_user_id', 'candidate_reviews', ['user_id'])
        op.create_index('ix_candidate_reviews_analysis_run_id', 'candidate_reviews', ['analysis_run_id'])

    # 3. Create project_briefs table
    if not inspector.has_table('project_briefs'):
        op.create_table(
            'project_briefs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('analysis_run_id', sa.Integer(), nullable=True),
            sa.Column('candidate_id', sa.String(length=100), nullable=False),
            sa.Column('title', sa.String(length=500), nullable=False),
            sa.Column('research_question', sa.Text(), nullable=False),
            sa.Column('method', sa.Text(), nullable=False),
            sa.Column('data_sources', sa.Text(), nullable=False),
            sa.Column('skills_required', sa.Text(), nullable=True),
            sa.Column('steps', sa.JSON(), nullable=False),
            sa.Column('success_criteria', sa.Text(), nullable=False),
            sa.Column('assumptions', sa.JSON(), nullable=False),
            sa.Column('time_budget', sa.String(length=100), nullable=True),
            sa.Column('resource_budget', sa.String(length=100), nullable=True),
            sa.Column('linked_source_ids', sa.JSON(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['analysis_run_id'], ['analysis_runs.id'], ondelete='SET NULL'),
        )
        op.create_index('ix_project_briefs_id', 'project_briefs', ['id'])
        op.create_index('ix_project_briefs_user_id', 'project_briefs', ['user_id'])
        op.create_index('ix_project_briefs_analysis_run_id', 'project_briefs', ['analysis_run_id'])


def downgrade():
    op.drop_table('project_briefs')
    op.drop_table('candidate_reviews')
