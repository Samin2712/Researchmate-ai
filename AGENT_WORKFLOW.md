# 🤖 Agent Workflow Guide - ResearchMate AI

Guide for multiple agents working on different phases of the project

---

## 🎯 Overview

This document outlines how different agents can work on different phases of the ResearchMate AI project simultaneously or sequentially.

---

## 👥 Agent Roles & Responsibilities

### 🔧 Backend Agent
**Primary Focus**: Server-side development, database, API endpoints

**Skills Required**:
- Python 3.11+
- FastAPI framework
- PostgreSQL & SQLAlchemy
- Docker basics
- REST API design

**Assigned Phases**:
- Phase 1: Infrastructure & Backend Core (Lead)
- Phase 2: AI/ML & RAG System (Support)

**Key Deliverables**:
- FastAPI application structure
- Database models and migrations
- Authentication system
- Document upload API
- PDF processing pipeline
- API documentation

---

### 🧠 AI Agent
**Primary Focus**: Machine learning, RAG system, embeddings

**Skills Required**:
- Python ML libraries (sentence-transformers, LangChain)
- Vector databases (ChromaDB)
- OpenAI API / LLM integration
- RAG architecture
- Prompt engineering

**Assigned Phases**:
- Phase 2: AI/ML & RAG System (Lead)

**Key Deliverables**:
- Vector store implementation
- Embedding generation service
- Text chunking strategy
- RAG engine
- LLM integration
- Chat API with streaming

---

### 🎨 Frontend Agent
**Primary Focus**: User interface, React components, UX

**Skills Required**:
- React 18 + TypeScript
- Tailwind CSS
- React Query & Zustand
- REST API consumption
- Responsive design

**Assigned Phases**:
- Phase 3: Frontend & User Interface (Lead)

**Key Deliverables**:
- React application structure
- Authentication UI
- Document upload UI
- Chat interface
- Dashboard
- Responsive design
- UI/UX polish

---

### 🚀 DevOps Agent
**Primary Focus**: Docker, deployment, testing, CI/CD

**Skills Required**:
- Docker & Docker Compose
- Nginx configuration
- CI/CD (GitHub Actions)
- Testing (pytest, Playwright)
- Performance optimization

**Assigned Phases**:
- Phase 1: Infrastructure Setup (Support)
- Phase 4: Integration & Deployment (Lead)

**Key Deliverables**:
- Docker environment
- CI/CD pipeline
- End-to-end tests
- Performance optimization
- Documentation
- Demo preparation

---

## 📅 Phase-by-Phase Workflow

### Phase 1: Infrastructure & Backend Core (Days 1-4)

#### Backend Agent Tasks
```
Day 1:
✓ Create project structure
✓ Set up FastAPI application
✓ Configure database connection
✓ Create initial models

Day 2:
✓ Implement authentication system
✓ Create user registration/login endpoints
✓ Set up JWT token generation
✓ Test auth flow

Day 3:
✓ Implement document upload endpoint
✓ Create PDF processing service
✓ Store documents in database
✓ Test with sample PDFs

Day 4:
✓ Create document CRUD endpoints
✓ Write unit tests
✓ Document API endpoints
✓ Code review and refinement
```

#### DevOps Agent Tasks (Parallel)
```
Day 1:
✓ Create Docker files
✓ Set up docker-compose.yml
✓ Configure PostgreSQL container
✓ Configure Redis container

Day 2:
✓ Configure ChromaDB container
✓ Set up Docker networking
✓ Create .env configuration
✓ Test docker-compose up

Day 3:
✓ Set up hot reload for development
✓ Configure volume mounts
✓ Create health checks
✓ Document Docker setup

Day 4:
✓ Create setup scripts
✓ Write troubleshooting guide
✓ Test complete Docker environment
✓ Code review
```

**Phase 1 Output**:
- ✅ Working Docker environment
- ✅ Backend API with auth
- ✅ Document upload working
- ✅ Database schema created

---

### Phase 2: AI/ML & RAG System (Days 5-7)

