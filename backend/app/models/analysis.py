"""
Analysis run models for comparison matrix and literature review.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class AnalysisKind(str, enum.Enum):
    """Type of analysis run."""
    COMPARISON = "comparison"
    LITERATURE_REVIEW = "literature_review"


class AnalysisStatus(str, enum.Enum):
    """Status of an analysis run."""
    PENDING = "pending"
    EXTRACTING = "extracting"
    SYNTHESIZING = "synthesizing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AnalysisRun(Base):
    """
    User-owned analysis runs for comparison and literature review.
    Tracks explicit document selection, parameters, progress, and results.
    """
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(Enum(AnalysisKind, values_callable=lambda cls: [e.value for e in cls]), nullable=False, index=True)
    status = Column(Enum(AnalysisStatus, values_callable=lambda cls: [e.value for e in cls]), nullable=False, default=AnalysisStatus.PENDING, index=True)

    # Configuration
    document_ids = Column(JSON, nullable=False)  # List of selected document IDs
    document_revisions = Column(JSON, nullable=True)  # Dict mapping doc_id to content_hash
    parameters = Column(JSON, nullable=True)  # Research question, length, etc.

    # Progress tracking
    stage = Column(String(50), nullable=True)  # Current processing stage
    progress_percent = Column(Integer, default=0)

    # Results
    result = Column(JSON, nullable=True)  # Structured extraction/synthesis result
    error_message = Column(Text, nullable=True)

    # Metadata
    prompt_version = Column(String(20), nullable=True)
    schema_version = Column(String(20), nullable=True)
    model_provider = Column(String(50), nullable=True)
    model_name = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="analysis_runs")
    review_edits = relationship("ReviewEdit", back_populates="analysis_run", cascade="all, delete-orphan")


class ReviewEdit(Base):
    """
    User edits to a literature review, stored separately from generated output.
    Preserves version history and tracks which citations were user-modified.
    """
    __tablename__ = "review_edits"

    id = Column(Integer, primary_key=True, index=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Edit content
    edited_content = Column(Text, nullable=False)  # Full edited text
    citation_ids = Column(JSON, nullable=True)  # List of citation IDs still referenced
    user_modified_citations = Column(JSON, nullable=True)  # Citations that were manually edited

    # Version tracking
    version = Column(Integer, default=1, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="review_edits")
    user = relationship("User")
