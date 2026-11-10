"""
Text Chunking Service - Smart document chunking
Splits documents into manageable chunks with overlap
"""
import logging
import re
from typing import List, Dict, Any
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """Represents a text chunk with metadata"""
    text: str
    page_number: int
    chunk_index: int
    start_char: int
    end_char: int
    metadata: Dict[str, Any]


class TextChunker:
    """
    Smart text chunking with overlap
    Preserves page numbers and section context
    """
    
    def __init__(
        self,
        chunk_size: int = None,
        chunk_overlap: int = None
    ):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        logger.info(f"📄 Text Chunker initialized: size={self.chunk_size}, overlap={self.chunk_overlap}")
    
    def _estimate_tokens(self, text: str) -> int:
        """
        Estimate token count (rough approximation)
        1 token ≈ 4 characters
        """
        return len(text) // 4
    
    def _split_by_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Simple sentence splitter (can be improved with nltk/spacy)
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _find_section_headers(self, text: str) -> List[tuple]:
        """
        Find potential section headers in text
        Returns list of (position, header_text) tuples
        """
        headers = []
        # Pattern for section headers (all caps, short lines, etc.)
        patterns = [
            r'^[A-Z][A-Z\s]{3,50}$',  # ALL CAPS headers
            r'^\d+\.\s+[A-Z].*$',      # Numbered sections
            r'^[IVX]+\.\s+[A-Z].*$',   # Roman numeral sections
        ]
        
        lines = text.split('\n')
        position = 0
        for line in lines:
            line_stripped = line.strip()
            for pattern in patterns:
                if re.match(pattern, line_stripped):
                    headers.append((position, line_stripped))
                    break
            position += len(line) + 1
        
        return headers
    
    def chunk_text(
        self,
        text: str,
        page_number: int = 0,
        document_metadata: Dict[str, Any] = None
    ) -> List[Chunk]:
        """
        Chunk a single page or text block
        
        Args:
            text: Text to chunk
            page_number: Page number for this text
            document_metadata: Additional metadata to include
        
        Returns:
            List of Chunk objects
        """
        if not text or not text.strip():
            return []
        
        chunks = []
        sentences = self._split_by_sentences(text)
        
        current_chunk = ""
        current_start = 0
        chunk_index = 0
        
        for sentence in sentences:
            # Check if adding this sentence would exceed chunk size
            potential_chunk = current_chunk + " " + sentence if current_chunk else sentence
            
            if self._estimate_tokens(potential_chunk) > self.chunk_size:
                # Save current chunk if it's not empty
                if current_chunk:
                    chunk = Chunk(
                        text=current_chunk.strip(),
                        page_number=page_number,
                        chunk_index=chunk_index,
                        start_char=current_start,
                        end_char=current_start + len(current_chunk),
                        metadata=document_metadata or {}
                    )
                    chunks.append(chunk)
                    chunk_index += 1
                    
                    # Calculate overlap for next chunk
                    overlap_text = current_chunk[-self.chunk_overlap * 4:]  # Approx chars
                    current_chunk = overlap_text + " " + sentence
                    current_start = current_start + len(current_chunk) - len(overlap_text)
                else:
                    # Single sentence is too long, include it anyway
                    current_chunk = sentence
            else:
                current_chunk = potential_chunk
        
        # Add the last chunk
        if current_chunk.strip():
            chunk = Chunk(
                text=current_chunk.strip(),
                page_number=page_number,
                chunk_index=chunk_index,
                start_char=current_start,
                end_char=current_start + len(current_chunk),
                metadata=document_metadata or {}
            )
            chunks.append(chunk)
        
        return chunks
    
    def chunk_document(
        self,
        pages: List[Dict[str, Any]],
        document_metadata: Dict[str, Any] = None
    ) -> List[Chunk]:
        """
        Chunk an entire document with multiple pages
        
        Args:
            pages: List of page dicts with 'text' and 'page_number' keys
            document_metadata: Metadata for the entire document
        
        Returns:
            List of all chunks from all pages
        """
        all_chunks = []
        
        for page in pages:
            page_text = page.get('text', '')
            page_number = page.get('page_number', 0)
            
            # Merge document and page metadata
            chunk_metadata = document_metadata.copy() if document_metadata else {}
            chunk_metadata.update({
                'page_number': page_number,
                'page_metadata': page.get('metadata', {})
            })
            
            # Chunk this page
            page_chunks = self.chunk_text(
                text=page_text,
                page_number=page_number,
                document_metadata=chunk_metadata
            )
            
            all_chunks.extend(page_chunks)
        
        logger.info(f"✅ Chunked document: {len(pages)} pages → {len(all_chunks)} chunks")
        return all_chunks
    
    def chunk_with_headers(
        self,
        text: str,
        document_metadata: Dict[str, Any] = None
    ) -> List[Chunk]:
        """
        Advanced chunking that respects section headers
        Tries to keep sections together when possible
        """
        headers = self._find_section_headers(text)
        
        if not headers:
            # No headers found, use regular chunking
            return self.chunk_text(text, 0, document_metadata)
        
        chunks = []
        chunk_index = 0
        
        # Split by sections
        for i, (pos, header) in enumerate(headers):
            # Get text for this section
            next_pos = headers[i + 1][0] if i + 1 < len(headers) else len(text)
            section_text = text[pos:next_pos]
            
            # Chunk this section
            section_metadata = document_metadata.copy() if document_metadata else {}
            section_metadata['section_header'] = header
            
            section_chunks = self.chunk_text(
                text=section_text,
                page_number=0,
                document_metadata=section_metadata
            )
            
            # Update chunk indices
            for chunk in section_chunks:
                chunk.chunk_index = chunk_index
                chunk_index += 1
                chunks.append(chunk)
        
        return chunks
    
    def get_chunk_stats(self, chunks: List[Chunk]) -> Dict[str, Any]:
        """Get statistics about chunks"""
        if not chunks:
            return {
                "total_chunks": 0,
                "avg_length": 0,
                "min_length": 0,
                "max_length": 0
            }
        
        lengths = [len(chunk.text) for chunk in chunks]
        return {
            "total_chunks": len(chunks),
            "avg_length": sum(lengths) // len(lengths),
            "min_length": min(lengths),
            "max_length": max(lengths),
            "avg_tokens": sum(self._estimate_tokens(c.text) for c in chunks) // len(chunks)
        }


# Global chunker instance
chunker = TextChunker()
