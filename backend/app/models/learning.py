"""
Models for Learning Assistance: Paper Starter Questions and Grounded Terminology Glossary
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, UniqueConstraint
)
from sqlalchemy.orm import relationship, backref
import enum

from app.core.database import Base


class QuestionCategory(str, enum.Enum):
    COMPREHENSION = "comprehension"
    METHODOLOGY = "methodology"
    CRITICAL_THINKING = "critical_thinking"


class QuestionGenerationStatus(str, enum.Enum):
    PENDING = "pending"
    READY = "ready"
    UNAVAILABLE = "unavailable"
    FAILED = "failed"


class DocumentQuestionSet(Base):
    """
    Starter questions generated for an individual paper.
    Caches 3 grounded questions: comprehension, methodology, and critical thinking.
    """
    __tablename__ = "document_questions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), nullable=False, default=QuestionGenerationStatus.PENDING.value, server_default="pending", index=True)
    document_revision = Column(String(64), nullable=True, index=True)
    prompt_version = Column(String(32), nullable=False, default="v1", server_default="v1")
    model_provider = Column(String(64), nullable=True)
    model_name = Column(String(100), nullable=True)
    questions = Column(JSON, nullable=True)  # List of {category, question, evidence_quotes, page_numbers}
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("document_id", "document_revision", "prompt_version", name="uq_doc_questions_rev"),
    )

    document = relationship("Document", backref=backref("question_sets", cascade="all, delete-orphan"))
    user = relationship("User")


class DocumentGlossaryTerm(Base):
    """
    Contextual term explanations grounded in an individual paper.
    Caches terminology explanations by owner, document revision, and term.
    """
    __tablename__ = "document_glossary"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_revision = Column(String(64), nullable=True, index=True)
    term = Column(String(255), nullable=False, index=True)
    context = Column(Text, nullable=True)
    explanation = Column(Text, nullable=False)
    grounded_in_paper = Column(Boolean, default=True, nullable=False)
    status = Column(String(32), nullable=False, default="grounded")  # "grounded", "general", "unavailable"
    source_quote = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    prompt_version = Column(String(32), nullable=False, default="v1", server_default="v1")
    model_provider = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("document_id", "term", "document_revision", "prompt_version", name="uq_doc_glossary_term"),
    )

    document = relationship("Document", backref=backref("glossary_terms", cascade="all, delete-orphan"))
    user = relationship("User")
