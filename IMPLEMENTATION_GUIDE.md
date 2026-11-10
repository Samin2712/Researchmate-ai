# 🚀 ResearchMate AI - Implementation Guide

## Quick Start

This guide walks you through implementing ResearchMate AI from scratch, following our 4-week roadmap.

---

## Prerequisites

### Required Software
- **Python 3.11+**
- **Node.js 18+** with npm/yarn
- **Git**
- **PostgreSQL 15+** (or use Docker)
- **Redis** (optional, for caching)

### API Keys
- **OpenAI API Key** (required) - Get at https://platform.openai.com
- **Anthropic API Key** (optional fallback) - Get at https://console.anthropic.com

### Skills Needed
- Basic Python (async/await, classes)
- Basic React (hooks, components)
- REST API concepts
- Git version control

---

## Week 1: Foundation Setup

### Day 1-2: Project Initialization

#### Step 1: Create Project Structure

```bash
# Create main directory
mkdir researchmate-ai
cd researchmate-ai

# Initialize git
git init
git branch -M main

# Create structure
mkdir -p frontend backend docs scripts tests

# Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
.env
venv/
*.db
*.db-journal

# Node
node_modules/
dist/
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Data
data/
uploads/
*.pdf
chroma/
EOF

# Create README
cat > README.md << 'EOF'
# ResearchMate AI

Your AI-powered research companion that transforms how students discover, understand, and synthesize academic knowledge.

## Setup

See [docs/setup.md](docs/setup.md) for installation instructions.

## Features

- 📄 PDF upload and processing
- 💬 Natural language Q&A about your papers
- 🔍 Intelligent semantic search
- 📚 Literature review generation
- 🌐 Knowledge graph visualization
- 📝 Citation management

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Python
- AI: OpenAI GPT-4, LangChain, ChromaDB
- Database: PostgreSQL + ChromaDB

## License

MIT License - see LICENSE file
EOF
```

#### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << 'EOF'
# Core Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
asyncpg==0.29.0

# AI/ML
openai==1.3.5
anthropic==0.7.0
langchain==0.0.335
sentence-transformers==2.2.2
chromadb==0.4.18
tiktoken==0.5.1

# PDF Processing
PyMuPDF==1.23.7
pdfplumber==0.10.3

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6

# Utilities
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
aiofiles==23.2.1
redis==5.0.1

# Development
pytest==7.4.3
pytest-asyncio==0.21.1
black==23.11.0
flake8==6.1.0
mypy==1.7.1
EOF

# Install dependencies
pip install -r requirements.txt

# Create project structure
mkdir -p app/{api/v1,core,models,schemas,services/{rag},utils}
touch app/__init__.py
touch app/api/__init__.py
touch app/api/v1/__init__.py

# Create .env.example
cat > .env.example << 'EOF'
# API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/researchmate
TEST_DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/researchmate_test

# JWT
SECRET_KEY=your-secret-key-generate-with-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# App Config
UPLOAD_DIR=./uploads
CHROMA_DIR=./data/chroma
MAX_UPLOAD_SIZE=10485760  # 10MB

# Environment
ENVIRONMENT=development
DEBUG=True
EOF
```

#### Step 3: Frontend Setup

```bash
cd ../frontend

# Create Vite + React + TypeScript project
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install additional packages
npm install \
  @tanstack/react-query \
  axios \
  zustand \
  react-router-dom \
  react-markdown \
  react-syntax-highlighter \
  @headlessui/react \
  @heroicons/react \
  clsx \
  tailwind-merge

# Install dev dependencies
npm install -D \
  tailwindcss \
  postcss \
  autoprefixer \
  @types/react-syntax-highlighter

# Initialize Tailwind
npx tailwindcss init -p

# Update tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
EOF

# Create .env.example
cat > .env.example << 'EOF'
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
EOF

# Create directory structure
mkdir -p src/{components/{chat,documents,knowledge-graph,shared},pages,hooks,services,store,utils,types}
```

### Day 3-4: Document Processing Pipeline

#### Backend: Document Processor

```python
# app/services/document_processor.py

