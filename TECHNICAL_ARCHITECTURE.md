# 🏗️ ResearchMate AI - Technical Architecture

## System Overview

ResearchMate AI is built as a modern full-stack application with a clear separation of concerns:

- **Frontend:** React SPA with TypeScript for type safety and better developer experience
- **Backend:** FastAPI Python server with async support for high performance
- **AI Layer:** RAG system combining vector search, LLMs, and custom processing
- **Data Layer:** PostgreSQL for relational data, ChromaDB for vector storage

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Browser    │  │   Mobile     │  │   Desktop    │            │
│  │   (React)    │  │   (Future)   │  │   (Future)   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│           │                 │                 │                    │
│           └─────────────────┴─────────────────┘                    │
│                           │                                        │
│                      HTTPS/WSS                                     │
└───────────────────────────┼────────────────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────────────────┐
│                     API GATEWAY                                    │
│                    (FastAPI + CORS)                                │
│                           │                                        │
│  ┌──────────────┬─────────┴─────────┬──────────────┬────────────┐│
│  │     Auth     │     Document      │     Chat     │  Analytics ││
│  │   Middleware │     Endpoints     │   Endpoints  │  Endpoints ││
│  └──────┬───────┴─────────┬─────────┴──────┬───────┴────┬───────┘│
└─────────┼─────────────────┼────────────────┼────────────┼────────┘
          │                 │                │            │
┌─────────┼─────────────────┼────────────────┼────────────┼────────┐
│         │      SERVICE LAYER (Business Logic)           │        │
│         │                 │                │            │        │
│  ┌──────▼───────┐  ┌──────▼──────┐  ┌─────▼─────┐  ┌──▼──────┐ │
│  │    User      │  │  Document   │  │    RAG    │  │ Export  │ │
│  │   Service    │  │  Processor  │  │  Engine   │  │ Service │ │
│  └──────┬───────┘  └──────┬──────┘  └─────┬─────┘  └──┬──────┘ │
└─────────┼──────────────────┼───────────────┼───────────┼─────────┘
          │                  │               │           │
┌─────────┼──────────────────┼───────────────┼───────────┼─────────┐
│         │      AI/ML LAYER (Intelligence)              │         │
│         │                  │               │           │         │
│  ┌──────▼───────┐  ┌───────▼──────┐  ┌────▼─────────────────┐  │
│  │   LLM API    │  │  Embedding   │  │   Vector Search      │  │
│  │  (OpenAI/    │  │   Model      │  │   (ChromaDB)         │  │
│  │  Anthropic)  │  │ (Sentence    │  │   - Semantic         │  │
│  │              │  │ Transformers)│  │   - Hybrid           │  │
│  └──────────────┘  └──────────────┘  │   - Re-ranking       │  │
│                                       └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                  │               │           │
┌─────────┼──────────────────┼───────────────┼───────────┼─────────┐
│         │       DATA LAYER (Persistence)                │         │
│         │                  │               │           │         │
│  ┌──────▼───────┐  ┌───────▼──────┐  ┌────▼────┐  ┌──▼──────┐  │
│  │  PostgreSQL  │  │   ChromaDB   │  │  Redis  │  │   S3    │  │
│  │  (Metadata)  │  │   (Vectors)  │  │ (Cache) │  │ (Files) │  │
│  └──────────────┘  └──────────────┘  └─────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components Deep Dive

### 1. Document Processing Pipeline

```python
# Flow: PDF Upload → Text Extraction → Chunking → Embedding → Storage

class DocumentProcessor:
    """
    Orchestrates the document ingestion pipeline
    """
    
    async def process_document(self, file: UploadFile) -> Document:
        # Step 1: Extract text and metadata
        text, metadata = await self.pdf_parser.extract(file)
        
        # Step 2: Chunk the document intelligently
        chunks = await self.chunker.create_chunks(
            text=text,
            chunk_size=500,
            chunk_overlap=50,
            strategy="recursive"
        )
        
        # Step 3: Generate embeddings
        embeddings = await self.embedder.embed_documents(chunks)
        
        # Step 4: Store in vector database
        await self.vector_store.add_documents(
            documents=chunks,
            embeddings=embeddings,
            metadata=metadata
        )
        
        # Step 5: Store metadata in SQL database
        document = await self.db.create_document(metadata)
        
        return document
```

