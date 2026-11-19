"""Recovery, provider separation, session revocation, and verification regressions."""
import hashlib
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.user import User, UserAuth, PasswordReset
from app.services.account_security import verify_google_credential, send_reset_email, email_configured

BASE = '/api/v1/auth'


@pytest.fixture
def mail(monkeypatch, verification_mail):
    monkeypatch.setattr(settings, 'EMAIL_FROM', 'ResearchMate <sender@gmail.com>')
    monkeypatch.setattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    sender = AsyncMock()
    monkeypatch.setattr('app.api.v1.account_security.send_reset_email', sender)
    return sender


async def account(client, verification_mail, email='user@example.com'):
    assert (await client.post(f'{BASE}/register', json={
        'email': email, 'password': 'old-password', 'full_name': 'Researcher'
    })).status_code == 201
    assert (await client.post(f'{BASE}/verify-email', json={'token': verification_mail.call_args.args[1]})).status_code == 200
    result = await client.post(f'{BASE}/login/json', json={'email': email, 'password': 'old-password'})
    return {'Authorization': f'Bearer {result.json()["access_token"]}'}


@pytest.mark.asyncio
async def test_recovery_single_use_and_revokes_sessions(client, test_db, mail, verification_mail):
    headers = await account(client, verification_mail)
    response = await client.post(f'{BASE}/forgot-password', json={'email': 'USER@example.com'})
    assert response.status_code == 200
    token = mail.call_args.args[1]
    record = (await test_db.execute(select(PasswordReset))).scalar_one()
    assert record.token_hash == hashlib.sha256(token.encode()).hexdigest()
    assert token not in response.text
    assert (await client.get(f'{BASE}/me', headers=headers)).status_code == 200
    reset = await client.post(f'{BASE}/reset-password', json={'token': token, 'new_password': 'new-password'})
    assert reset.status_code == 200
    assert (await client.post(f'{BASE}/reset-password', json={'token': token, 'new_password': 'other-password'})).status_code == 400
    assert (await client.get(f'{BASE}/me', headers=headers)).status_code == 401
    for password, status in [('old-password', 401), ('new-password', 200)]:
        assert (await client.post(f'{BASE}/login/json', json={'email': 'user@example.com', 'password': password})).status_code == status


@pytest.mark.asyncio
async def test_change_requires_current_password_revokes_all_links_and_sessions(client, test_db, mail, verification_mail):
    headers = await account(client, verification_mail)
    await client.post(f'{BASE}/forgot-password', json={'email': 'user@example.com'})
    token = mail.call_args.args[1]
    for password, status in [('wrong-password', 400), ('old-password', 200)]:
        response = await client.post(f'{BASE}/change-password', headers=headers, json={
            'current_password': password, 'new_password': 'new-password'
        })
        assert response.status_code == status
    assert (await client.get(f'{BASE}/me', headers=headers)).status_code == 401
    assert (await client.post(f'{BASE}/reset-password', json={'token': token, 'new_password': 'reset-again'})).status_code == 400
    login = await client.post(f'{BASE}/login', data={'username': 'user@example.com', 'password': 'new-password'})
    assert login.status_code == 200
    assert (await client.get(f'{BASE}/me', headers={'Authorization': f'Bearer {login.json()["access_token"]}'})).status_code == 200


@pytest.mark.asyncio
async def test_expired_invalid_and_overlong_password_links(client, test_db, mail, verification_mail):
    await account(client, verification_mail)
    await client.post(f'{BASE}/forgot-password', json={'email': 'user@example.com'})
    token = mail.call_args.args[1]
    assert (await client.post(f'{BASE}/reset-password', json={'token': token, 'new_password': '🔥' * 19})).status_code == 422
    record = (await test_db.execute(select(PasswordReset))).scalar_one()
    record.expires_at = datetime.utcnow() - timedelta(seconds=1)
    await test_db.commit()
    for value in [token, 'x' * 43]:
        assert (await client.post(f'{BASE}/reset-password', json={'token': value, 'new_password': 'new-password'})).status_code == 400


