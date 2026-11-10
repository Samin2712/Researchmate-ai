# ⚡ ResearchMate AI - Quick Start Guide

Get up and running in 15 minutes!

---

## 🎯 Goal

By the end of this guide, you'll have:
- ✅ Backend API running on http://localhost:8000
- ✅ Frontend app running on http://localhost:5173
- ✅ Ability to upload a PDF and ask questions about it

---

## 📋 Prerequisites Check

Before starting, ensure you have:

```bash
# Check Python version (need 3.11+)
python --version

# Check Node.js version (need 18+)
node --version

# Check if PostgreSQL is installed
psql --version

# Check if Git is installed
git --version
```

If anything is missing, install it first!

---

## 🚀 Setup (Step-by-Step)

### Step 1: Clone and Navigate

```bash
# Clone the repository
git clone https://github.com/yourusername/researchmate-ai.git
cd researchmate-ai
```

### Step 2: Backend Setup (5 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies (this will take 2-3 minutes)
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env file with your text editor
# IMPORTANT: Add your OpenAI API key!
```

**Edit `.env` file:**
```env
OPENAI_API_KEY=sk-your-api-key-here
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/researchmate
SECRET_KEY=your-secret-key-generate-with-openssl
```

**Create the database:**
```bash
# Option 1: Using Docker (recommended)
docker run --name researchmate-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=researchmate -p 5432:5432 -d postgres:15

# Option 2: Using existing PostgreSQL
createdb researchmate
```

**Run migrations:**
```bash
# If using Alembic
alembic upgrade head

# Or skip for now and let SQLAlchemy create tables on startup
```

**Start the backend server:**
```bash
uvicorn app.main:app --reload

# You should see:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# INFO:     Application startup complete
```

✅ **Backend is running!** Open http://localhost:8000/docs to see the API documentation.

### Step 3: Frontend Setup (5 minutes)

**Open a NEW terminal** (keep backend running)

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies (this will take 2-3 minutes)
npm install

# Create .env file
cp .env.example .env
```

**Edit `.env.local` file:**
```env
VITE_API_URL=http://localhost:8000/api/v1
```

**Start the frontend server:**
```bash
npm run dev

# You should see:
# VITE v5.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

✅ **Frontend is running!** Open http://localhost:5173 in your browser.

---

## 🎮 First Test (5 minutes)

### Test 1: Upload a Document

1. **Download a sample research paper:**
   - Go to https://arxiv.org/
   - Download any recent CS paper PDF (e.g., https://arxiv.org/pdf/2301.00234.pdf)
   - Save it as `test_paper.pdf`

2. **Upload via UI:**
   - Open http://localhost:5173
   - Click "Upload Document" button
   - Select your `test_paper.pdf`
   - Wait for processing (should take 10-30 seconds)

3. **Verify upload:**
   - You should see the paper appear in your library
   - Title, authors, and metadata should be extracted

### Test 2: Ask a Question

1. **Navigate to Chat:**
   - Click on the uploaded paper
   - Click "Chat with this paper" button

2. **Ask a question:**
   ```
   What is the main contribution of this paper?
   ```

3. **Check the response:**
   - You should get an answer within 5 seconds
   - Answer should include citations like [Source 1] (Page 3)
   - Sources should be listed below the answer

✅ **If this works, you're all set!** 🎉

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: ModuleNotFoundError**
```bash
# Solution: Make sure virtual environment is activated
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate      # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Problem: Database connection error**
```bash
# Solution: Check if PostgreSQL is running
# Docker:
docker ps  # Should show researchmate-db

# Start if stopped:
docker start researchmate-db

# Native PostgreSQL:
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

**Problem: OpenAI API error**
```
Error: You didn't provide an API key
```
```bash
# Solution: Check .env file
cat .env | grep OPENAI_API_KEY

# Should show: OPENAI_API_KEY=sk-...
# If not, add it to .env
```

### Frontend Issues

**Problem: Cannot connect to API**
```
Error: Network Error
```
```bash
# Solution 1: Check if backend is running
curl http://localhost:8000/health

# Should return: {"status":"healthy"}

# Solution 2: Check CORS settings in backend
# backend/app/main.py should allow http://localhost:5173
```

**Problem: White screen / blank page**
```bash
# Solution: Check browser console (F12)
# Look for errors

# Common fix: Clear cache and reload
# Chrome: Ctrl+Shift+R (Cmd+Shift+R on Mac)
```

### Common Errors

**1. "Address already in use"**
```bash
# Backend (port 8000)
# Find and kill process:
# Mac/Linux:
lsof -ti:8000 | xargs kill -9

# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Frontend (port 5173) - similar process
```

**2. "Permission denied"**
```bash
# Give execute permission
chmod +x scripts/setup.sh

# Or run with sudo
sudo python ...
```

**3. PDF processing fails**
```bash
# Install system dependencies
# Mac:
brew install poppler

# Linux:
sudo apt-get install -y poppler-utils

# Windows: Download poppler from https://github.com/oschwartz10612/poppler-windows
```

---

## 🧪 Verify Everything Works

Run this checklist:

- [ ] Backend responds at http://localhost:8000/health
- [ ] Frontend loads at http://localhost:5173
- [ ] Can access API docs at http://localhost:8000/docs
- [ ] Can upload a PDF file
- [ ] Can see document in library
- [ ] Can ask a question and get an answer
- [ ] Answer includes source citations

If all checked, **you're ready to develop!** 🚀

---

## 📁 Project Structure Quick Reference

```
researchmate-ai/
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py       # ← Start here (entry point)
│   │   ├── api/v1/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── models/       # Database models
│   ├── requirements.txt  # Python dependencies
│   └── .env             # Environment variables
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── App.tsx      # ← Start here (main component)
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   └── services/    # API clients
│   ├── package.json     # Node dependencies
│   └── .env            # Environment variables
│
└── docs/                # Documentation
```

---

## 🎯 Next Steps

Now that you're set up:

1. **Read the Project Plan:** [PROJECT_PLAN.md](PROJECT_PLAN.md)
2. **Follow Implementation Guide:** [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
3. **Understand Architecture:** [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md)
4. **Track Progress:** [FEATURES_CHECKLIST.md](FEATURES_CHECKLIST.md)

---

## 💡 Development Tips

### Hot Reload is Enabled

Both backend and frontend support hot reload:
- **Backend:** Edit Python files → server reloads automatically
- **Frontend:** Edit React files → page updates in browser

### Useful Commands

```bash
# Backend
cd backend
source venv/bin/activate

# Run tests
pytest

# Format code
black app/
flake8 app/

# Check types
mypy app/

# Frontend
cd frontend

# Run tests
npm test

# Build for production
npm run build

# Lint
npm run lint

# Format
npm run format
```

### Debugging

**Backend:**
```python
# Add breakpoints
import pdb; pdb.set_trace()

# Or use print debugging
print(f"DEBUG: {variable}")
```

**Frontend:**
```typescript
// Browser DevTools (F12)
console.log('DEBUG:', variable);

// React DevTools extension
// Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/
```

### Database GUI Tools

- **pgAdmin:** https://www.pgadmin.org/
- **DBeaver:** https://dbeaver.io/
- **TablePlus:** https://tableplus.com/

Connect with:
- Host: localhost
- Port: 5432
- Database: researchmate
- User: postgres
- Password: password

---

## 🤝 Getting Help

If you're stuck:

1. **Check the docs:**
   - API docs: http://localhost:8000/docs
   - README: [README.md](README.md)

2. **Common issues:**
   - [Troubleshooting section above](#-troubleshooting)

3. **Ask for help:**
   - GitHub Issues: [Create an issue](https://github.com/yourusername/researchmate-ai/issues)
   - Team Discord: [Join here](#)
   - STEM2Connect Discord: [Official channel](#)

---

## ✅ Ready to Code!

You're all set! Here's what to build first:

**Week 1 Focus:**
1. Get basic document upload working
2. Implement PDF text extraction
3. Set up vector database
4. Create simple chat endpoint

**Start with:** `backend/app/services/document_processor.py`

**Good luck! 🚀**

---

## 📚 Additional Resources

### Learning Resources
- **FastAPI Tutorial:** https://fastapi.tiangolo.com/tutorial/
- **React Docs:** https://react.dev/learn
- **LangChain Docs:** https://python.langchain.com/docs/get_started/introduction
- **ChromaDB Docs:** https://docs.trychroma.com/

### Sample Papers for Testing
- **arXiv:** https://arxiv.org/ (free research papers)
- **PubMed Central:** https://www.ncbi.nlm.nih.gov/pmc/ (free medical papers)
- **bioRxiv:** https://www.biorxiv.org/ (free biology preprints)

### Free API Options (if no OpenAI credits)
- **HuggingFace Inference API:** Free tier available
- **Groq:** Fast, free LLM inference
- **Ollama:** Run local LLMs (llama3, mistral)
- **Cohere:** Free tier for embeddings and generation

---

**Last Updated:** November 10, 2026  
**Version:** 1.0  
**Status:** Ready to Use ✅
