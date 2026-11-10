# 📁 ResearchMate AI - Complete Directory Structure

This document shows the full project structure you'll create during development.

---

## 🌳 Full Project Tree

```
researchmate-ai/
│
├── 📄 README.md                          # Main project documentation
├── 📄 PROJECT_PLAN.md                    # Comprehensive hackathon plan
├── 📄 PROJECT_SUMMARY.md                 # One-page overview
├── 📄 IMPLEMENTATION_GUIDE.md            # Step-by-step implementation
├── 📄 TECHNICAL_ARCHITECTURE.md          # System design deep-dive
├── 📄 QUICK_START.md                     # 15-minute setup guide
├── 📄 FEATURES_CHECKLIST.md              # Progress tracking
├── 📄 CONTRIBUTING.md                    # Contribution guidelines
├── 📄 LICENSE                            # MIT License
├── 📄 .gitignore                         # Git ignore rules
├── 📄 docker-compose.yml                 # Docker orchestration
│
├── 📁 frontend/                          # React TypeScript Frontend
│   ├── 📄 package.json                   # Node dependencies
│   ├── 📄 package-lock.json
│   ├── 📄 tsconfig.json                  # TypeScript config
│   ├── 📄 vite.config.ts                 # Vite config
│   ├── 📄 tailwind.config.js             # Tailwind CSS config
│   ├── 📄 postcss.config.js
│   ├── 📄 .env.example                   # Environment variables template
│   ├── 📄 .eslintrc.json                 # ESLint config
│   ├── 📄 .prettierrc                    # Prettier config
│   ├── 📄 Dockerfile                     # Frontend Docker image
│   ├── 📄 index.html                     # HTML entry point
│   │
│   ├── 📁 public/                        # Static assets
│   │   ├── favicon.ico
│   │   ├── logo.svg
│   │   └── robots.txt
│   │
│   └── 📁 src/                           # Source code
│       ├── 📄 App.tsx                    # Main app component
│       ├── 📄 main.tsx                   # Entry point
│       ├── 📄 index.css                  # Global styles
│       ├── 📄 vite-env.d.ts
│       │
│       ├── 📁 components/                # React components
│       │   ├── 📁 chat/
│       │   │   ├── ChatInterface.tsx
│       │   │   ├── MessageList.tsx
│       │   │   ├── MessageBubble.tsx
│       │   │   ├── ChatInput.tsx
│       │   │   ├── SourceCitation.tsx
│       │   │   └── TypingIndicator.tsx
│       │   │
│       │   ├── 📁 documents/
│       │   │   ├── DocumentUpload.tsx
│       │   │   ├── DocumentList.tsx
│       │   │   ├── DocumentCard.tsx
│       │   │   ├── DocumentDetail.tsx
│       │   │   └── PdfViewer.tsx
│       │   │
│       │   ├── 📁 knowledge-graph/
│       │   │   ├── KnowledgeGraph.tsx
│       │   │   ├── GraphNode.tsx
│       │   │   ├── GraphEdge.tsx
│       │   │   └── GraphControls.tsx
│       │   │
│       │   ├── 📁 tools/
│       │   │   ├── Summarizer.tsx
│       │   │   ├── LiteratureReview.tsx
│       │   │   ├── CitationGenerator.tsx
│       │   │   └── ConceptExplainer.tsx
│       │   │
│       │   └── 📁 shared/                # Reusable components
│       │       ├── Button.tsx
│       │       ├── Input.tsx
│       │       ├── Modal.tsx
│       │       ├── Dropdown.tsx
│       │       ├── LoadingSpinner.tsx
│       │       ├── ErrorBoundary.tsx
│       │       ├── Toast.tsx
│       │       └── Layout.tsx
│       │
│       ├── 📁 pages/                     # Page components
│       │   ├── Dashboard.tsx
│       │   ├── Chat.tsx
│       │   ├── Library.tsx
│       │   ├── Upload.tsx
│       │   ├── Settings.tsx
│       │   ├── Login.tsx
│       │   └── Register.tsx
│       │
│       ├── 📁 hooks/                     # Custom React hooks
│       │   ├── useAuth.ts
│       │   ├── useDocuments.ts
│       │   ├── useChat.ts
│       │   ├── useWebSocket.ts
│       │   └── useLocalStorage.ts
│       │
│       ├── 📁 services/                  # API service layer
│       │   ├── api.ts                    # Axios instance
│       │   ├── auth.service.ts
│       │   ├── document.service.ts
│       │   ├── chat.service.ts
│       │   └── websocket.service.ts
│       │
│       ├── 📁 store/                     # State management
│       │   ├── authStore.ts
│       │   ├── documentStore.ts
│       │   ├── chatStore.ts
│       │   └── uiStore.ts
│       │
│       ├── 📁 utils/                     # Helper functions
│       │   ├── formatters.ts
│       │   ├── validators.ts
│       │   ├── constants.ts
│       │   └── helpers.ts
│       │
│       └── 📁 types/                     # TypeScript types
│           ├── document.types.ts
│           ├── chat.types.ts
│           ├── user.types.ts
│           └── api.types.ts
│
├── 📁 backend/                           # FastAPI Python Backend
│   ├── 📄 requirements.txt               # Python dependencies
│   ├── 📄 requirements-dev.txt           # Dev dependencies
│   ├── 📄 pyproject.toml                 # Python project config
│   ├── 📄 setup.py
│   ├── 📄 .env.example                   # Environment variables template
│   ├── 📄 alembic.ini                    # Alembic config
│   ├── 📄 Dockerfile                     # Backend Docker image
│   ├── 📄 pytest.ini                     # Pytest config
│   ├── 📄 .flake8                        # Flake8 config
│   ├── 📄 mypy.ini                       # MyPy config
│   │
│   ├── 📁 alembic/                       # Database migrations
│   │   ├── 📄 env.py
│   │   ├── 📄 script.py.mako
│   │   └── 📁 versions/
│   │       └── [migration files]
│   │
│   ├── 📁 app/                           # Main application
│   │   ├── 📄 __init__.py
│   │   ├── 📄 main.py                    # FastAPI app entry point
│   │   ├── 📄 dependencies.py            # Dependency injection
│   │   │
│   │   ├── 📁 api/                       # API routes
│   │   │   ├── 📄 __init__.py
│   │   │   └── 📁 v1/
│   │   │       ├── 📄 __init__.py
│   │   │       ├── 📄 documents.py       # Document endpoints
│   │   │       ├── 📄 chat.py            # Chat endpoints
│   │   │       ├── 📄 auth.py            # Auth endpoints
│   │   │       ├── 📄 users.py           # User endpoints
│   │   │       ├── 📄 tools.py           # AI tools endpoints
│   │   │       └── 📄 analytics.py       # Analytics endpoints
│   │   │
│   │   ├── 📁 core/                      # Core functionality
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 config.py              # Configuration
│   │   │   ├── 📄 security.py            # Auth & security
│   │   │   ├── 📄 logging.py             # Logging setup
│   │   │   └── 📄 exceptions.py          # Custom exceptions
│   │   │
│   │   ├── 📁 models/                    # Database models (SQLAlchemy)
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 base.py                # Base model
│   │   │   ├── 📄 user.py
│   │   │   ├── 📄 document.py
│   │   │   ├── 📄 chunk.py
│   │   │   ├── 📄 chat.py
│   │   │   └── 📄 citation.py
│   │   │
│   │   ├── 📁 schemas/                   # Pydantic schemas
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 user.py
│   │   │   ├── 📄 document.py
│   │   │   ├── 📄 chat.py
│   │   │   ├── 📄 auth.py
│   │   │   └── 📄 response.py
│   │   │
│   │   ├── 📁 services/                  # Business logic
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 document_processor.py  # PDF processing
│   │   │   ├── 📄 chunker.py             # Text chunking
│   │   │   ├── 📄 embedder.py            # Embedding generation
│   │   │   ├── 📄 vector_store.py        # ChromaDB wrapper
│   │   │   ├── 📄 llm_service.py         # LLM integration
│   │   │   ├── 📄 user_service.py
│   │   │   │
│   │   │   └── 📁 rag/                   # RAG implementation
│   │   │       ├── 📄 __init__.py
│   │   │       ├── 📄 engine.py          # Main RAG engine
│   │   │       ├── 📄 retriever.py       # Document retrieval
│   │   │       ├── 📄 generator.py       # Answer generation
│   │   │       ├── 📄 reranker.py        # Re-ranking
│   │   │       ├── 📄 hybrid_search.py   # Hybrid search
│   │   │       └── 📄 prompts.py         # Prompt templates
│   │   │
│   │   ├── 📁 utils/                     # Utilities
│   │   │   ├── 📄 __init__.py
│   │   │   ├── 📄 pdf_parser.py          # PDF parsing
│   │   │   ├── 📄 citation.py            # Citation handling
│   │   │   ├── 📄 text_processing.py
│   │   │   └── 📄 helpers.py
│   │   │
│   │   └── 📁 db/                        # Database
│   │       ├── 📄 __init__.py
│   │       ├── 📄 session.py             # DB session
│   │       ├── 📄 base.py
│   │       └── 📄 init_db.py             # DB initialization
│   │
│   └── 📁 tests/                         # Tests
│       ├── 📄 __init__.py
│       ├── 📄 conftest.py                # Pytest fixtures
│       ├── 📁 unit/
│       │   ├── 📄 test_rag.py
│       │   ├── 📄 test_embedder.py
│       │   ├── 📄 test_chunker.py
│       │   └── 📄 test_document_processor.py
│       ├── 📁 integration/
│       │   ├── 📄 test_api.py
│       │   ├── 📄 test_database.py
│       │   └── 📄 test_vector_store.py
│       └── 📁 e2e/
│           └── 📄 test_full_flow.py
│
├── 📁 docs/                              # Documentation
│   ├── 📄 api.md                         # API documentation
│   ├── 📄 architecture.md                # Architecture details
│   ├── 📄 deployment.md                  # Deployment guide
│   ├── 📄 user-guide.md                  # User guide
│   ├── 📄 development.md                 # Development guide
│   ├── 📄 troubleshooting.md             # Troubleshooting
│   │
│   └── 📁 images/                        # Documentation images
│       ├── upload.png
│       ├── chat.png
│       ├── library.png
│       ├── graph.png
│       └── architecture-diagram.png
│
├── 📁 scripts/                           # Utility scripts
│   ├── 📄 setup.sh                       # Initial setup
│   ├── 📄 seed_data.py                   # Database seeding
│   ├── 📄 benchmark.py                   # Performance testing
│   ├── 📄 migrate.py                     # Database migration
│   └── 📄 deploy.sh                      # Deployment script
│
├── 📁 .github/                           # GitHub configuration
│   ├── 📁 workflows/
│   │   ├── ci.yml                        # CI pipeline
│   │   ├── deploy.yml                    # CD pipeline
│   │   └── lint.yml                      # Linting
│   ├── 📁 ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── 📁 data/                              # Data files (gitignored)
│   ├── 📁 chroma/                        # ChromaDB storage
│   ├── 📁 uploads/                       # Uploaded PDFs
│   └── 📄 .gitkeep
│
└── 📁 tests/                             # E2E tests
    ├── 📁 e2e/
    │   ├── 📄 test_upload.spec.ts
    │   ├── 📄 test_chat.spec.ts
    │   └── 📄 test_auth.spec.ts
    └── 📁 fixtures/
        └── sample_papers/
            ├── paper1.pdf
            ├── paper2.pdf
            └── paper3.pdf
```

