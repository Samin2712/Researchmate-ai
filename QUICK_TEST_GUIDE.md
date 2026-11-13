# 🚀 Quick RAG Testing Guide

## Current Status

- ✅ All RAG components implemented
- ✅ Backend code complete
- 🔄 Docker build in progress (very slow - ~5-10 min remaining)
- ⚠️ Frontend not set up yet (doesn't affect RAG testing)

---

## Option 1: Test Locally (FASTEST - Recommended)

### Prerequisites
```powershell
# Navigate to backend
cd backend

# Activate virtual environment (if exists)
.\venv\Scripts\activate

# Or create new one
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Run Comprehensive RAG Tests

#### Test 1: RAG Components (Unit Test)
```powershell
python test_rag.py
```
**What it tests**:
- ✅ Embedding generation
- ✅ Text chunking
- ✅ Vector store operations
- ✅ RAG engine
- ✅ Hybrid search
- ✅ Citation extraction

#### Test 2: End-to-End RAG (Integration Test)
```powershell
python test_rag_live.py
```
**What it does**:
1. Creates a sample PDF
2. Registers test user
3. Uploads and processes PDF
4. Asks 4 different questions
5. Shows AI responses with citations

#### Test 3: API Endpoints
```powershell
python test_api.py
```
**What it tests**:
- ✅ Health endpoint
- ✅ User registration
- ✅ User login
- ✅ Document upload
- ✅ Document listing
- ✅ Chat API

---

## Option 2: Test with Docker (Currently Building)

### Check Build Status
```powershell
# In another terminal
docker-compose -f docker-compose.backend-only.yml logs -f backend
```

### Once Build Completes

#### 1. Verify Services are Running
```powershell
docker ps
```
You should see:
- researchmate-postgres (healthy)
- researchmate-redis (healthy)
- researchmate-chromadb (healthy)
- researchmate-backend (running)

#### 2. Check Health
```powershell
curl http://localhost:8000/health
```

#### 3. Run Tests Inside Container
```powershell
docker-compose -f docker-compose.backend-only.yml exec backend python test_rag_live.py
```

---

## Option 3: Manual API Testing (Using curl or Postman)

### 1. Health Check
```powershell
curl http://localhost:8000/health
```

### 2. Register User
```powershell
$body = @{
    email = "test@example.com"
    password = "testpass123"
    full_name = "Test User"
} | ConvertTo-Json

curl -X POST http://localhost:8000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -Body $body
```

### 3. Login
```powershell
curl -X POST http://localhost:8000/api/v1/auth/login `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "username=test@example.com&password=testpass123"
```
**Save the access_token from response!**

### 4. Upload Document
```powershell
# First create sample PDF
cd backend
python create_sample_pdf.py

# Then upload
$token = "YOUR_ACCESS_TOKEN_HERE"
curl -X POST http://localhost:8000/api/v1/documents/upload `
  -H "Authorization: Bearer $token" `
  -F "file=@sample_ai_research.pdf"
```

### 5. Ask Question (RAG)
```powershell
$body = @{
    message = "What are the main benefits of AI in STEM education?"
    session_id = "test-session-1"
} | ConvertTo-Json

curl -X POST http://localhost:8000/api/v1/chat/message `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -Body $body
```

---

## Quick Diagnostic Commands

### Check if Backend is Running
```powershell
curl http://localhost:8000/health
```

### Check ChromaDB
```powershell
curl http://localhost:8001/api/v1/heartbeat
```

### Check PostgreSQL
```powershell
docker-compose -f docker-compose.backend-only.yml exec postgres psql -U researchmate -d researchmate -c "SELECT version();"
```

### Check Redis
```powershell
docker-compose -f docker-compose.backend-only.yml exec redis redis-cli ping
```

### View Backend Logs
```powershell
docker-compose -f docker-compose.backend-only.yml logs -f backend
```

---

## Expected Results

### ✅ Successful RAG Test Output
```
✅ TEST 1: Embedding Generation - PASSED
   Generated embedding vector of dimension 384

✅ TEST 2: Text Chunking - PASSED
   Created 15 chunks from document

✅ TEST 3: Vector Store - PASSED
   Stored and retrieved 15 embeddings

✅ TEST 4: RAG Engine - PASSED
   Retrieved 5 relevant chunks for query

✅ TEST 5: Hybrid Search - PASSED
   Semantic + keyword search working

✅ TEST 6: Citation Extraction - PASSED
   Extracted 3 sources with page numbers

All tests passed! ✅
```

### ✅ Successful Live Test Output
```
📄 Creating sample PDF...
✅ PDF created: sample_ai_research.pdf

👤 Registering test user...
✅ User registered: test@example.com

📤 Uploading document...
✅ Document uploaded: ID=1, Status=processing

⏳ Waiting for processing...
✅ Document processed: 15 chunks created

💬 Question 1: What is this document about?
🤖 Response: This document discusses the integration of Artificial Intelligence in STEM education. It explores how AI technologies can enhance learning experiences, provide personalized instruction, and improve educational outcomes for students in science, technology, engineering, and mathematics fields.

📚 Sources:
   - Page 1: "Artificial Intelligence in STEM Education" (score: 0.89)
   - Page 2: "AI-powered learning platforms..." (score: 0.85)
```

---

## Troubleshooting

### Issue: "Connection refused"
**Solution**: Backend not running yet
```powershell
# Check if services are up
docker ps

# Restart if needed
docker-compose -f docker-compose.backend-only.yml restart backend
```

### Issue: "401 Unauthorized"
**Solution**: Invalid or expired token
```powershell
# Login again to get new token
curl -X POST http://localhost:8000/api/v1/auth/login ...
```

### Issue: "Document processing failed"
**Solution**: Check backend logs
```powershell
docker-compose -f docker-compose.backend-only.yml logs backend
```

### Issue: "ChromaDB connection error"
**Solution**: ChromaDB not ready
```powershell
# Check ChromaDB health
curl http://localhost:8001/api/v1/heartbeat

# Restart if needed
docker-compose -f docker-compose.backend-only.yml restart chromadb
```

---

## Performance Expectations

| Operation | Expected Time |
|-----------|---------------|
| User Registration | < 500ms |
| User Login | < 300ms |
| Document Upload | < 1s |
| Document Processing (10 pages) | 5-10s |
| Embedding Generation | 50-100ms per chunk |
| Vector Search | 20-50ms |
| LLM Generation | 1-3s |
| **Total Query Time** | **2-4s** |

---

## API Documentation

Once backend is running:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Next Steps After Successful Testing

1. ✅ Verify all tests pass
2. ✅ Test with your own PDF documents
3. ✅ Experiment with different questions
4. ✅ Adjust RAG parameters (chunk size, top-K, etc.)
5. 🔄 Set up frontend (React + Vite)
6. 🔄 Deploy to production

---

## Support

If you encounter issues:
1. Check `backend/logs/app.log`
2. Review Docker logs: `docker-compose logs`
3. Verify environment variables in `.env`
4. Ensure API keys are valid (GOOGLE_API_KEY)

---

**Last Updated**: 2026-11-11  
**Docker Build Status**: In Progress (~80% complete)  
**Recommended**: Start with Option 1 (local testing) for fastest results!
