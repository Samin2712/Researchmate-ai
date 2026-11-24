"""Credential lifecycle, external verification boundary, privacy, and request isolation."""
from unittest.mock import AsyncMock

import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException
from sqlalchemy import select

from app.core.config import settings
from app.models.ai_provider import AICredential, AISelection
from app.services import ai_credentials as credentials
from tests.test_profile import account

pytestmark = pytest.mark.asyncio
BASE = '/api/v1/ai-providers'
KEY = 'private-test-key-never-return-this'


@pytest.fixture
def providers(monkeypatch):
    monkeypatch.setattr(settings, 'AI_KEY_ENCRYPTION_SECRET', Fernet.generate_key().decode())
    instances = []

    class FakeProvider:
        def __init__(self, api_key, model):
            self.key, self.model = api_key, model
            self.generate = AsyncMock(return_value='OK')
            instances.append(self)

        async def stream_generate(self, **kwargs):
            yield self.key

    monkeypatch.setattr(credentials, 'PROVIDERS', {p: FakeProvider for p in credentials.PROVIDERS})
    return instances


async def connect(client, headers, provider='gemini', key=KEY):
    verified = await client.post(BASE + '/verify', headers=headers, json={'provider': provider, 'api_key': key})
    assert verified.status_code == 200, verified.text
    assert verified.json()['status'] == 'verified', verified.text
    saved = await client.put(BASE + '/connection', headers=headers, json={
        'provider': provider, 'api_key': key, 'verification_token': verified.json()['verification_token'],
    })
    assert saved.status_code == 200, saved.text
    return saved


@pytest.mark.parametrize('provider', ['gemini', 'openai', 'anthropic'])
async def test_verify_encrypt_save_select_replace_remove(client, test_db, verification_mail, providers, provider, caplog):
    headers = await account(client, verification_mail)
    saved = await connect(client, headers, provider)
    assert KEY not in saved.text
    assert saved.json()['selected'] == 'default'
    call = providers[-1].generate.call_args.kwargs
    assert call['max_tokens'] == 8
    row = await test_db.scalar(select(AICredential))
    assert KEY not in row.encrypted_key
    assert credentials.cipher().decrypt(row.encrypted_key.encode())
    selected = await client.put(BASE + '/selection', headers=headers, json={'provider': provider})
    assert selected.json()['selected'] == provider
    llm = await credentials.resolve_llm(test_db, row.user_id)
    assert llm.provider.key == KEY
    await connect(client, headers, provider, 'replacement-private-test-key')
    llm = await credentials.resolve_llm(test_db, row.user_id)
    assert llm.provider.key == 'replacement-private-test-key'
    removed = await client.delete(BASE + '/' + provider, headers=headers)
    assert removed.json()['connections'] == []
    assert removed.json()['selected'] == 'default'
    assert await credentials.resolve_llm(test_db, row.user_id) is credentials.llm_service
    assert KEY not in caplog.text


async def test_ownership_receipts_and_explicit_default(client, test_db, verification_mail, providers):
    alice = await account(client, verification_mail)
    bob = await account(client, verification_mail, 'bob@example.com')
    verified = (await client.post(BASE + '/verify', headers=alice, json={'provider': 'openai', 'api_key': KEY})).json()
    for headers, provider, key in ((bob, 'openai', KEY), (alice, 'gemini', KEY), (alice, 'openai', 'different-secret-key')):
        response = await client.put(BASE + '/connection', headers=headers, json={
            'provider': provider, 'api_key': key, 'verification_token': verified['verification_token'],
        })
        assert response.status_code == 400
    await connect(client, alice, 'openai')
    row = await test_db.scalar(select(AICredential))
    await client.put(BASE + '/selection', headers=alice, json={'provider': 'openai'})
    assert (await client.get(BASE, headers=bob)).json()['connections'] == []
    assert (await client.put(BASE + '/selection', headers=bob, json={'provider': 'openai'})).status_code == 409
    await client.delete(BASE + '/openai', headers=bob)
    assert (await credentials.resolve_llm(test_db, row.user_id)).provider.key == KEY
    await client.put(BASE + '/selection', headers=alice, json={'provider': 'default'})
    assert await credentials.resolve_llm(test_db, row.user_id) is credentials.llm_service
    # Saving alone does not alter the default for either account.
    assert settings.LLM_PROVIDER != 'personal'


@pytest.mark.parametrize('status,message,expected', [
    (401, 'authentication', 'Invalid API key'),
    (403, 'permission denied', 'model'),
    (404, 'model_not_found', 'model'),
    (429, 'quota exhausted', 'quota'),
    (400, 'credit balance', 'billing'),
    (503, 'connection timeout', 'connection'),
    (500, 'unexpected', 'could not complete'),
])
async def test_failed_verification_is_clear_and_redacts_provider_errors(client, verification_mail, providers, status, message, expected, monkeypatch, caplog):
    headers = await account(client, verification_mail)

    class Failure(Exception):
        status_code = status

    class BadProvider:
        def __init__(self, **kwargs):
            pass

        async def generate(self, **kwargs):
            raise Failure(f'{message} {KEY}')

    monkeypatch.setitem(credentials.PROVIDERS, 'gemini', BadProvider)
    response = await client.post(BASE + '/verify', headers=headers, json={'provider': 'gemini', 'api_key': KEY})
    assert response.json()['status'] == 'failed'
    assert expected in response.json()['message']
    assert KEY not in response.text + caplog.text
    assert (await client.get(BASE, headers=headers)).json()['connections'] == []


