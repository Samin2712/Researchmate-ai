"""
Pydantic schemas for Learning Assistance (starter questions and terminology).
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class StarterQuestion(BaseModel):
    category: Literal["comprehension", "methodology", "critical_thinking"]
    question: str = Field(..., min_length=5, max_length=1000)
    evidence_quotes: Optional[List[str]] = Field(default_factory=list)
    page_numbers: Optional[List[Optional[int]]] = Field(default_factory=list)


class DocumentQuestionSetResponse(BaseModel):
    id: Optional[int] = None
    document_id: int
    status: Literal["pending", "ready", "unavailable", "failed"]
    document_revision: Optional[str] = None
    prompt_version: str = "v1"
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    questions: List[StarterQuestion] = []
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StarterQuestionRegenerateResponse(BaseModel):
    status: str
    message: str
    document_id: int
