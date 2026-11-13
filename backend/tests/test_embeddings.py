from types import SimpleNamespace
import math

import pytest

from app.core.config import settings
from app.core.database import normalize_database_url
from app.services.embedder import EmbeddingService


def test_managed_postgres_urls():
    for url in ('postgres://user:pass@db/app', 'postgresql://user:pass@db/app'):
        assert normalize_database_url(url) == 'postgresql+asyncpg://user:pass@db/app'
    url = 'sqlite+aiosqlite:///./test.db'
    assert normalize_database_url(url) == url


def test_remote_embeddings_use_task_types_and_do_not_load_local_model(monkeypatch):
    import httpx
    monkeypatch.setattr(settings, 'EMBEDDING_PROVIDER', 'gemini')
    monkeypatch.setattr(settings, 'GOOGLE_API_KEY', 'test-key')
    calls = []

    def post(url, *, headers, json, timeout):
        assert headers == {'x-goog-api-key': 'test-key'}
        assert 'test-key' not in url
        calls.append(json['requests'])
        return SimpleNamespace(status_code=200, json=lambda: {
            'embeddings': [{'values': [2.0] * 768} for _ in json['requests']],
        })

    monkeypatch.setattr(httpx, 'post', post)
    service = EmbeddingService()
    result = service.embed_documents(['one', 'two', 'three'], batch_size=2)
    assert len(result) == 3
    assert len(calls) == 2
    assert calls[0][0]['taskType'] == 'RETRIEVAL_DOCUMENT'
    assert calls[0][0]['outputDimensionality'] == 768
    assert math.isclose(sum(value ** 2 for value in result[0]), 1)
    assert len(service.embed_query('question')) == 768
    assert calls[-1][0]['taskType'] == 'RETRIEVAL_QUERY'
    assert service._model is None


def test_remote_provider_failures_are_actionable_and_do_not_expose_key(monkeypatch):
    import httpx
    monkeypatch.setattr(settings, 'EMBEDDING_PROVIDER', 'gemini')
    monkeypatch.setattr(settings, 'GOOGLE_API_KEY', 'test-secret')
    monkeypatch.setattr(httpx, 'post', lambda *args, **kwargs: SimpleNamespace(status_code=429))
    with pytest.raises(ValueError) as error:
        EmbeddingService().embed_query('question')
    assert '429' in str(error.value)
    assert 'quota' in str(error.value)
    assert 'test-secret' not in str(error.value)
