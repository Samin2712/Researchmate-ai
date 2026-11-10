"""
Document Pydantic schemas
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.models.document import DocumentStatus


class DocumentBase(BaseModel):
    """Base document schema"""
    title: str
    authors: Optional[str] = None
    year: Optional[int] = None
    abstract: Optional[str] = None


class DocumentCreate(DocumentBase):
    """Document creation schema"""
    pass


class DocumentUpdate(BaseModel):
    """Document update schema"""
    title: Optional[str] = None
    authors: Optional[str] = None
    year: Optional[int] = None
    abstract: Optional[str] = None


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