import PyMuPDF as fitz
import pdfplumber
from pathlib import Path
from typing import Dict, List, Optional
import re

class DocumentProcessor:
    """Process PDF documents and extract text + metadata"""
    
    def __init__(self, upload_dir: str = "./uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
    
    async def process_pdf(self, file_path: Path) -> Dict:
        """
        Extract text and metadata from PDF
        
        Returns:
            {
                'text': str,
                'metadata': {
                    'title': str,
                    'authors': List[str],
                    'year': int,
                    'abstract': str,
                    'page_count': int,
                }
            }
        """
        # Extract text with PyMuPDF
        text = self._extract_text_pymupdf(file_path)
        
        # Extract metadata
        metadata = self._extract_metadata(file_path, text)
        
        return {
            'text': text,
            'metadata': metadata
        }
    
    def _extract_text_pymupdf(self, file_path: Path) -> str:
        """Extract text using PyMuPDF (fast)"""
        doc = fitz.open(file_path)
        text_parts = []
        
        for page_num, page in enumerate(doc, start=1):
            page_text = page.get_text()
            # Add page marker for citation purposes
            text_parts.append(f"\n[Page {page_num}]\n{page_text}")
        
        doc.close()
        return "\n\n".join(text_parts)
    
    def _extract_metadata(self, file_path: Path, text: str) -> Dict:
        """Extract metadata from PDF and text"""
        doc = fitz.open(file_path)
        
        # Get PDF metadata
        pdf_metadata = doc.metadata
        page_count = len(doc)
        doc.close()
        
        # Extract title (from PDF metadata or first lines)
        title = pdf_metadata.get('title', '') or self._extract_title(text)
        
        # Extract authors
        authors = self._extract_authors(text)
        
        # Extract year
        year = self._extract_year(text)
        
        # Extract abstract
        abstract = self._extract_abstract(text)
        
        return {
            'title': title,
            'authors': authors,
            'year': year,
            'abstract': abstract,
            'page_count': page_count,
        }
    
    def _extract_title(self, text: str) -> str:
        """Extract title from beginning of paper"""
        lines = text.split('\n')[:10]
        
        # Title is usually one of the first few lines
        # Look for longest line that's not all caps
        candidates = [
            line.strip() 
            for line in lines 
            if len(line.strip()) > 10 and not line.isupper()
        ]
        
        if candidates:
            return max(candidates, key=len)[:200]  # Limit length
        return "Untitled Document"
    
    def _extract_authors(self, text: str) -> List[str]:
        """Extract author names"""
        # Look for common author patterns
        author_patterns = [
            r'(?:by|By|BY)\s+((?:[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+and\s+)?)+)',
            r'([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)',
        ]
        
        authors = []
        for pattern in author_patterns:
            matches = re.findall(pattern, text[:1000])
            if matches:
                authors.extend(matches)
                break
        
        return authors[:5] if authors else ["Unknown Author"]
    
    def _extract_year(self, text: str) -> Optional[int]:
        """Extract publication year"""
        # Look for 4-digit years (1900-2099)
        years = re.findall(r'\b(19\d{2}|20\d{2})\b', text[:2000])
        
        if years:
            # Return most recent plausible year
            return int(max(years, key=lambda y: int(y)))
        return None
    
    def _extract_abstract(self, text: str) -> str:
        """Extract abstract section"""
        # Look for abstract section
        abstract_pattern = r'(?i)abstract\s*[\n:]\s*(.{100,1500}?)(?:\n\n|\n[A-Z]|Introduction|Keywords)'
        
        match = re.search(abstract_pattern, text)
        if match:
            return match.group(1).strip()
        
        # Fallback: use first paragraph
        paragraphs = text.split('\n\n')
        for para in paragraphs:
            if len(para) > 100:
                return para[:500] + "..."
        
        return ""
```

#### Backend: Text Chunker

```python
# app/services/chunker.py

from typing import List, Dict
import re

class TextChunker:
    """Intelligently chunk documents for RAG"""
    
    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        separator: str = "\n\n"
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separator = separator
    
    def chunk_text(self, text: str) -> List[Dict]:
        """
        Split text into overlapping chunks
        
        Returns:
            List of chunks with metadata:
            [
                {
                    'text': str,
                    'chunk_index': int,
                    'page_number': int (if available),
                    'start_char': int,
                    'end_char': int,
                }
            ]
        """
        # Split by pages first
        page_pattern = r'\[Page (\d+)\]'
        pages = re.split(page_pattern, text)
        
        chunks = []
        char_position = 0
        
        for i in range(1, len(pages), 2):
            page_num = int(pages[i])
            page_text = pages[i + 1] if i + 1 < len(pages) else ""
            
            # Split page into chunks
            page_chunks = self._split_text(page_text)
            
            for chunk_text in page_chunks:
                chunks.append({
                    'text': chunk_text,
                    'chunk_index': len(chunks),
                    'page_number': page_num,
                    'start_char': char_position,
                    'end_char': char_position + len(chunk_text),
                })
                char_position += len(chunk_text)
        
        return chunks
    
    def _split_text(self, text: str) -> List[str]:
        """Split text using recursive strategy"""
        chunks = []
        
        # Try to split by paragraphs first
        paragraphs = text.split(self.separator)
        
        current_chunk = ""
        for para in paragraphs:
            # If adding this paragraph exceeds chunk size
            if len(current_chunk) + len(para) > self.chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                
                # If paragraph itself is too long, split it
                if len(para) > self.chunk_size:
                    chunks.extend(self._split_long_paragraph(para))
                    current_chunk = ""
                else:
                    # Start new chunk with overlap
                    if chunks:
                        overlap_text = chunks[-1][-self.chunk_overlap:]
                        current_chunk = overlap_text + " " + para
                    else:
                        current_chunk = para
            else:
                current_chunk += self.separator + para if current_chunk else para
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _split_long_paragraph(self, text: str) -> List[str]:
        """Split a paragraph that's longer than chunk_size"""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) > self.chunk_size:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    
                    # Add overlap
                    overlap = current_chunk[-self.chunk_overlap:]
                    current_chunk = overlap + " " + sentence
                else:
                    # Sentence itself is too long, split by words
                    chunks.append(sentence[:self.chunk_size])
                    current_chunk = sentence[self.chunk_size:]
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
```

#### Backend: Upload API Endpoint

```python
# app/api/v1/documents.py

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pathlib import Path
import uuid
from app.services.document_processor import DocumentProcessor
from app.services.chunker import TextChunker