**Key Technologies:**
- **PyMuPDF:** Fast PDF parsing, good for academic papers
- **pdfplumber:** Table extraction and layout analysis
- **RecursiveCharacterTextSplitter:** Intelligent chunking with semantic awareness

**Chunking Strategy:**
```
Document (10,000 words)
    ↓
Split by sections (headings detected)
    ↓
Further split if section > chunk_size
    ↓
Overlap 50 tokens between chunks
    ↓
Result: ~60 chunks of 500 tokens each
```

---

### 2. RAG (Retrieval-Augmented Generation) Engine

```python
class RAGEngine:
    """
    Core RAG implementation with hybrid search and re-ranking
    """
    
    async def answer_question(
        self, 
        query: str, 
        user_id: str,
        top_k: int = 5
    ) -> Answer:
        # Step 1: Query expansion
        expanded_queries = await self.expand_query(query)
        
        # Step 2: Hybrid search (semantic + keyword)
        semantic_results = await self.semantic_search(
            query, top_k=top_k*2
        )
        keyword_results = await self.keyword_search(
            query, top_k=top_k*2
        )
        combined = self.merge_results(semantic_results, keyword_results)
        
        # Step 3: Re-rank with cross-encoder
        reranked = await self.reranker.rerank(
            query=query,
            documents=combined,
            top_k=top_k
        )
        
        # Step 4: Build context
        context = self.build_context(reranked)
        
        # Step 5: Generate answer with LLM
        prompt = self.create_prompt(query, context)
        answer = await self.llm.generate(prompt)
        
        # Step 6: Extract citations
        citations = self.extract_citations(answer, reranked)
        
        return Answer(
            text=answer,
            sources=citations,
            confidence=self.calculate_confidence(answer)
        )
```

**Search Strategy:**

1. **Semantic Search** (60% weight)
   - Convert query to embedding
   - Cosine similarity in vector space
   - Best for conceptual matching

2. **Keyword Search** (40% weight)
   - BM25 algorithm
   - Term frequency analysis
   - Best for specific terms/names

3. **Hybrid Fusion**
   - Reciprocal Rank Fusion (RRF)
   - Combines both rankings
   - Robust against search failures

**Re-ranking:**
```python
# Cross-encoder model for precise relevance scoring
cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

scores = cross_encoder.predict([
    [query, doc.text] for doc in candidates
])

reranked = sorted(
    zip(candidates, scores), 
    key=lambda x: x[1], 
    reverse=True
)[:top_k]
```

---

### 3. Embedding Generation

```python
class EmbeddingService:
    """
    Generates and manages document embeddings
    """
    
    def __init__(self):
        self.model = SentenceTransformer(
            'sentence-transformers/all-MiniLM-L6-v2'
        )
        # 384-dimensional embeddings
        # Fast inference: ~1000 sentences/sec on CPU
        
    async def embed_documents(
        self, 
        texts: List[str],
        batch_size: int = 32
    ) -> np.ndarray:
        """Batch embedding generation with progress tracking"""
        embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            batch_embeddings = self.model.encode(
                batch,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            embeddings.append(batch_embeddings)
            
        return np.vstack(embeddings)
    
    async def embed_query(self, query: str) -> np.ndarray:
        """Single query embedding"""
        return self.model.encode([query])[0]
```

**Model Choice Rationale:**
- `all-MiniLM-L6-v2`: Fast, efficient, good quality
- Alternative: `all-mpnet-base-v2` (better quality, slower)
- Alternative: OpenAI `text-embedding-3-small` (API-based)