---

## 📊 File Count Summary

| Category | Count | Description |
|----------|-------|-------------|
| **Documentation** | 10+ files | README, guides, architecture |
| **Frontend** | 60+ files | React components, services, types |
| **Backend** | 50+ files | FastAPI routes, services, models |
| **Tests** | 20+ files | Unit, integration, E2E tests |
| **Config** | 15+ files | Docker, CI/CD, linters |
| **Scripts** | 5+ files | Setup, deployment, seeding |
| **Total** | ~160+ files | Full production-ready codebase |

---

## 🎯 Key Directories Explained

### Frontend (`/frontend/src/`)

**`components/`** - All React UI components
- `chat/` - Chat interface components
- `documents/` - Document management UI
- `knowledge-graph/` - Graph visualization
- `shared/` - Reusable components

**`pages/`** - Top-level route pages
- Each page corresponds to a route (e.g., `/dashboard`, `/chat`)

**`services/`** - API communication layer
- Axios instances and service functions
- Separates API logic from components

**`store/`** - Global state management (Zustand)
- Auth state, document state, chat state

**`hooks/`** - Custom React hooks
- Reusable logic (e.g., `useAuth`, `useChat`)

### Backend (`/backend/app/`)

**`api/v1/`** - API endpoints
- RESTful routes organized by resource
- Versioned API (v1, v2, etc.)

