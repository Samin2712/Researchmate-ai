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
                     "document_type", "structured_authors"):
            if name not in existing:
                sql_type = Document.__table__.c[name].type.compile(dialect=connection.dialect)
                connection.exec_driver_sql(f'ALTER TABLE documents ADD COLUMN {name} {sql_type}')
    Base.metadata.create_all(connection)
    # Repair tables created by the original 0002 migration, which omitted these timestamps.
    table, name = "tags", "created_at"
    columns = {c["name"] for c in inspect(connection).get_columns(table)}
    if name not in columns:
        connection.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} TIMESTAMP")
        connection.exec_driver_sql(f"UPDATE {table} SET {name} = CURRENT_TIMESTAMP WHERE {name} IS NULL")
