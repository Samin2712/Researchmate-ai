"""Durable vectors, isolated by embedding model and document owner."""
from sqlalchemy import Column, String, Text, JSON, ForeignKey, Integer
from app.core.database import Base


class DocumentVector(Base):
    __tablename__ = 'document_vectors'
    id = Column(String, primary_key=True)
    document_id = Column(Integer, ForeignKey('documents.id', ondelete='CASCADE'), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    embedding_model = Column(String, index=True, nullable=False)
    text = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=False)
    source_metadata = Column(JSON, nullable=False)
