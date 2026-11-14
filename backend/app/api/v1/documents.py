"""
Document management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pathlib import Path
from collections import defaultdict
import uuid
import logging
import asyncio

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.document import Document, DocumentStatus, CollectionDocument, DocumentTag
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUpdate
)
from app.services.document_processor import document_processor
from app.services.ingestion_pipeline import ingestion_pipeline

router = APIRouter()
logger = logging.getLogger(__name__)
processing_slot = asyncio.Semaphore(1)


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PDF files are allowed. Got: {file_ext}"
        )
    
    # Note: File size check is done during upload


async def process_document_task(document_id: int, file_path: str, user_id: int):
    # Request sessions may close before a background task finishes.
    # Only one document at a time per worker to bound embedding/PDF memory use.
    async with processing_slot:
        async with AsyncSessionLocal() as db:
            await _process_document(document_id, file_path, user_id, db)


async def _process_document(document_id: int, file_path: str, user_id: int, db: AsyncSession):
    """Background task to process uploaded document and generate embeddings"""
    try:
        logger.info(f"Processing document {document_id} through ingestion pipeline")
        
        # Run through complete ingestion pipeline (PDF → Text → Chunks → Embeddings → Vector Store)
        result = await ingestion_pipeline.process_document(
            file_path=file_path,
            document_id=str(document_id),
            user_id=str(user_id),
            db=db
        )
        
        # Update document in database
        doc_result = await db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = doc_result.scalar_one_or_none()
        
        if document and result.get('success'):
            # Update with extracted metadata
            metadata = result.get('metadata', {})
            document.title = metadata.get("title", document.title)
            document.authors = metadata.get("authors", "Unknown")
            document.year = metadata.get("year")
            document.abstract = metadata.get("abstract")
            document.page_count = result.get('pages_processed', 0)
            document.file_size = Path(file_path).stat().st_size
            document.status = DocumentStatus.COMPLETED
            
            await db.commit()
            logger.info(f"✅ Document {document_id} processed: {result.get('chunks_created')} chunks created")
        elif document:
            # Processing failed
            document.status = DocumentStatus.FAILED
            document.error_message = result.get('error', 'Unknown error')
            await db.commit()
            logger.error(f"❌ Document {document_id} processing failed: {result.get('error')}")
        
    except Exception as e:
        logger.error(f"❌ Error processing document {document_id}: {e}")
        await db.rollback()
        
        # Update document with error status
        result = await db.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        
        if document:
            document.status = DocumentStatus.FAILED
            document.error_message = str(e)
            await db.commit()


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a PDF document
    
    The document will be processed in the background to extract text and metadata
    """
    # Validate file
    validate_file(file)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = Path(settings.UPLOAD_DIR) / str(current_user.id) / unique_filename
    
    # Create user directory if it doesn't exist
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save file
    try:
        size = 0
        with file_path.open("wb") as buffer:
            while block := await file.read(64 * 1024):
                size += len(block)
                if size > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(400, f'File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB')
                buffer.write(block)
        with file_path.open('rb') as saved:
            if saved.read(5) != b'%PDF-':
                raise HTTPException(400, 'This file is not a valid PDF.')
    except HTTPException:
        file_path.unlink(missing_ok=True)
        raise
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error saving file"
        )
    finally:
        file.file.close()
    
    # Check file size
    file_size = file_path.stat().st_size
    if file_size > settings.MAX_UPLOAD_SIZE:
        file_path.unlink()  # Delete file
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Create document record
    document = Document(
        user_id=current_user.id,
        title=file.filename,  # Will be updated after processing
        file_path=str(file_path),
        status=DocumentStatus.PROCESSING
    )
    
    db.add(document)
    await db.commit()
    await db.refresh(document)
    
    # Process document in background (with embeddings)
    background_tasks.add_task(process_document_task, document.id, str(file_path), current_user.id)
    
    return document