router = APIRouter()
processor = DocumentProcessor()
chunker = TextChunker()

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    # current_user = Depends(get_current_user)  # Add later
):
    """Upload and process a PDF document"""
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are supported")
    
    # Save file
    file_id = str(uuid.uuid4())
    file_path = processor.upload_dir / f"{file_id}.pdf"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Process document
    try:
        result = await processor.process_pdf(file_path)
        
        # Chunk the text
        chunks = chunker.chunk_text(result['text'])
        
        # TODO: Generate embeddings and store in vector DB
        # TODO: Save metadata to PostgreSQL
        
        return {
            "id": file_id,
            "filename": file.filename,
            "status": "processed",
            "metadata": result['metadata'],
            "chunk_count": len(chunks),
        }
    
    except Exception as e:
        # Clean up file on error
        file_path.unlink(missing_ok=True)
        raise HTTPException(500, f"Processing failed: {str(e)}")

@router.get("/")
async def list_documents():
    """List all documents"""
    # TODO: Implement database query
    return {"documents": []}

@router.get("/{document_id}")
async def get_document(document_id: str):
    """Get document details"""
    # TODO: Implement
    return {"id": document_id}

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document"""
    # TODO: Implement
    return {"status": "deleted"}
```

#### Backend: Main App Setup

```python
# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import documents

app = FastAPI(
    title="ResearchMate AI",
    description="AI-powered research assistant",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    documents.router,
    prefix="/api/v1/documents",
    tags=["documents"]
)

@app.get("/")
async def root():
    return {
        "message": "ResearchMate AI API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
```

#### Test the Backend

```bash
# Run the server
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# In another terminal, test the endpoint
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "file=@sample_paper.pdf"
```

### Day 5-7: Basic RAG System

#### Setup ChromaDB

```python
# app/services/vector_store.py

import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional
import numpy as np

class VectorStore:
    """Manage vector storage with ChromaDB"""
    
    def __init__(self, persist_directory: str = "./data/chroma"):
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False
            )
        )
        
        self.collection = self.client.get_or_create_collection(
            name="research_papers",
            metadata={"hnsw:space": "cosine"}
        )
    
    async def add_documents(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict],
        ids: Optional[List[str]] = None
    ):
        """Add documents to vector store"""
        if ids is None:
            import uuid
            ids = [str(uuid.uuid4()) for _ in texts]
        
        self.collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids
        )
        
        return ids
    
    async def search(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict] = None
    ) -> List[Dict]:
        """Semantic search"""
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        documents = []
        for i in range(len(results['ids'][0])):
            documents.append({
                'id': results['ids'][0][i],
                'text': results['documents'][0][i],
                'metadata': results['metadatas'][0][i],
                'distance': results['distances'][0][i],
                'score': 1 - results['distances'][0][i]  # Convert distance to similarity
            })
        
        return documents
    
    async def delete_by_metadata(self, where: Dict):
        """Delete documents by metadata filter"""
        self.collection.delete(where=where)
```

#### Embedding Service

```python
# app/services/embedder.py

from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

class EmbeddingService:
    """Generate embeddings for text"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()
    
    async def embed_documents(
        self,
        texts: List[str],
        batch_size: int = 32
    ) -> np.ndarray:
        """Generate embeddings for multiple documents"""
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=True
        )
        return embeddings
    
    async def embed_query(self, text: str) -> np.ndarray:
        """Generate embedding for a single query"""
        embedding = self.model.encode(
            [text],
            convert_to_numpy=True,
            normalize_embeddings=True
        )[0]
        return embedding