---

### 4. Vector Database (ChromaDB)

```python
class VectorStore:
    """
    Manages vector storage and retrieval
    """
    
    def __init__(self):
        self.client = chromadb.PersistentClient(
            path="./data/chroma"
        )
        self.collection = self.client.get_or_create_collection(
            name="research_papers",
            metadata={
                "hnsw:space": "cosine",
                "hnsw:construction_ef": 200,
                "hnsw:search_ef": 100
            }
        )
    
    async def add_documents(
        self,
        documents: List[str],
        embeddings: np.ndarray,
        metadata: List[Dict]
    ):
        """Add documents with embeddings"""
        ids = [str(uuid.uuid4()) for _ in documents]
        
        self.collection.add(
            ids=ids,
            embeddings=embeddings.tolist(),
            documents=documents,
            metadatas=metadata
        )
        
        return ids
    
    async def search(
        self,
        query_embedding: np.ndarray,
        n_results: int = 10,
        where: Optional[Dict] = None
    ) -> List[Document]:
        """Semantic search with optional filtering"""
        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"]
        )
        
        return self.parse_results(results)
```

**ChromaDB Configuration:**
- **Index:** HNSW (Hierarchical Navigable Small World)
- **Distance:** Cosine similarity
- **Persistence:** Local disk for development, S3 for production
- **Metadata filtering:** Support for user_id, document_id, date ranges

---

### 5. LLM Integration

```python
class LLMService:
    """
    Manages LLM API calls with fallback and error handling
    """
    
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.primary = "openai"
        
    async def generate(
        self,
        prompt: str,
        system_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        stream: bool = False
    ) -> str:
        """Generate response with automatic fallback"""
        try:
            if self.primary == "openai":
                return await self._openai_generate(
                    prompt, system_prompt, temperature, max_tokens, stream
                )
            else:
                return await self._anthropic_generate(
                    prompt, system_prompt, temperature, max_tokens, stream
                )
        except Exception as e:
            logger.error(f"Primary LLM failed: {e}")
            # Fallback to secondary provider
            return await self._fallback_generate(
                prompt, system_prompt, temperature, max_tokens, stream
            )
    
    async def _openai_generate(self, ...):
        response = await self.openai_client.chat.completions.create(
            model="gpt-4o-mini",  # or gpt-4o for higher quality
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream
        )
        
        if stream:
            return self._stream_response(response)
        return response.choices[0].message.content
```

**Prompt Template:**
```python
SYSTEM_PROMPT = """You are ResearchMate AI, an expert research assistant.

Your role is to help users understand academic papers by:
1. Providing accurate, well-sourced answers
2. Citing specific passages from the papers
3. Explaining complex concepts clearly
4. Identifying connections between papers

Guidelines:
- Always cite sources with [Author, Year, p.X] format
- If information is not in the provided context, say so
- Explain technical terms in simple language
- Be concise but thorough
"""

USER_PROMPT_TEMPLATE = """Context from research papers:
{context}

User question: {question}

Provide a comprehensive answer based on the context above. 
Include citations in [Author, Year, p.X] format.
"""
```

---

### 6. API Layer (FastAPI)

```python
# app/main.py

from fastapi import FastAPI, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ResearchMate AI API",
    version="1.0.0",
    docs_url="/api/docs"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.post("/api/v1/documents/upload")
async def upload_document(
    file: UploadFile,
    current_user: User = Depends(get_current_user)
):
    """Upload and process a research paper"""
    document = await document_service.process_document(
        file=file,
        user_id=current_user.id
    )
    return DocumentResponse(**document.dict())

@app.post("/api/v1/chat/ask")
async def ask_question(
    request: QuestionRequest,
    current_user: User = Depends(get_current_user)
):
    """Ask a question about uploaded papers"""
    answer = await rag_engine.answer_question(
        query=request.question,
        user_id=current_user.id,
        document_ids=request.document_ids
    )
    return AnswerResponse(**answer.dict())

@app.websocket("/api/v1/chat/stream")
async def chat_stream(
    websocket: WebSocket,
    token: str
):
    """Streaming chat interface"""
    await websocket.accept()
    user = await verify_token(token)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            async for chunk in rag_engine.stream_answer(
                query=data["question"],
                user_id=user.id
            ):
                await websocket.send_json({
                    "type": "chunk",
                    "data": chunk
                })
            
            await websocket.send_json({"type": "done"})
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {user.id}")
```

