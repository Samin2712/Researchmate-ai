# 🤖 ResearchMate AI - AI-Powered Research Assistant

## Run the full app locally

From this directory, run `npm run dev` (or `npm.cmd run dev` if PowerShell blocks npm).
It prepares missing dependencies and starts the backend and frontend together.
Use `npm run doctor` to check real connections and AI generation.
See [one-command startup](docs/LOCAL_STARTUP.md) for credentials, first-run downloads, and database options.

> **Intelligent Research Paper Assistant with RAG (Retrieval Augmented Generation)**
> 
> Upload PDFs, ask questions, get AI-powered answers with citations! 🎓

[![Phase 2 Complete](https://img.shields.io/badge/Phase%202-Complete-success)](BUILD_PHASES.md)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-blue)](QUICK_START.md)
[![Free Tier](https://img.shields.io/badge/Cost-100%25%20Free-green)](https://makersuite.google.com)

---

## ✨ Features

### 📚 Document Management
- ✅ **PDF Upload & Processing** - Extract text from research papers
- ✅ **Intelligent Chunking** - Split documents with context preservation
- ✅ **Metadata Extraction** - Track titles, authors, pages
- ✅ **Progress Tracking** - Real-time upload and processing status

### 🧠 AI-Powered Q&A (RAG)
- ✅ **Semantic Search** - Find relevant content using embeddings
- ✅ **Hybrid Search** - Combine semantic + keyword (BM25) search
- ✅ **LLM Generation** - Get answers using Google Gemini or OpenAI
- ✅ **Citation Extraction** - See exact sources with page numbers
- ✅ **Streaming Responses** - Real-time answer generation
- ✅ **Confidence Scores** - Know how confident the AI is

### 🔐 User Management
- ✅ **Secure Authentication** - JWT-based auth
- ✅ **User Registration** - Easy sign-up flow
- ✅ **Session Management** - Persistent login
- ✅ **Role-Based Access** - Multi-user support

### 🎨 Modern UI
- ✅ **Responsive Design** - Works on desktop & mobile
- ✅ **Real-time Updates** - Live chat interface
- ✅ **Document Library** - Manage uploaded papers
- ✅ **Dark Mode Ready** - Eye-friendly interface

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Docker Desktop (that's it!)
- Free Gemini API key ([get here](https://makersuite.google.com/app/apikey))

### Setup
```bash
# 1. Clone repository
git clone <your-repo-url>
cd "STEM2Connect AI Hackathon"

# 2. Configure environment
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# 3. Start everything
docker-compose up -d

# 4. Wait ~2 minutes for services to start
docker-compose ps

# 5. Access the app
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

**That's it!** 🎉

See [QUICK_START.md](QUICK_START.md) for detailed instructions.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                          │
│                    (Vite + TypeScript)                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                   FastAPI Backend                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Authentication │ Document Upload │ Chat API         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              RAG Pipeline (Phase 2)                   │   │
│  │  • PDF Processing    • Text Chunking                 │   │
│  │  • Embeddings        • Vector Storage                │   │
│  │  • Semantic Search   • LLM Generation                │   │
│  │  • Hybrid Search     • Citation Extraction           │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬──────────────┬──────────────┬─────────────┘
                 │              │              │
        ┌────────▼─────┐ ┌─────▼──────┐ ┌────▼─────────┐
        │ PostgreSQL   │ │  Redis     │ │  ChromaDB    │
        │  (User Data) │ │  (Cache)   │ │ (Embeddings) │
        └──────────────┘ └────────────┘ └──────────────┘
```

### Technology Stack

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Query (data fetching)
- Zustand (state management)

**Backend**
- FastAPI (Python 3.11+)
- SQLAlchemy (ORM)
- Alembic (migrations)
- Pydantic (validation)

**AI/ML**
- Google Gemini 1.5 (LLM) - **FREE!**
- sentence-transformers (embeddings) - **FREE!**
- ChromaDB (vector database)
- rank-bm25 (hybrid search)

**Infrastructure**
- Docker + Docker Compose
- PostgreSQL 15
- Redis 7
- Nginx (production)

---

## 📖 How It Works

### 1. Document Upload
```
User uploads PDF
    ↓
Extract text (PyPDF2)
    ↓
Split into chunks (500 tokens, 50 overlap)
    ↓
Generate embeddings (sentence-transformers)
    ↓
Store in ChromaDB vector database
```

### 2. Question Answering
```
User asks question
    ↓
Generate question embedding
    ↓
Semantic search in ChromaDB (top 5 results)
    ↓
Keyword search with BM25
    ↓
Combine & re-rank results
    ↓
Send context + question to Gemini LLM
    ↓
Stream AI response with citations
```

### 3. Citation Extraction
- Extract exact text snippets from results
- Include page numbers and relevance scores
- Link citations to source documents
- Display confidence levels

---

## 📁 Project Structure

```
STEM2Connect AI Hackathon/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/            # API endpoints
│   │   │   ├── auth.py        # Authentication
│   │   │   ├── documents.py   # Document upload
│   │   │   └── chat.py        # Chat/Q&A
│   │   ├── core/              # Core configuration
│   │   │   ├── config.py      # Settings
│   │   │   ├── database.py    # DB connection
│   │   │   └── security.py    # Auth helpers
│   │   ├── models/            # Database models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   │       ├── embedder.py    # Embedding generation
│   │       ├── chunker.py     # Text chunking
│   │       ├── vector_store.py # ChromaDB operations
│   │       ├── llm_service.py  # LLM integration
│   │       ├── rag/
│   │       │   ├── engine.py       # RAG orchestration
│   │       │   └── hybrid_search.py # BM25 + semantic
│   │       └── ingestion_pipeline.py # Full pipeline
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile            # Backend Docker image
│   └── test_rag.py           # RAG tests
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities
│   │   └── App.tsx           # Main app
│   ├── package.json          # Node dependencies
│   └── Dockerfile            # Frontend Docker image
├── docker-compose.yml        # Development compose
├── docker-compose.prod.yml   # Production compose
├── .env.example              # Environment template
├── QUICK_START.md           # Quick start guide
├── DOCKER_SETUP_GUIDE.md    # Docker documentation
└── BUILD_PHASES.md          # Development phases
```

---

## 🎯 Development Phases

| Phase | Status | Features |
|-------|--------|----------|
| **Phase 1** | ✅ Complete | Core setup, Auth, Document upload |
| **Phase 2** | ✅ Complete | RAG pipeline, Embeddings, Q&A with citations |
| **Phase 3** | 🚧 Planned | Advanced features, UI polish |

See [BUILD_PHASES.md](BUILD_PHASES.md) for details.

---

## 🧪 Testing

### Backend Tests
```bash
# Unit tests
docker-compose exec backend pytest

# RAG system test
docker-compose exec backend python test_rag.py

# Integration test
docker-compose exec backend python test_rag_live.py

# With coverage
docker-compose exec backend pytest --cov=app --cov-report=html
```

### Frontend Tests
```bash
# Unit tests
docker-compose exec frontend npm test

# E2E tests
docker-compose exec frontend npm run test:e2e
```

---

## 🚀 Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
# Update .env with production values
cp .env.example .env.production

# Build and start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

See [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md#production-deployment) for complete guide.

---

## 🔧 Configuration

### Environment Variables

Key variables in `.env`:

```bash
# LLM Provider (choose one)
LLM_PROVIDER=gemini              # or openai, anthropic
GOOGLE_API_KEY=AIza...           # Your Gemini key
GEMINI_MODEL=gemini-1.5-flash    # Model to use

# Embeddings (local, free)
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# RAG Configuration
CHUNK_SIZE=500                   # Tokens per chunk
CHUNK_OVERLAP=50                 # Overlap between chunks
TOP_K_RESULTS=5                  # Results to retrieve
SIMILARITY_THRESHOLD=0.7         # Minimum similarity

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379/0

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

See [.env.example](.env.example) for all options.

---

## 📊 API Documentation

### Interactive Docs
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

```
POST   /api/v1/auth/register      # Create account
POST   /api/v1/auth/login          # Login
POST   /api/v1/documents/upload    # Upload PDF
GET    /api/v1/documents/          # List documents
GET    /api/v1/documents/{id}      # Get document
POST   /api/v1/chat/message        # Ask question (streaming)
GET    /api/v1/chat/sessions       # List chat sessions
GET    /api/v1/chat/sessions/{id}  # Get chat history
```

---

## 💰 Cost Analysis

### 100% Free Setup (Recommended)
- ✅ Gemini API: **FREE** (generous limits)
- ✅ Embeddings: **FREE** (runs locally)
- ✅ Vector DB: **FREE** (ChromaDB local)
- ✅ Total: **$0/month** 🎉

### Paid Options (Optional)
- OpenAI GPT-4: ~$0.03 per 1K tokens
- Anthropic Claude: ~$0.015 per 1K tokens
- Hosted vector DB: ~$20-100/month

**Recommendation**: Start with free Gemini, upgrade if needed.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- Google Gemini for free LLM API
- Hugging Face for sentence-transformers
- ChromaDB for vector database
- FastAPI & React communities

---

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: Create GitHub issue
- **Logs**: `docker-compose logs -f`
- **Health Check**: http://localhost:8000/health

---

## 🎉 Quick Links

- [Quick Start Guide](QUICK_START.md) - Get started in 5 minutes
- [Docker Setup](DOCKER_SETUP_GUIDE.md) - Complete Docker guide
- [Build Phases](BUILD_PHASES.md) - Development roadmap
- [API Documentation](http://localhost:8000/docs) - Interactive API docs
- [Get Gemini Key](https://makersuite.google.com/app/apikey) - Free API access

---

**Built with ❤️ for STEM2Connect AI Hackathon**

**Version**: 2.0.0 (Phase 2 Complete)  
**Last Updated**: November 11, 2026
