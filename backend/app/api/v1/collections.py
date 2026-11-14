"""
Collections, Tags, and BibTeX export API endpoints
"""
from __future__ import annotations

import logging
import re
import unicodedata
from typing import List, Optional, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import (
    Collection, CollectionDocument, Tag, DocumentTag, Document,
)
from app.schemas.collections import (
    CollectionCreate, CollectionUpdate, CollectionResponse,
    CollectionDetailResponse, TagCreate, TagUpdate, TagResponse,
    BulkMembershipRequest, AddTagRequest,
)
from app.schemas.document import DocumentResponse

router = APIRouter()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_collection_or_404(
    collection_id: int, user_id: int, db: AsyncSession
) -> Collection:
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == user_id,
        )
    )
    col = result.scalar_one_or_none()
    if col is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    return col


async def _get_tag_or_404(tag_id: int, user_id: int, db: AsyncSession) -> Tag:
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
    )
    tag = result.scalar_one_or_none()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


async def _get_document_or_403(doc_id: int, user_id: int, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Document {doc_id} not found or not owned by you",
        )
    return doc


async def _build_document_response(doc: Document, db: AsyncSession) -> DocumentResponse:
    """Build a DocumentResponse including tag_ids and collection_ids."""
    tag_rows = await db.execute(
        select(DocumentTag.tag_id).where(DocumentTag.document_id == doc.id)
    )
    tag_ids = [r[0] for r in tag_rows.all()]

    col_rows = await db.execute(
        select(CollectionDocument.collection_id).where(
            CollectionDocument.document_id == doc.id
        )
    )
    collection_ids = [r[0] for r in col_rows.all()]

    data = DocumentResponse.model_validate(doc)
    data.tag_ids = tag_ids
    data.collection_ids = collection_ids
    return data


async def _build_collection_response(col: Collection, db: AsyncSession) -> CollectionResponse:
    count_result = await db.execute(
        select(func.count(CollectionDocument.document_id)).join(
            Document, Document.id == CollectionDocument.document_id
        ).where(Document.user_id == col.user_id,
            CollectionDocument.collection_id == col.id
        )
    )
    doc_count = count_result.scalar() or 0
    resp = CollectionResponse.model_validate(col)
    resp.document_count = doc_count
    return resp


# ---------------------------------------------------------------------------
# Collections CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=List[CollectionResponse])
async def list_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all collections owned by the current user, with document counts."""
    result = await db.execute(
        select(Collection).where(Collection.user_id == current_user.id)
        .order_by(Collection.created_at.desc(), Collection.id.desc())
    )
    collections = result.scalars().all()

    # Batch fetch counts
    count_result = await db.execute(
        select(
            CollectionDocument.collection_id,
            func.count(CollectionDocument.document_id).label("cnt"),
        ).join(Document, Document.id == CollectionDocument.document_id).where(
            Document.user_id == current_user.id,
            CollectionDocument.collection_id.in_([c.id for c in collections])
        ).group_by(CollectionDocument.collection_id)
    )
    counts: Dict[int, int] = {row.collection_id: row.cnt for row in count_result}

    responses = []
    for col in collections:
        r = CollectionResponse.model_validate(col)
        r.document_count = counts.get(col.id, 0)
        responses.append(r)
    return responses


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    payload: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new collection."""
    col = Collection(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
    )
    db.add(col)
    try:
        await db.commit()
        await db.refresh(col)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A collection named '{payload.name}' already exists",
        )
    return await _build_collection_response(col, db)


@router.get("/{collection_id}", response_model=CollectionDetailResponse)
async def get_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single collection with its document ids and count."""
    col = await _get_collection_or_404(collection_id, current_user.id, db)

    doc_rows = await db.execute(
        select(CollectionDocument.document_id).join(
            Document, Document.id == CollectionDocument.document_id
        ).where(Document.user_id == current_user.id,
            CollectionDocument.collection_id == col.id
        )
    )
    doc_ids = [r[0] for r in doc_rows.all()]

    resp = CollectionDetailResponse.model_validate(col)
    resp.document_count = len(doc_ids)
    resp.document_ids = doc_ids
    return resp


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: int,
    payload: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename or update description of a collection."""
    col = await _get_collection_or_404(collection_id, current_user.id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(col, field, value)

    try:
        await db.commit()
        await db.refresh(col)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A collection named '{payload.name}' already exists",
        )
    return await _build_collection_response(col, db)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a collection (documents are NOT deleted)."""
    col = await _get_collection_or_404(collection_id, current_user.id, db)
    await db.delete(col)
    await db.commit()
    return None


# ---------------------------------------------------------------------------
# Collection ↔ Document membership
# ---------------------------------------------------------------------------

@router.post("/{collection_id}/documents", status_code=status.HTTP_204_NO_CONTENT)
async def add_documents_to_collection(
    collection_id: int,
    payload: BulkMembershipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-add documents to a collection. All must be owned by the user (atomic)."""
    col = await _get_collection_or_404(collection_id, current_user.id, db)

    # Verify ownership of every doc atomically before any insert
    owned_result = await db.execute(
        select(Document.id).where(
            Document.id.in_(payload.document_ids),
            Document.user_id == current_user.id,
        )
    )
    owned_ids = {r[0] for r in owned_result.all()}
    missing = set(payload.document_ids) - owned_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documents not found or not owned by you: {sorted(missing)}",
        )

    # Fetch existing memberships to avoid duplicates
    existing_result = await db.execute(
        select(CollectionDocument.document_id).join(
            Document, Document.id == CollectionDocument.document_id
        ).where(Document.user_id == current_user.id,
            CollectionDocument.collection_id == col.id,
            CollectionDocument.document_id.in_(payload.document_ids),
        )
    )
    existing_ids = {r[0] for r in existing_result.all()}
    new_ids = owned_ids - existing_ids

    for doc_id in new_ids:
        db.add(CollectionDocument(collection_id=col.id, document_id=doc_id))

    await db.commit()
    return None