---

### 7. Frontend Architecture (React)

```typescript
// src/services/api.ts

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const documentService = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return response.data;
  },
  
  list: async () => {
    const response = await api.get('/documents');
    return response.data;
  },
  
  delete: async (id: string) => {
    await api.delete(`/documents/${id}`);
  },
};

export const chatService = {
  ask: async (question: string, documentIds: string[]) => {
    const response = await api.post('/chat/ask', {
      question,
      document_ids: documentIds,
    });
    return response.data;
  },
  
  stream: (question: string, onChunk: (chunk: string) => void) => {
    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/chat/stream?token=${getToken()}`
    );
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ question }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chunk') {
        onChunk(data.data);
      }
    };
    
    return ws;
  },
};
```

```typescript
// src/components/Chat/ChatInterface.tsx

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatService } from '@/services/api';

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  const askMutation = useMutation({
    mutationFn: (question: string) => 
      chatService.ask(question, selectedDocuments),
    onSuccess: (answer) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer.text,
        sources: answer.sources,
      }]);
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: input,
    }]);
    
    askMutation.mutate(input);
    setInput('');
  };
  
  return (
    <div className="chat-interface">
      <MessageList messages={messages} />
      <ChatInput 
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        loading={askMutation.isPending}
      />
    </div>
  );
};
```

---

## Database Schema

### PostgreSQL Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    authors TEXT[],
    year INTEGER,
    abstract TEXT,
    file_path VARCHAR(500),
    page_count INTEGER,
    status VARCHAR(50) DEFAULT 'processing',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chunks table (metadata only, vectors in ChromaDB)
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    page_number INTEGER,
    vector_id VARCHAR(255), -- ChromaDB ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat history table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    sources JSONB, -- Citations and sources
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
```

---

## Performance Optimization

### 1. Caching Strategy

```python
from functools import lru_cache
import redis

# Redis for distributed caching
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True
)

class CacheService:
    @staticmethod
    async def get_or_compute(
        key: str,
        compute_fn: Callable,
        ttl: int = 3600
    ):
        """Cache with automatic computation"""
        # Check cache
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)
        
        # Compute
        result = await compute_fn()
        
        # Store in cache
        redis_client.setex(
            key,
            ttl,
            json.dumps(result)
        )
        
        return result

# Usage
@app.get("/documents/{doc_id}/summary")
async def get_summary(doc_id: str):
    return await cache.get_or_compute(
        key=f"summary:{doc_id}",
        compute_fn=lambda: summarize_document(doc_id),
        ttl=86400  # 24 hours
    )
```

### 2. Async Processing

```python
from celery import Celery

celery_app = Celery(
    'researchmate',
    broker='redis://localhost:6379/0'
)

@celery_app.task
def process_document_async(document_id: str):
    """Background processing for large documents"""
    document = db.get_document(document_id)
    
    # Update status
    db.update_document(document_id, status='processing')
    
    try:
        # Process
        processor.process(document)
        db.update_document(document_id, status='completed')
    except Exception as e:
        db.update_document(document_id, status='failed', error=str(e))

# Usage in API
@app.post("/documents/upload")
async def upload(file: UploadFile):
    document = await db.create_document(file.filename)
    
    # Queue for processing
    process_document_async.delay(document.id)
    
    return {"id": document.id, "status": "queued"}
```

### 3. Database Query Optimization

