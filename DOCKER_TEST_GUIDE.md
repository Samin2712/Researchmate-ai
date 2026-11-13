# 🧪 Docker Testing Guide - Verify Your Setup

Complete test suite to verify your ResearchMate AI Docker setup is working correctly.

---

## ✅ Pre-Flight Checklist

Before testing, ensure:

```bash
# 1. All containers are running
docker-compose ps

# Expected output:
# researchmate-postgres    Up (healthy)
# researchmate-redis       Up (healthy)
# researchmate-chromadb    Up (healthy)
# researchmate-backend     Up
# researchmate-frontend    Up

# 2. No errors in logs
docker-compose logs --tail=50
```

---

## 🔍 Test Suite

### Test 1: Health Checks ✅

**What it tests**: All services are responding

```bash
# Backend health
curl http://localhost:8000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "llm_provider": "gemini",
#   "embedding_model": "sentence-transformers/all-MiniLM-L6-v2"
# }

# Frontend loads
curl -I http://localhost:5173

# Expected: HTTP/1.1 200 OK
```

**✅ Pass**: All endpoints return 200 OK  
**❌ Fail**: Check logs with `docker-compose logs [service-name]`

---

### Test 2: Database Connection ✅

**What it tests**: PostgreSQL is accessible

```bash
# Connect to database
docker-compose exec postgres psql -U researchmate -d researchmate -c "SELECT version();"

# Expected: PostgreSQL version info
```

**✅ Pass**: Version info displays  
**❌ Fail**: Database not ready - wait 30s and retry

---

### Test 3: Redis Connection ✅

**What it tests**: Redis cache is working

```bash
# Test Redis
docker-compose exec redis redis-cli ping

# Expected: PONG

# Set and get a value
docker-compose exec redis redis-cli SET test "hello"
docker-compose exec redis redis-cli GET test

# Expected: "hello"
```

**✅ Pass**: PONG received, value stored/retrieved  
**❌ Fail**: Redis service not started

---

### Test 4: ChromaDB Connection ✅

**What it tests**: Vector database is accessible

```bash
# Test ChromaDB API
curl http://localhost:8001/api/v1/heartbeat

# Expected: timestamp response
```

**✅ Pass**: Timestamp returned  
**❌ Fail**: ChromaDB not ready - check logs

---

### Test 5: API Documentation ✅

**What it tests**: FastAPI is serving docs

Open in browser:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)

**✅ Pass**: Both pages load with API documentation  
**❌ Fail**: Backend not started or error in code

---

### Test 6: User Registration ✅

**What it tests**: Complete auth flow

```bash
# Register a new user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "full_name": "Test User"
  }'

# Expected: User created with ID
# {"id": 1, "email": "test@example.com", "full_name": "Test User", ...}
```

**✅ Pass**: User created successfully  
**❌ Fail**: Check backend logs for database errors

---

### Test 7: User Login ✅

**What it tests**: JWT token generation

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpass123"

# Expected: Access token
# {"access_token": "eyJ...", "token_type": "bearer"}

# Save token for next tests
export TOKEN="<paste-token-here>"
```

**✅ Pass**: Token received  
**❌ Fail**: Invalid credentials or auth error

---

### Test 8: Document Upload ✅

**What it tests**: PDF upload and processing pipeline

```bash
# Create a simple test PDF first
docker-compose exec backend python create_sample_pdf.py

# Upload the PDF
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@backend/sample_ai_research.pdf"

# Expected: Document metadata
# {
#   "id": 1,
#   "title": "Artificial Intelligence in STEM Education",
#   "status": "processing",
#   ...
# }

# Save document ID
export DOC_ID=1
```

**✅ Pass**: Upload successful, processing started  
**❌ Fail**: Check file size limits and permissions

---

### Test 9: Document Processing ✅

**What it tests**: RAG pipeline (chunking, embeddings, vector storage)

```bash
# Wait 30 seconds for processing
sleep 30

# Check document status
curl -X GET http://localhost:8000/api/v1/documents/$DOC_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: Status should be "completed"
# {
#   "id": 1,
#   "status": "completed",
#   "chunk_count": 15,
#   ...
# }
```

**✅ Pass**: Status = "completed", chunk_count > 0  
**❌ Fail**: 
- Status = "failed": Check error_message field
- Status = "processing": Wait longer (60s total)
- Check logs: `docker-compose logs backend`

---

### Test 10: Question Answering ✅

**What it tests**: Full RAG pipeline with LLM generation

```bash
# Ask a question about the document
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main benefits of AI in STEM education?",
    "session_id": "test-session-1"
  }'

# Expected: Streaming response with:
# - AI-generated answer
# - Source citations
# - Page numbers
# - Relevance scores
```

**✅ Pass**: 
- Received AI response
- Sources included with page numbers
- Response relates to document content

**❌ Fail**:
- Check Gemini API key in .env
- Verify GOOGLE_API_KEY is set correctly
- Check backend logs for API errors

---

### Test 11: Semantic Search ✅

**What it tests**: Vector similarity search

```bash
# Search for similar content
curl -X GET "http://localhost:8000/api/v1/documents/search?query=quantum+computing" \
  -H "Authorization: Bearer $TOKEN"

