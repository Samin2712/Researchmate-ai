# 🤖 Agent Commands Guide - How to Assign Work

Complete guide on how to give commands to different agents (or Kiro in different sessions) to work on specific phases

---

## 📋 Overview

You can work with agents in two ways:
1. **Single Agent (Kiro)** - Open different sessions for different tasks
2. **Multiple Agents** - Assign different people/agents to different phases
3. **Kiro Sub-Agents** - Use `invoke_sub_agent` tool to delegate tasks

---

## 🎯 Method 1: Using Kiro in Different Sessions (Recommended)

Open a new Kiro session for each phase and give these commands:

### 📦 Phase 1: Backend Infrastructure

**Open New Session → Copy/Paste This:**

```
I'm working on ResearchMate AI project located at "d:\REACT_JS\STEM2Connect AI Hackathon"

Read these files first:
- BUILD_PHASES.md (Phase 1 section)
- AGENT_WORKFLOW.md (Backend Agent section)
- .env.example

Then complete Phase 1, Task 1.3: Backend Framework Setup
- Set up FastAPI application in backend/app/main.py
- Create core configuration
- Add health check endpoint
- Set up CORS middleware
- Test with uvicorn

Follow the exact structure from BUILD_PHASES.md.
Update the checklist as you complete tasks.
```

### 🧠 Phase 2: AI/ML & RAG System

**Open New Session → Copy/Paste This:**

```
I'm working on ResearchMate AI project at "d:\REACT_JS\STEM2Connect AI Hackathon"

Context:
- Phase 1 is complete (backend API is running)
- Database is set up
- Document upload works

Read these files:
- BUILD_PHASES.md (Phase 2 section)
- TECHNICAL_ARCHITECTURE.md (RAG section)
- backend/app/services/llm_service.py (already exists)

Now complete Phase 2: AI/ML & RAG System
Start with Task 2.1: ChromaDB Vector Store Setup

Implement:
- Vector store service
- Embedding generation
- Text chunking
- Document ingestion pipeline
- RAG engine
- Chat API endpoints

Use Google Gemini (FREE) - the LLM service is already configured.
Update BUILD_PHASES.md as you complete tasks.
```

### 🎨 Phase 3: Frontend Development

**Open New Session → Copy/Paste This:**

```
I'm working on ResearchMate AI at "d:\REACT_JS\STEM2Connect AI Hackathon"

Context:
- Backend API is complete at http://localhost:8000
- Phase 1 & 2 are done
- Chat API endpoints are ready

Read these files:
- BUILD_PHASES.md (Phase 3 section)
- API docs at http://localhost:8000/docs

Now complete Phase 3: Frontend & User Interface

Tasks:
1. Initialize React + Vite + TypeScript in frontend/
2. Set up Tailwind CSS
3. Create API service layer
4. Build authentication UI (login/register)
5. Build document upload UI (drag-and-drop)
6. Build chat interface (with streaming)
7. Polish UI/UX

Use the API endpoints from the backend.
Update BUILD_PHASES.md as you complete tasks.
```

### 🚀 Phase 4: Testing & Deployment

**Open New Session → Copy/Paste This:**

```
I'm working on ResearchMate AI at "d:\REACT_JS\STEM2Connect AI Hackathon"

Context:
- All phases 1-3 are complete
- Full stack application is working
- Need testing, optimization, and deployment prep

Read these files:
- BUILD_PHASES.md (Phase 4 section)
- DOCKER_SETUP_GUIDE.md

Now complete Phase 4: Integration & Deployment

Tasks:
1. Write E2E tests with Playwright
2. Write unit tests (pytest for backend, Jest for frontend)
3. Set up CI/CD pipeline
4. Optimize Docker for production
5. Complete documentation
6. Create demo video script
7. Final testing and polish

Goal: Production-ready application.
Update BUILD_PHASES.md as you complete tasks.
```

---

## 🎯 Method 2: Using Kiro Sub-Agents (Advanced)

You can delegate specific tasks to specialized sub-agents:

