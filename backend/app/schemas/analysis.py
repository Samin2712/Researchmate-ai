"""
Pydantic schemas for analysis runs (comparison matrix and literature review).
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator

from app.models.analysis import AnalysisKind, AnalysisStatus


# Evidence reference structure (reuses existing evidence contract)
class EvidenceReference(BaseModel):
    """Reference to a source document chunk with quote."""
    source_id: str
    document_id: int
    chunk_id: Optional[int] = None
    page_number: Optional[int] = None
    page_label: Optional[str] = None
    quote: str
    title: Optional[str] = None
    authors: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


# Comparison Matrix Schemas
class ComparisonCellValue(BaseModel):
    """Single cell value in comparison matrix with evidence."""
    value: str  # The extracted assertion or "Not reported"
    evidence: List[EvidenceReference] = Field(default_factory=list)
    confidence: Optional[str] = None  # "high", "medium", "low", or None


class ComparisonRow(BaseModel):
    """Single row in comparison matrix."""
    field: str  # research_question, study_type, population, findings, limitations
    label: str  # Human-readable field label
    cells: Dict[int, ComparisonCellValue]  # document_id -> cell value


class ComparisonMatrixResult(BaseModel):
    """Complete comparison matrix result."""
    rows: List[ComparisonRow]
    document_ids: List[int]
    document_titles: Dict[int, str]
    coverage: Dict[int, Dict[str, bool]]  # doc_id -> field -> extracted_successfully
    warnings: List[str] = Field(default_factory=list)


# Literature Review Schemas
class ReviewSection(BaseModel):
    """Section of literature review with citations."""
    heading: str
    content: str
    citations: List[str] = Field(default_factory=list)  # Citation IDs


class LiteratureReviewResult(BaseModel):
    """Complete literature review result."""
    title: str
    abstract: str
    sections: List[ReviewSection]
    bibliography: Dict[str, EvidenceReference]  # citation_id -> evidence
    coverage: Dict[int, str]  # doc_id -> "included" | "insufficient" | "failed"
    themes: List[str] = Field(default_factory=list)
    research_question: Optional[str] = None


# Analysis Run Schemas
class AnalysisRunCreate(BaseModel):
    """Request to create a new analysis run."""
    kind: AnalysisKind
    force: bool = False
    document_ids: List[int] = Field(min_length=2, max_length=10)
    parameters: Optional[Dict[str, Any]] = None

    @field_validator('document_ids')
    @classmethod
    def validate_document_count(cls, v, info):
        if len(set(v)) != len(v) or any(doc_id <= 0 for doc_id in v):
            raise ValueError('Select distinct positive document IDs')
        kind = info.data.get('kind')
        if kind == AnalysisKind.COMPARISON and not (2 <= len(v) <= 5):
            raise ValueError("Comparison requires 2-5 documents")
        if kind == AnalysisKind.LITERATURE_REVIEW and not (2 <= len(v) <= 10):
            raise ValueError("Literature review requires 2-10 documents")
        return v

    @field_validator('parameters')
    @classmethod
    def validate_parameters(cls, value):
        value = value or {}
        if set(value) - {'research_question', 'length'}:
            raise ValueError('Unknown analysis parameter')
        question = value.get('research_question', '')
        if not isinstance(question, str) or len(question) > 2000:
            raise ValueError('Research question must be text of at most 2000 characters')
        if value.get('length', 'medium') not in ('short', 'medium', 'long'):
            raise ValueError('Invalid review length')
        return value


class AnalysisRunUpdate(BaseModel):
    """Update analysis run status/progress."""
    status: Optional[AnalysisStatus] = None
    stage: Optional[str] = None
    progress_percent: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


class AnalysisRunResponse(BaseModel):
    """Analysis run response."""
    id: int
    user_id: int
    kind: AnalysisKind
    status: AnalysisStatus
    document_ids: List[int]
    document_revisions: Optional[Dict[str, str]] = None
    parameters: Optional[Dict[str, Any]] = None
    stage: Optional[str] = None
    progress_percent: int
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    prompt_version: Optional[str] = None
    schema_version: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# Review Edit Schemas
class ReviewEditCreate(BaseModel):
    """Save user edits to literature review."""
    edited_content: str = Field(min_length=1, max_length=100000)
    citation_ids: Optional[List[str]] = None
    user_modified_citations: Optional[List[str]] = None


class ReviewEditResponse(BaseModel):
    """Review edit response."""
    id: int
    analysis_run_id: int
    user_id: int
    edited_content: str
    citation_ids: Optional[List[str]] = None
    user_modified_citations: Optional[List[str]] = None
    version: int
    created_at: datetime

    model_config = {"from_attributes": True}


# Export Schemas
class ExportFormat(BaseModel):
    """Export format configuration."""
    format: str = Field(pattern="^(markdown|csv|pdf)$")
    include_evidence: bool = True
    include_bibliography: bool = True
