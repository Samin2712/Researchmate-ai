"""
Document processing service for PDF extraction and metadata
"""
import pymupdf as fitz  # PyMuPDF
from pathlib import Path
from typing import Dict, Optional, List, Tuple
import re
import logging

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Process PDF documents and extract text and metadata"""
    
    def __init__(self):
        self.logger = logger
    
    def extract_text(self, file_path: str) -> Tuple[str, int]:
        """
        Extract all text from PDF
        
        Returns:
            Tuple of (text, page_count)
        """
        try:
            doc = fitz.open(file_path)
            text_parts = []
            page_count = len(doc)
            
            for page_num in range(page_count):
                page = doc[page_num]
                text = page.get_text()
                text_parts.append(text)
            
            doc.close()
            full_text = "\n\n".join(text_parts)
            return full_text, page_count
            
        except Exception as e:
            self.logger.error(f"Error extracting text from {file_path}: {e}")
            raise
    
    def extract_text_by_page(self, file_path: str) -> Dict[int, str]:
        """
        Extract text from PDF, organized by page number
        
        Returns:
            Dictionary mapping page number to text
        """
        try:
            doc = fitz.open(file_path)
            pages_text = {}
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                pages_text[page_num + 1] = text  # 1-indexed pages
            
            doc.close()
            return pages_text
            
        except Exception as e:
            self.logger.error(f"Error extracting text by page from {file_path}: {e}")
            raise
    
    def extract_metadata(self, file_path: str, full_text: str) -> Dict[str, Optional[str]]:
        """
        Extract metadata from PDF (title, authors, year, abstract)
        
        This uses heuristics to find common patterns in academic papers
        """
        metadata = {
            "title": None,
            "authors": None,
            "year": None,
            "abstract": None
        }
        
        try:
            # Try to get metadata from PDF properties first
            doc = fitz.open(file_path)
            pdf_metadata = doc.metadata
            
            if pdf_metadata.get("title"):
                metadata["title"] = pdf_metadata["title"]
            if pdf_metadata.get("author"):
                metadata["authors"] = pdf_metadata["author"]
            
            doc.close()
            
            # If no title from metadata, try to extract from first page
            if not metadata["title"]:
                metadata["title"] = self._extract_title(full_text)
            
            # Extract year
            metadata["year"] = self._extract_year(full_text)
            
            # Extract abstract
            metadata["abstract"] = self._extract_abstract(full_text)
            
            # If no authors from metadata, try to extract
            if not metadata["authors"]:
                metadata["authors"] = self._extract_authors(full_text)
            
        except Exception as e:
            self.logger.warning(f"Error extracting metadata from {file_path}: {e}")
        
        return metadata
    
    def _extract_title(self, text: str) -> Optional[str]:
        """Extract title from document text (usually first large text block)"""
        lines = text.split("\n")
        
        # Look for first non-empty line that's likely a title
        for line in lines[:20]:  # Check first 20 lines
            line = line.strip()
            if len(line) > 10 and len(line) < 200:  # Reasonable title length
                # Avoid lines that look like URLs, emails, or page numbers
                if not re.match(r"^(https?://|www\.|Page \d+|\d+$)", line, re.IGNORECASE):
                    return line
        
        return "Untitled Document"
    
    def _extract_authors(self, text: str) -> Optional[str]:
        """Extract authors from document text"""
        # Look for common author patterns in first 500 characters
        first_part = text[:500]
        
        # Pattern: Name1, Name2, and Name3
        author_pattern = r"([A-Z][a-z]+ [A-Z][a-z]+(?:,? (?:and |& )?[A-Z][a-z]+ [A-Z][a-z]+)*)"
        matches = re.findall(author_pattern, first_part)
        
        if matches:
            return matches[0]
        
        return None
    
    def _extract_year(self, text: str) -> Optional[int]:
        """Extract publication year from document"""
        # Look for 4-digit years between 1900 and current year
        year_pattern = r"\b(19\d{2}|20[0-2]\d)\b"
        matches = re.findall(year_pattern, text[:1000])
        
        if matches:
            # Return the first reasonable year found
            years = [int(y) for y in matches if 1950 <= int(y) <= 2030]
            if years:
                return years[0]
        
        return None
    
    def _extract_abstract(self, text: str) -> Optional[str]:
        """Extract abstract from document"""
        # Look for "Abstract" section
        abstract_pattern = r"(?i)abstract[:\s]*\n(.*?)(?:\n\s*\n|\n(?:1\.|Introduction|Keywords))"
        match = re.search(abstract_pattern, text[:3000], re.DOTALL)
        
        if match:
            abstract = match.group(1).strip()
            # Clean up the abstract
            abstract = re.sub(r"\s+", " ", abstract)
            if len(abstract) > 50:  # Minimum abstract length
                return abstract[:1000]  # Limit abstract length
        
        return None
    
    def get_file_size(self, file_path: str) -> int:
        """Get file size in bytes"""
        return Path(file_path).stat().st_size
    
    def validate_pdf(self, file_path: str) -> bool:
        """
        Validate if file is a readable PDF
        
        Returns:
            True if valid PDF, False otherwise
        """
        try:
            doc = fitz.open(file_path)
            page_count = len(doc)
            doc.close()
            return page_count > 0
        except Exception as e:
            self.logger.error(f"Invalid PDF {file_path}: {e}")
            return False
    
    def process_document(self, file_path: str) -> Dict:
        """
        Process a PDF document completely
        
        Returns:
            Dictionary with extracted data
        """
        from app.core.config import settings
        with fitz.open(file_path) as document:
            if len(document) > settings.MAX_DOCUMENT_PAGES:
                raise ValueError(f'Upload a PDF with at most {settings.MAX_DOCUMENT_PAGES} pages. Split longer documents into smaller files.')
        if not self.validate_pdf(file_path):
            raise ValueError("Invalid or corrupted PDF file")
        
        # Extract text
        full_text, page_count = self.extract_text(file_path)
        
        # Extract metadata
        metadata = self.extract_metadata(file_path, full_text)
        
        # Get file size
        file_size = self.get_file_size(file_path)
        
        # Get text by page for chunking
        pages_text = self.extract_text_by_page(file_path)
        
        return {
            "full_text": full_text,
            "pages_text": pages_text,
            "page_count": page_count,
            "file_size": file_size,
            "title": metadata["title"],
            "authors": metadata["authors"],
            "year": metadata["year"],
            "abstract": metadata["abstract"],
        }


# Global instance
document_processor = DocumentProcessor()
