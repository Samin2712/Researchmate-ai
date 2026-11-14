"""
Document database models
"""
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float, UniqueConstraint, JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class DocumentStatus(str, enum.Enum):
    """Document processing status"""
    UPLOADING = "uploading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(Base):
    """Research paper document model"""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    authors = Column(Text, nullable=True)
    year = Column(Integer, nullable=True)
    abstract = Column(Text, nullable=True)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)  # in bytes
    page_count = Column(Integer, nullable=True)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.UPLOADING)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Extended citation metadata
    structured_authors = Column(JSON, nullable=True)
    doi = Column(String, nullable=True)
    journal = Column(String, nullable=True)
    volume = Column(String, nullable=True)
    issue = Column(String, nullable=True)
    pages = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    url = Column(String, nullable=True)
    document_type = Column(String, nullable=True, default="article")

    # Relationships
    owner = relationship("User", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
    collections = relationship(
        "Collection",
        secondary="collection_documents",
        back_populates="documents",
        lazy="select",
    )
    tags = relationship(
        "Tag",
        secondary="document_tags",
        back_populates="documents",
        lazy="select",
    )
    
    def __repr__(self):
        return f"<Document {self.title}>"


class Chunk(Base):
    """Document chunk for RAG"""
    __tablename__ = "chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    chunk_index = Column(Integer, nullable=False)
    vector_id = Column(String, nullable=True, unique=True)  # ChromaDB ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="chunks")
    
    def __repr__(self):
        return f"<Chunk {self.id} from Document {self.document_id}>"


class Collection(Base):
    """User-owned collection of documents"""
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_collection_user_name"),
    )

    owner = relationship("User", back_populates="collections")
    documents = relationship(
        "Document",
        secondary="collection_documents",
        back_populates="collections",
        lazy="select",
    )

    def __repr__(self):
        return f"<Collection {self.name} (user {self.user_id})>"


class CollectionDocument(Base):
    """Many-to-many join table for Collection and Document"""
    __tablename__ = "collection_documents"

    collection_id = Column(
        Integer,
        ForeignKey("collections.id", ondelete="CASCADE"),
        primary_key=True,
    )
    document_id = Column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<CollectionDocument col={self.collection_id} doc={self.document_id}>"


class Tag(Base):
    """User-owned tag for labeling documents"""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=True)  # hex color e.g. #116e64
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_tag_user_name"),
    )

    owner = relationship("User", back_populates="tags")
    documents = relationship(
        "Document",
        secondary="document_tags",
        back_populates="tags",
        lazy="select",
    )

    def __repr__(self):
        return f"<Tag {self.name} (user {self.user_id})>"


class DocumentTag(Base):
    """Many-to-many join table for Document and Tag"""
    __tablename__ = "document_tags"

    document_id = Column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id = Column(
        Integer,
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<DocumentTag doc={self.document_id} tag={self.tag_id}>"
