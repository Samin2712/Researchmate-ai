# Personal AI providers

Settings → AI providers is optional for signed-in users. Accounts start with **App default**, using the existing backend AI credentials both locally and in production. Saving a connection does not activate it: choose it under **AI for chat and analysis**. Choose App default at any time to use app credentials again. Removing the active connection explicitly restores App default.

Select Google Gemini, OpenAI, or Anthropic, enter a key, and click **Verify connection**. Verification sends an eight-output-token generation request to the configured model, so it may incur a small charge. A successful verification permits Save or Replace for ten minutes. Personal usage is billed to the user's provider account. The last verification date is historical, not a guarantee of current quota or access. Invalid keys, missing model access, billing/quota limits, and network failures are explained in Settings or the failed request. Personal errors never fall back to app credentials.

## Server setup and persistence

Install the normal runtime requirements. Configure `AI_KEY_ENCRYPTION_SECRET` with a persistent, independently generated Fernet key, separate from `SECRET_KEY` and provider API keys:

```powershell
backend/venv/Scripts/python.exe -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Store it in the ignored `backend/.env` for local development and as a backend environment secret in Render. Keep the same secret across restarts/deploys and back it up separately from the database. Do not put it in frontend environment variables or Git. Changing it without migrating ciphertext makes existing personal keys unreadable; users must replace them. Missing encryption configuration disables personal connections while App default continues working.

Use durable `DATABASE_URL` storage: local SQLite files persist on the local machine; Render should use managed PostgreSQL. Keys remain saved across sign-ins, restarts, and deploys only when that database and encryption secret are preserved. Local and deployed databases have separate connections unless intentionally configured to use the same database and secret. Personal keys do not change existing app provider secrets or embedding configuration.

The startup schema bootstrap creates `ai_credentials` and `ai_selections` for existing databases. Alembic migration `0011_ai_providers` supports managed migration workflows. No existing table or credential is overwritten. Models come from `GEMINI_MODEL`, `OPENAI_MODEL`, and `ANTHROPIC_MODEL`; verification uses the exact same model as generation. The Anthropic default is `claude-haiku-4-5`.

## Privacy and execution

All endpoints require authentication and derive the owner from the session. Keys are Fernet authenticated ciphertext with the account ID and provider bound inside the encrypted payload. API responses return provider, verification date, selection, and configured model only. There is no endpoint to retrieve a saved key, including its suffix. Draft secrets remain in component memory; keys never enter browser storage, URLs, React Query caches, or frontend environment variables. Validation responses omit rejected input. SQL logs hide parameters and provider SDK debug logging is disabled. Provider exceptions are classified and sanitized before they reach chat, analysis persistence, or logs.

Verification is limited to ten attempts per user per ten-minute window. The short-lived encrypted verification receipt binds the owner, provider, model, and key digest; no second paid verification request is made on save. Existing connections survive failed verification or replacement.

Chat (including streaming) resolves the user's selection for each request and constructs its own LLM/RAG instance. Analysis captures the resolved LLM in its background job, preserving the selection made when it was submitted. Shared application settings and the default LLM are never changed. Personal analysis provenance uses `personal:<provider>` to distinguish cached runs from app-funded results. Embeddings, document ingestion, and learning assistance retain their existing configuration.

## Checks

`backend/tests/test_ai_providers.py` covers all three provider lifecycles, verification token binding and expiry, rate limits, encrypted persistence, user isolation, ciphertext substitution, explicit default selection, concurrent personal clients, chat/stream/analysis selection, sanitized provider failures, and encryption configuration errors. Frontend Playwright coverage exercises Settings at desktop and mobile sizes, including key masking, verification invalidation after edits, save/replace/remove, default selection, and browser-storage privacy.