**`services/`** - Business logic layer
- Heavy lifting happens here
- Independent of API routes

**`services/rag/`** - RAG system
- Core AI functionality
- Retrieval, generation, re-ranking

**`models/`** - Database models (SQLAlchemy)
- ORM definitions for PostgreSQL

**`schemas/`** - Pydantic schemas
- Request/response validation
- API documentation

**`core/`** - Core utilities
- Config, security, logging
- Shared across all modules

---

## 🔧 Configuration Files

### Python
- `requirements.txt` - Production dependencies
- `requirements-dev.txt` - Development dependencies
- `pyproject.toml` - Modern Python project config
- `setup.py` - Package setup
- `pytest.ini` - Test configuration
- `.flake8` - Linting rules
- `mypy.ini` - Type checking config

### Node/React
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Build tool config
- `tailwind.config.js` - Styling config
- `.eslintrc.json` - Linting rules
- `.prettierrc` - Code formatting

### Docker
- `docker-compose.yml` - Multi-container setup
- `Dockerfile` (frontend) - Frontend image
- `Dockerfile` (backend) - Backend image

### CI/CD
- `.github/workflows/ci.yml` - Continuous integration
- `.github/workflows/deploy.yml` - Deployment
- `.github/workflows/lint.yml` - Code quality

---

