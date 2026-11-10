# ResearchMate AI - Backend

FastAPI backend for ResearchMate AI - An AI-powered research paper assistant with RAG capabilities.

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- PostgreSQL 15+ (or use SQLite for development)

### Setup

1. **Create virtual environment**
```bash
python -m venv venv
```

2. **Activate virtual environment**
```bash
# Windows
.\venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**
```bash
# For Phase 1 (Core functionality)
pip install -r requirements-core.txt

# For Phase 2 (Add ML dependencies)
pip install -r requirements.txt
```

4. **Configure environment**
```bash
# Copy example environment file
cp ../.env.example .env

# Edit .env with your settings
# Required:
# - DATABASE_URL
# - SECRET_KEY (generate with: openssl rand -hex 32)
# - GOOGLE_API_KEY (for Gemini LLM)
```

5. **Run the application**
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

6. **Access the API**
- API Documentation: http://localhost:8000/docs
- Alternative Docs: http://localhost:8000/redoc
- Health Check: http://localhost:8000/health

## 📁 Project Structure

```
backend/
├── app/
│   ├── api/v1/          # API endpoints
│   │   ├── auth.py      # Authentication
│   │   ├── documents.py # Document management
│   │   └── chat.py      # Chat & RAG
│   ├── core/            # Core functionality
│   │   ├── config.py    # Configuration
│   │   ├── database.py  # Database setup
│   │   └── security.py  # Auth & JWT
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   └── main.py          # FastAPI app
├── tests/               # Test suite
├── alembic/             # Database migrations
└── requirements.txt     # Dependencies
```

## 🔗 API Endpoints

### Authentication
```
POST /api/v1/auth/register      # Register new user
POST /api/v1/auth/login         # Login (form data)
POST /api/v1/auth/login/json    # Login (JSON)
GET  /api/v1/auth/me            # Get current user
```

### Documents
```
POST   /api/v1/documents/upload  # Upload PDF
GET    /api/v1/documents         # List documents
GET    /api/v1/documents/{id}    # Get document
PATCH  /api/v1/documents/{id}    # Update document
DELETE /api/v1/documents/{id}    # Delete document
```

### Chat (Phase 2)
```
POST /api/v1/chat/ask            # Ask question
GET  /api/v1/chat/sessions       # List sessions
GET  /api/v1/chat/sessions/{id}  # Get session
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py -v

# Run with coverage
pytest --cov=app tests/
```

## 🐳 Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 🔧 Development

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Code Quality

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

## 📝 Environment Variables

Key environment variables (see `.env.example` for full list):

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/db

# Authentication
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI
GOOGLE_API_KEY=your-gemini-api-key
LLM_PROVIDER=gemini

# File Upload
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760  # 10MB
```

## 🛠️ Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: SQLAlchemy (async) + PostgreSQL
- **Authentication**: JWT (python-jose)
- **PDF Processing**: PyMuPDF, pdfplumber
- **Testing**: pytest + pytest-asyncio
- **AI/ML**: Google Gemini, sentence-transformers (Phase 2)

## 📚 Documentation

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Pydantic Docs](https://docs.pydantic.dev/)
- [Alembic Docs](https://alembic.sqlalchemy.org/)

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.

## 📄 License

See [LICENSE](../LICENSE) file.

## 🆘 Troubleshooting

### Common Issues

**1. Database connection error**
```bash
# Check PostgreSQL is running
# Update DATABASE_URL in .env
# For development, use SQLite:
DATABASE_URL=sqlite+aiosqlite:///./test.db
```

**2. Module import errors**
```bash
# Ensure virtual environment is activated
# Reinstall dependencies
pip install -r requirements-core.txt
```

**3. CORS errors from frontend**
```bash
# Update CORS_ORIGINS in .env
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

**4. JWT token errors**
```bash
# Generate new SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"
# Update SECRET_KEY in .env
```

## 📊 Status

**Phase 1**: ✅ Complete  
- Backend framework
- Database models
- Authentication
- Document upload
- PDF processing

**Phase 2**: 🚧 In Progress  
- RAG implementation
- Vector database
- LLM integration
- Chat functionality

---

For more information, see [PHASE1_COMPLETION_SUMMARY.md](../PHASE1_COMPLETION_SUMMARY.md)
