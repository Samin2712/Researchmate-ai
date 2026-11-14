"""
Evidence notebook API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional, List

from app.services.evidence import pdf_bytes, refresh_revision, resolve_evidence
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, EvidenceNote, Document, Collection
from app.schemas.evidence import (
    EvidenceNoteCreate,
    EvidenceNoteUpdate,
    EvidenceNoteResponse,
    EvidenceNoteListResponse,
    EvidenceExportRequest,
)

router = APIRouter()


@router.post("/notes", response_model=EvidenceNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_evidence_note(
    note_data: EvidenceNoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new evidence note with source reference"""

    # Validate document ownership
    doc_query = await db.execute(
        select(Document).where(
            and_(
                Document.id == note_data.document_id,
                Document.user_id == current_user.id
            )
        )
    )
    document = doc_query.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
        )

    resolved = await resolve_evidence(db, document, note_data.page_number, note_data.chunk_id, note_data.source_quote)
    if not resolved['source_quote'] or resolved['source_quote'] != note_data.source_quote:
        raise HTTPException(400, 'Save an exact source quote from the verification panel')
    await refresh_revision(db, document)

    # Validate collection if provided
    if note_data.collection_id:
        coll_query = await db.execute(
            select(Collection).where(
                and_(
                    Collection.id == note_data.collection_id,
                    Collection.user_id == current_user.id
                )
            )
        )
        collection = coll_query.scalar_one_or_none()
        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found or access denied"
            )

    # Create evidence note
    evidence_note = EvidenceNote(
        user_id=current_user.id,
        collection_id=note_data.collection_id,
        document_id=note_data.document_id,
        chunk_id=resolved["chunk_id"],
        page_number=resolved["page_number"],
        page_label=resolved["page_label"],
        source_quote=note_data.source_quote,
        document_title=document.title,
        document_authors=document.authors,
        title=note_data.title,
        note=note_data.note,
        tags=note_data.tags,
        quote_bounds=None,
        content_hash=document.content_hash,
        is_stale=0,
    )

    db.add(evidence_note)
    await db.commit()
    await db.refresh(evidence_note)

    return evidence_note


@router.get("/notes", response_model=EvidenceNoteListResponse)
async def list_evidence_notes(
    page: int = 1,
    page_size: int = 50,
    collection_id: Optional[int] = None,
    document_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's evidence notes with pagination and filtering"""

    if page < 1 or page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid pagination parameters"
        )

    # Build query
    query = select(EvidenceNote).where(EvidenceNote.user_id == current_user.id)

    if collection_id:
        query = query.where(EvidenceNote.collection_id == collection_id)

    if document_id:
        query = query.where(EvidenceNote.document_id == document_id)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (EvidenceNote.title.ilike(search_pattern)) |
            (EvidenceNote.note.ilike(search_pattern)) |
            (EvidenceNote.source_quote.ilike(search_pattern))
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(EvidenceNote.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    notes = result.scalars().all()
    for document_id in {note.document_id for note in notes if note.document_id}:
        document = await db.get(Document, document_id)
        if document and document.user_id == current_user.id:
            try:
                await refresh_revision(db, document)
            except HTTPException:
                for note in notes:
                    if note.document_id == document_id:
                        note.is_stale = 1
    await db.commit()

    for note in notes:
        await db.refresh(note)

    return EvidenceNoteListResponse(
        items=notes,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/notes/{note_id}", response_model=EvidenceNoteResponse)
async def get_evidence_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific evidence note"""

    query = await db.execute(
        select(EvidenceNote).where(
            and_(
                EvidenceNote.id == note_id,
                EvidenceNote.user_id == current_user.id
            )
        )
    )
    note = query.scalar_one_or_none()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence note not found"
        )

    return note


@router.patch("/notes/{note_id}", response_model=EvidenceNoteResponse)
async def update_evidence_note(
    note_id: int,
    note_update: EvidenceNoteUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an evidence note (only editable fields)"""

    query = await db.execute(
        select(EvidenceNote).where(
            and_(
                EvidenceNote.id == note_id,
                EvidenceNote.user_id == current_user.id
            )
        )
    )
    note = query.scalar_one_or_none()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence note not found"
        )

    # Validate collection if changed
    if note_update.collection_id is not None and note_update.collection_id != note.collection_id:
        coll_query = await db.execute(
            select(Collection).where(
                and_(
                    Collection.id == note_update.collection_id,
                    Collection.user_id == current_user.id
                )
            )
        )
        collection = coll_query.scalar_one_or_none()
        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found or access denied"
            )

    # Update only editable fields
    for field, value in note_update.model_dump(exclude_unset=True).items():
        setattr(note, field, value)

    await db.commit()
    await db.refresh(note)

    return note


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evidence_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an evidence note"""

    query = await db.execute(
        select(EvidenceNote).where(
            and_(
                EvidenceNote.id == note_id,
                EvidenceNote.user_id == current_user.id
            )
        )
    )
    note = query.scalar_one_or_none()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence note not found"
        )

    await db.delete(note)
    await db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/notes/export")
async def export_evidence_notes(
    export_request: EvidenceExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export selected evidence notes as Markdown"""

    # Fetch requested notes
    query = await db.execute(
        select(EvidenceNote).where(
            and_(
                EvidenceNote.id.in_(export_request.note_ids),
                EvidenceNote.user_id == current_user.id
            )
        ).order_by(EvidenceNote.created_at)
    )
    notes = query.scalars().all()

    if len(notes) != len(export_request.note_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Some notes were not found"
        )

    # Build Markdown content
    markdown_lines = ["# Evidence Notebook Export\n"]

    if export_request.include_collection_info:
        # Group by collection
        collections_map = {}
        for note in notes:
            coll_id = note.collection_id or "uncategorized"
            if coll_id not in collections_map:
                collections_map[coll_id] = []
            collections_map[coll_id].append(note)

        for coll_id, coll_notes in collections_map.items():
            if coll_id != "uncategorized":
                # Fetch collection name
                coll_query = await db.execute(
                    select(Collection).where(Collection.id == coll_id)
                )
                collection = coll_query.scalar_one_or_none()
                markdown_lines.append(f"\n## Collection: {collection.name if collection else 'Unknown'}\n")
            else:
                markdown_lines.append("\n## Uncategorized\n")

            for note in coll_notes:
                markdown_lines.extend(_format_note_markdown(note))
    else:
        for note in notes:
            markdown_lines.extend(_format_note_markdown(note))

    markdown_content = "\n".join(markdown_lines)

    return StreamingResponse(
        iter([markdown_content.encode('utf-8')]),
        media_type="text/markdown",
        headers={
            "Content-Disposition": "attachment; filename=evidence_export.md"
        }
    )