### Example 1: Delegate Backend Setup

**In Current Session:**

```
Use the general-task-execution sub-agent to complete Phase 1, Task 1.3 (Backend Framework Setup).

Context files:
- BUILD_PHASES.md
- AGENT_WORKFLOW.md

Task: Set up FastAPI application with:
- Main application file (app/main.py)
- Configuration (app/core/config.py)
- Health check endpoint
- CORS middleware
- API documentation

Update BUILD_PHASES.md when done.
```

### Example 2: Delegate AI Implementation

**In Current Session:**

```
Use the general-task-execution sub-agent to implement the RAG engine.

Context: Phase 1 is complete, database and document upload working.

Task: Implement Phase 2 RAG System:
- Vector store with ChromaDB
- Embedding generation service
- Document ingestion pipeline
- RAG question-answering engine

Use the LLM service in backend/app/services/llm_service.py (already configured for Gemini).
```

---

## 📝 Method 3: Detailed Step-by-Step Commands

If you want more control, break down into smaller tasks:

### Backend Tasks (Individual Commands)

#### Command 1: Create Main Application

```
Create the FastAPI main application file at backend/app/main.py

Requirements:
- Import FastAPI
- Create app instance with title "ResearchMate AI"
- Set up CORS middleware for http://localhost:5173
- Create root endpoint that returns {"message": "ResearchMate AI", "version": "1.0.0"}
- Create health endpoint at /health
- Include API documentation at /docs

Follow the structure in TECHNICAL_ARCHITECTURE.md.
```

#### Command 2: Database Models

```
Create SQLAlchemy database models in backend/app/models/

Create these models:
1. User model (id, email, password_hash, created_at)
2. Document model (id, user_id, title, authors, year, abstract, file_path, status, created_at)
3. Chunk model (id, document_id, text, page_number, chunk_index, vector_id)
4. ChatSession model (id, user_id, title, created_at)
5. ChatMessage model (id, session_id, role, content, sources, created_at)

Use async SQLAlchemy with PostgreSQL.
Refer to TECHNICAL_ARCHITECTURE.md for schema details.
```

#### Command 3: Authentication System

```
Implement JWT authentication system:

Create backend/app/core/security.py:
- Password hashing with bcrypt
- JWT token generation
- Token verification
- get_current_user dependency

Create backend/app/api/v1/auth.py:
- POST /register endpoint
- POST /login endpoint
- GET /me endpoint (returns current user)

Create backend/app/schemas/user.py for Pydantic models.
```

### AI/ML Tasks (Individual Commands)

#### Command 1: Vector Store

```
Create ChromaDB vector store service at backend/app/services/vector_store.py

Implement:
- VectorStore class
- __init__ method (connect to ChromaDB)
- add_documents method (store embeddings)
- search method (semantic search)
- delete_by_metadata method

Use the configuration from app/core/config.py.
Refer to TECHNICAL_ARCHITECTURE.md for implementation details.
```

#### Command 2: Embedding Service

```
Create embedding service at backend/app/services/embedder.py

Implement:
- EmbeddingService class using sentence-transformers
- embed_documents method (batch processing)
- embed_query method (single query)
- Use model: sentence-transformers/all-MiniLM-L6-v2

Should generate 384-dimensional embeddings.
```

#### Command 3: RAG Engine

```
Create RAG engine at backend/app/services/rag/engine.py

Implement RAGEngine class with:
- answer_question method (main RAG pipeline)
- _build_context method (format retrieved docs)
- _generate_answer method (use llm_service)
- _calculate_confidence method

Use the llm_service from app/services/llm_service.py (already configured).
Integrate with vector_store and embedder services.
```

### Frontend Tasks (Individual Commands)

#### Command 1: React Setup

```
Initialize React + TypeScript project in frontend/

Steps:
1. Run: npm create vite@latest . -- --template react-ts
2. Install dependencies: tailwindcss, react-router-dom, axios, @tanstack/react-query, zustand
3. Set up Tailwind CSS
4. Create directory structure:
   - src/components/
   - src/pages/
   - src/services/
   - src/store/
   - src/types/

Create basic App.tsx with routing.
```

