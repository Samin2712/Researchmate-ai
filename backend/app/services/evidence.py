"""Owned document provenance. Physical pages are 1-based; rectangles normalized.

Only unique, exact page text receives geometry. Repeated passages and normalized
chunk text deliberately fall back to page navigation without a highlight.
"""
from pathlib import Path
import hashlib
import fitz
from fastapi import HTTPException
from sqlalchemy import select, update
from app.core.config import settings
from app.models import Chunk, EvidenceNote


def pdf_path(document):
    path = Path(document.file_path).resolve()
    if not path.is_relative_to(Path(settings.UPLOAD_DIR).resolve()):
        raise HTTPException(403, 'Access denied')
    if not path.is_file() and document.pdf_content is None:
        raise HTTPException(404, 'Original PDF unavailable on server; upload it again to verify.')
    return path


def pdf_bytes(document):
    path = pdf_path(document)
    return path.read_bytes() if path.is_file() else document.pdf_content


async def refresh_revision(db, document):
    data = pdf_bytes(document)
    revision = hashlib.sha256(data).hexdigest()
    document.pdf_content = data
    await db.execute(update(EvidenceNote).where(
        EvidenceNote.document_id == document.id,
        (EvidenceNote.content_hash != revision) | EvidenceNote.content_hash.is_(None),
    ).values(is_stale=1))
    document.content_hash = revision
    return revision


async def resolve_evidence(db, document, page_number=None, chunk_id=None, quote=None):
    chunk = None
    if chunk_id is not None:
        chunk = (await db.execute(select(Chunk).where(
            Chunk.id == chunk_id, Chunk.document_id == document.id,
        ))).scalar_one_or_none()
        if chunk is None:
            raise HTTPException(400, 'Invalid chunk for this document')
        if page_number is not None and page_number != chunk.page_number:
            raise HTTPException(400, 'Page does not match chunk')
        page_number = chunk.page_number
        if quote is not None and quote not in chunk.text:
            raise HTTPException(400, 'Quote is not verbatim source evidence')
        quote = quote if quote is not None else chunk.text
    if page_number is None:
        return dict(page_number=None, source_quote=None, chunk_id=None,
                    highlight_status='unknown_page', rects=[], page_label=None)
    data = pdf_bytes(document)
    try:
        with fitz.open(stream=data, filetype='pdf') as pdf:
            if page_number < 1 or page_number > len(pdf):
                raise HTTPException(400, 'Invalid physical page number')
            page = pdf[page_number - 1]
            text = page.get_text()
            if not text.strip():
                return dict(page_number=page_number, source_quote=None, chunk_id=None,
                            highlight_status='no_extractable_text', rects=[], page_label=page.get_label() or None)
            # Resolve old truncated citations only through a unique stored chunk on
            # this document/page. Never strip ellipses when accepting saved quotes.
            if chunk is None and quote:
                candidates = (await db.execute(select(Chunk).where(
                    Chunk.document_id == document.id, Chunk.page_number == page_number,
                ))).scalars().all()
                prefix = quote[:-3] if quote.endswith('...') else quote
                matches = [c for c in candidates if c.text.startswith(prefix)]
                if len(matches) == 1:
                    chunk = matches[0]
                    quote = chunk.text
            if quote is None:
                quote = text
            # Chunker normalizes whitespace. A chunk is an exact stored extraction
            # snapshot, not a generated claim. Geometry requires exact page match.
            valid = quote in text or (
                chunk is not None and quote in chunk.text
                and ' '.join(quote.split()) in ' '.join(text.split())
            )
            if not valid:
                raise HTTPException(400, 'Quote is not verbatim source evidence')
            rects = []
            status = 'unavailable'
            if text.count(quote) == 1:
                boxes = page.search_for(quote)
                if boxes and not page.rotation:
                    rects = [dict(x=r.x0/page.rect.width, y=r.y0/page.rect.height,
                                  width=r.width/page.rect.width, height=r.height/page.rect.height) for r in boxes]
                    status = 'available'
            elif text.count(quote) > 1:
                status = 'ambiguous'
            return dict(page_number=page_number, source_quote=quote,
                        chunk_id=chunk.id if chunk else None,
                        highlight_status=status, rects=rects, page_label=page.get_label() or None)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, 'PDF cannot be read')
