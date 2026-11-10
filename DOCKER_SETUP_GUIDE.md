# 🐳 Docker Setup Guide - ResearchMate AI

Complete guide to running ResearchMate AI with Docker

---

## 📋 Prerequisites

### Required Software
- **Docker Desktop** 4.25+ (includes Docker Compose)
  - Windows: https://docs.docker.com/desktop/install/windows-install/
  - Mac: https://docs.docker.com/desktop/install/mac-install/
  - Linux: https://docs.docker.com/desktop/install/linux-install/

- **Git** (to clone the repository)

### Required API Keys (Choose One)
- **Google Gemini API Key** (100% FREE - Recommended for development)
  - Get at: https://makersuite.google.com/app/apikey
  - No credit card required
  - See [GEMINI_SETUP.md](GEMINI_SETUP.md) for complete guide
  
- **OpenAI API Key** (Paid - Optional)
  - Get at: https://platform.openai.com/api-keys
  - Requires payment

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Clone and Configure

```powershell
# Clone the repository
cd "d:\REACT_JS\STEM2Connect AI Hackathon"

# Copy environment file
Copy-Item .env.example .env

# Edit .env and add your API key
# Open .env in your editor and set:
# For Gemini (FREE): GOOGLE_API_KEY=AIza-your-actual-key-here
# OR for OpenAI (Paid): OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 2: Start All Services

```powershell
# Start all containers
docker-compose up -d

# This will start:
# - PostgreSQL (port 5432)
# - Redis (port 6379)
# - ChromaDB (port 8001)
# - Backend API (port 8000)
# - Frontend (port 5173)
```

### Step 3: Wait for Services to Be Ready

```powershell
# Check status
docker-compose ps

# Wait for all services to be "healthy" (about 30-60 seconds)
# You should see:
# - researchmate-postgres    healthy
# - researchmate-redis       healthy
# - researchmate-chromadb    healthy
# - researchmate-backend     running
# - researchmate-frontend    running
```

### Step 4: Access the Application

Open your browser and visit:
- **Frontend**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 🔧 Docker Commands Reference

### Basic Commands

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Rebuild a service
docker-compose up -d --build backend

# Stop and remove everything (including volumes)
docker-compose down -v
```

### Service Management

```powershell
# Start only backend services (no frontend)
docker-compose up -d postgres redis chromadb backend

# Start only database
docker-compose up -d postgres

# Execute command in running container
docker-compose exec backend bash
docker-compose exec postgres psql -U researchmate
```

### Debugging

```powershell
# View container status
docker-compose ps

# Inspect a container
docker-compose logs backend --tail=100

# Check resource usage
docker stats

# Access backend shell
docker-compose exec backend bash

# Access database
docker-compose exec postgres psql -U researchmate -d researchmate
```

---

## 📊 Understanding the Services

### 1. PostgreSQL Database
- **Port**: 5432
- **Purpose**: Store user data, documents metadata, chat history
- **Access**: 
  ```powershell
  docker-compose exec postgres psql -U researchmate -d researchmate
  ```

### 2. Redis Cache
- **Port**: 6379
- **Purpose**: Caching, session storage, rate limiting
- **Access**: 
  ```powershell
  docker-compose exec redis redis-cli
  ```

### 3. ChromaDB Vector Database
- **Port**: 8001
- **Purpose**: Store document embeddings for semantic search
- **Access**: http://localhost:8001

### 4. Backend API (FastAPI)
- **Port**: 8000
- **Purpose**: REST API for all operations
- **API Docs**: http://localhost:8000/docs
- **Hot Reload**: Enabled in development mode

### 5. Frontend (React + Vite)
- **Port**: 5173
- **Purpose**: User interface
- **Access**: http://localhost:5173
- **Hot Reload**: Enabled in development mode

---

## 🔄 Development Workflow

### Making Backend Changes

1. Edit files in `backend/` directory
2. Changes auto-reload (no restart needed)
3. View logs: `docker-compose logs -f backend`

```powershell
# If you need to rebuild
docker-compose up -d --build backend
```

### Making Frontend Changes

1. Edit files in `frontend/src/` directory
2. Changes auto-reload (no restart needed)
3. View logs: `docker-compose logs -f frontend`

```powershell
# If you need to rebuild
docker-compose up -d --build frontend
```

### Database Migrations

```powershell
# Generate a new migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Rollback migration
docker-compose exec backend alembic downgrade -1
```

### Running Tests

