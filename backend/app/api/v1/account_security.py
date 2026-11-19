"""Google sign-in and password-only account recovery."""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import delete, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.core.security import create_access_token, get_current_user, get_password_hash, verify_password
from app.models.user import User, UserAuth, PasswordReset, EmailVerification
from app.schemas.user import ChangePassword, ForgotPassword, GoogleLogin, ResetPassword, Token, VerifyEmail
from app.services.account_security import (
    email_configured, ensure_auth, send_reset_email, throttle, verify_google_credential,
    send_verification_email, MailDeliveryError,
)

router = APIRouter()
logger = logging.getLogger(__name__)
GENERIC_RESET_MESSAGE = 'If an eligible email/password account exists, a password reset link will be emailed to you.'


def issue_token(user):
    return {'access_token': create_access_token({'sub': user.email, 'ver': user.session_version}), 'token_type': 'bearer'}


def ip(request):
    # Do not trust arbitrary X-Forwarded-For headers.
    return request.client.host if request.client else 'unknown'


@router.get('/providers')
async def providers():
    return {'google_client_id': settings.GOOGLE_CLIENT_ID}


@router.post('/verify-email')
async def verify_email(data: VerifyEmail, request: Request, db: AsyncSession = Depends(get_db)):
    await throttle(db, 'verify-ip', ip(request), 30)
    now = datetime.utcnow()
    user_id = (await db.execute(update(EmailVerification).where(
        EmailVerification.token_hash == hashlib.sha256(data.token.encode()).hexdigest(),
        EmailVerification.verified_at.is_(None), EmailVerification.expires_at > now,
    ).values(verified_at=now, token_hash=None, expires_at=None)
        .returning(EmailVerification.user_id))).scalar_one_or_none()
    if user_id is None:
        raise HTTPException(400, 'This verification link is invalid or expired. Request a new one.')
    await db.commit()
    return {'message': 'Email verified. You can now sign in.'}


@router.post('/resend-verification')
async def resend_verification(data: ForgotPassword, request: Request, db: AsyncSession = Depends(get_db)):
    if not email_configured():
        raise HTTPException(503, 'Email verification is unavailable. Please try again later.')
    email = str(data.email).strip().lower()
    await throttle(db, 'resend-ip', ip(request), 20)
    await throttle(db, 'resend-email', email, 3)
    from app.api.v1.auth import email_match
    user = (await db.execute(select(User).where(email_match(email)).with_for_update())).scalar_one_or_none()
    if user and user.is_active and user.auth_provider == 'password' and not user.email_verified:
        token = secrets.token_urlsafe(32)
        user.email_verification.token_hash = hashlib.sha256(token.encode()).hexdigest()
        user.email_verification.expires_at = datetime.utcnow() + timedelta(minutes=settings.EMAIL_VERIFICATION_EXPIRE_MINUTES)
        try:
            await send_verification_email(email, token)
        except MailDeliveryError:
            await db.rollback()
            raise HTTPException(503, 'The verification email could not be sent. Please try again later.')
        await db.commit()
    return {'message': 'If an account needs verification, a new link has been submitted for sending. Check your inbox and spam folder.'}


@router.post('/google', response_model=Token)
async def google_login(data: GoogleLogin, request: Request, db: AsyncSession = Depends(get_db)):
    await throttle(db, 'google', ip(request), 30)
    claims = await verify_google_credential(data.credential)
    result = await db.execute(select(User).join(UserAuth).where(UserAuth.google_sub == claims['sub']))
    user = result.scalar_one_or_none()
    if not user:
        from app.api.v1.auth import email_match
        email = claims['email'].strip().lower()
        if (await db.execute(select(User).where(email_match(email)))).scalar_one_or_none():
            raise HTTPException(409, 'An account with this email already exists. Sign in using your original method.')
        user = User(email=email, hashed_password='!', full_name=str(claims.get('name', ''))[:150] or None,
                    is_active=True, auth=UserAuth(provider='google', google_sub=claims['sub'], session_version=0))
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(409, 'This account was just registered. Please sign in again.')
    if not user.is_active:
        raise HTTPException(400, 'Inactive user')
    return issue_token(user)