async def test_auth_validation_and_encryption_failure(client, test_db, verification_mail, providers, monkeypatch):
    assert (await client.get(BASE)).status_code == 401
    headers = await account(client, verification_mail)
    malformed = await client.post(BASE + '/verify', headers=headers, json={'provider': 'unknown', 'api_key': KEY})
    assert malformed.status_code == 422
    assert KEY not in malformed.text
    await connect(client, headers)
    row = await test_db.scalar(select(AICredential))
    await client.put(BASE + '/selection', headers=headers, json={'provider': 'gemini'})
    monkeypatch.setattr(settings, 'AI_KEY_ENCRYPTION_SECRET', Fernet.generate_key().decode())
    with pytest.raises(HTTPException, match='') as error:
        await credentials.resolve_llm(test_db, row.user_id)
    assert error.value.status_code == 503
    monkeypatch.setattr(settings, 'AI_KEY_ENCRYPTION_SECRET', None)
    assert (await client.post(BASE + '/verify', headers=headers, json={'provider': 'gemini', 'api_key': KEY})).status_code == 503
    await client.put(BASE + '/selection', headers=headers, json={'provider': 'default'})
    assert await credentials.resolve_llm(test_db, row.user_id) is credentials.llm_service


async def test_no_fallback_and_concurrent_credentials(client, test_db, verification_mail, providers):
    alice = await account(client, verification_mail)
    bob = await account(client, verification_mail, 'bob@example.com')
    await connect(client, alice)
    await connect(client, bob, key='bob-private-key')
    rows = (await test_db.scalars(select(AICredential).order_by(AICredential.user_id))).all()
    for row in rows:
        test_db.add(AISelection(user_id=row.user_id, provider='gemini'))
    await test_db.commit()
    a = await credentials.resolve_llm(test_db, rows[0].user_id)
    b = await credentials.resolve_llm(test_db, rows[1].user_id)
    assert a.provider.key == KEY
    assert b.provider.key == 'bob-private-key'
    a.provider.generate.side_effect = RuntimeError('quota exhausted ' + KEY)
    with pytest.raises(RuntimeError, match='quota'):
        await a.generate(prompt='test', system_prompt='test')
    assert await b.generate(prompt='test', system_prompt='test') == 'OK'
    # Same failure propagates through structured analysis and streaming paths.
    with pytest.raises(RuntimeError, match='quota'):
        await a.generate_structured_response('test', {})
    assert credentials.llm_service is not a and credentials.llm_service is not b


async def test_verification_expiry_and_throttling(client, verification_mail, providers, monkeypatch):
    headers = await account(client, verification_mail)
    response = await client.post(BASE + '/verify', headers=headers, json={'provider': 'gemini', 'api_key': KEY})
    token = response.json()['verification_token']
    import time
    now = time.time()
    monkeypatch.setattr('cryptography.fernet.time.time', lambda: now + 601)
    response = await client.put(BASE + '/connection', headers=headers, json={
        'provider': 'gemini', 'api_key': KEY, 'verification_token': token,
    })
    assert response.status_code == 400
    monkeypatch.undo()


async def test_verification_rate_limit(client, verification_mail, providers):
    headers = await account(client, verification_mail)
    for _ in range(10):
        response = await client.post(BASE + '/verify', headers=headers, json={'provider': 'gemini', 'api_key': KEY})
        assert response.status_code == 200
    response = await client.post(BASE + '/verify', headers=headers, json={'provider': 'gemini', 'api_key': KEY})
    assert response.status_code == 429
    assert len(providers) == 10


async def test_chat_stream_and_analysis_use_request_personal_key(client, test_db, verification_mail, providers, monkeypatch):
    from app.services.rag.engine import RAGEngine
    from app.api.v1.analysis import get_analysis_service
    from app.models.user import User
    headers = await account(client, verification_mail)
    await connect(client, headers)
    await client.put(BASE + '/selection', headers=headers, json={'provider': 'gemini'})
    seen = []

    async def answer(self, **kwargs):
        seen.append(self.llm.provider.key)
        return {'error': 'Invalid API key. Replace it in Settings.'}

    async def stream(self, **kwargs):
        seen.append(self.llm.provider.key)
        yield {'type': 'error', 'error': 'Provider quota reached. Check your provider account.'}

    monkeypatch.setattr(RAGEngine, 'answer_question', answer)
    monkeypatch.setattr(RAGEngine, 'stream_answer', stream)
    response = await client.post('/api/v1/chat/ask', headers=headers, json={'message': 'Hello'})
    assert response.status_code == 502
    assert 'Invalid API key' in response.text
    response = await client.post('/api/v1/chat/stream', headers=headers, json={'message': 'Hello'})
    assert 'Provider quota reached' in response.text
    assert KEY not in response.text
    assert seen == [KEY, KEY]
    user = await test_db.scalar(select(User))
    service = await get_analysis_service(test_db, user)
    assert service.llm.provider.key == KEY
    assert service.llm.provider_name == 'personal:gemini'


async def test_database_ciphertext_cannot_be_moved_between_users(client, test_db, verification_mail, providers):
    alice = await account(client, verification_mail)
    bob = await account(client, verification_mail, 'bob@example.com')
    await connect(client, alice)
    await connect(client, bob, key='bob-private-key')
    rows = (await test_db.scalars(select(AICredential).order_by(AICredential.user_id))).all()
    rows[1].encrypted_key = rows[0].encrypted_key
    await test_db.commit()
    with pytest.raises(HTTPException) as error:
        await credentials.resolve_llm(test_db, rows[1].user_id, 'gemini')
    assert error.value.status_code == 503
