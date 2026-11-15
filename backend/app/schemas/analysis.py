"""
Pydantic schemas for analysis runs (comparison matrix and literature review).
"""
from datetime import datetime
from typing import List, Dict, Any, Optional, Literal
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


# Gap Analysis Schemas
class FeasibleProject(BaseModel):
    """Feasible student investigation recommendation."""
    bounded_question: str
    suggested_method: str
    data_sources: str
    skills_required: str
    concrete_steps: List[str] = Field(default_factory=list)
    success_criteria: str
    time_budget: Optional[str] = None
    resource_budget: Optional[str] = None


class GapCandidate(BaseModel):
    """Candidate research gap with evidence basis and student project."""
    id: str
    title: str
    gap_category: str  # methodology, population, dataset, outcome_measure, theoretical, replication, other
    scope: str
    gap_source: str  # author_stated, model_inferred, missing_reporting
    supporting_quotes: List[EvidenceReference] = Field(default_factory=list)
    evidence_basis: str
    rationale: str
    uncertainty: str
    proposed_research_question: str
    suggested_search_terms: List[str] = Field(default_factory=list)
    feasible_project: FeasibleProject
    coverage_note: Optional[str] = None


class GapAnalysisResult(BaseModel):
    """Complete gap analysis result."""
    candidates: List[GapCandidate]
    coverage: Dict[int, str]  # doc_id -> "included" | "insufficient" | "failed"
    warnings: List[str] = Field(default_factory=list)
    analysis_scope: str


# Candidate Review Schemas
class CandidateReviewUpdate(BaseModel):
    status: Optional[Literal['saved', 'dismissed']] = None
    comment: Optional[str] = Field(default=None, max_length=10000)


class CandidateReviewResponse(BaseModel):
    id: int
    user_id: int
    analysis_run_id: int
    candidate_id: str
    status: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# Project Brief Schemas
class ProjectBriefCreate(BaseModel):
    assumptions: List[str] = Field(default_factory=list, max_length=30)
    time_budget: Optional[str] = Field(default=None, max_length=100)
    resource_budget: Optional[str] = Field(default=None, max_length=100)


class ProjectBriefResponse(BaseModel):
    id: int
    user_id: int
    analysis_run_id: Optional[int] = None
    candidate_id: str
    title: str
    research_question: str
    method: str
    data_sources: str
    skills_required: Optional[str] = None
    steps: List[str]
    success_criteria: str
    assumptions: List[str]
    time_budget: Optional[str] = None
    resource_budget: Optional[str] = None
    linked_source_ids: List[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# Disagreement Explorer Schemas
class ClaimSide(BaseModel):
    """One side of a comparable claim in a relationship."""
    document_id: int
    document_title: str
    claim: str
    metric_or_outcome: Optional[str] = None
    population_or_dataset: Optional[str] = None
    method_or_context: Optional[str] = None
    evidence: List[EvidenceReference] = Field(default_factory=list)


class ClaimRelationship(BaseModel):
    """Relationship between two studies on an outcome/theme."""
    id: str
    relationship_type: str  # agreement, apparent_disagreement, different_context, insufficient_evidence
    outcome_theme: str
    left: ClaimSide
    right: ClaimSide
    rationale: str
    distinguishing_factors: Optional[str] = None


class DisagreementResult(BaseModel):
    """Complete agreement/disagreement explorer result."""
    relationships: List[ClaimRelationship]
    coverage: Dict[int, str]  # doc_id -> "included" | "insufficient" | "failed"
    warnings: List[str] = Field(default_factory=list)
    themes: List[str] = Field(default_factory=list)


class SaveRelationshipEvidenceRequest(BaseModel):
    note: Optional[str] = None


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
        if kind == AnalysisKind.GAP_ANALYSIS and not (2 <= len(v) <= 10):
            raise ValueError("Gap analysis requires 2-10 documents")
        if kind == AnalysisKind.DISAGREEMENT and not (2 <= len(v) <= 10):
            raise ValueError("Disagreement explorer requires 2-10 documents")
        return v

    @field_validator('parameters')
    @classmethod
    def validate_parameters(cls, value):
        value = value or {}
        allowed = {'research_question', 'length', 'scope', 'time_budget', 'resource_budget'}
        if set(value) - allowed:
            raise ValueError('Unknown analysis parameter')
        question = value.get('research_question')
        if question is not None:
            if not isinstance(question, str) or len(question) > 2000:
                raise ValueError('Research question must be text of at most 2000 characters')
        if 'length' in value and value.get('length') not in ('short', 'medium', 'long'):
            raise ValueError('Invalid review length')
        for str_key in ('scope', 'time_budget', 'resource_budget'):
            if str_key in value and value[str_key] is not None:
                if not isinstance(value[str_key], str) or len(value[str_key]) > 2000:
                    raise ValueError(f'{str_key} must be text of at most 2000 characters')
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