```python
# Use connection pooling
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import NullPool

engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,  # or QueuePool with size limits
    echo=False
)

# Batch queries
async def get_documents_with_chunks(user_id: str):
    """Efficient join query"""
    query = """
    SELECT 
        d.id, d.title, d.authors,
        json_agg(c.*) as chunks
    FROM documents d
    LEFT JOIN chunks c ON d.id = c.document_id
    WHERE d.user_id = :user_id
    GROUP BY d.id
    """
    
    result = await db.execute(query, {"user_id": user_id})
    return result.fetchall()
```

---

## Security Considerations

### 1. Authentication

```python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm="HS256"
    )
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(401)
    except JWTError:
        raise HTTPException(401)
    
    user = await db.get_user(user_id)
    if user is None:
        raise HTTPException(401)
    
    return user
```

### 2. Input Validation

```python
from pydantic import BaseModel, Field, validator

class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    document_ids: List[str] = Field(..., max_items=10)
    
    @validator('question')
    def validate_question(cls, v):
        # Prevent injection attacks
        if any(char in v for char in ['<', '>', '{', '}']):
            raise ValueError('Invalid characters in question')
        return v.strip()
```

### 3. Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

@app.post("/chat/ask")
@limiter.limit("10/minute")
async def ask_question(request: Request, ...):
    ...
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer (Nginx)               │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌───────▼────────┐               ┌──────────▼───────┐
│  Frontend      │               │   Backend API    │
│  Container     │               │   Containers     │
│  (React SPA)   │               │   (FastAPI)      │
│                │               │   x3 replicas    │
└────────────────┘               └──────────────────┘
                                          │
                        ┌─────────────────┼─────────────────┐
                        │                 │                 │
                ┌───────▼────┐    ┌──────▼─────┐   ┌──────▼──────┐
                │ PostgreSQL │    │  ChromaDB  │   │   Redis     │
                │            │    │            │   │   Cache     │
                └────────────┘    └────────────┘   └─────────────┘
```

### Docker Compose

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/researchmate
      - REDIS_URL=redis://redis:6379/0
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - redis
      - chromadb

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=researchmate

  chromadb:
    image: chromadb/chroma:latest
    volumes:
      - chroma_data:/chroma/chroma
    ports:
      - "8001:8000"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  chroma_data:
```

---

## Monitoring & Observability

```python
# Logging
import logging
from pythonjsonlogger import jsonlogger

logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

# Metrics
from prometheus_client import Counter, Histogram

query_counter = Counter(
    'researchmate_queries_total',
    'Total number of queries'
)

query_duration = Histogram(
    'researchmate_query_duration_seconds',
    'Query processing time'
)

@app.post("/chat/ask")
async def ask_question(...):
    query_counter.inc()
    
    with query_duration.time():
        answer = await rag_engine.answer_question(...)
    
    return answer
```

---

## Testing Strategy

```python
# Unit tests
import pytest
from app.services.rag import RAGEngine

@pytest.mark.asyncio
async def test_rag_retrieval():
    engine = RAGEngine()
    
    # Setup test data
    await engine.add_document(TEST_DOCUMENT)
    
    # Test query
    answer = await engine.answer_question("What is the main finding?")
    
    assert answer.text is not None
    assert len(answer.sources) > 0
    assert answer.confidence > 0.7

# Integration tests
@pytest.mark.integration
async def test_document_upload_flow(client):
    # Upload document
    with open("test_paper.pdf", "rb") as f:
        response = await client.post(
            "/documents/upload",
            files={"file": f}
        )
    
    assert response.status_code == 200
    doc_id = response.json()["id"]
    
    # Wait for processing
    await asyncio.sleep(5)
    
    # Query the document
    response = await client.post(
        "/chat/ask",
        json={
            "question": "What is this paper about?",
            "document_ids": [doc_id]
        }
    )
    
    assert response.status_code == 200
    assert "abstract" in response.json()["text"].lower()
```

---

*This architecture is designed to be scalable, maintainable, and extensible for future enhancements.*
