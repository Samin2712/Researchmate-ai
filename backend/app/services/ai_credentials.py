"""No plaintext persistence, shared settings mutation, or personal-key fallback."""
import asyncio
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from sqlalchemy import select

from app.core.config import settings
from app.models.ai_provider import AICredential, AISelection
from app.services.llm_service import (
    LLMService, GeminiProvider, OpenAIProvider, AnthropicProvider, llm_service,
)

PROVIDERS = {'gemini': GeminiProvider, 'openai': OpenAIProvider, 'anthropic': AnthropicProvider}


class ProviderFailure(RuntimeError):
    """Already sanitized; preserve its category across service boundaries."""


def cipher():
    secret = settings.AI_KEY_ENCRYPTION_SECRET
    if not secret or secret == settings.SECRET_KEY:
        raise HTTPException(503, 'Personal AI connections are unavailable: configure a separate AI_KEY_ENCRYPTION_SECRET on the server. App default is still available.')
    try:
        return Fernet(secret.encode())
    except (ValueError, TypeError):
        raise HTTPException(503, 'Personal AI encryption is not configured correctly. Contact the administrator.') from None


def model_for(provider):
    return {'gemini': settings.GEMINI_MODEL, 'openai': settings.OPENAI_MODEL,
            'anthropic': settings.ANTHROPIC_MODEL}[provider]


def provider_error(exc):
    # Inspect only for classification. Never log or return SDK exception text,
    # request URLs, headers, or response bodies (which can echo credentials).
    if isinstance(exc, ProviderFailure):
        return str(exc)
    status = getattr(exc, 'status_code', None) or getattr(exc, 'code', None)
    message = str(exc).lower()
    if status == 429 or any(x in message for x in ('quota', 'resource_exhausted', 'rate limit', 'credit balance', 'billing')):
        return 'Provider quota, rate limit, or billing limit reached. Check your provider account and try again.'
    if status == 401 or any(x in message for x in ('api_key_invalid', 'api key not valid', 'invalid api key', 'authentication')):
        return 'Invalid API key. Check the key or replace it in Settings.'
    if status in (403, 404) or any(x in message for x in ('permission', 'model_not_found', 'model access')):
        return 'This key cannot access the configured model. Enable model access in your provider account or choose another provider.'
    if isinstance(exc, (TimeoutError, ConnectionError)) or any(x in message for x in ('timeout', 'connection', 'network')):
        return 'Cannot reach the AI provider. Check your connection and try again.'
    return 'The AI provider could not complete the request. Check the key, model access, and provider status, then try again.'


class PersonalLLM(LLMService):
    def __init__(self, provider, key):
        self.selected_provider = provider
        self.selected_model = model_for(provider)
        try:
            self.provider = PROVIDERS[provider](api_key=key, model=self.selected_model)
        except Exception:
            raise HTTPException(503, 'Personal AI provider is unavailable. Check server configuration.') from None

    @property
    def provider_name(self):
        # Keep analysis caches and provenance separate from app-funded runs.
        return f'personal:{self.selected_provider}'

    @property
    def model_name(self):
        return self.selected_model

    def get_provider_info(self):
        return {'provider': self.provider_name, 'status': 'active', 'is_free': False}

    async def generate(self, *args, **kwargs):
        try:
            return await super().generate(*args, **kwargs)
        except Exception as exc:
            raise ProviderFailure(provider_error(exc)) from None

    async def generate_structured_response(self, *args, **kwargs):
        try:
            return await super().generate_structured_response(*args, **kwargs)
        except Exception as exc:
            raise ProviderFailure(provider_error(exc)) from None

    async def stream_generate(self, *args, **kwargs):
        try:
            async for chunk in super().stream_generate(*args, **kwargs):
                yield chunk
        except Exception as exc:
            raise ProviderFailure(provider_error(exc)) from None


async def resolve_llm(db, user_id, selection=None):
    if selection is None:
        preference = await db.get(AISelection, user_id)
        selection = preference.provider if preference else 'default'
    if selection == 'default':
        return llm_service
    row = await db.get(AICredential, (user_id, selection))
    if not row:
        raise HTTPException(409, 'The selected personal connection was removed. Choose App default or connect a key in Settings.')
    try:
        payload = json.loads(cipher().decrypt(row.encrypted_key.encode()))
        if payload['user_id'] != user_id or payload['provider'] != selection:
            raise InvalidToken()
        key = payload['key']
    except (InvalidToken, ValueError, KeyError):
        raise HTTPException(503, 'Cannot unlock this personal key. Replace it in Settings or explicitly select App default.') from None
    return PersonalLLM(selection, key)


async def connection_state(db, user_id):
    rows = (await db.scalars(select(AICredential).where(AICredential.user_id == user_id))).all()
    selection = await db.get(AISelection, user_id)
    return {'selected': selection.provider if selection else 'default',
            'available': bool(settings.AI_KEY_ENCRYPTION_SECRET),
            'connections': [{'provider': r.provider, 'status': 'verified', 'verified_at': r.verified_at} for r in rows],
            'models': {p: model_for(p) for p in PROVIDERS}}


async def verify_key(user_id, provider, key):
    box = cipher()
    llm = PersonalLLM(provider, key)
    try:
        # Same model and SDK path used by real requests; no model-list false positives.
        await asyncio.wait_for(llm.generate(prompt='Reply OK.', system_prompt='Reply briefly.',
                                            temperature=0.1, max_tokens=8), timeout=20)
    except Exception as exc:
        return {'status': 'failed', 'message': provider_error(exc)}
    receipt = box.encrypt(json.dumps({'user_id': user_id, 'provider': provider,
        'model': model_for(provider), 'digest': hashlib.sha256(key.encode()).hexdigest()}).encode()).decode()
    return {'status': 'verified', 'message': 'Connection verified. Save to keep this key.', 'verification_token': receipt}


def validate_receipt(token, user_id, provider, key):
    try:
        receipt = json.loads(cipher().decrypt(token.encode(), ttl=600))
        expected = {'user_id': user_id, 'provider': provider, 'model': model_for(provider),
                    'digest': hashlib.sha256(key.encode()).hexdigest()}
        if receipt != expected:
            raise ValueError('Verification does not match')
    except (InvalidToken, ValueError, TypeError):
        raise HTTPException(400, 'Verify this key again before saving. Verification expires after 10 minutes.') from None


def encrypted_value(user_id, provider, key):
    return cipher().encrypt(json.dumps({'user_id': user_id, 'provider': provider, 'key': key}).encode()).decode()