```powershell
# Backend tests
docker-compose exec backend pytest

# Frontend tests
docker-compose exec frontend npm test

# Backend tests with coverage
docker-compose exec backend pytest --cov=app --cov-report=html
```

---

## 🐛 Troubleshooting

### Issue: Services Won't Start

```powershell
# Check logs for errors
docker-compose logs

# Common issues:
# 1. Port already in use
#    - Stop other services using ports 5432, 6379, 8000, 5173, 8001
#    - netstat -ano | findstr "8000"  (Windows)

# 2. Docker Desktop not running
#    - Start Docker Desktop

# 3. Insufficient memory
#    - Increase Docker Desktop memory limit (Settings > Resources)
```

### Issue: Backend Can't Connect to Database

```powershell
# Check if PostgreSQL is healthy
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Wait for health check to pass
```

### Issue: Frontend Can't Connect to Backend

```powershell
# Check if backend is running
docker-compose ps backend

# Check backend logs for errors
docker-compose logs backend

# Verify .env file has correct API URL
# VITE_API_URL=http://localhost:8000/api/v1
```

### Issue: Out of Disk Space

```powershell
# Remove unused images and volumes
docker system prune -a --volumes

# Or selectively remove
docker volume ls
docker volume rm <volume-name>
```

### Issue: Permission Errors (Linux/Mac)

```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Or run with sudo
sudo docker-compose up -d
```

---

## 🔒 Production Deployment

### Step 1: Update Configuration

```powershell
# Copy production compose file
Copy-Item docker-compose.prod.yml docker-compose.override.yml

# Update .env with production values:
# - Strong SECRET_KEY
# - Strong database passwords
# - Production API keys
# - Set DEBUG=False
# - Set ENVIRONMENT=production
```

### Step 2: Build for Production

```powershell
# Build all production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start in production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Step 3: Setup SSL (Optional)

```powershell
# Place SSL certificates in nginx/ssl/
# - cert.pem
# - key.pem

# Update nginx config to use SSL
# Restart nginx
docker-compose restart nginx
```

### Step 4: Health Checks

```powershell
# Check all services are healthy
docker-compose ps

# Test health endpoints
curl http://localhost/health
curl http://localhost/api/v1/health
```

---

## 📈 Monitoring

### View Resource Usage

```powershell
# Real-time stats
docker stats

# Or specific container
docker stats researchmate-backend
```

### View Logs

```powershell
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100 backend

# Save logs to file
docker-compose logs > logs.txt
```

### Container Inspection

```powershell
# Inspect container details
docker inspect researchmate-backend

# View container processes
docker-compose top backend
```

---

## 🔧 Advanced Configuration

### Custom Network Configuration

Edit `docker-compose.yml`:

```yaml
networks:
  researchmate-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### Volume Management

```powershell
# List volumes
docker volume ls

# Inspect volume
docker volume inspect researchmate_postgres_data

# Backup database volume
docker run --rm -v researchmate_postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore database volume
docker run --rm -v researchmate_postgres_data:/data -v ${PWD}:/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

### Environment Variables per Service

```yaml
services:
  backend:
    environment:
      - LOG_LEVEL=DEBUG
      - WORKERS=4
```

---

## 🚨 Emergency Procedures

### Complete Reset

```powershell
# DANGER: This removes everything!
docker-compose down -v
docker system prune -a --volumes

# Then start fresh
docker-compose up -d
```

### Backup Before Reset

```powershell
# Backup database
docker-compose exec postgres pg_dump -U researchmate researchmate > backup.sql

# Backup uploads
docker cp researchmate-backend:/app/uploads ./uploads-backup

# Backup ChromaDB
docker cp researchmate-chromadb:/chroma/chroma ./chroma-backup
```

### Restore from Backup

```powershell
# Restore database
docker-compose exec -T postgres psql -U researchmate < backup.sql

# Restore uploads
docker cp ./uploads-backup/. researchmate-backend:/app/uploads

# Restore ChromaDB
docker cp ./chroma-backup/. researchmate-chromadb:/chroma/chroma
```

---

## 📚 Additional Resources

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose Documentation**: https://docs.docker.com/compose/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Documentation**: https://react.dev/

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] All containers running: `docker-compose ps`
- [ ] Frontend loads: http://localhost:5173
- [ ] Backend API docs load: http://localhost:8000/docs
- [ ] Health check passes: http://localhost:8000/health
- [ ] Can register a user
- [ ] Can login
- [ ] Can upload a PDF
- [ ] Can ask a question

---

**Last Updated**: November 10, 2026  
**Maintainer**: ResearchMate AI Team
