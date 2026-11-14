"""
Evidence notebook schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class QuoteBounds(BaseModel):
    """Character position bounds for a quote within a page"""
    start: int
    end: int


class EvidenceReference(BaseModel):
    """Reusable typed evidence reference contract"""
    document_id: int
    chunk_id: Optional[int] = None
    page_number: Optional[int] = Field(None, ge=1)  # 1-based page index
    page_label: Optional[str] = None  # Display label if different
    source_quote: str
    quote_bounds: Optional[QuoteBounds] = None


class EvidenceNoteCreate(BaseModel):
    """Create a new evidence note"""
    # Source reference
    document_id: int
    chunk_id: Optional[int] = None
    page_number: Optional[int] = Field(None, ge=1)
    page_label: Optional[str] = None
    source_quote: str = Field(..., min_length=1, max_length=100000)
    quote_bounds: Optional[QuoteBounds] = None

    # User annotations
    title: Optional[str] = None
    note: Optional[str] = None
    tags: Optional[List[str]] = None
    collection_id: Optional[int] = None


class EvidenceNoteUpdate(BaseModel):
    """Update an existing evidence note (only editable fields)"""
    title: Optional[str] = None
    note: Optional[str] = None
    tags: Optional[List[str]] = None
    collection_id: Optional[int] = None


class EvidenceNoteResponse(BaseModel):
    """Evidence note response"""
    id: int
    user_id: int
    collection_id: Optional[int]

    # Source reference (immutable snapshot)
    document_id: Optional[int]
    chunk_id: Optional[int]
    page_number: Optional[int]
    page_label: Optional[str]
    source_quote: str
    document_title: Optional[str]
    document_authors: Optional[str]

    # User annotations (editable)
    title: Optional[str]
    note: Optional[str]
    tags: Optional[List[str]]

    # Metadata
    quote_bounds: Optional[dict]
    content_hash: Optional[str]
    is_stale: int

    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class EvidenceNoteListResponse(BaseModel):
    """Paginated list of evidence notes"""
    items: List[EvidenceNoteResponse]
    total: int
    page: int
    page_size: int


class EvidenceExportRequest(BaseModel):
    """Request to export evidence notes as Markdown"""
    note_ids: List[int] = Field(..., min_length=1)
    include_collection_info: bool = True


class SourceVerificationRequest(BaseModel):
    """Request to verify a source citation"""
    document_id: int
    page_number: Optional[int] = Field(None, ge=1)
    chunk_id: Optional[int] = None
    quote_text: Optional[str] = None