## 📝 Important Files by Priority

### Must-Have (Week 1)
1. `backend/app/main.py` - Backend entry point
2. `backend/app/services/document_processor.py` - PDF processing
3. `backend/app/services/rag/engine.py` - RAG core
4. `frontend/src/App.tsx` - Frontend entry
5. `frontend/src/components/chat/ChatInterface.tsx` - Chat UI
6. `docker-compose.yml` - Easy setup

### Should-Have (Week 2)
7. `backend/app/api/v1/documents.py` - Document API
8. `backend/app/api/v1/chat.py` - Chat API
9. `backend/app/models/document.py` - Document model
10. `frontend/src/services/api.ts` - API client
11. `backend/app/core/security.py` - Authentication
12. `README.md` - Project documentation

### Nice-to-Have (Week 3-4)
13. `backend/app/services/rag/reranker.py` - Advanced RAG
14. `frontend/src/components/knowledge-graph/` - Visualization
15. `tests/` - Comprehensive tests
16. `.github/workflows/` - CI/CD
17. `docs/` - Extended documentation

---

## 🚀 Creation Order

Follow this order during development:

**Day 1:**
1. Create root directory and README
2. Initialize Git repository
3. Create `.gitignore`
4. Set up backend structure
5. Set up frontend structure

**Day 2-3:**
6. Backend: models, schemas, basic routes
7. Frontend: basic components, routing
8. Docker Compose setup

**Day 4-7:**
9. Core RAG implementation
10. Document processing
11. Chat interface
12. API integration

**Week 2-4:**
13. Advanced features
14. Tests
15. Documentation
16. CI/CD

---

## 💡 Tips

### Keep It Organized
- Group related files together
- Use consistent naming conventions
- Add README in complex folders

### Don't Commit
- API keys (use `.env`)
- Uploaded files (`/uploads/`)
- Database files (`*.db`)
- Node modules (`/node_modules/`)
- Python cache (`__pycache__/`)

### Version Control
```bash
# Commit frequently
git add [specific files]
git commit -m "feat: add document upload"

# Push to GitHub
git push origin main
```

### File Naming
- **Python:** `snake_case.py`
- **TypeScript:** `PascalCase.tsx` (components), `camelCase.ts` (utilities)
- **Config:** `kebab-case.yml`

---

## 📦 Empty Folders to Create

Some folders need to exist but start empty:

```bash
mkdir -p data/chroma
mkdir -p data/uploads
mkdir -p docs/images
mkdir -p tests/fixtures/sample_papers

# Add .gitkeep to track in Git
touch data/.gitkeep
touch docs/images/.gitkeep
touch tests/fixtures/.gitkeep
```

---

## 🔍 Find Files Quickly

```bash
# Find all Python files
find . -name "*.py"

# Find all TypeScript components
find ./frontend/src -name "*.tsx"

# Find all configuration files
find . -name "*.json" -o -name "*.yml" -o -name "*.toml"

# Count lines of code
find . -name "*.py" -o -name "*.ts" -o -name "*.tsx" | xargs wc -l
```

---

## ✅ Checklist

Before submission, ensure all key files exist:

- [ ] README.md with comprehensive docs
- [ ] docker-compose.yml for easy setup
- [ ] .env.example with all required variables
- [ ] requirements.txt with pinned versions
- [ ] package.json with project metadata
- [ ] Tests in /tests/ directory
- [ ] API documentation in /docs/api.md
- [ ] Screenshots in /docs/images/
- [ ] LICENSE file (MIT recommended)
- [ ] CONTRIBUTING.md for contributors

---

**This structure is designed to be scalable, maintainable, and hackathon-winning! 🏆**

*Last Updated: November 10, 2026*
