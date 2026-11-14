from sqlalchemy import create_engine, inspect, text
from app.core.schema import upgrade_schema


def test_legacy_upgrade_preserves_data_and_can_repeat(tmp_path):
    engine = create_engine("sqlite:///" + (tmp_path / "legacy.db").as_posix())
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE documents (id INTEGER PRIMARY KEY, title VARCHAR NOT NULL, authors TEXT)"))
        conn.execute(text("INSERT INTO documents VALUES (1, 'Legacy paper', 'Original author')"))
        upgrade_schema(conn)
        upgrade_schema(conn)
        assert conn.execute(text("SELECT title, authors, doi FROM documents")).one() == ("Legacy paper", "Original author", None)
        assert "structured_authors" in {c["name"] for c in inspect(conn).get_columns("documents")}
        assert {"collections", "tags", "document_tags", "collection_documents"} <= set(inspect(conn).get_table_names())
    engine.dispose()


def test_fresh_schema_bootstrap(tmp_path):
    engine = create_engine("sqlite:///" + (tmp_path / "fresh.db").as_posix())
    with engine.begin() as conn:
        upgrade_schema(conn)
        assert "users" in inspect(conn).get_table_names()
    engine.dispose()
