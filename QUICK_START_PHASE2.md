# 🚀 Quick Start Guide - Phase 2 Testing

## What You Need to Add

### 1️⃣ Get FREE Gemini API Key (2 minutes)

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your key (starts with `AIza...`)

### 2️⃣ Configure Environment

Edit `backend/.env`:
```bash
# Add these lines
GOOGLE_API_KEY=AIzaSy...your-actual-key-here
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-1.5-flash
```

### 3️⃣ Run Tests

```powershell
# Navigate to backend
cd backend

# Run comprehensive test suite
python test_rag.py
```

**Expected Output**:
```
✅ PASS - Embeddings
✅ PASS - Chunking
✅ PASS - Vector Store
✅ PASS - LLM
✅ PASS - RAG System

📊 Overall: 5/5 tests passed (100.0%)
🎉 All tests passed! Phase 2 is complete!
```

---

## 🧪 Manual Testing

### Start Backend
```powershell
# Option 1: With Docker
docker-compose up -d backend

# Option 2: Without Docker
cd backend
python -m uvicorn app.main:app --reload
```

### Test Upload Document
```powershell
# First, get auth token by logging in
$token = "your_jwt_token_here"

# Upload a PDF
curl -X POST http://localhost:8000/api/v1/documents/upload `
  -H "Authorization: Bearer $token" `
  -F "file=@path/to/your/paper.pdf"
```

**Response**:
```json
{
  "id": 1,
  "title": "your_paper.pdf",
  "status": "PROCESSING",
  "created_at": "2026-11-11T00:00:00"
}
```

Wait ~10 seconds for processing to complete.

### Test Ask Question
```powershell
# Ask a question
curl -X POST http://localhost:8000/api/v1/chat/ask `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{
    "message": "What is this paper about?",
    "document_ids": [1]
  }'
```

**Response**:
```json
{
  "session_id": 1,
  "message": {
    "role": "assistant",
    "content": "This paper discusses... [Page 1]",
    "sources": [...],
    "confidence_score": 0.87
  },
  "sources": [
    {
      "document_id": 1,
      "title": "Research Paper",
      "page_number": 1,
      "similarity_score": 0.92
    }
  ],
  "metadata": {
    "chunks_retrieved": 5,
    "provider": "gemini"
  }
}
```

### Test Streaming
```powershell
# Stream response
curl -X POST http://localhost:8000/api/v1/chat/stream `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"message": "Explain quantum computing"}'
```

**Response** (Server-Sent Events):
```
data: {"type": "session", "session_id": 1}
data: {"type": "metadata", "chunks_retrieved": 5}
data: {"type": "answer", "content": "Quantum", "done": false}
data: {"type": "answer", "content": " computing", "done": false}
...
data: {"type": "complete"}
```

---

## 🔍 Verify Implementation

### Check Vector Store
```powershell
cd backend
python -c "
from app.services.vector_store import vector_store
stats = vector_store.get_collection_stats()
print(f'Total chunks: {stats[\"total_chunks\"]}')
print(f'Status: {stats[\"status\"]}')
"
```

### Check Embedder
```powershell
python -c "
from app.services.embedder import embedder
print(f'Model: {embedder.model_name}')
print(f'Dimension: {embedder.get_embedding_dimension()}')
"
```

### Check LLM
```powershell
python -c "
from app.services.llm_service import llm_service
info = llm_service.get_provider_info()
print(f'Provider: {info[\"provider\"]}')
print(f'Is Free: {info.get(\"is_free\", False)}')
"
```

---

## 📊 What's Implemented

### ✅ Services
- `vector_store.py` - ChromaDB integration
- `embedder.py` - Sentence-transformers
- `chunker.py` - Smart text chunking
- `ingestion_pipeline.py` - PDF → Vector store
- `rag/engine.py` - Question answering
- `rag/hybrid_search.py` - BM25 + semantic search

### ✅ APIs
- `POST /api/v1/chat/ask` - Standard Q&A
- `POST /api/v1/chat/stream` - Streaming Q&A
- `POST /api/v1/documents/upload` - Auto-embedding

### ✅ Tests
- `backend/test_rag.py` - Complete test suite

---

## 🐛 Troubleshooting

### Issue: "No LLM provider available"
**Solution**: Add `GOOGLE_API_KEY` to `.env`

### Issue: "Module not found: google.generativeai"
**Solution**: 
```powershell
pip install google-generativeai
# or
docker-compose build backend
```

### Issue: "ChromaDB collection not found"
**Solution**: Vector store auto-creates on first use. Just wait a moment.

### Issue: "Rate limit exceeded"
**Solution**: Gemini free tier: 15 RPM. Wait 1 minute and retry.

---

## 📈 Performance Expectations

- **Upload 10-page PDF**: 5-10 seconds
- **Upload 100-page PDF**: 30-60 seconds
- **Ask question**: 2-3 seconds
- **Streaming response**: <100ms per token
- **Embedding generation**: ~1000 sentences/sec

---

## 🎯 Next Steps

1. ✅ Add Gemini API key
2. ✅ Run test suite (`python backend/test_rag.py`)
3. ✅ Test with real PDFs
4. ✅ Verify chat works end-to-end
5. 🚀 Ready for Phase 3 (Frontend)!

---

## 💡 Tips

- **Use short PDFs first** (5-10 pages) for faster testing
- **Check logs** at `backend/logs/app.log` for debugging
- **Clear vector store** if needed: Delete `backend/data/chroma/`
- **Gemini is FREE** - No credit card needed!

---

## 📞 Need Help?

Check these files:
- `PHASE2_COMPLETION_SUMMARY.md` - Detailed documentation
- `GEMINI_SETUP.md` - Gemini API setup guide
- `BUILD_PHASES.md` - Overall project progress
- `backend/logs/app.log` - Application logs

---

**Ready to test? Run `python backend/test_rag.py`!** 🚀