```

#### Basic RAG Engine

```python
# app/services/rag/engine.py

from typing import List, Dict
from app.services.vector_store import VectorStore
from app.services.embedder import EmbeddingService
from openai import AsyncOpenAI
import os

class RAGEngine:
    """Core RAG implementation"""
    
    def __init__(self):
        self.vector_store = VectorStore()
        self.embedder = EmbeddingService()
        self.llm_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    async def answer_question(
        self,
        query: str,
        top_k: int = 5,
        document_ids: List[str] = None
    ) -> Dict:
        """Answer a question using RAG"""
        
        # Step 1: Embed the query
        query_embedding = await self.embedder.embed_query(query)
        
        # Step 2: Retrieve relevant chunks
        where_filter = None
        if document_ids:
            where_filter = {"document_id": {"$in": document_ids}}
        
        relevant_docs = await self.vector_store.search(
            query_embedding=query_embedding.tolist(),
            n_results=top_k,
            where=where_filter
        )
        
        # Step 3: Build context
        context = self._build_context(relevant_docs)
        
        # Step 4: Generate answer
        answer = await self._generate_answer(query, context)
        
        # Step 5: Format response with citations
        return {
            "answer": answer,
            "sources": relevant_docs,
            "confidence": self._calculate_confidence(relevant_docs)
        }
    
    def _build_context(self, documents: List[Dict]) -> str:
        """Build context string from retrieved documents"""
        context_parts = []
        
        for i, doc in enumerate(documents, 1):
            metadata = doc['metadata']
            text = doc['text']
            
            context_parts.append(
                f"[Source {i}] (Page {metadata.get('page_number', 'unknown')})\n{text}\n"
            )
        
        return "\n".join(context_parts)
    
    async def _generate_answer(self, query: str, context: str) -> str:
        """Generate answer using LLM"""
        system_prompt = """You are ResearchMate AI, an expert research assistant.

Your role is to help users understand academic papers by providing accurate, 
well-sourced answers based on the provided context.

Guidelines:
1. Only answer based on the provided context
2. Cite sources using [Source X] format
3. If information is not in the context, say so
4. Explain complex concepts clearly
5. Be concise but thorough"""

        user_prompt = f"""Context from research papers:

{context}

Question: {query}

Provide a comprehensive answer based on the context above. Include citations."""

        response = await self.llm_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    def _calculate_confidence(self, documents: List[Dict]) -> float:
        """Calculate confidence score based on retrieval scores"""
        if not documents:
            return 0.0
        
        avg_score = sum(doc['score'] for doc in documents) / len(documents)
        return round(avg_score, 2)