@router.delete("/{collection_id}/documents", status_code=status.HTTP_204_NO_CONTENT)
async def remove_documents_from_collection(
    collection_id: int,
    payload: BulkMembershipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Bulk-remove documents from a collection."""
    await _get_collection_or_404(collection_id, current_user.id, db)
    owned = await db.execute(select(Document.id).where(
        Document.id.in_(payload.document_ids), Document.user_id == current_user.id))
    if set(payload.document_ids) - set(owned.scalars().all()):
        raise HTTPException(status_code=404, detail="Document not found")

    await db.execute(
        delete(CollectionDocument).where(
            CollectionDocument.collection_id == collection_id,
            CollectionDocument.document_id.in_(payload.document_ids),
        )
    )
    await db.commit()
    return None


@router.get("/{collection_id}/documents", response_model=List[DocumentResponse])
async def list_collection_documents(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List documents that belong to a collection."""
    await _get_collection_or_404(collection_id, current_user.id, db)

    result = await db.execute(
        select(Document)
        .join(CollectionDocument, CollectionDocument.document_id == Document.id)
        .where(
            CollectionDocument.collection_id == collection_id,
            Document.user_id == current_user.id,
        )
        .order_by(CollectionDocument.added_at.desc(), Document.id.desc())
    )
    docs = result.scalars().all()
    return [await _build_document_response(doc, db) for doc in docs]


# ---------------------------------------------------------------------------
# Tags CRUD  (mounted at /api/v1/tags via main.py)
# ---------------------------------------------------------------------------

tags_router = APIRouter()


@tags_router.get("", response_model=List[TagResponse])
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tags owned by the current user."""
    result = await db.execute(
        select(Tag).where(Tag.user_id == current_user.id).order_by(Tag.name)
    )
    return result.scalars().all()


@tags_router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    payload: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tag."""
    tag = Tag(user_id=current_user.id, name=payload.name, color=payload.color)
    db.add(tag)
    try:
        await db.commit()
        await db.refresh(tag)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag '{payload.name}' already exists",
        )
    return tag


@tags_router.patch("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    payload: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a tag's name or color."""
    tag = await _get_tag_or_404(tag_id, current_user.id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tag, field, value)
    try:
        await db.commit()
        await db.refresh(tag)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Tag '{payload.name}' already exists",
        )
    return tag


