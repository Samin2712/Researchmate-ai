"""
ResearchMate AI - Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from pathlib import Path
import asyncio
from sqlalchemy import text

from app.core.config import settings
from app.api.v1 import auth, documents, chat
from app.core.database import engine, Base

# Configure logging
Path(settings.LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting ResearchMate AI...")
    
    # Create upload directory
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Database tables created")
    logger.info("ResearchMate AI started successfully!")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ResearchMate AI...")
    await engine.dispose()
    logger.info("ResearchMate AI shut down successfully!")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-Powered Research Paper Assistant with RAG",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - health check"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    from app.services.vector_store import vector_store
    from app.services.embedder import embedder
    from app.services.llm_service import llm_service
    database_ok = False
    try:
        async with engine.connect() as connection:
            await asyncio.wait_for(connection.execute(text('SELECT 1')), timeout=5)
        database_ok = True
    except Exception:
        logger.warning('Database health check failed')
    try:
        await asyncio.wait_for(asyncio.to_thread(vector_store.client.heartbeat), timeout=5)
        vector_ok = True
    except Exception:
        vector_ok = False
    embeddings_ok = embedder.model is not None
    healthy = database_ok and vector_ok and embeddings_ok
    return JSONResponse(status_code=200 if healthy else 503, content={
        'status': 'healthy' if healthy else 'unhealthy',
        'database': 'connected' if database_ok else 'unavailable',
        'database_type': engine.url.get_backend_name(),
        'llm_provider': settings.LLM_PROVIDER,
        'embedding_model': settings.EMBEDDING_MODEL,
        'vector_store': {'status': 'connected' if vector_ok else 'unavailable', 'mode': settings.CHROMA_MODE},
        'embeddings': {'status': 'loaded' if embeddings_ok else 'unavailable', 'model': embedder.model_name},
        'llm': {**llm_service.get_provider_info(), 'connectivity': 'not_checked', 'model': settings.GEMINI_MODEL if settings.LLM_PROVIDER == 'gemini' else None},
        'redis': {'status': 'not_used', 'required': False},
    })


# Include API routers
app.include_router(
    auth.router,
    prefix=f"{settings.API_V1_PREFIX}/auth",
    tags=["Authentication"]
)

app.include_router(
    documents.router,
    prefix=f"{settings.API_V1_PREFIX}/documents",
    tags=["Documents"]
)

app.include_router(
    chat.router,
    prefix=f"{settings.API_V1_PREFIX}/chat",
    tags=["Chat"]
)


# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={
        "status": "error",
        "message": "An internal error occurred",
        "detail": str(exc) if settings.DEBUG else None
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
