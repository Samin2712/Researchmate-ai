"""
Pydantic schemas for Collections and Tags
"""
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List


# ---------------------------------------------------------------------------
# Collection schemas
# ---------------------------------------------------------------------------

class NamedInput(BaseModel):
    @field_validator("name", mode="before", check_fields=False)
    @classmethod
    def clean_name(cls, value):
        if value is None or not str(value).strip():
            raise ValueError("Name cannot be empty")
        return str(value).strip()

    @field_validator("color", check_fields=False)
    @classmethod
    def valid_color(cls, value):
        import re
        if value is not None and not re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            raise ValueError("Color must be a six-digit hex color")
        return value


class CollectionCreate(NamedInput):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None


class CollectionUpdate(NamedInput):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None


class CollectionResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    document_count: int = 0  # computed

    class Config:
        from_attributes = True


class CollectionDetailResponse(CollectionResponse):
    """Extended collection response with document ids"""
    document_ids: List[int] = []


# ---------------------------------------------------------------------------
# Tag schemas
# ---------------------------------------------------------------------------

class TagCreate(NamedInput):
    name: str = Field(min_length=1, max_length=100)
    color: Optional[str] = None  # hex color


class TagUpdate(NamedInput):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = None


class TagResponse(BaseModel):
    id: int
    user_id: int
    name: str
    color: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Shared / bulk
# ---------------------------------------------------------------------------

class BulkMembershipRequest(BaseModel):
    document_ids: List[int] = Field(min_length=1, max_length=1000)


class AddTagRequest(BaseModel):
    tag_id: int


class BibTexExportRequest(BaseModel):
    document_ids: List[int] = Field(min_length=1, max_length=1000)
