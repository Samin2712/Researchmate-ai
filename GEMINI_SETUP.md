# 🆓 Google Gemini Setup Guide - FREE API

Complete guide to using Google Gemini API (completely FREE) instead of OpenAI

---

## 🌟 Why Google Gemini?

### ✅ Advantages
- **100% FREE** - No credit card required
- **Generous rate limits** - 60 requests per minute (free tier)
- **Powerful models**:
  - `gemini-1.5-flash` - Fast, multimodal (recommended for development)
  - `gemini-1.5-pro` - Advanced reasoning (free with limits)
  - `gemini-pro` - Text-only (legacy but stable)
- **Multimodal support** - Text, images, documents
- **2M token context window** - Much larger than GPT-4

### 📊 Free Tier Limits
- **Rate Limits**: 
  - 15 RPM (requests per minute) for gemini-1.5-pro
  - 15 RPM for gemini-1.5-flash
  - 2 RPM for gemini-pro
- **Token Limits**: 32,000 tokens per minute
- **No expiration** - Free tier doesn't expire
- **No credit card** - Required only for paid tier

---

## 🚀 Quick Start (3 Minutes)

### Step 1: Get Your Free API Key

1. **Visit Google AI Studio**
   - Go to: https://makersuite.google.com/app/apikey
   - Or: https://aistudio.google.com/app/apikey

2. **Sign in with Google Account**
   - Use any personal Gmail account
   - No payment method needed

3. **Create API Key**
   - Click "Create API Key"
   - Choose "Create API key in new project" (or use existing)
   - Copy your API key (starts with `AIza...`)

### Step 2: Configure Your Project

```powershell
# Navigate to your project
cd "d:\REACT_JS\STEM2Connect AI Hackathon"

# Copy environment file
Copy-Item .env.example .env

# Edit .env and add:
# GOOGLE_API_KEY=AIzaSy...your-actual-key
# LLM_PROVIDER=gemini
# GEMINI_MODEL=gemini-1.5-flash
```

### Step 3: Test Your Setup

```powershell
# Start Docker services
docker-compose up -d

# Check backend logs
docker-compose logs backend

# You should see: "✅ Using Google Gemini (FREE)"
```

---

## ⚙️ Configuration Options

### Environment Variables

```bash
# .env file

# PRIMARY: Google Gemini (FREE)
GOOGLE_API_KEY=AIzaSy...your-key-here
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-1.5-flash

# Model Options:
# - gemini-1.5-flash    (Recommended - Fast, efficient, multimodal)
# - gemini-1.5-pro      (Most capable, higher rate limits)
# - gemini-pro          (Legacy, text-only, stable)

# LLM Parameters
LLM_TEMPERATURE=0.7      # 0.0-1.0 (higher = more creative)
LLM_MAX_TOKENS=2000      # Max output length
```

### Available Models Comparison

| Model | Speed | Quality | Context | Multimodal | RPM (Free) |
|-------|-------|---------|---------|------------|------------|
| **gemini-1.5-flash** | ⚡⚡⚡ | ⭐⭐⭐⭐ | 1M tokens | ✅ | 15 |
| **gemini-1.5-pro** | ⚡⚡ | ⭐⭐⭐⭐⭐ | 2M tokens | ✅ | 15 |
| **gemini-pro** | ⚡⚡⚡ | ⭐⭐⭐ | 32k tokens | ❌ | 2 |

**Recommendation**: Use `gemini-1.5-flash` for development - it's fast, free, and high quality!

---

## 🧪 Testing Your Setup

### Test 1: Check API Key

```python
# test_gemini.py
import google.generativeai as genai
import os

# Configure
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Test
model = genai.GenerativeModel('gemini-1.5-flash')
response = model.generate_content("Hello, Gemini! Are you working?")
print(response.text)
```

```powershell
# Run test
python test_gemini.py
```

### Test 2: API Endpoint Test

```powershell
# Start the backend
docker-compose up -d backend

# Test health endpoint
curl http://localhost:8000/health

# Should return:
# {
#   "status": "healthy",
#   "llm_provider": "gemini",
#   "is_free": true
# }
```

### Test 3: RAG Question

```powershell
# Upload a PDF
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -F "file=@sample_paper.pdf"

# Ask a question (using Gemini)
curl -X POST http://localhost:8000/api/v1/chat/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is this paper about?"}'
```

---

## 💡 Code Examples

### Example 1: Simple Question Answering