```

#### Chat API Endpoint

```python
# app/api/v1/chat.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.rag.engine import RAGEngine

router = APIRouter()
rag_engine = RAGEngine()

class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    document_ids: Optional[List[str]] = None
    top_k: int = Field(default=5, ge=1, le=20)

class AnswerResponse(BaseModel):
    answer: str
    sources: List[dict]
    confidence: float

@router.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    """Ask a question about uploaded documents"""
    try:
        result = await rag_engine.answer_question(
            query=request.question,
            top_k=request.top_k,
            document_ids=request.document_ids
        )
        
        return AnswerResponse(**result)
    
    except Exception as e:
        raise HTTPException(500, f"Failed to answer question: {str(e)}")

# Add to main.py
# from app.api.v1 import chat
# app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
```

---

## Week 2: Core Features

### Day 8-10: Frontend Chat Interface

```typescript
// frontend/src/services/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

export interface Document {
  id: string;
  filename: string;
  status: string;
  metadata: {
    title: string;
    authors: string[];
    year?: number;
    abstract: string;
    page_count: number;
  };
  chunk_count: number;
}

export interface AnswerResponse {
  answer: string;
  sources: Array<{
    id: string;
    text: string;
    metadata: {
      page_number: number;
      document_id: string;
    };
    score: number;
  }>;
  confidence: number;
}

export const documentService = {
  upload: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return response.data;
  },
  
  list: async (): Promise<Document[]> => {
    const response = await api.get<{ documents: Document[] }>('/documents');
    return response.data.documents;
  },
};

export const chatService = {
  ask: async (
    question: string,
    documentIds?: string[]
  ): Promise<AnswerResponse> => {
    const response = await api.post<AnswerResponse>('/chat/ask', {
      question,
      document_ids: documentIds,
    });
    
    return response.data;
  },
};
```

```typescript
// frontend/src/components/Chat/ChatInterface.tsx

import { useState } from 'react';
import { chatService, type AnswerResponse } from '@/services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: AnswerResponse['sources'];
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      role: 'user',
      content: input,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await chatService.ask(input);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get answer:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
        {loading && <LoadingIndicator />}
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your papers..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <p className="text-sm font-semibold mb-1">Sources:</p>
            {message.sources.map((source, idx) => (
              <div key={source.id} className="text-xs mt-1">
                [Source {idx + 1}] Page {source.metadata.page_number} 
                (Score: {source.score.toFixed(2)})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
    </div>
  );
}
```

### Continue with remaining weeks in similar detail...

---

## Testing

```python
# tests/test_rag.py

import pytest
from app.services.rag.engine import RAGEngine

@pytest.mark.asyncio
async def test_answer_question():
    engine = RAGEngine()
    
    # Upload a test document first
    # ... setup code ...
    
    result = await engine.answer_question("What is the main contribution?")
    
    assert result['answer'] is not None
    assert len(result['sources']) > 0
    assert 0 <= result['confidence'] <= 1
```

---

## Deployment

```bash
# Build for production
cd frontend
npm run build

cd ../backend
# Use gunicorn or similar for production
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

---

*Continue building week by week following the roadmap!*