@router.post('/{document_id}/retry', response_model=DocumentResponse)
async def retry_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(
        Document.id == document_id, Document.user_id == current_user.id,
    ))
    document = result.scalar_one_or_none()
    if document is None:
        raise HTTPException(404, 'Document not found')
    if document.status != DocumentStatus.FAILED:
        raise HTTPException(409, 'Only failed documents can be retried.')
    if not Path(document.file_path).is_file():
        raise HTTPException(409, 'The original PDF is no longer on the server. Delete this entry and upload the PDF again.')
    # A failed attempt may have left index entries or relational chunks behind.
    from sqlalchemy import delete
    from app.models.document import Chunk
    await ingestion_pipeline.delete_document_embeddings(str(document_id))
    await db.execute(delete(Chunk).where(Chunk.document_id == document_id))
    document.status = DocumentStatus.PROCESSING
    document.error_message = None
    await db.commit()
    await db.refresh(document)
    background_tasks.add_task(process_document_task, document.id, document.file_path, current_user.id)
    return document


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    collection_id: Optional[int] = None,
    tag_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all documents for current user, with optional collection and tag filtering
    """
    from app.api.v1.collections import _get_collection_or_404, _get_tag_or_404
    if collection_id is not None:
        await _get_collection_or_404(collection_id, current_user.id, db)
    if tag_id is not None:
        await _get_tag_or_404(tag_id, current_user.id, db)
    query = select(Document).where(Document.user_id == current_user.id)
    count_query = select(func.count(Document.id)).where(Document.user_id == current_user.id)

    if collection_id is not None:
        query = query.join(
            CollectionDocument, CollectionDocument.document_id == Document.id
        ).where(CollectionDocument.collection_id == collection_id)
        count_query = count_query.join(
            CollectionDocument, CollectionDocument.document_id == Document.id
        ).where(CollectionDocument.collection_id == collection_id)

    if tag_id is not None:
        query = query.join(
            DocumentTag, DocumentTag.document_id == Document.id
        ).where(DocumentTag.tag_id == tag_id)
        count_query = count_query.join(
            DocumentTag, DocumentTag.document_id == Document.id
        ).where(DocumentTag.tag_id == tag_id)

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    result = await db.execute(
        query.order_by(Document.created_at.desc(), Document.id.desc())
        .offset(skip)
        .limit(limit)
    )
    documents = result.scalars().all()

    doc_ids = [d.id for d in documents]
    tag_map = defaultdict(list)
    col_map = defaultdict(list)
    if doc_ids:
        tag_rows = await db.execute(
            select(DocumentTag.document_id, DocumentTag.tag_id).where(
                DocumentTag.document_id.in_(doc_ids)
            )
        )
        for d_id, t_id in tag_rows.all():
            tag_map[d_id].append(t_id)

        col_rows = await db.execute(
            select(CollectionDocument.document_id, CollectionDocument.collection_id).where(
                CollectionDocument.document_id.in_(doc_ids)
            )
        )
        for d_id, c_id in col_rows.all():
            col_map[d_id].append(c_id)

    doc_responses = []
    for d in documents:
        resp = DocumentResponse.model_validate(d)
        resp.tag_ids = tag_map[d.id]
        resp.collection_ids = col_map[d.id]
        doc_responses.append(resp)

    return {
        "documents": doc_responses,
        "total": total
    }


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific document
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    tag_rows = await db.execute(
        select(DocumentTag.tag_id).where(DocumentTag.document_id == document.id)
    )
    col_rows = await db.execute(
        select(CollectionDocument.collection_id).where(CollectionDocument.document_id == document.id)
    )
    resp = DocumentResponse.model_validate(document)
    resp.tag_ids = [r[0] for r in tag_rows.all()]
    resp.collection_ids = [r[0] for r in col_rows.all()]
    return resp


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update document metadata
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update fields
    update_data = document_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)
    
    await db.commit()
    await db.refresh(document)

    tag_rows = await db.execute(
        select(DocumentTag.tag_id).where(DocumentTag.document_id == document.id)
    )
    col_rows = await db.execute(
        select(CollectionDocument.collection_id).where(CollectionDocument.document_id == document.id)
    )
    resp = DocumentResponse.model_validate(document)
    resp.tag_ids = [r[0] for r in tag_rows.all()]
    resp.collection_ids = [r[0] for r in col_rows.all()]
    return resp


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a document and its embeddings
    """
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Delete embeddings from vector store
    try:
        await ingestion_pipeline.delete_document_embeddings(str(document_id))
        logger.info(f"🗑️  Deleted embeddings for document {document_id}")
    except Exception as e:
        logger.warning(f"Failed to delete embeddings: {e}")
    
    # Delete file from disk
    try:
        file_path = Path(document.file_path)
        if file_path.exists():
            file_path.unlink()
    except Exception as e:
        logger.error(f"Error deleting file {document.file_path}: {e}")
    
    # Delete from database (chunks will be cascade deleted)
    await db.delete(document)
    await db.commit()
    
    logger.info(f"✅ Deleted document {document_id}")
    return None
