# Keep Render accounts and papers across restarts

The deployed environment must be changed as well as deploying this code. Local
SQLite files on Render's ephemeral filesystem disappear on restart/redeployment.
Code cannot recover accounts or files already removed by the host.

## 1. Create PostgreSQL

In Render, choose **New → Postgres** in the same region as the backend. Select a
plan appropriate for the project; check its retention/expiration before relying
on it. After it is ready, copy its **Internal Database URL** from Connections.
Keep the URL private. Another managed PostgreSQL provider is also supported.

## 2. Set the backend environment

Open **researchmate-backend → Environment**. Add/update these values:

| Key | Value |
| --- | --- |
| `DATABASE_URL` | The PostgreSQL Internal Database URL (paste the actual private value) |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `EMBEDDING_PROVIDER` | `gemini` |
| `VECTOR_STORE_MODE` | `database` |
| `EMBEDDING_BATCH_SIZE` | `4` |
| `GOOGLE_API_KEY` | Your existing Google AI Studio key with embedding-model access |
| `SECRET_KEY` | A long, random secret; keep the same value across deployments |
| `CORS_ORIGINS` | `https://researchmate-frontend.onrender.com` |

Both `postgres://` and `postgresql://` provider URLs are accepted and converted
to the async PostgreSQL driver. PostgreSQL stores users, profile information,
small re-encoded profile photos, chats, extracted chunks, and embedding vectors.
Gemini embedding requests are sent to Google's API and subject to its access,
quota, and billing rules. Provider failures are shown as failed processing jobs.
The default embedding model is `gemini-embedding-001`.

## 3. Backend build and health settings

With **Root Directory = backend**:

- Build Command: `pip install -r requirements-hosted.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
- Health Check Path: `/health/live`

If Root Directory is blank, use `pip install -r backend/requirements-hosted.txt`
and add `--app-dir backend` to the start command instead.

Use one worker: document processing is serialized per process, and startup marks
jobs interrupted by a previous process as failed. `/health/live` does not load
models or call external AI services. `/health` remains a deeper diagnostics route.
Deploy the updated backend and frontend from the same version.

The hosted dependency list excludes PyTorch and Chroma. Set **both**
`EMBEDDING_PROVIDER=gemini` and `VECTOR_STORE_MODE=database` before switching to it.
Local development can retain `requirements.txt`, local embeddings, and Chroma.

## 4. Check the result

1. Register once and fill in **My profile**, including a photo.
2. Log out, log in with the same email/password, and check the saved profile.
3. Upload a short text-based PDF; wait for **Ready to explore**, then ask a question.
4. Restart the backend and repeat login and a question about the same paper.
5. If a PDF was interrupted during restart, it will show **Processing failed**
   with an explanation. Use **Retry processing** if the original file remains,
   or delete the entry and re-upload it.

An existing SQLite database is not automatically copied into PostgreSQL. Export
and migrate any data you still need before changing DATABASE_URL. A newly created
PostgreSQL database starts empty; users from a lost temporary database must
register once more after this change. Subsequent restarts keep PostgreSQL data.

## Original PDFs

Original PDFs are still stored in `UPLOAD_DIR`. Completed papers remain searchable
after a restart because their extracted text and vectors are in PostgreSQL.
Keeping original PDF files for retries requires a persistent disk (set `UPLOAD_DIR`
to a directory on its mount) or future object-storage integration. Profile photos
do not require a persistent disk because they are stored in PostgreSQL.

## Frontend routes

Keep Render's existing **Redirects/Rewrites** rule: Source `/*`, Destination
`/index.html`, Action **Rewrite**. This lets refreshed `/profile`, `/library`,
and other React Router routes load normally.

If the process still stops, inspect Render logs/metrics for an out-of-memory kill,
exit code, or traceback. The code changes reduce memory pressure but cannot
confirm the original cause without deployment logs or guarantee a hosting quota.
