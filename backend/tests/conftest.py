"""
Pytest configuration and fixtures
"""
import pytest
import asyncio
from unittest.mock import AsyncMock
from typing import AsyncGenerator, Generator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# Test database URL (use in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """Create test database session"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
def verification_mail(monkeypatch):
    """Mock the external mail boundary; tests still explicitly click verification links."""
    monkeypatch.setattr(settings, 'GMAIL_CLIENT_ID', 'gmail-test-client')
    monkeypatch.setattr(settings, 'GMAIL_CLIENT_SECRET', 'gmail-test-secret')
    monkeypatch.setattr(settings, 'GMAIL_REFRESH_TOKEN', 'gmail-test-refresh')
    monkeypatch.setattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    sender = AsyncMock(return_value='gmail-message-id')
    import app.api.v1.auth as auth_api
    import app.api.v1.account_security as security_api
    monkeypatch.setattr(auth_api, 'send_verification_email', sender)
    monkeypatch.setattr(security_api, 'send_verification_email', sender)
    return sender


@pytest.fixture
async def client(test_db: AsyncSession, verification_mail) -> AsyncGenerator[AsyncClient, None]:
    """Create test client"""
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()
