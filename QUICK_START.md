# 🚀 ResearchMate AI - Quick Start Guide

## One-command local development

Run **`npm run dev`** from the repository root. On restricted PowerShell installations, use
**`npm.cmd run dev`**. This launches FastAPI and Vite using SQLite and persistent Chroma;
Docker is not required for this mode. Run `npm run doctor` to verify the connections.
See [local startup details](docs/LOCAL_STARTUP.md). The Docker instructions below are a separate workflow.

Get up and running in **5 minutes** with Docker!

---

## ✅ Prerequisites (2 minutes)

### 1. Install Docker Desktop
- **Windows**: https://docs.docker.com/desktop/install/windows-install/
- **Mac**: https://docs.docker.com/desktop/install/mac-install/
- **Linux**: https://docs.docker.com/engine/install/

**Verify installation**:
```bash
docker --version
docker-compose --version
```

### 2. Get a FREE Gemini API Key (1 minute)
1. Visit https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your key (starts with `AIza...`)
4. **No credit card required!** ✨

---

## 🎯 One-Command Setup

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd "STEM2Connect AI Hackathon"
```

### Step 2: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your Gemini API key
# Find this line: GOOGLE_API_KEY=your-google-gemini-api-key-here
# Replace with: GOOGLE_API_KEY=AIza-your-actual-key-here
```

**Windows PowerShell**:
```powershell
Copy-Item .env.example .env
notepad .env
```

### Step 3: Start Everything! 🎉
```bash
docker-compose up -d
```

This **one command** will:
- ✅ Download all Docker images
- ✅ Install all dependencies
- ✅ Start PostgreSQL database
- ✅ Start Redis cache
- ✅ Start ChromaDB vector database
- ✅ Start FastAPI backend
- ✅ Start React frontend

**Initial startup takes 3-5 minutes** (only the first time)

### Step 4: Wait for Services
```bash
# Check status
docker-compose ps

# Wait until you see:
# ✅ postgres   healthy
# ✅ redis      healthy
# ✅ chromadb   healthy
# ✅ backend    running
# ✅ frontend   running
```

### Step 5: Access the App! 🎉
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 🎮 Try It Out!

### 1. Register a User
1. Go to http://localhost:5173
2. Click "Sign Up"
3. Enter email and password
4. Click "Create Account"

### 2. Upload a Research Paper
1. Click "Upload Document"
2. Select a PDF file (max 10MB)
3. Wait for processing (~30 seconds)
4. See "Processing Complete" ✅

### 3. Ask Questions!
1. Go to "Chat" section
2. Type: *"What is the main conclusion of this paper?"*
3. Get AI answer with citations! 🤖
4. Click citations to see sources

---

## 🛠️ Useful Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Stop Everything
```bash
docker-compose down
```

### Restart a Service
```bash
docker-compose restart backend
```

### Rebuild After Code Changes
```bash
# Backend
docker-compose up -d --build backend

# Frontend
docker-compose up -d --build frontend
```

### Complete Reset (Nuclear Option)
```bash
# WARNING: This deletes ALL data!
docker-compose down -v
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Issue: "Port already in use"
**Solution**: Stop conflicting services
```bash
# Windows
netstat -ano | findstr "8000"
taskkill /PID <process-id> /F

# Mac/Linux
lsof -i :8000
kill -9 <process-id>
```

### Issue: "Backend won't start"
**Solution**: Check API key
```bash
# View backend logs
docker-compose logs backend

# Common errors:
# - "Invalid API key" → Check GOOGLE_API_KEY in .env
# - "Connection refused" → Database not ready yet (wait 30s)
```

### Issue: "Out of memory"
**Solution**: Increase Docker memory
1. Open Docker Desktop
2. Settings → Resources
3. Increase Memory to 4GB+
4. Click "Apply & Restart"

### Issue: "Cannot connect to Docker daemon"
**Solution**: Start Docker Desktop
- Make sure Docker Desktop app is running
- Wait for Docker icon to show "running"

---

## 📊 What's Running?

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| **Frontend** | 5173 | React UI | http://localhost:5173 |
| **Backend** | 8000 | FastAPI API | http://localhost:8000/docs |
| **PostgreSQL** | 5432 | User data, documents | - |
| **Redis** | 6379 | Cache, sessions | - |
| **ChromaDB** | 8001 | Vector embeddings | http://localhost:8001 |

---

## 🔧 Development Mode

### Edit Backend Code
1. Edit files in `backend/`
2. Changes auto-reload (hot reload enabled)
3. No need to restart!

### Edit Frontend Code
1. Edit files in `frontend/src/`
2. Changes auto-reload (Vite HMR)
3. Instant preview!

### Run Tests
```bash
# Backend tests
docker-compose exec backend pytest

# Frontend tests
docker-compose exec frontend npm test
```

---

## 🎓 Next Steps

1. **Read Full Documentation**
   - [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md) - Complete Docker guide
   - [BUILD_PHASES.md](BUILD_PHASES.md) - Development phases
   - [FEATURES_CHECKLIST.md](FEATURES_CHECKLIST.md) - Feature status

2. **Explore the API**
   - Visit http://localhost:8000/docs
   - Try the interactive API documentation
   - Test endpoints with built-in UI

3. **Customize Configuration**
   - Edit `.env` for different settings
   - Change LLM model: `GEMINI_MODEL=gemini-1.5-pro`
   - Adjust chunk size: `CHUNK_SIZE=1000`
   - Enable debug logging: `LOG_LEVEL=DEBUG`

4. **Deploy to Production**
   - See [DOCKER_SETUP_GUIDE.md](DOCKER_SETUP_GUIDE.md#production-deployment)
   - Use `docker-compose.prod.yml`
   - Configure SSL/HTTPS
   - Set up monitoring

---

## 💡 Tips & Tricks

### Use Free Tier Effectively
- **Gemini 1.5 Flash**: Fast, free, perfect for dev
- **Gemini 1.5 Pro**: Advanced reasoning, free with limits
- **Local Embeddings**: sentence-transformers runs locally (free!)
- **No API costs**: All vector operations are local

### Optimize Performance
```bash
# Increase workers (production)
WORKERS=4 docker-compose up -d backend

# Reduce memory usage (development)
CHUNK_SIZE=300 docker-compose up -d backend
```

### Monitor Resources
```bash
# Real-time stats
docker stats

# Disk usage
docker system df
```

---

## ❓ FAQ

**Q: Do I need to pay for anything?**  
A: No! Gemini API is 100% free, embeddings run locally.

**Q: Can I use OpenAI instead of Gemini?**  
A: Yes! Set `LLM_PROVIDER=openai` and `OPENAI_API_KEY` in `.env`

**Q: How do I update to latest code?**  
A: `git pull && docker-compose up -d --build`

**Q: Where is my data stored?**  
A: In Docker volumes: `docker volume ls`

**Q: Can I run without Docker?**  
A: Yes, but Docker is much easier. See manual setup in docs.

**Q: What PDF formats are supported?**  
A: Standard PDFs. Text-based PDFs work best.

**Q: How many documents can I upload?**  
A: Unlimited! (limited by disk space)

---

## 🆘 Need Help?

1. **Check logs**: `docker-compose logs -f`
2. **Health check**: http://localhost:8000/health
3. **API status**: http://localhost:8000/docs
4. **Reset everything**: `docker-compose down -v && docker-compose up -d`

---

## 🎉 Success!

You now have a fully functional RAG-powered research assistant!

**Next**: Upload a research paper and start asking questions! 🚀

---

**Last Updated**: November 11, 2026  
**Version**: 2.0 (Phase 2 Complete)
