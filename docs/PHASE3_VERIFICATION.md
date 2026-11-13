# Phase 3 implementation and verification

Date: November 13, 2026 (Asia/Dhaka).

All eight Phase 3 tasks are implemented. The original local backend startup blockers have been repaired.
Real registration, PDF ingestion, Gemini streaming with source citations, saved history, and browser logout
now pass against the running local backend. Local storage uses SQLite and persistent Chroma.

## Task status

| Task | Implemented | Verification |
| --- | --- | --- |
| 3.1 React project setup | Vite, React 18, strict TypeScript, Tailwind, Router, dependencies, environment configuration, folder structure | Development server and production build verified |
| 3.2 API service layer | Axios interceptors, bearer JWT, auth/document/chat services, query hooks, robust POST SSE reader | Contract unit tests and real authenticated API requests pass |
| 3.3 Authentication | Login/register validation, password visibility, localStorage token, restored-session verification, protected routes, logout/expiry | Real browser registration/login/logout pass; controlled incorrect credentials, expiry, 401 and network-outage tests pass |
| 3.4 Documents | Keyboard file picker, drag/drop, PDF signature/type/size validation, transfer progress, cancel/retry, processing polling, library/cards/deletion | Picker and drag/drop, malformed files, progress, rejection/retry, search, deletion pass; real four-page PDF processing and malformed-PDF failure recovery pass |
| 3.5 Chat | Incremental streaming, input/stop, loading, source excerpts and links, confidence, history, scope, scroll management and recovery | Real Gemini streaming, citations and saved history pass; controlled partial rendering, stopping, provider-error recovery and exports pass |
| 3.6 Dashboard/navigation | Real-query statistics, sidebar, mobile modal menu, settings/preferences, about page | Desktop/mobile navigation and layouts verified |
| 3.7 UI polish | Shared loading/skeleton/error/toast/empty states, error boundary, focused Motion transitions, reduced motion, keyboard focus, memoization and route splitting | Keyboard and automated axe checks pass on desktop Chromium, mobile Chromium and Edge; screenshots reviewed |
| 3.8 Advanced tools | Streamed paper summary, Markdown/PDF download, search/status/sort, React Flow map, APA/MLA/Chicago citation drafts | Controlled summary, export downloads, filters, map and citation formatter pass; map paper links also activated using keyboard |

Dark mode is optional and was not added. Account profile editing is not supported by the backend.

## Completed checks

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed with no warnings or errors.
- `npm.cmd test`: 8 tests passed, covering SSE fragmentation/UTF-8/CRLF/errors/truncation,
  file validation, evidence-map construction and citation formatting.
- `npm.cmd run build`: passed. Production bundles were used for the final browser checks.
- Full Playwright suite: **25 passed, 2 skipped**. Desktop Chromium includes the real backend journey.
  The eight controlled tests run in desktop Chromium, mobile Chromium and Edge. Only the duplicate
  mobile/Edge copies of the live backend test are intentionally skipped.
- Additional focused Playwright run after strengthening interaction checks: **6 passed**,
  covering drag/drop + progress/retry and keyboard map links in all three projects.
- Browser projects: installed Chromium, 390px mobile Chromium emulation, installed Microsoft Edge.
  These cover two browser products using the Chromium engine; Firefox and Safari are untested.
- Axe reported no violations on tested dashboard, library and chat states, including expanded chat sources.
  This is automated coverage, not a claim of a complete manual WCAG or screen-reader audit.
- Desktop/mobile screenshots were reviewed during testing; horizontal document overflow was checked.
- `npm run test:backend`: **12 passed**, including authentication, legacy serialization, and health
  checks that correctly return HTTP 503 for unavailable required data services.
- Root launcher tests: **5 passed**, including database environment precedence regressions.
- `npm run doctor`: passed real frontend, CORS, SQLite, persistent Chroma, loaded embeddings and an
  authenticated Gemini generation request.
- `scripts/test_live_api.py`: passed real registration/login, invalid extension rejection, malformed-PDF
  failure recovery, valid PDF extraction/embedding/indexing, a real Gemini SSE answer with citations,
  saved history, authentication enforcement and document/conversation deletion.
- Python compilation of the two changed backend modules passed.

The browser fixture responses are confined to `frontend/tests/e2e`. The shipped app calls the real
environment-configured API. No demo records, simulated uploads or canned AI answers are shipped.

## Backend compatibility changes

Two targeted fixes support the frontend's actual contract:

- `backend/app/api/v1/chat.py` saves sources as JSON lists rather than double-encoded strings,
  converts fractional retrieval confidence to the existing integer percentage storage contract,
  and forwards nonempty terminal answer chunks (including the no-context answer).
- `backend/app/schemas/chat.py` decodes legacy JSON-string sources when loading old conversations.

These changes were checked with regression tests, compilation, real API requests, and the live browser
journey including a history reload. Existing unrelated workspace changes were retained. Additional startup
repairs corrected the PDF processor interface, background database-session lifetime, Chroma client/filter
configuration, Gemini SDK/model, dotenv loading and the backend test fixtures.

## Connection status and startup

Run **`npm run dev`** from the repository root (or `npm.cmd run dev` if PowerShell blocks npm.ps1).
The local API and frontend are running on ports 8000 and 5173. Run **`npm run doctor`** for actual
connectivity checks. See [local startup details](LOCAL_STARTUP.md).

SQLite is the database configured in `backend/.env`. The PostgreSQL server on port 5432 rejects the
credentials in the root `.env`; PostgreSQL is not used in the verified local workflow. Redis is not
integrated into the current app and is explicitly reported as `not_used`. Remote Chroma/production Docker
and PostgreSQL integration have not been verified by this native local run.

The initial backend import failures and missing packages were repaired using `requirements-runtime.txt`.
The root environment's invalid numeric value was corrected. Gemini uses the supported async Gen AI SDK
and an account-accessible model. A pending model download and interrupted npm extraction caused the
previous apparent stall; the download completed and missing frontend files/command shortcuts were repaired.
Setup now checks the frontend production build before recording success, preserves installed packages,
and prints progress during long steps. Downloaded data and private configuration remain ignored by Git.

## Product boundaries

PDF exports use the built-in Latin PDF font; Markdown exports preserve Unicode. Source links show
metadata and indexed excerpts because the backend has no authenticated PDF-download endpoint.
Citation formatter output is a draft from available metadata. Map edges show shared author metadata
or papers cited together, not inferred scientific relationships. Summaries use the existing chat endpoint.

See [frontend startup instructions](../frontend/README.md) for environment variables and commands.