@pytest.mark.asyncio
async def test_google_accounts_cannot_use_local_password_flows(client, test_db, mail, monkeypatch):
    verifier = AsyncMock(return_value={'sub': 'google-123', 'email': 'google@example.com', 'name': 'Google User'})
    monkeypatch.setattr('app.api.v1.account_security.verify_google_credential', verifier)
    response = await client.post(f'{BASE}/google', json={'credential': 'verified-in-provider-test'})
    assert response.status_code == 200
    headers = {'Authorization': f'Bearer {response.json()["access_token"]}'}
    me = await client.get(f'{BASE}/me', headers=headers)
    assert me.json()['auth_provider'] == 'google'
    google_response = await client.post(f'{BASE}/forgot-password', json={'email': 'google@example.com'})
    unknown_response = await client.post(f'{BASE}/forgot-password', json={'email': 'unknown@example.com'})
    assert google_response.json() == unknown_response.json()
    mail.assert_not_called()
    assert (await client.post(f'{BASE}/change-password', headers=headers, json={
        'current_password': 'anything', 'new_password': 'new-password'
    })).status_code == 400
    assert (await client.post(f'{BASE}/login/json', json={
        'email': 'google@example.com', 'password': '!'
    })).status_code == 401
    again = await client.post(f'{BASE}/google', json={'credential': 'same-provider-user'})
    assert again.status_code == 200
    assert len((await test_db.execute(select(User))).scalars().all()) == 1


@pytest.mark.asyncio
async def test_google_never_silently_links_existing_password_account(client, monkeypatch, verification_mail):
    headers = await account(client, verification_mail)
    monkeypatch.setattr('app.api.v1.account_security.verify_google_credential', AsyncMock(return_value={
        'sub': 'unlinked', 'email': 'USER@example.com', 'name': 'Different Name'
    }))
    assert (await client.post(f'{BASE}/google', json={'credential': 'another-google-user'})).status_code == 409
    assert (await client.get(f'{BASE}/me', headers=headers)).json()['auth_provider'] == 'password'


@pytest.mark.asyncio
async def test_unknown_email_throttled_and_unconfigured_mail_is_explicit(client, mail, monkeypatch):
    for index in range(4):
        response = await client.post(f'{BASE}/forgot-password', json={'email': 'unknown@example.com'})
        assert response.status_code == (200 if index < 3 else 429)
    mail.assert_not_called()
    monkeypatch.setattr(settings, 'GMAIL_REFRESH_TOKEN', None)
    assert (await client.post(f'{BASE}/forgot-password', json={'email': 'unknown@example.com'})).status_code == 503


@pytest.mark.asyncio
async def test_password_change_needs_authentication(client):
    assert (await client.post(f'{BASE}/change-password', json={
        'current_password': 'old-password', 'new_password': 'new-password'
    })).status_code == 401


@pytest.mark.asyncio
async def test_google_verifier_checks_audience_and_verified_email(monkeypatch):
    monkeypatch.setattr(settings, 'GOOGLE_CLIENT_ID', 'expected-client-id')
    from fastapi import HTTPException
    with patch('google.oauth2.id_token.verify_oauth2_token') as verifier:
        verifier.return_value = {'sub': '123', 'email': 'google@example.com', 'email_verified': True}
        assert (await verify_google_credential('credential'))['sub'] == '123'
        assert verifier.call_args.args[2] == 'expected-client-id'
        verifier.side_effect = ValueError('invalid signature, issuer, expiry or audience')
        with pytest.raises(HTTPException) as error:
            await verify_google_credential('forged-token')
        assert error.value.status_code == 401
        verifier.side_effect = None
        verifier.return_value = {'sub': '123', 'email': 'google@example.com', 'email_verified': False}
        with pytest.raises(HTTPException):
            await verify_google_credential('unverified-email')
