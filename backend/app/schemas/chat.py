"""
Chat Pydantic schemas
"""
from pydantic import BaseModel, Field, field_validator
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.models.chat import MessageRole


class ChatMessageBase(BaseModel):
    """Base chat message schema"""
    role: MessageRole
    content: str


class ChatMessageCreate(BaseModel):
    """Chat message creation schema"""
    content: str = Field(..., min_length=1, max_length=5000)


class SourceReference(BaseModel):
    """Source reference for citations"""
    document_id: int
    document_title: str
    page_number: Optional[int] = None
    chunk_text: str
    relevance_score: Optional[float] = None


class ChatMessageResponse(ChatMessageBase):
    """Chat message response schema"""
    id: int
    session_id: int
    sources: Optional[List[Dict[str, Any]]] = None
    confidence_score: Optional[int] = None
    created_at: datetime

    @field_validator("sources", mode="before")
    @classmethod
    def decode_legacy_sources(cls, value):
        """Read conversations saved before sources were stored as JSON lists."""
        if isinstance(value, str):
            return json.loads(value)
        return value
    
    class Config:
        from_attributes = True


class ChatSessionBase(BaseModel):
    """Base chat session schema"""
    title: str = "New Chat"


class ChatSessionCreate(ChatSessionBase):
    """Chat session creation schema"""
    pass


class ChatSessionResponse(ChatSessionBase):
    """Chat session response schema"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ChatSessionWithMessages(ChatSessionResponse):
    """Chat session with messages"""
    messages: List[ChatMessageResponse] = []


class ChatRequest(BaseModel):
    """Chat request schema"""
    session_id: Optional[int] = None
    message: str = Field(..., min_length=1, max_length=5000)
    document_ids: Optional[List[int]] = None  # Filter by specific documents


class ChatResponse(BaseModel):
    """Chat response schema"""
    session_id: int
    message: ChatMessageResponse
    sources: List[Dict[str, Any]] = []
    metadata: Optional[Dict[str, Any]] = None
