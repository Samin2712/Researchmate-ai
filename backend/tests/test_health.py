"""
Test health check endpoints
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test root endpoint returns health status"""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "ResearchMate AI"
    assert "version" in data


@pytest.mark.asyncio
async def test_health_check_endpoint(client: AsyncClient, test_db, monkeypatch):
    """Test the healthy contract without network/model downloads."""
    import app.main as main_module
    from app.services.embedder import embedder
    from app.services.vector_store import vector_store
    from types import SimpleNamespace
    monkeypatch.setattr(main_module, "engine", test_db.bind)
    monkeypatch.setattr(vector_store, "_client", SimpleNamespace(heartbeat=lambda: 1))
    monkeypatch.setattr(embedder, "get_embedding_dimension", lambda: 384)
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "llm_provider" in data
    assert "embedding_model" in data