#### Command 2: API Service Layer

```
Create API service at frontend/src/services/api.ts

Implement:
- Axios instance with base URL from env
- Request interceptor for auth token
- documentService (upload, list, delete)
- chatService (ask, stream)
- authService (login, register)

TypeScript interfaces for all request/response types.
```

#### Command 3: Chat Interface

```
Create chat interface components:

1. frontend/src/components/chat/ChatInterface.tsx
   - Message list with auto-scroll
   - Input field
   - Send button
   - Loading states

2. frontend/src/components/chat/MessageBubble.tsx
   - User message style
   - Assistant message style
   - Source citations display

3. frontend/src/pages/Chat.tsx
   - Main chat page
   - State management with useState
   - Integration with chatService

Use Tailwind CSS for styling.
```

---

## 🔄 Tracking Progress

After each command/session, the agent should:

### 1. Update BUILD_PHASES.md

Change task status:
- ⏳ → 🔄 (when starting)
- 🔄 → ✅ (when complete)

### 2. Create Handoff Document

When phase is complete, create `PHASE_X_HANDOFF.md`:

```markdown
# Phase X Handoff

## Completed Items
- ✅ Task 1
- ✅ Task 2

## Files Created
- path/to/file1.py
- path/to/file2.tsx

## API Endpoints (if backend)
- POST /api/v1/endpoint1
- GET /api/v1/endpoint2

## How to Test
[Commands to test the work]

## Known Issues
- None

## Next Phase Notes
[Information for next agent]
```

### 3. Commit Changes

```powershell
git add .
git commit -m "feat(phase-1): complete backend framework setup"
git push
```

---

## 💬 Example Conversation Flow

### Starting Phase 1

**You:**
```
I need to start building ResearchMate AI. Begin with Phase 1 from BUILD_PHASES.md.
Start with task 1.3: Backend Framework Setup.
```

**Kiro Response:**
- Reads BUILD_PHASES.md
- Creates backend/app/main.py
- Sets up configuration
- Creates health endpoint
- Tests with uvicorn
- Updates BUILD_PHASES.md (✅ task 1.3)
- Tells you what's done and what's next

### Continuing to Next Task

**You:**
```
Great! Now continue with task 1.4: Database Setup.
```

**Kiro Response:**
- Creates database models
- Sets up Alembic
- Creates migrations
- Tests database connection
- Updates BUILD_PHASES.md (✅ task 1.4)
- Provides next steps

### Starting New Phase (New Session)

**You:**
```
I'm starting Phase 2. Phase 1 is complete (backend API is running).
Complete Phase 2 from BUILD_PHASES.md: AI/ML & RAG System.
Start with task 2.1: ChromaDB Vector Store Setup.
```

**Kiro Response:**
- Reads Phase 2 requirements
- Creates vector store service
- Implements embedding generation
- Tests with sample data
- Updates BUILD_PHASES.md
- Provides integration instructions

---

## 🎯 Quick Command Templates

### For Complete Phase

```
Complete Phase [NUMBER] from BUILD_PHASES.md.
Previous phases are done and working.
Update the checklist as you go.
```

### For Single Task

```
Complete Phase [NUMBER], Task [NUMBER].[NUMBER] from BUILD_PHASES.md.
Follow the requirements exactly.
Update BUILD_PHASES.md when done.
```

### For Specific Feature

```
Implement [FEATURE NAME] as described in BUILD_PHASES.md Phase [NUMBER].
Context: [what's already done]
Requirements: [specific requirements]
Test it and confirm it works.
```

### For Bug Fix

```
There's an issue with [FEATURE].
Error: [error message]
Fix the issue and test it works.
```

### For Testing

```
Write tests for Phase [NUMBER] implementation.
Use pytest for backend, Jest for frontend.
Aim for >70% coverage.
```

---

## 🤝 Multi-Agent Collaboration

If working with multiple people/agents:

### Backend Developer