async def deliver_reset(email, token, token_hash, session_factory=AsyncSessionLocal):
    try:
        await send_reset_email(email, token)
    except Exception as error:
        category = str(error) if isinstance(error, MailDeliveryError) else 'unexpected'
        logger.error('Gmail password-reset sending failed (%s); check sender OAuth credentials and quota.', category)
        # Remove unusable requests without revealing the provider response or token.
        async with session_factory() as db:
            await db.execute(delete(PasswordReset).where(PasswordReset.token_hash == token_hash))
            await db.commit()


@router.post('/forgot-password')
async def forgot_password(data: ForgotPassword, request: Request, tasks: BackgroundTasks,
                          db: AsyncSession = Depends(get_db)):
    if not email_configured():
        raise HTTPException(503, 'Password recovery is not configured yet. Please try again later.')
    email = str(data.email).strip().lower()
    await throttle(db, 'forgot-ip', ip(request), 20)
    await throttle(db, 'forgot-email', email, 3)
    from app.api.v1.auth import email_match
    user = (await db.execute(select(User).where(email_match(email)))).scalar_one_or_none()
    now = datetime.utcnow()
    await db.execute(delete(PasswordReset).where(PasswordReset.expires_at < now))
    if user and user.is_active and user.auth_provider == 'password' and user.email_verified:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        db.add(PasswordReset(token_hash=token_hash, user_id=user.id,
                             expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)))
        await db.commit()
        tasks.add_task(deliver_reset, email, token, token_hash)
    return {'message': GENERIC_RESET_MESSAGE}


async def replace_password(db, user, password):
    await ensure_auth(db, user)
    user.hashed_password = get_password_hash(password)
    await db.execute(update(UserAuth).where(UserAuth.user_id == user.id).values(
        session_version=UserAuth.session_version + 1))
    await db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.id))
    await db.commit()
    await db.refresh(user)


@router.post('/reset-password')
async def reset_password(data: ResetPassword, request: Request, db: AsyncSession = Depends(get_db)):
    await throttle(db, 'reset-ip', ip(request), 30)
    now = datetime.utcnow()
    # Atomic consumption means two simultaneous requests cannot reuse the link.
    user_id = (await db.execute(update(PasswordReset).where(
        PasswordReset.token_hash == hashlib.sha256(data.token.encode()).hexdigest(),
        PasswordReset.used_at.is_(None), PasswordReset.expires_at > now,
    ).values(used_at=now).returning(PasswordReset.user_id))).scalar_one_or_none()
    if user_id is None:
        raise HTTPException(400, 'This reset link is invalid or expired. Request a new link.')
    user = (await db.execute(select(User).where(User.id == user_id).with_for_update())).scalar_one()
    if not user.is_active or user.auth_provider != 'password':
        raise HTTPException(400, 'This reset link is invalid or expired. Request a new link.')
    await replace_password(db, user, data.new_password)
    return {'message': 'Password reset. Sign in with your new password.'}


@router.post('/change-password')
async def change_password(data: ChangePassword, request: Request,
                          user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if user.auth_provider != 'password':
        raise HTTPException(400, 'Manage your password in your Google account.')
    await throttle(db, 'change-user', str(user.id), 10)
    # Lock before checking the old password to serialize concurrent password changes.
    user = (await db.execute(select(User).where(User.id == user.id).with_for_update()
                             .execution_options(populate_existing=True))).scalar_one()
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(400, 'Current password is incorrect.')
    if verify_password(data.new_password, user.hashed_password):
        raise HTTPException(400, 'Choose a password different from your current password.')
    await replace_password(db, user, data.new_password)
    return {'message': 'Password changed. Sign in again with your new password.'}
