"""Provider verification, transactional email, and persistent auth throttling."""
import hashlib
import base64
import hmac
import logging
import time
from datetime import datetime, timedelta
from email.utils import parseaddr
from email.message import EmailMessage
from email.policy import SMTP
from urllib.parse import quote, urlsplit

import httpx
from fastapi import HTTPException
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.models.user import AuthRateLimit, UserAuth
from app.services.email_templates import render_account_email

logger = logging.getLogger(__name__)


def insert_for(db, model):
    return (sqlite_insert if db.bind.dialect.name == 'sqlite' else pg_insert)(model)


async def throttle(db, scope: str, identity: str, limit: int, seconds: int = 3600):
    """Atomic fixed-window counters shared across workers; never store raw IP/email."""
    now = datetime.utcnow()
    window = int(time.time()) // seconds
    digest = hmac.new(settings.SECRET_KEY.encode(), identity.encode(), hashlib.sha256).hexdigest()
    key = f'{scope}:{window}:{digest}'
    await db.execute(delete(AuthRateLimit).where(AuthRateLimit.expires_at < now))
    stmt = insert_for(db, AuthRateLimit).values(
        key=key, attempts=1, expires_at=now + timedelta(seconds=seconds)
    ).on_conflict_do_update(
        index_elements=['key'], set_={'attempts': AuthRateLimit.attempts + 1}
    ).returning(AuthRateLimit.attempts)
    attempts = (await db.execute(stmt)).scalar_one()
    await db.commit()
    if attempts > limit:
        raise HTTPException(429, 'Too many attempts. Please try again later.', headers={'Retry-After': str(seconds)})


async def ensure_auth(db, user):
    await db.execute(insert_for(db, UserAuth).values(
        user_id=user.id, provider='password', session_version=0
    ).on_conflict_do_nothing(index_elements=['user_id']))


async def verify_google_credential(credential: str):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, 'Google sign-in is not configured yet.')
    from google.oauth2 import id_token
    from google.auth.transport.requests import Request

    def verify():
        return id_token.verify_oauth2_token(credential, Request(), settings.GOOGLE_CLIENT_ID)

    try:
        claims = await run_in_threadpool(verify)
    except ValueError:
        raise HTTPException(401, 'Google sign-in could not be verified. Please try again.')
    except Exception:
        logger.warning('Google token verification unavailable')
        raise HTTPException(503, 'Google sign-in is temporarily unavailable. Please try again.')
    if not claims.get('sub') or not claims.get('email') or claims.get('email_verified') is not True:
        raise HTTPException(401, 'A verified Google email address is required.')
    return claims


def email_sender():
    """Accept either a bare verified address or Name <address>."""
    value = settings.EMAIL_FROM or ''
    if '\r' in value or '\n' in value:
        return None
    name, address = parseaddr(value)
    try:
        address = str(TypeAdapter(EmailStr).validate_python(address))
    except ValidationError:
        return None
    return {'name': name or settings.APP_NAME, 'email': address}


def email_configured():
    origin = urlsplit(settings.FRONTEND_URL)
    return bool(settings.GMAIL_CLIENT_ID and settings.GMAIL_CLIENT_SECRET and settings.GMAIL_REFRESH_TOKEN
                and email_sender() and origin.netloc and (
        origin.scheme == 'https' or (
            settings.ENVIRONMENT != 'production' and origin.scheme == 'http'
            and origin.hostname in ('localhost', '127.0.0.1')
        )
    ) and not origin.query and not origin.fragment)


class MailDeliveryError(Exception):
    """Safe error category: never expose OAuth secrets or the message body."""


async def send_account_email(email: str, token: str, *, verification: bool = False):
    if not email_configured():
        raise ValueError('Password recovery email is not configured.')
    # Fixed, configured origin prevents Host-header poisoning. Never log reset links.
    route = 'verify-email' if verification else 'reset-password'
    action = 'Verify your email' if verification else 'Reset your password'
    link = f'{settings.FRONTEND_URL.rstrip("/")}/{route}#token={quote(token)}'
    minutes = settings.EMAIL_VERIFICATION_EXPIRE_MINUTES if verification else settings.PASSWORD_RESET_EXPIRE_MINUTES
    sender = email_sender()
    message = EmailMessage()
    message['From'] = settings.EMAIL_FROM
    message['To'] = str(TypeAdapter(EmailStr).validate_python(email))
    message['Subject'] = f'{action} — ResearchMate AI'
    plain_text, html = render_account_email(link, minutes, verification=verification)
    message.set_content(plain_text)
    message.add_alternative(html, subtype='html')
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            auth = await client.post('https://oauth2.googleapis.com/token', data={
                'client_id': settings.GMAIL_CLIENT_ID, 'client_secret': settings.GMAIL_CLIENT_SECRET,
                'refresh_token': settings.GMAIL_REFRESH_TOKEN, 'grant_type': 'refresh_token',
            })
            if auth.status_code != 200 or not auth.json().get('access_token'):
                raise MailDeliveryError('authorization')
            # Addressing the authorized mailbox explicitly rejects mismatched sender credentials.
            response = await client.post(
                f'https://gmail.googleapis.com/gmail/v1/users/{quote(sender["email"], safe="")}/messages/send',
                headers={'Authorization': f'Bearer {auth.json()["access_token"]}'},
                json={'raw': base64.urlsafe_b64encode(message.as_bytes(policy=SMTP)).decode()},
            )
            if response.status_code not in (200, 201) or not response.json().get('id'):
                category = 'quota' if response.status_code == 429 else 'rejected'
                raise MailDeliveryError(category)
            logger.info('Gmail API accepted account email for sending (not an inbox-delivery confirmation).')
            return response.json()['id']
    except MailDeliveryError as error:
        logger.error('Gmail API did not accept account email (%s).', str(error))
        raise
    except (httpx.HTTPError, ValueError, KeyError):
        logger.error('Gmail API account email sending is unavailable.')
        raise MailDeliveryError('unavailable') from None


async def send_reset_email(email: str, token: str):
    return await send_account_email(email, token)


async def send_verification_email(email: str, token: str):
    return await send_account_email(email, token, verification=True)