```
You're the Backend Agent working on Phase 1.
Project: d:\REACT_JS\STEM2Connect AI Hackathon
Your tasks: See BUILD_PHASES.md Phase 1
Your guide: AGENT_WORKFLOW.md Backend Agent section

Start with task 1.3 and work through 1.8.
Commit after each task.
Create handoff document when done.
```

### AI/ML Developer

```
You're the AI Agent working on Phase 2.
Project: d:\REACT_JS\STEM2Connect AI Hackathon
Your tasks: See BUILD_PHASES.md Phase 2
Your guide: AGENT_WORKFLOW.md AI Agent section

Backend is ready (Phase 1 done).
Start with task 2.1 and work through 2.7.
Use Gemini LLM (free) - already configured.
```

### Frontend Developer

```
You're the Frontend Agent working on Phase 3.
Project: d:\REACT_JS\STEM2Connect AI Hackathon
Your tasks: See BUILD_PHASES.md Phase 3
Your guide: AGENT_WORKFLOW.md Frontend Agent section

Backend API ready at http://localhost:8000/docs
Start with task 3.1 and work through 3.8.
```

### DevOps Engineer

```
You're the DevOps Agent working on Phase 4.
Project: d:\REACT_JS\STEM2Connect AI Hackathon
Your tasks: See BUILD_PHASES.md Phase 4
Your guide: AGENT_WORKFLOW.md DevOps Agent section

App is feature-complete (Phases 1-3 done).
Focus on testing, optimization, deployment.
```

---

## 📊 Progress Tracking Commands

### Check Status

```
Show me the progress of BUILD_PHASES.md.
Which tasks are complete? Which are pending?
```

### Generate Report

```
Generate a progress report from BUILD_PHASES.md.
Include:
- Overall completion percentage
- Completed tasks
- Remaining tasks
- Estimated time to complete
```

### Create Handoff

```
Create a Phase [NUMBER] handoff document.
Include:
- What was completed
- Files created/modified
- How to test
- Notes for next phase
```

---

## 🚀 Getting Started Now

### Immediate Next Steps

**Choose your approach:**

#### Option A: Do It All Yourself (with Kiro)
```
Start Phase 1 from BUILD_PHASES.md.
Complete tasks 1.3 through 1.8 one by one.
I'll help with each task.
```

#### Option B: Phase by Phase
```
Complete just Phase 1 now.
I'll work on Phase 2 later in a new session.
Start with task 1.3: Backend Framework Setup.
```

#### Option C: Specific Task Only
```
Just implement task 1.3: Backend Framework Setup.
I'll do the rest later.
```

---

## 💡 Tips for Best Results

### 1. Be Specific
❌ "Build the backend"
✅ "Complete Phase 1, Task 1.3: Backend Framework Setup from BUILD_PHASES.md"

### 2. Provide Context
✅ "Phase 1 is complete. Backend API is running at localhost:8000"

### 3. Reference Documentation
✅ "Follow the structure in TECHNICAL_ARCHITECTURE.md"

### 4. Request Testing
✅ "Implement it and test that it works"

### 5. Ask for Updates
✅ "Update BUILD_PHASES.md when done"

---

## 📞 Example Commands for Right Now

### To Start Immediately

**Pick one:**

1️⃣ **Full Phase 1**
```
Complete Phase 1 from BUILD_PHASES.md.
Start with task 1.3 (Backend Framework Setup).
Work through all tasks in order.
Update the checklist as you go.
Test everything works.
```

2️⃣ **Just Backend Setup**
```
Implement task 1.3 from BUILD_PHASES.md: Backend Framework Setup.
Create FastAPI app in backend/app/main.py.
Follow TECHNICAL_ARCHITECTURE.md.
Test with uvicorn.
```

3️⃣ **Database First**
```
Set up the PostgreSQL database for ResearchMate AI.
Create models from BUILD_PHASES.md task 1.4.
Set up Alembic migrations.
Test connection.
```

---

**Just copy/paste any of these commands and I'll start working! 🚀**