#### AI Agent Tasks
```
Day 5:
✓ Set up ChromaDB client
✓ Implement vector store service
✓ Create embedding service
✓ Test embedding generation

Day 6:
✓ Implement text chunking
✓ Create document ingestion pipeline
✓ Test PDF → chunks → embeddings → vector DB
✓ Optimize chunking strategy

Day 7:
✓ Implement RAG engine core
✓ Integrate OpenAI API
✓ Create prompt templates
✓ Test question answering
✓ Add citation extraction
```

#### Backend Agent Tasks (Support)
```
Day 5-7:
✓ Create chat API endpoints
✓ Implement WebSocket for streaming
✓ Add chat history storage
✓ Integration testing with RAG engine
✓ Document AI endpoints
```

**Phase 2 Output**:
- ✅ Vector database operational
- ✅ Documents auto-indexed
- ✅ RAG engine answering questions
- ✅ Streaming responses working

---

### Phase 3: Frontend & User Interface (Days 8-11)

#### Frontend Agent Tasks
```
Day 8:
✓ Initialize React + Vite project
✓ Set up Tailwind CSS
✓ Create project structure
✓ Implement API service layer

Day 9:
✓ Create authentication UI
✓ Implement login/register forms
✓ Add token storage
✓ Test auth flow

Day 10:
✓ Create document upload UI
✓ Implement drag-and-drop
✓ Create document library view
✓ Test upload flow

Day 11:
✓ Create chat interface
✓ Implement streaming responses
✓ Add source citations display
✓ Polish UI/UX
```

#### Backend Agent Tasks (Support)
```
Day 8-11:
✓ Fix any API issues found by frontend
✓ Add CORS configuration
✓ Optimize API response times
✓ Help with integration issues
```

**Phase 3 Output**:
- ✅ Working frontend application
- ✅ Authentication UI functional
- ✅ Document management working
- ✅ Chat interface polished

---

### Phase 4: Integration & Deployment (Days 12-14)

#### DevOps Agent Tasks
```
Day 12:
✓ Set up E2E tests (Playwright)
✓ Write integration tests
✓ Set up CI/CD pipeline
✓ Run load tests

Day 13:
✓ Optimize Docker images
✓ Set up production docker-compose
✓ Configure nginx
✓ Implement caching

Day 14:
✓ Write complete documentation
✓ Create demo video script
✓ Prepare deployment guide
✓ Final testing
```

#### All Agents (Collaboration)
```
Day 12-14:
✓ Bug fixes
✓ Performance optimization
✓ Documentation review
✓ Demo preparation
✓ Code review
✓ Final polish
```

**Phase 4 Output**:
- ✅ Production-ready deployment
- ✅ Complete documentation
- ✅ All tests passing
- ✅ Demo ready

---

## 🔄 Agent Handoff Protocol

### When Backend Agent Completes Phase 1

**Handoff Document**: `PHASE1_HANDOFF.md`

```markdown
# Phase 1 Handoff

## Completed Items
- ✅ FastAPI application running
- ✅ Database schema created
- ✅ Authentication working
- ✅ Document upload endpoint ready

## API Endpoints Ready
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/documents/upload
- GET /api/v1/documents

## Environment Setup
- Docker environment at: docker-compose.yml
- .env configured with: [list variables]
- Database migrations at: backend/alembic/versions/

## Known Issues
- None

## Next Steps for AI Agent
1. Use vector store service template in app/services/vector_store.py
2. Documents are stored in PostgreSQL, add embeddings to ChromaDB
3. Chat API endpoint structure ready in app/api/v1/chat.py

## Testing
- Run: docker-compose up -d
- Test auth: curl -X POST http://localhost:8000/api/v1/auth/register
- API docs: http://localhost:8000/docs
```

### When AI Agent Completes Phase 2

**Handoff Document**: `PHASE2_HANDOFF.md`

