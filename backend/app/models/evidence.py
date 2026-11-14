"""
Evidence notebook models for source verification and saved evidence.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class EvidenceNote(Base):
    """User-saved evidence with source references and personal notes"""
    __tablename__ = "evidence_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="SET NULL"), nullable=True, index=True)

    # Source reference (immutable snapshot)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    chunk_id = Column(Integer, ForeignKey("chunks.id", ondelete="SET NULL"), nullable=True)
    page_number = Column(Integer, nullable=True)  # 1-based page number
    page_label = Column(String, nullable=True)  # Display label if different from number

    # Evidence snapshot (preserved even if document is deleted)
    source_quote = Column(Text, nullable=False)  # Exact quote from source
    document_title = Column(String, nullable=True)  # Cached for display if doc deleted
    document_authors = Column(String, nullable=True)  # Cached authors

    # User annotations (editable)
    title = Column(String, nullable=True)
    note = Column(Text, nullable=True)  # User's personal note about this evidence
    tags = Column(JSON, nullable=True)  # Array of tag strings

    # Metadata
    quote_bounds = Column(JSON, nullable=True)  # {start: int, end: int} character positions
    content_hash = Column(String, nullable=True)  # Hash of source document content for staleness detection
    is_stale = Column(Integer, default=0)  # 1 if source document was reprocessed/modified

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="evidence_notes")
    collection = relationship("Collection", back_populates="evidence_notes")
    document = relationship("Document", back_populates="evidence_notes")
    chunk = relationship("Chunk", back_populates="evidence_notes")

    def __repr__(self):
        return f"<EvidenceNote {self.id}: {self.title or 'Untitled'}>"
