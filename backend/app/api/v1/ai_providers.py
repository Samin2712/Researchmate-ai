"""Authenticated self-service endpoints; responses contain metadata only."""
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, SecretStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.ai_provider import AICredential, AISelection
from app.services.ai_credentials import (
    connection_state, verify_key, validate_receipt, encrypted_value,
)

Provider = Literal['gemini', 'openai', 'anthropic']
router = APIRouter(prefix='/ai-providers', tags=['AI providers'])


class KeyInput(BaseModel):
    model_config = ConfigDict(extra='forbid', hide_input_in_errors=True)
    provider: Provider
    api_key: SecretStr = Field(min_length=8, max_length=512)


class SaveInput(KeyInput):
    verification_token: str = Field(max_length=2048)


class SelectionInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    provider: Literal['default', 'gemini', 'openai', 'anthropic']


@router.get('')
async def state(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await connection_state(db, user.id)


@router.post('/verify')
async def verify(data: KeyInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.services.account_security import throttle
    await throttle(db, 'ai-verify', str(user.id), limit=10, seconds=600)
    return await verify_key(user.id, data.provider, data.api_key.get_secret_value().strip())


@router.put('/connection')
async def save(data: SaveInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    key = data.api_key.get_secret_value().strip()
    validate_receipt(data.verification_token, user.id, data.provider, key)
    row = await db.get(AICredential, (user.id, data.provider))
    if row is None:
        row = AICredential(user_id=user.id, provider=data.provider)
        db.add(row)
    row.encrypted_key = encrypted_value(user.id, data.provider, key)
    row.verified_at = datetime.now(timezone.utc)
    await db.commit()
    return await connection_state(db, user.id)


@router.put('/selection')
async def select(data: SelectionInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if data.provider != 'default' and not await db.get(AICredential, (user.id, data.provider)):
        raise HTTPException(409, 'Verify and save a key for this provider first.')
    row = await db.get(AISelection, user.id)
    if row is None:
        row = AISelection(user_id=user.id)
        db.add(row)
    row.provider = data.provider
    await db.commit()
    return await connection_state(db, user.id)


@router.delete('/{provider}')
async def remove(provider: Provider, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await db.get(AICredential, (user.id, provider))
    if row:
        await db.delete(row)
    selection = await db.get(AISelection, user.id)
    if selection and selection.provider == provider:
        # Explicit removal restores the app default, as explained in Settings.
        selection.provider = 'default'
    await db.commit()
    return await connection_state(db, user.id)
