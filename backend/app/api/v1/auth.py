"""
Authentication API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import hashlib
import secrets

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user
)
from app.core.config import settings
from app.models.user import User, UserProfile, EmailVerification
from app.services.account_security import email_configured, send_verification_email, throttle, MailDeliveryError
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, ProfileUpdate
from app.services.profile_photo import make_profile_photo

router = APIRouter()


def email_match(email: str):
    from sqlalchemy import func
    return func.lower(User.email) == email.strip().lower()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user
    """
    await throttle(db, 'register-ip', request.client.host if request.client else 'unknown', 20)
    # Check if user already exists
    result = await db.execute(select(User).where(email_match(str(user_data.email))))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    if not email_configured():
        raise HTTPException(503, 'Email verification is unavailable. Please try again later.')
    if len(user_data.password.encode('utf-8')) > 72:
        raise HTTPException(422, 'Use a password of 72 UTF-8 bytes or fewer.')

    # Create new user
    new_user = User(
        email=str(user_data.email).strip().lower(),
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        is_active=True
    )

    db.add(new_user)
    token = secrets.token_urlsafe(32)
    new_user.email_verification = EmailVerification(
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.EMAIL_VERIFICATION_EXPIRE_MINUTES),
    )
    await db.flush()
    try:
        await send_verification_email(new_user.email, token)
    except MailDeliveryError:
        await db.rollback()
        raise HTTPException(503, 'The verification email could not be sent. Please try again later.')
    await db.commit()
    await db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Login user and return JWT token
    """
    # Get user by email
    result = await db.execute(select(User).where(email_match(form_data.username)))
    user = result.scalar_one_or_none()

    if not user or user.auth_provider != 'password' or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    if not user.email_verified:
        raise HTTPException(403, 'Verify your email address before signing in. You can resend the verification email.')

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "ver": user.session_version},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/login/json", response_model=Token)
async def login_json(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login user with JSON payload (alternative to form data)
    """
    # Get user by email
    result = await db.execute(select(User).where(email_match(str(user_data.email))))
    user = result.scalar_one_or_none()

    if not user or user.auth_provider != 'password' or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    if not user.email_verified:
        raise HTTPException(403, 'Verify your email address before signing in. You can resend the verification email.')

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "ver": user.session_version},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information
    """
    return current_user


@router.patch('/me', response_model=UserResponse)
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    name = data.full_name.strip()
    if not name:
        raise HTTPException(422, 'Full name cannot be empty')
    current_user.full_name = name
    if current_user.profile is None:
        current_user.profile = UserProfile()
    for field in ('institution', 'bio', 'research_interests'):
        value = getattr(data, field)
        setattr(current_user.profile, field, value.strip() or None if value else None)
    if data.default_explanation_mode is not None:
        current_user.profile.default_explanation_mode = data.default_explanation_mode
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post('/me/photo', response_model=UserResponse)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from starlette.concurrency import run_in_threadpool
    try:
        data = await file.read(2 * 1024 * 1024 + 1)
    finally:
        await file.close()
    photo = await run_in_threadpool(make_profile_photo, data)
    if current_user.profile is None:
        current_user.profile = UserProfile()
    current_user.profile.photo_data = photo
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.delete('/me/photo', response_model=UserResponse)
async def remove_profile_photo(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.profile:
        current_user.profile.photo_data = None
        await db.commit()
        await db.refresh(current_user)
    return current_user