```python
from app.services.llm_service import llm_service

# Generate response
answer = await llm_service.generate(
    prompt="Explain quantum computing in simple terms",
    system_prompt="You are a helpful science educator.",
    temperature=0.7,
    max_tokens=500
)

print(answer)
# Uses Gemini automatically!
```

### Example 2: Streaming Responses

```python
from app.services.llm_service import llm_service

# Stream response
async for chunk in llm_service.stream_generate(
    prompt="Write a poem about AI",
    system_prompt="You are a creative poet."
):
    print(chunk, end="", flush=True)
```

### Example 3: RAG with Context

```python
from app.services.llm_service import llm_service

# Build context from retrieved documents
context = """
[Document 1]
Quantum computers use qubits which can be 0 and 1 simultaneously.

[Document 2]
Superposition allows quantum computers to process many possibilities at once.
"""

# Generate answer
prompt = f"""Context from research papers:
{context}

Question: How do quantum computers work?

Provide a comprehensive answer based on the context above."""

system_prompt = """You are ResearchMate AI, an expert research assistant.
Always cite sources and explain concepts clearly."""

answer = await llm_service.generate(
    prompt=prompt,
    system_prompt=system_prompt
)

print(answer)
```

---

## 🔀 Multiple Provider Support

The system supports multiple LLM providers with automatic fallback:

### Priority Order

1. **Primary Provider** (set in LLM_PROVIDER)
2. **Gemini** (if API key available)
3. **OpenAI** (if API key available)
4. **Anthropic** (if API key available)

### Configuration

```bash
# Option 1: Gemini only (FREE)
LLM_PROVIDER=gemini
GOOGLE_API_KEY=AIza...

# Option 2: Multiple providers with fallback
LLM_PROVIDER=gemini
GOOGLE_API_KEY=AIza...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant...

# Option 3: Switch to OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### Check Active Provider

```python
# Get provider info
info = llm_service.get_provider_info()
print(info)
# {
#   "provider": "gemini",
#   "status": "active",
#   "is_free": true
# }
```

---

## 🐛 Troubleshooting

### Issue: "API Key not valid"

```
Error: API key not valid. Please pass a valid API key.
```

**Solution**:
1. Check your API key starts with `AIza`
2. Verify no extra spaces in `.env` file
3. Regenerate key at https://makersuite.google.com/app/apikey
4. Make sure key is enabled (not restricted)

### Issue: "Rate limit exceeded"

```
Error: Resource has been exhausted (e.g. check quota).
```

**Solution**:
1. Free tier limits:
   - gemini-1.5-flash: 15 RPM
   - gemini-1.5-pro: 15 RPM
2. Wait 1 minute and try again
3. Consider switching models
4. Implement rate limiting in your code

### Issue: "Module not found: google.generativeai"

```
ImportError: No module named 'google.generativeai'
```

**Solution**:
```powershell
# Install the package
pip install google-generativeai

# Or rebuild Docker
docker-compose build backend
```

### Issue: "Provider not initialized"

```
RuntimeError: No LLM provider initialized
```

**Solution**:
1. Check `.env` has `GOOGLE_API_KEY`
2. Check `LLM_PROVIDER=gemini`
3. Restart backend: `docker-compose restart backend`
4. Check logs: `docker-compose logs backend`

---

## 📊 Performance Comparison

### Response Time

| Provider | Model | Avg Response Time | Cost |
|----------|-------|------------------|------|
| **Gemini** | gemini-1.5-flash | ~1-2s | FREE |
| **Gemini** | gemini-1.5-pro | ~2-4s | FREE |
| OpenAI | gpt-4o-mini | ~2-3s | $0.15/1M tokens |
| OpenAI | gpt-4o | ~4-6s | $5/1M tokens |
| Anthropic | claude-3-haiku | ~2-3s | $0.25/1M tokens |

### Quality for RAG Tasks

| Provider | Model | RAG Quality | Citation Accuracy | Cost |
|----------|-------|-------------|-------------------|------|
| **Gemini** | **gemini-1.5-flash** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **FREE** ✅ |
| **Gemini** | **gemini-1.5-pro** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **FREE** ✅ |
| OpenAI | gpt-4o-mini | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Paid |
| OpenAI | gpt-4o | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Paid |

**Conclusion**: Gemini 1.5 Flash is perfect for this project - free, fast, and high quality!

---

## 🚀 Production Considerations

### Rate Limiting

```python
# Implement rate limiting
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

@app.post("/chat/ask")
@limiter.limit("10/minute")  # Adjust based on Gemini limits
async def ask_question(...):
    pass
```

### Caching

```python
# Cache responses to reduce API calls
from functools import lru_cache