# Expected: Relevant document chunks with scores
```

**✅ Pass**: Results returned with relevance scores  
**❌ Fail**: ChromaDB connection issue

---

### Test 12: Frontend Functionality ✅

**What it tests**: React app works end-to-end

**Manual test in browser**:

1. Go to http://localhost:5173
2. Register new user (or login)
3. Upload a PDF document
4. Wait for "Processing Complete" (30-60s)
5. Go to Chat
6. Ask: "What is this document about?"
7. Verify AI response with citations appears

**✅ Pass**: All steps work without errors  
**❌ Fail**: Check browser console and network tab

---

## 🚀 Automated Test Script

Run all backend tests automatically:

```bash
# Run comprehensive test suite
docker-compose exec backend python test_rag.py

# Expected output:
# ✅ TEST 1: Embedding Generation - PASSED
# ✅ TEST 2: Text Chunking - PASSED  
# ✅ TEST 3: Vector Store - PASSED
# ✅ TEST 4: RAG Engine - PASSED
# ✅ TEST 5: Hybrid Search - PASSED
# ✅ TEST 6: Citation Extraction - PASSED
# 
# All tests passed! ✅
```

**Alternative**: Run with real PDF upload

```bash
docker-compose exec backend python test_rag_live.py

# This will:
# 1. Create sample PDF
# 2. Register test user
# 3. Upload PDF
# 4. Wait for processing
# 5. Ask 4 test questions
# 6. Display AI responses with citations
```

---

## 📊 Performance Tests

### Load Test: Multiple Uploads

```bash
# Upload 10 PDFs concurrently
for i in {1..10}; do
  curl -X POST http://localhost:8000/api/v1/documents/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@backend/sample_ai_research.pdf" &
done
wait

# Check all processed
docker-compose exec backend python -c "
from app.core.database import SessionLocal
from app.models.document import Document
db = SessionLocal()
completed = db.query(Document).filter_by(status='completed').count()
print(f'Completed: {completed}/10')
"
```

**✅ Pass**: All 10 documents processed  
**❌ Fail**: Check system resources

---

### Stress Test: Many Questions

```bash
# Ask 20 questions rapidly
for i in {1..20}; do
  curl -X POST http://localhost:8000/api/v1/chat/message \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message": "Summarize this paper.", "session_id": "stress-test"}' &
done
wait
```

**✅ Pass**: All responses received  
**❌ Fail**: Hit rate limits or resource limits

---

## 🐛 Debugging Failed Tests

### Backend Won't Start

```bash
# View detailed logs
docker-compose logs backend --tail=100

# Common issues:
# 1. Missing API key
#    Fix: Add GOOGLE_API_KEY to .env
#
# 2. Database connection failed
#    Fix: Wait for postgres to be healthy
#    docker-compose ps postgres
#
# 3. Port conflict
#    Fix: Stop service using port 8000
#    netstat -ano | findstr "8000"
```

### Processing Fails

```bash
# Check document error
curl -X GET http://localhost:8000/api/v1/documents/$DOC_ID \
  -H "Authorization: Bearer $TOKEN"

# Look at error_message field

# Check vector store
docker-compose exec backend python -c "
from app.services.vector_store import vector_store
collections = vector_store.client.list_collections()
print(f'Collections: {[c.name for c in collections]}')
"
```

### API Returns Errors

```bash
# Enable debug logging
docker-compose exec backend python -c "
import os
os.environ['LOG_LEVEL'] = 'DEBUG'
"

docker-compose restart backend
docker-compose logs -f backend
```

---

## 📈 Success Metrics

After all tests pass, you should have:

- ✅ All 5 Docker containers running healthy
- ✅ Backend API responding on port 8000
- ✅ Frontend serving on port 5173
- ✅ User registration & login working
- ✅ PDF upload completing successfully
- ✅ Documents processed with chunks & embeddings
- ✅ Questions answered with AI responses
- ✅ Citations extracted with page numbers
- ✅ No errors in logs

---

## 🎯 Next Steps

Once all tests pass:

1. **Customize Configuration**
   - Edit `.env` for your preferences
   - Try different LLM models
   - Adjust RAG parameters

2. **Add Real Documents**
   - Upload actual research papers
   - Test with various PDF formats
   - Build your research library

3. **Explore API**
   - Visit http://localhost:8000/docs
   - Try different endpoints
   - Build custom integrations

4. **Deploy to Production**
   - See [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md#production-deployment)
   - Configure SSL
   - Set up monitoring

---

## 📞 Still Having Issues?

1. **Check logs**: `docker-compose logs -f`
2. **Restart services**: `docker-compose restart`
3. **Nuclear option**: `docker-compose down -v && docker-compose up -d`
4. **Review documentation**: See [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md)

---

**Happy Testing!** 🎉

If all tests pass, you have a fully functional RAG-powered research assistant ready to use!
