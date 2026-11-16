"""Non-destructive bootstrap for legacy, fresh, and upgraded databases."""
from sqlalchemy import inspect
from app.core.database import Base


def upgrade_schema(connection):
    import app.models  # noqa: F401
    from app.models.document import Document

    inspector = inspect(connection)
    if inspector.has_table("documents"):
        existing = {column["name"] for column in inspector.get_columns("documents")}
        for name in ("doi", "journal", "volume", "issue", "pages", "publisher", "url",
                     "document_type", "structured_authors", "content_hash", "pdf_content"):
            if name not in existing:
                sql_type = Document.__table__.c[name].type.compile(dialect=connection.dialect)
                connection.exec_driver_sql(f'ALTER TABLE documents ADD COLUMN {name} {sql_type}')
    from app.models.document import Chunk
    if inspector.has_table("chunks"):
        existing = {column["name"] for column in inspector.get_columns("chunks")}
        for name in ("page_label", "char_start", "char_end", "bbox"):
            if name not in existing:
                sql_type = Chunk.__table__.c[name].type.compile(dialect=connection.dialect)
                connection.exec_driver_sql(f'ALTER TABLE chunks ADD COLUMN {name} {sql_type}')

    from app.models.chat import ChatMessage
    if inspector.has_table("chat_messages"):
        existing = {column["name"] for column in inspector.get_columns("chat_messages")}
        if "explanation_mode" not in existing:
            sql_type = ChatMessage.__table__.c["explanation_mode"].type.compile(dialect=connection.dialect)
            connection.exec_driver_sql(f"ALTER TABLE chat_messages ADD COLUMN explanation_mode {sql_type} DEFAULT 'standard'")
            connection.exec_driver_sql("UPDATE chat_messages SET explanation_mode = 'standard' WHERE explanation_mode IS NULL")

    from app.models.user import UserProfile
    if inspector.has_table("user_profiles"):
        existing = {column["name"] for column in inspector.get_columns("user_profiles")}
        if "default_explanation_mode" not in existing:
            sql_type = UserProfile.__table__.c["default_explanation_mode"].type.compile(dialect=connection.dialect)
            connection.exec_driver_sql(f"ALTER TABLE user_profiles ADD COLUMN default_explanation_mode {sql_type} DEFAULT 'standard'")
            connection.exec_driver_sql("UPDATE user_profiles SET default_explanation_mode = 'standard' WHERE default_explanation_mode IS NULL")

    Base.metadata.create_all(connection)
    if connection.dialect.name == "postgresql":
        connection.exec_driver_sql("ALTER TYPE analysiskind ADD VALUE IF NOT EXISTS 'gap_analysis'")
        connection.exec_driver_sql("ALTER TYPE analysiskind ADD VALUE IF NOT EXISTS 'disagreement'")
    # Repair tables created by the original 0002 migration, which omitted these timestamps.
    table, name = "tags", "created_at"
    columns = {c["name"] for c in inspect(connection).get_columns(table)}
    if name not in columns:
        connection.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} TIMESTAMP")
        connection.exec_driver_sql(f"UPDATE {table} SET {name} = CURRENT_TIMESTAMP WHERE {name} IS NULL")
