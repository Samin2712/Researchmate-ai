import pytest
from types import SimpleNamespace
import app.main as main_module
from app.core.database import engine
from app.services.vector_store import vector_store


@pytest.mark.asyncio
async def test_database_failure_is_not_reported_as_healthy(client, monkeypatch):
    def fail():
        raise ConnectionError('test database unavailable')

    monkeypatch.setattr(main_module, 'engine', SimpleNamespace(connect=fail, url=engine.url))
    response = await client.get('/health')
    assert response.status_code == 503
    assert response.json()['database'] == 'unavailable'


@pytest.mark.asyncio
async def test_vector_failure_is_not_reported_as_healthy(client, monkeypatch):
    def fail():
        raise ConnectionError('test vector store unavailable')

    monkeypatch.setattr(vector_store.client, 'heartbeat', fail)
    response = await client.get('/health')
    assert response.status_code == 503
    assert response.json()['vector_store']['status'] == 'unavailable'
    assert response.json()['llm']['connectivity'] == 'not_checked'