```markdown
# Phase 2 Handoff

## Completed Items
- ✅ RAG engine operational
- ✅ Documents auto-indexed in vector DB
- ✅ Question answering working
- ✅ Streaming responses implemented

## API Endpoints for Frontend
- POST /api/v1/chat/ask
  - Body: {"question": "string", "document_ids": ["string"]}
  - Response: {"answer": "string", "sources": []}

- WS /api/v1/chat/stream
  - Connect with token: ws://localhost:8000/api/v1/chat/stream?token=xxx

## Example Requests
[Include curl examples]

## Known Issues
- None

## Next Steps for Frontend Agent
1. Use API service templates in frontend/src/services/api.ts
2. Implement streaming with WebSocket
3. Display source citations from response

## Testing
- Upload PDF: [curl command]
- Ask question: [curl command]
```

---

## 🤝 Collaboration Guidelines

### Communication

1. **Update BUILD_PHASES.md** after completing each task
   - Change status from ⏳ to 🔄 to ✅
   - Add notes if needed

2. **Create handoff documents** when completing a phase
   - Document what's done
   - List API endpoints
   - Provide examples
   - Note issues

3. **Use clear commit messages**
   ```
   feat(backend): add document upload endpoint
   fix(frontend): resolve CORS issue
   docs(api): update OpenAPI documentation
   test(rag): add unit tests for embedder
   ```

### Code Review

- Review each other's PRs
- Use GitHub PR template
- Test before approving
- Document concerns

### Issue Tracking

- Create GitHub issues for bugs
- Label by component: `backend`, `frontend`, `ai`, `devops`
- Assign to appropriate agent
- Link PRs to issues

---

## 🛠️ Development Tools

### Shared Tools

- **Git**: Version control
- **VS Code**: Recommended editor
- **Docker Desktop**: Container management
- **Postman**: API testing

### Backend/AI Agent Tools

- **Python 3.11+**: Runtime
- **pytest**: Testing
- **Black**: Code formatting
- **mypy**: Type checking

### Frontend Agent Tools

- **Node.js 18+**: Runtime
- **npm/yarn**: Package manager
- **ESLint**: Linting
- **Prettier**: Formatting

### DevOps Agent Tools

- **docker-compose**: Orchestration
- **k6**: Load testing
- **Playwright**: E2E testing
- **GitHub Actions**: CI/CD

---

## 📊 Progress Tracking

### Daily Standups (Async)

Each agent posts in `DAILY_UPDATES.md`:

```markdown
## [Date] - [Agent Name]

### Yesterday
- Completed X
- Fixed Y
- Started Z

### Today
- Will complete Z
- Will start A
- Planning to B

### Blockers
- Waiting for X from [Agent]
- Issue with Y (link to issue)
```

### Weekly Milestones

- **End of Week 1**: Phase 1 & 2 complete
- **End of Week 2**: Phase 3 complete
- **End of Week 3**: Phase 4 complete + Demo ready

---

## 🚀 Quick Start for Each Agent

### Backend Agent

```powershell
# Clone and setup
cd "d:\REACT_JS\STEM2Connect AI Hackathon"
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start services with Docker
docker-compose up -d postgres redis

# Run backend
uvicorn app.main:app --reload

# Open API docs
# http://localhost:8000/docs
```

### AI Agent

```powershell
# Setup (same as backend)
cd "d:\REACT_JS\STEM2Connect AI Hackathon"
cd backend
.\venv\Scripts\activate

# Start all services
docker-compose up -d

# Work on RAG system
# app/services/rag/
```

### Frontend Agent

```powershell
# Setup frontend
cd "d:\REACT_JS\STEM2Connect AI Hackathon"
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
# http://localhost:5173
```

### DevOps Agent

```powershell
# Setup Docker environment
cd "d:\REACT_JS\STEM2Connect AI Hackathon"

# Copy env file
Copy-Item .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## 📞 Support & Questions

- **Technical Issues**: Create GitHub issue with label
- **Architecture Questions**: Tag @backend-agent or @ai-agent
- **Docker Issues**: Tag @devops-agent
- **UI/UX Questions**: Tag @frontend-agent

---

**Last Updated**: November 10, 2026  
**Version**: 1.0