@lru_cache(maxsize=100)
async def generate_cached(prompt: str, system: str):
    return await llm_service.generate(prompt, system)
```

### Error Handling

```python
# Handle rate limits gracefully
try:
    answer = await llm_service.generate(prompt, system_prompt)
except Exception as e:
    if "quota" in str(e).lower():
        # Rate limit hit - retry after delay
        await asyncio.sleep(60)
        answer = await llm_service.generate(prompt, system_prompt)
    else:
        raise
```

### Monitoring

```python
# Track API usage
import logging

logger = logging.getLogger(__name__)

async def generate_with_logging(prompt, system):
    start = time.time()
    try:
        result = await llm_service.generate(prompt, system)
        duration = time.time() - start
        logger.info(f"Gemini request successful: {duration:.2f}s")
        return result
    except Exception as e:
        logger.error(f"Gemini request failed: {e}")
        raise
```

---

## 🔒 Security Best Practices

### API Key Security

```bash
# ❌ NEVER commit API keys to git
.env
*.env

# ✅ Use environment variables
GOOGLE_API_KEY=${GOOGLE_API_KEY}

# ✅ Rotate keys regularly
# Generate new key at: https://makersuite.google.com/app/apikey
```

### API Key Restrictions (Optional)

1. Go to Google Cloud Console
2. Find your API key
3. Add restrictions:
   - **IP addresses** - Restrict to your server IP
   - **API restrictions** - Limit to Generative AI API
   - **Quota limits** - Set custom limits

---

## 📚 Additional Resources

### Official Documentation
- **Gemini API Docs**: https://ai.google.dev/docs
- **Python SDK**: https://github.com/google/generative-ai-python
- **API Reference**: https://ai.google.dev/api/python/google/generativeai

### Tutorials
- **Quickstart**: https://ai.google.dev/tutorials/python_quickstart
- **RAG with Gemini**: https://ai.google.dev/examples/rag
- **Streaming**: https://ai.google.dev/tutorials/streaming_quickstart

### Community
- **Discord**: https://discord.gg/google-ai
- **GitHub Issues**: https://github.com/google/generative-ai-python/issues
- **Stack Overflow**: Tag `google-gemini`

---

## ✅ Verification Checklist

Before starting development, verify:

- [ ] API key obtained from https://makersuite.google.com/app/apikey
- [ ] `.env` file configured with `GOOGLE_API_KEY`
- [ ] `LLM_PROVIDER=gemini` in `.env`
- [ ] Docker services running: `docker-compose ps`
- [ ] Backend shows "✅ Using Google Gemini (FREE)" in logs
- [ ] Health endpoint returns `"is_free": true`
- [ ] Can upload PDF and ask questions
- [ ] Responses are streaming correctly

---

## 💰 Cost Comparison

### Development Phase (1 month)

| Provider | Estimated Requests | Cost |
|----------|-------------------|------|
| **Gemini** | Unlimited (within rate limits) | **$0** ✅ |
| OpenAI (GPT-4o-mini) | ~10,000 requests | ~$5-10 |
| OpenAI (GPT-4o) | ~10,000 requests | ~$50-100 |
| Anthropic (Claude 3) | ~10,000 requests | ~$10-20 |

### Production (1000 users/month)

| Provider | Estimated Requests | Cost |
|----------|-------------------|------|
| **Gemini** | 100,000 requests | **$0** ✅ |
| OpenAI (GPT-4o-mini) | 100,000 requests | ~$50-100 |
| OpenAI (GPT-4o) | 100,000 requests | ~$500-1000 |
| Anthropic (Claude 3) | 100,000 requests | ~$100-200 |

**Savings**: Using Gemini saves $50-1000+ per month! 💰

---

## 🎯 Recommended Configuration

For **ResearchMate AI Hackathon Project**:

```bash
# .env - Recommended Settings

# Use Gemini (FREE)
LLM_PROVIDER=gemini
GOOGLE_API_KEY=AIza...your-key-here
GEMINI_MODEL=gemini-1.5-flash

# Optimal parameters for RAG
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000
TOP_K_RESULTS=5

# Local embeddings (also FREE)
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

**Why this setup**:
- ✅ 100% FREE for unlimited development
- ✅ Fast responses (1-2 seconds)
- ✅ High quality RAG answers
- ✅ Streaming support
- ✅ Large context window (1M tokens)
- ✅ No credit card needed
- ✅ Perfect for hackathons and prototypes

---

**Ready to build with Gemini! 🚀**

*Last Updated: November 10, 2026*  
*Using: google-generativeai v0.3.1*
