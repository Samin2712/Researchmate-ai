"""
Document Pydantic schemas
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List, Literal
from app.models.document import DocumentStatus


class Author(BaseModel):
    given: str = Field(default="", max_length=200)
    family: str = Field(min_length=1, max_length=200)


class DocumentBase(BaseModel):
    """Base document schema"""
    title: str
    authors: Optional[str] = None
    structured_authors: Optional[List[Author]] = None
    year: Optional[int] = None
    abstract: Optional[str] = None
    doi: Optional[str] = None
    journal: Optional[str] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    pages: Optional[str] = None
    publisher: Optional[str] = None
    url: Optional[str] = None
    document_type: Optional[str] = "article"


class DocumentCreate(DocumentBase):
    """Document creation schema"""
    pass


class DocumentUpdate(BaseModel):
    """Document update schema"""
    title: Optional[str] = Field(None, min_length=1, max_length=1000)
    authors: Optional[str] = None
    structured_authors: Optional[List[Author]] = None
    year: Optional[int] = Field(None, ge=1, le=9999)
    abstract: Optional[str] = None
    doi: Optional[str] = None
    journal: Optional[str] = None
    volume: Optional[str] = None
    issue: Optional[str] = None
    pages: Optional[str] = None
    publisher: Optional[str] = None
    url: Optional[str] = None
    document_type: Optional[Literal["article", "book", "inproceedings", "misc"]] = None

    @field_validator("title", "document_type", mode="before")
    @classmethod
    def required_if_present(cls, value):
        if value is None or not str(value).strip():
            raise ValueError("This field cannot be empty")
        return str(value).strip()

    @field_validator("doi", "url", mode="before")
    @classmethod
    def citation_identifiers(cls, value, info):
        import re
        if value is None or not str(value).strip():
            return None
        value = str(value).strip()
        if info.field_name == "doi" and not re.fullmatch(r"10\.\d{4,9}/\S+", value):
            raise ValueError("Use a DOI such as 10.1000/example")
        if info.field_name == "url":
            from urllib.parse import urlparse
            parsed = urlparse(value)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                raise ValueError("Use an absolute HTTP or HTTPS URL")
        return value


class DocumentResponse(DocumentBase):
    """Document response schema"""
    id: int
    user_id: int
    file_path: str
    file_size: Optional[int] = None
    page_count: Optional[int] = None
    status: DocumentStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    tag_ids: List[int] = Field(default_factory=list)
    collection_ids: List[int] = Field(default_factory=list)
    
    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Document list response"""
    documents: List[DocumentResponse]
    total: int


class ChunkResponse(BaseModel):
    """Chunk response schema"""
    id: int
    document_id: int
    text: str
    page_number: Optional[int] = None
    chunk_index: int
    
    class Config:
        from_attributes = True
