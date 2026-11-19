import base64
import hashlib
from datetime import datetime, timedelta
from email import policy
from email.parser import BytesParser

import httpx
import pytest
from sqlalchemy import select

from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User, EmailVerification
from app.services.account_security import send_reset_email, send_verification_email, MailDeliveryError

BASE = '/api/v1/auth'
DATA = {'email': 'new@example.com', 'password': 'password123', 'full_name': 'New User'}


@pytest.mark.asyncio
async def test_registration_requires_verification_and_token_is_single_use(client, test_db, verification_mail):
    response = await client.post(f'{BASE}/register', json=DATA)
    assert response.status_code == 201
    assert response.json()['email_verified'] is False
    secret = verification_mail.call_args.args[1]
    state = (await test_db.execute(select(EmailVerification))).scalar_one()
    assert state.token_hash == hashlib.sha256(secret.encode()).hexdigest()
    assert secret not in response.text
    for path, body in [('/login/json', {'json': DATA}), ('/login', {'data': {'username': DATA['email'], 'password': DATA['password']}})]:
        assert (await client.post(BASE + path, **body)).status_code == 403
    forged_session = create_access_token({'sub': DATA['email']})
    assert (await client.get(f'{BASE}/me', headers={'Authorization': f'Bearer {forged_session}'})).status_code == 403
    assert (await client.post(f'{BASE}/verify-email', json={'token': secret})).status_code == 200
    assert (await client.post(f'{BASE}/verify-email', json={'token': secret})).status_code == 400
    login = await client.post(f'{BASE}/login/json', json=DATA)
    assert login.status_code == 200
    assert (await client.get(f'{BASE}/me', headers={'Authorization': f'Bearer {login.json()["access_token"]}'})).json()['email_verified'] is True


@pytest.mark.asyncio
async def test_resend_expiry_rotation_and_no_cross_purpose_token_use(client, test_db, verification_mail):
    await client.post(f'{BASE}/register', json=DATA)
    first = verification_mail.call_args.args[1]
    state = (await test_db.execute(select(EmailVerification))).scalar_one()
    state.expires_at = datetime.utcnow() - timedelta(seconds=1)
    await test_db.commit()
    assert (await client.post(f'{BASE}/verify-email', json={'token': first})).status_code == 400
    response = await client.post(f'{BASE}/resend-verification', json={'email': DATA['email']})
    assert response.status_code == 200
    second = verification_mail.call_args.args[1]
    assert second != first
    assert (await client.post(f'{BASE}/verify-email', json={'token': first})).status_code == 400
    assert (await client.post(f'{BASE}/reset-password', json={'token': second, 'new_password': 'changed123'})).status_code == 400
    assert (await client.post(f'{BASE}/verify-email', json={'token': second})).status_code == 200
    verification_mail.reset_mock()
    await client.post(f'{BASE}/resend-verification', json={'email': DATA['email']})
    verification_mail.assert_not_called()


@pytest.mark.asyncio
async def test_registration_send_failure_does_not_claim_success_or_save_account(client, test_db, verification_mail):
    verification_mail.side_effect = MailDeliveryError('authorization')
    response = await client.post(f'{BASE}/register', json=DATA)
    assert response.status_code == 503
    assert 'could not be sent' in response.json()['detail']
    assert (await test_db.execute(select(User))).scalars().all() == []
    assert (await client.post(f'{BASE}/register', json={**DATA, 'email': 'invalid-address'})).status_code == 422


@pytest.mark.asyncio
async def test_unverified_cannot_recover_password_and_resend_is_throttled(client, verification_mail, monkeypatch):
    from unittest.mock import AsyncMock
    reset = AsyncMock()
    monkeypatch.setattr('app.api.v1.account_security.send_reset_email', reset)
    await client.post(f'{BASE}/register', json=DATA)
    pending = await client.post(f'{BASE}/forgot-password', json={'email': DATA['email']})
    unknown = await client.post(f'{BASE}/forgot-password', json={'email': 'unknown@example.com'})
    assert pending.json() == unknown.json()
    reset.assert_not_called()
    for i in range(4):
        assert (await client.post(f'{BASE}/resend-verification', json={'email': DATA['email']})).status_code == (200 if i < 3 else 429)


@pytest.mark.asyncio
@pytest.mark.parametrize('verification', [False, True])
async def test_gmail_refresh_and_mime_send_use_https(monkeypatch, verification_mail, verification):
    monkeypatch.setattr(settings, 'EMAIL_FROM', 'ResearchMate AI <researchmateai123@gmail.com>')
    captured = []
    def handle(request):
        captured.append(request)
        if request.url.host == 'oauth2.googleapis.com':
            assert b'grant_type=refresh_token' in request.content
            return httpx.Response(200, json={'access_token': 'short-lived-token'})
        return httpx.Response(200, json={'id': 'gmail-message-123'})
    real_client = httpx.AsyncClient
    monkeypatch.setattr('app.services.account_security.httpx.AsyncClient', lambda **kwargs: real_client(transport=httpx.MockTransport(handle), **kwargs))
    sender = send_verification_email if verification else send_reset_email
    assert await sender('another-user@example.com', 'safe-token') == 'gmail-message-123'
    import json
    message = BytesParser(policy=policy.default).parsebytes(base64.urlsafe_b64decode(json.loads(captured[1].content)['raw']))
    assert message['To'] == 'another-user@example.com'
    assert message['From'] == 'ResearchMate AI <researchmateai123@gmail.com>'
    assert ('Verify' if verification else 'Reset') in message['Subject']
    route = 'verify-email' if verification else 'reset-password'
    assert f'/{route}#token=safe-token' in message.get_body(preferencelist=('plain',)).get_content()
    html = message.get_body(preferencelist=('html',)).get_content()
    assert f'/{route}#token=safe-token' in html
    assert 'background-color:#116e64' in html
    assert ('Verify email address' if verification else 'Reset password') in html
    assert 'Button not working?' in html
    assert '<script' not in html and '<img' not in html
    assert captured[1].headers['authorization'] == 'Bearer short-lived-token'
    assert '/users/researchmateai123%40gmail.com/messages/send' in str(captured[1].url)


@pytest.mark.asyncio
@pytest.mark.parametrize('stage,status', [('refresh', 400), ('send', 403), ('send', 429), ('send', 500)])
async def test_gmail_failures_are_safe_and_never_claim_delivery(monkeypatch, verification_mail, stage, status):
    def handle(request):
        if request.url.host == 'oauth2.googleapis.com':
            return httpx.Response(status if stage == 'refresh' else 200, json={'access_token': 'token', 'error': 'private-provider-details'})
        return httpx.Response(status, json={'error': 'private-provider-details'})
    real_client = httpx.AsyncClient
    monkeypatch.setattr('app.services.account_security.httpx.AsyncClient', lambda **kwargs: real_client(transport=httpx.MockTransport(handle), **kwargs))
    with pytest.raises(MailDeliveryError) as error:
        await send_reset_email('user@example.com', 'secret')
    assert 'private-provider-details' not in str(error.value)
    assert 'secret' not in str(error.value)