@tags_router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a tag and remove it from all documents."""
    tag = await _get_tag_or_404(tag_id, current_user.id, db)
    await db.delete(tag)
    await db.commit()
    return None


# ---------------------------------------------------------------------------
# Document ↔ Tag endpoints  (mounted under /api/v1/documents via main.py)
# ---------------------------------------------------------------------------

doc_tags_router = APIRouter()


@doc_tags_router.post("/{document_id}/tags", status_code=status.HTTP_204_NO_CONTENT)
async def add_tag_to_document(
    document_id: int,
    payload: AddTagRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a tag to a document."""
    await _get_document_or_403(document_id, current_user.id, db)
    await _get_tag_or_404(payload.tag_id, current_user.id, db)

    # Check if already tagged
    existing = await db.execute(
        select(DocumentTag).where(
            DocumentTag.document_id == document_id,
            DocumentTag.tag_id == payload.tag_id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(DocumentTag(document_id=document_id, tag_id=payload.tag_id))
        await db.commit()
    return None


@doc_tags_router.delete("/{document_id}/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_tag_from_document(
    document_id: int,
    tag_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a tag from a document."""
    await _get_document_or_403(document_id, current_user.id, db)
    await _get_tag_or_404(tag_id, current_user.id, db)
    await db.execute(
        delete(DocumentTag).where(
            DocumentTag.document_id == document_id,
            DocumentTag.tag_id == tag_id,
        )
    )
    await db.commit()
    return None


# ---------------------------------------------------------------------------
# BibTeX utilities
# ---------------------------------------------------------------------------

_BIBTEX_SPECIAL = str.maketrans(
    {
        "{": r"\{",
        "}": r"\}",
        "\\": r"\\",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "&": r"\&",
        "^": r"\^{}",
        "_": r"\_",
        "~": r"\~{}",
    }
)


def _escape_bibtex(value: str) -> str:
    """Escape BibTeX special characters."""
    return value.translate(_BIBTEX_SPECIAL)


def _to_ascii_key(text: str) -> str:
    """Normalize unicode string to ASCII-safe key fragment."""
    normalized = unicodedata.normalize("NFKD", text)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", ascii_only.lower())


def _make_bibtex_key(doc: Document, used_keys: set) -> str:
    """Generate a collision-safe BibTeX key for a document."""
    # First author last name
    first_author = ""
    if doc.structured_authors:
        first_author = _to_ascii_key(doc.structured_authors[0]["family"]) or "unknown"
    elif doc.authors:
        raw_first = re.split(r"\s+and\s+|;|,", doc.authors, flags=re.IGNORECASE)[0].strip()
        tokens = raw_first.split()
        first_author = _to_ascii_key(tokens[-1]) if tokens else "unknown"
    else:
        first_author = "unknown"

    # Year
    year_part = str(doc.year) if doc.year else "nd"

    # First word of title
    title_word = ""
    if doc.title:
        words = re.findall(r"[a-zA-Z0-9]+", doc.title)
        title_word = _to_ascii_key(words[0]) if words else "untitled"
    else:
        title_word = "untitled"

    base_key = f"{first_author}_{year_part}_{title_word}"
    key = base_key
    suffix = 1
    while key in used_keys:
        key = f"{base_key}_{suffix}"
        suffix += 1
    used_keys.add(key)
    return key


def _build_bibtex_entry(doc: Document, key: str) -> str:
    """Build a single BibTeX entry string for a document."""
    dtype = (doc.document_type or "article").lower()
    if dtype not in {"article", "book", "inproceedings", "misc"}:
        dtype = "misc"

    lines = [f"@{dtype}{{{key},"]

    def add_field(bib_name: str, value: Optional[str]):
        if value:
            lines.append(f"  {bib_name} = {{{_escape_bibtex(value)}}},")

    add_field("title", doc.title)
    if doc.structured_authors:
        authors = " and ".join(
            f"{a['family']}, {a.get('given', '')}".rstrip(', ')
            for a in doc.structured_authors)
    else:
        authors = re.sub(r"\s*;\s*|\s+and\s+", " and ", doc.authors or "", flags=re.I)
    add_field("author", authors)
    if doc.year:
        lines.append(f"  year = {{{doc.year}}},")
    add_field("abstract", doc.abstract)
    add_field("doi", doc.doi)
    add_field("url", doc.url)

    if dtype == "article":
        add_field("journal", doc.journal)
        add_field("volume", doc.volume)
        add_field("number", doc.issue)
        add_field("pages", doc.pages)
        add_field("publisher", doc.publisher)
    elif dtype == "book":
        add_field("publisher", doc.publisher)
        add_field("volume", doc.volume)
        add_field("pages", doc.pages)
    elif dtype == "inproceedings":
        add_field("booktitle", doc.journal)  # journal field reused for venue
        add_field("pages", doc.pages)
        add_field("publisher", doc.publisher)
    # misc: no specific fields beyond the common ones

    lines.append("}")
    return "\n".join(lines)


def _build_bibtex_file(docs: List[Document]) -> str:
    used_keys: set = set()
    entries = [_build_bibtex_entry(doc, _make_bibtex_key(doc, used_keys)) for doc in docs]
    return "\n\n".join(entries) + "\n"


# BibTeX routes hang off the documents router (included in main.py with doc prefix)
bibtex_router = APIRouter()


@bibtex_router.get("/{document_id}/bibtex")
async def export_single_bibtex(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download BibTeX entry for a single document."""
    doc = await _get_document_or_403(document_id, current_user.id, db)
    used: set = set()
    content = _build_bibtex_entry(doc, _make_bibtex_key(doc, used))
    return Response(
        content=content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="reference.bib"'},
    )


@bibtex_router.post("/bibtex-export")
async def export_bulk_bibtex(
    payload: BulkMembershipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download BibTeX for multiple documents (must all be owned by user)."""
    result = await db.execute(
        select(Document).where(
            Document.id.in_(payload.document_ids),
            Document.user_id == current_user.id,
        )
    )
    docs = result.scalars().all()
    found_ids = {d.id for d in docs}
    missing = set(payload.document_ids) - found_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documents not found or not owned by you: {sorted(missing)}",
        )

    # Preserve requested order
    id_to_doc = {d.id: d for d in docs}
    ordered_docs = [id_to_doc[i] for i in sorted(set(payload.document_ids))]
    content = _build_bibtex_file(ordered_docs)

    return Response(
        content=content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="references.bib"'},
    )
