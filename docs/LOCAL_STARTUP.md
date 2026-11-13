# Start ResearchMate with one command

From the repository root:

```powershell
npm run dev
```

If PowerShell blocks `npm.ps1`, use **`npm.cmd run dev`**. It invokes the same script.
`npm start` is an alias for the same local development launcher.

The launcher automatically installs missing dependencies into `backend/venv` and `frontend/node_modules`
on first use, starts FastAPI, waits for its real readiness check, and starts Vite.
Already-installed frontend packages are checked and preserved. Setup repairs missing command shortcuts
and verifies a frontend production build before recording success. Slow setup/startup steps print a progress
message every 15 seconds. To force a full frontend reinstall, run `npm run setup -- --force`.
Later runs reuse the installed packages and downloaded embedding model. First setup requires network access,
Python 3.10–3.12, Node.js 20.19+ / 22.12+, and enough disk space for CPU PyTorch and the local embedding model.
No global Python package installation or virtual-environment activation is needed.
For a slow first model download, `RESEARCHMATE_STARTUP_TIMEOUT_MS` can extend the default five-minute
backend readiness timeout. Embedding downloads are cached in `backend/data/huggingface` unless `HF_HOME`
is already configured.

- Frontend: `http://127.0.0.1:5173`
- Backend API docs: `http://127.0.0.1:8000/docs`
- Backend readiness: `http://127.0.0.1:8000/health`
- Verify frontend, CORS, data services and a real AI response: **`npm run doctor`**
- Install/reinstall packages explicitly: **`npm run setup`**

Use Ctrl+C to stop the servers started by the launcher. Healthy existing ResearchMate servers can be reused;
the launcher does not stop reused servers. An unrelated application on either port produces an explicit error.
Vite supports frontend hot reload. Restart this command after backend Python changes.

## Configuration

Settings load the root `.env`, then `backend/.env`. For the local npm launcher, the database in
`backend/.env` wins over an inherited terminal `DATABASE_URL`; this prevents unrelated shell exports
from accidentally selecting PostgreSQL. Use `RESEARCHMATE_DATABASE_URL` for an intentional launcher
override. Other settings continue to honor real process variables. Direct Uvicorn/Docker execution
keeps the standard process-variable precedence.
For local CORS, the npm launcher preserves configured origins and includes both `http://localhost:5173`
and `http://127.0.0.1:5173`. A stale terminal `CORS_ORIGINS` cannot exclude the address printed by the
launcher. Use `RESEARCHMATE_CORS_ORIGINS` if you deliberately want a different exact allowlist.
The launcher owns its debug setting through `RESEARCHMATE_DEBUG` (default `false`), so unrelated tools'
`DEBUG` values cannot prevent FastAPI from starting. Set `RESEARCHMATE_DEBUG=true` for SQL debug logging.

When `backend/.env` is absent, setup creates it from `backend/.env.example`, with a randomly generated JWT
secret. Existing environment files and their keys are preserved. Put your Gemini key in `GOOGLE_API_KEY`
in either environment file. The default model is `gemini-2.5-flash`; model access and quota are verified by
`npm run doctor`, rather than claimed by the health endpoint.

Local development uses the existing **SQLite** configuration and **persistent Chroma** inside the Python
process. This runs the application without Docker, PostgreSQL or a separate vector-server process:

```dotenv
DATABASE_URL=sqlite+aiosqlite:///./test.db
CHROMA_MODE=persistent
CHROMA_PERSIST_DIR=./data/chroma
GEMINI_MODEL=gemini-2.5-flash
EMBEDDING_PROVIDER=local
VECTOR_STORE_MODE=chroma
EMBEDDING_BATCH_SIZE=4
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
MAX_DOCUMENT_PAGES=100
MAX_DOCUMENT_CHUNKS=1000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

SQLite data remains in `backend/test.db`; vectors remain in `backend/data/chroma`. Stopping the app does
not remove them. Uploaded papers, local environment files, caches and the virtual environment are ignored by Git.

Profile editing, profile photos, logout, PDF retry, and restart recovery also work
locally with this configuration. Startup creates the new profile tables in your
existing local database without resetting accounts. The Gemini embedding model
setting is unused while `EMBEDDING_PROVIDER=local`; Gemini chat still uses your
existing `GOOGLE_API_KEY`. Keep the local provider/vector settings to reuse your
existing Chroma indexes. Render's PostgreSQL/Gemini/database settings belong in
the Render dashboard; do not paste its Internal Database URL into the local file.

To use PostgreSQL, set a working `DATABASE_URL=postgresql+asyncpg://...` in `backend/.env` or set
`RESEARCHMATE_DATABASE_URL` in your terminal, and run that PostgreSQL service separately.
The launcher verifies the database before loading AI services. Invalid configured PostgreSQL credentials fail startup;
the launcher does not silently switch databases or reset passwords. For a remote Chroma server, explicitly set
`CHROMA_MODE=http`, `CHROMA_HOST` and `CHROMA_PORT`.

Redis has no active integration in the current application, so local startup does not launch it and health
reports `not_used`. This command is for native local development; existing Docker deployment files are separate.

If startup reports `InvalidPasswordError`, PostgreSQL was explicitly selected with credentials that the
server rejected. For the existing local database, keep `DATABASE_URL=sqlite+aiosqlite:///./test.db` in
`backend/.env` and clear any `RESEARCHMATE_DATABASE_URL` override. A generic terminal `DATABASE_URL` no
longer overrides this local file in the npm launcher. No database or account data is reset by this fix.

## Health checks

`/health` executes a real database `SELECT 1`, checks the Chroma heartbeat and confirms the embedding model
is loaded. It returns HTTP 503 when a required local component is unavailable. LLM SDK initialization does not
prove authentication or quota, so `npm run doctor` additionally sends a small real provider request.

The launcher uses `backend/requirements-runtime.txt`. The main `backend/requirements.txt` delegates to
that same list, so the normal API installation path stays compatible with the implemented code. Dependency setup is repeated when that file or the frontend lockfile changes.

Implementation uses Chroma's [persistent and HTTP clients](https://docs.trychroma.com/reference/python)
and Google's [asynchronous Gen AI SDK](https://googleapis.github.io/python-genai/).
