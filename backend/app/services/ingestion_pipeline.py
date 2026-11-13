"""
Document Ingestion Pipeline
Orchestrates: PDF → Text → Chunks → Embeddings → Vector Store
"""
import logging
import asyncio
from typing import Dict, Any, Optional, Callable
from pathlib import Path
from datetime import datetime
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.document_processor import document_processor
from app.services.chunker import chunker, Chunk
from app.services.embedder import embedder
from app.services.vector_store import vector_store
from app.models.document import Document
from app.core.database import AsyncSessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    Document ingestion pipeline with async processing
    Handles large documents efficiently
    """
    
    def __init__(self):
        self.status_callbacks = []
    
    def add_status_callback(self, callback: Callable[[str, float], None]):
        """Add a callback for progress updates"""
        self.status_callbacks.append(callback)
    
    async def _update_status(self, message: str, progress: float):
        """Send status update to all callbacks"""
        logger.info(f"📊 [{progress:.0%}] {message}")
        for callback in self.status_callbacks:
            try:
                await callback(message, progress)
            except Exception as e:
                logger.warning(f"Status callback failed: {e}")
    
    async def process_document(
        self,
        file_path: str,
        document_id: str,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Process a PDF document through the complete pipeline
        
        Args:
            file_path: Path to PDF file
            document_id: Document ID in database
            user_id: User ID who uploaded the document
            db: Database session
        
        Returns:
            Processing result with statistics
        """
        start_time = datetime.utcnow()
        
        try:
            # Step 1: Extract text and metadata
            await self._update_status("Extracting text from PDF...", 0.1)
            
            extracted = await asyncio.to_thread(document_processor.process_document, file_path)
            pages = [{'page_number': number, 'text': text} for number, text in extracted['pages_text'].items()]
            metadata = {key: extracted[key] for key in ('title', 'authors', 'year', 'abstract')}
            metadata['title'] = metadata['title'] or Path(file_path).name
            metadata['authors'] = metadata['authors'] or 'Unknown'
            
            if not pages:
                raise ValueError("No text extracted from PDF")
            
            await self._update_status(f"Extracted {len(pages)} pages", 0.2)
            
            # Step 2: Chunk the document
            await self._update_status("Chunking document...", 0.3)
            
            document_metadata = {
                "document_id": document_id,
                "user_id": user_id,
                "title": metadata.get("title", "Unknown"),
                "authors": metadata.get("authors", "Unknown"),
                "year": metadata.get("year", "Unknown"),
            }
            
            chunks = await asyncio.to_thread(
                chunker.chunk_document,
                pages,
                document_metadata
            )

            if not chunks:
                raise ValueError('No readable text was found. Upload a text-based PDF rather than a scanned image.')
            if len(chunks) > settings.MAX_DOCUMENT_CHUNKS:
                raise ValueError(f'This PDF is too large to process. Use fewer than {settings.MAX_DOCUMENT_CHUNKS} text chunks or split it into smaller PDFs.')
            
            await self._update_status(f"Created {len(chunks)} chunks", 0.4)
            
            # Step 3: Generate embeddings
            await self._update_status("Generating embeddings...", 0.5)
            
            chunk_texts = [chunk.text for chunk in chunks]
            embeddings = await asyncio.to_thread(
                embedder.embed_documents,
                chunk_texts,
                batch_size=settings.EMBEDDING_BATCH_SIZE
            )
            
            await self._update_status(f"Generated {len(embeddings)} embeddings", 0.7)
            
            # Step 4: Store in vector database
            await self._update_status("Storing in vector database...", 0.8)
            
            # Prepare data for vector store
            chunk_ids = [f"{document_id}_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "document_id": document_id,
                    "user_id": user_id,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "title": metadata.get("title", "Unknown"),
                    "authors": metadata.get("authors", "Unknown"),
                    "year": str(metadata.get("year", "Unknown")),
                }
                for chunk in chunks
            ]
            
            # Add to vector store
            success = await asyncio.to_thread(
                vector_store.add_documents,
                texts=chunk_texts,
                embeddings=embeddings,
                metadatas=metadatas,
                ids=chunk_ids
            )
            
            if not success:
                raise Exception("Failed to add documents to vector store")

            # Keep relational chunks in sync with the vector index.
            from app.models.document import Chunk as DocumentChunk
            db.add_all([
                DocumentChunk(document_id=int(document_id), text=chunk.text,
                              page_number=chunk.page_number, chunk_index=index, vector_id=chunk_ids[index])
                for index, chunk in enumerate(chunks)
            ])
            await db.flush()
            
            await self._update_status("Document processed successfully!", 1.0)
            
            # Calculate statistics
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            stats = chunker.get_chunk_stats(chunks)
            
            result = {
                "success": True,
                "document_id": document_id,
                "pages_processed": len(pages),
                "chunks_created": len(chunks),
                "embeddings_generated": len(embeddings),
                "processing_time_seconds": processing_time,
                "chunk_stats": stats,
                "metadata": metadata
            }
            
            logger.info(f"✅ Document processed successfully: {document_id}")
            logger.info(f"📊 Stats: {len(pages)} pages → {len(chunks)} chunks in {processing_time:.2f}s")
            
            return result
        
        except Exception as e:
            logger.error(f"❌ Pipeline failed for document {document_id}: {e}")
            await self._update_status(f"Error: {str(e)}", 0.0)
            
            return {
                "success": False,
                "document_id": document_id,
                "error": str(e),
                "processing_time_seconds": (datetime.utcnow() - start_time).total_seconds()
            }
    
    async def reindex_document(
        self,
        document_id: str,
        file_path: str,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Reindex an existing document (update embeddings)
        
        Args:
            document_id: Document ID to reindex
            file_path: Path to PDF file
            user_id: User ID
            db: Database session
        
        Returns:
            Processing result
        """
        try:
            # Delete existing vectors
            await self._update_status("Removing old embeddings...", 0.1)
            await asyncio.to_thread(vector_store.delete_by_document_id, document_id)
            
            # Reprocess
            result = await self.process_document(file_path, document_id, user_id, db)
            
            return result
        
        except Exception as e:
            logger.error(f"Failed to reindex document {document_id}: {e}")
            return {
                "success": False,
                "document_id": document_id,
                "error": str(e)
            }
    
    async def delete_document_embeddings(self, document_id: str) -> bool:
        """
        Delete all embeddings for a document
        
        Args:
            document_id: Document ID to delete
        
        Returns:
            Success status
        """
        try:
            await asyncio.to_thread(vector_store.delete_by_document_id, document_id)
            logger.info(f"🗑️  Deleted embeddings for document: {document_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete embeddings: {e}")
            return False
    
    async def get_pipeline_status(self) -> Dict[str, Any]:
        """Get current pipeline status and statistics"""
        try:
            vector_stats = await asyncio.to_thread(vector_store.get_collection_stats)
            
            return {
                "status": "healthy",
                "vector_store": vector_stats,
                "chunker": {
                    "chunk_size": chunker.chunk_size,
                    "chunk_overlap": chunker.chunk_overlap
                },
                "embedder": {
                    "model": embedder.model_name,
                    "dimension": embedder.get_embedding_dimension()
                }
            }
        except Exception as e:
            logger.error(f"Failed to get pipeline status: {e}")
            return {
                "status": "error",
                "error": str(e)
            }


# Global pipeline instance
ingestion_pipeline = IngestionPipeline()