def _format_note_markdown(note: EvidenceNote) -> List[str]:
    """Format a single evidence note as Markdown"""
    lines = []

    # Title
    title = note.title or "Untitled Evidence"
    lines.append(f"\n### {title}\n")

    # Source info
    source_parts = []
    if note.document_title:
        source_parts.append(note.document_title)
    if note.document_authors:
        source_parts.append(f"by {note.document_authors}")
    if note.page_number:
        page_ref = note.page_label or str(note.page_number)
        source_parts.append(f"Page {page_ref}")

    if source_parts:
        lines.append(f"**Source:** {', '.join(source_parts)}\n")

    # Quote (preserve exact text)
    lines.append("**Quote:**")
    lines.append("\n".join("> " + line for line in note.source_quote.split("\n")) + "\n")

    # User note
    if note.note:
        lines.append("**Note:**")
        lines.append(f"{note.note}\n")

    # Tags
    if note.tags:
        tags_str = ", ".join(f"`{tag}`" for tag in note.tags)
        lines.append(f"**Tags:** {tags_str}\n")

    # Stale warning
    if note.is_stale:
        lines.append("⚠️ *Warning: Source document may have been modified since this evidence was saved.*\n")

    lines.append("---\n")

    return lines


@router.get("/documents/{document_id}/pdf")
async def get_document_pdf(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch the original PDF file for authenticated user"""

    # Validate ownership
    query = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id
            )
        )
    )
    document = query.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
        )

    data = pdf_bytes(document)
    return Response(content=data, media_type="application/pdf", headers={
        "Content-Disposition": 'inline; filename="source.pdf"',
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    })



@router.get("/documents/{document_id}/evidence-detail")
async def get_evidence_detail(
    document_id: int,
    page_number: Optional[int] = None,
    chunk_id: Optional[int] = None,
    quote: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed evidence information for verification"""

    # Validate ownership
    query = await db.execute(
        select(Document).where(
            and_(
                Document.id == document_id,
                Document.user_id == current_user.id
            )
        )
    )
    document = query.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
        )

    resolved = await resolve_evidence(db, document, page_number, chunk_id, quote)
    revision = await refresh_revision(db, document)
    await db.commit()
    return {
        "document_id": document.id, "document_title": document.title,
        "document_authors": document.authors, "page_count": document.page_count,
        "content_hash": revision, **resolved,
    }
