"""Small-library vector search in PostgreSQL, without an in-process ML database.

Vectors are streamed in bounded batches and ranked by cosine distance. For larger
libraries this can be replaced by pgvector; no database extension is required here.
"""
import heapq
import math
from functools import cached_property

from sqlalchemy import create_engine, select, delete, func, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import normalize_database_url
from app.models.vector import DocumentVector


class DatabaseVectorStore:
    @cached_property
    def engine(self):
        url = normalize_database_url(settings.DATABASE_URL)
        url = url.replace('postgresql+asyncpg://', 'postgresql+psycopg://', 1)
        url = url.replace('sqlite+aiosqlite://', 'sqlite://', 1)
        return create_engine(url, pool_pre_ping=True)

    @property
    def model_key(self):
        from app.services.embedder import embedder
        return f'{embedder.provider}:{embedder.model_name}'

    @property
    def client(self):
        return self

    def heartbeat(self):
        with self.engine.connect() as connection:
            connection.execute(text('SELECT 1'))
        return True

    def add_documents(self, texts, embeddings, metadatas, ids):
        if not texts or not len(texts) == len(embeddings) == len(metadatas) == len(ids):
            raise ValueError('Vector inputs must have equal, non-zero lengths')
        with Session(self.engine) as db:
            for body, embedding, metadata, vector_id in zip(texts, embeddings, metadatas, ids):
                db.merge(DocumentVector(
                    id=vector_id, document_id=int(metadata['document_id']),
                    user_id=int(metadata['user_id']), embedding_model=self.model_key,
                    text=body, embedding=embedding, source_metadata=metadata,
                ))
            db.commit()
        return True

    def search(self, query_embedding, top_k=5, filters=None):
        if top_k <= 0:
            return []
        filters = filters or {}
        # Never permit an unscoped search to expose another user's documents.
        if 'user_id' not in filters:
            raise ValueError('A user_id filter is required for document search')
        statement = select(DocumentVector).where(
            DocumentVector.user_id == int(filters['user_id']),
            DocumentVector.embedding_model == self.model_key,
        )
        if 'document_id' in filters:
            value = filters['document_id']
            if isinstance(value, dict) and '$in' in value:
                statement = statement.where(DocumentVector.document_id.in_([int(item) for item in value['$in']]))
            else:
                statement = statement.where(DocumentVector.document_id == int(value))
        query_norm = math.sqrt(sum(value * value for value in query_embedding)) or 1
        best = []
        with Session(self.engine) as db:
            for row in db.scalars(statement.execution_options(yield_per=32)):
                vector = row.embedding
                if len(vector) != len(query_embedding):
                    continue
                norm = math.sqrt(sum(value * value for value in vector)) or 1
                similarity = sum(a * b for a, b in zip(query_embedding, vector)) / (query_norm * norm)
                result = {'id': row.id, 'text': row.text, 'metadata': row.source_metadata,
                          'distance': 1 - max(-1, min(1, similarity))}
                item = (similarity, row.id, result)
                if len(best) < top_k:
                    heapq.heappush(best, item)
                elif item[:2] > best[0][:2]:
                    heapq.heapreplace(best, item)
        return [item[2] for item in sorted(best, reverse=True)]

    def delete_by_document_id(self, document_id):
        with self.engine.begin() as connection:
            connection.execute(delete(DocumentVector).where(DocumentVector.document_id == int(document_id)))
        return True

    def delete_by_ids(self, ids):
        with self.engine.begin() as connection:
            connection.execute(delete(DocumentVector).where(DocumentVector.id.in_(ids)))
        return True

    def get_collection_stats(self):
        with self.engine.connect() as connection:
            count = connection.scalar(select(func.count()).select_from(DocumentVector))
        return {'total_chunks': count, 'collection_name': 'document_vectors', 'status': 'healthy'}
