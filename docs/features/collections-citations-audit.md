# Independent collections and citations audit

Audit date: 2026-11-14. The original implementation was incomplete; the issues below were repaired before deployment.

## Repairs

- Safe fresh/legacy schema bootstrap for SQLite and PostgreSQL; Alembic uses application DATABASE_URL. Added revision 0003 for previously migrated databases, preserved legacy authors and user data.
- Enforced ownership on every document in bulk removal and on removed tags; owner-scoped collection counts and stable ordering.
- Validated names, colors, citation type, titles, years, DOI and URL. Blank optional metadata becomes null, including clearing a year.
- Added ordered structured authors without altering legacy author strings. Aligned conference/misc types and BibTeX field mapping; normalized author separators, escaping and deterministic duplicate-ID export.
- Refreshed collection caches after metadata/tag/document mutations; polled processing collections; preserved URL filters and repaired atomic Clear filters behavior.
- Added reusable explicit-ID selection snapshots, removed stale selected papers, reset selection on collection navigation, and provided ready-only analysis resolution.
- Added tag rename/delete controls, labels, error recovery, mobile filter wrapping, reachable collection menus, reduced-motion dialogs and accessible bulk collection choices.
- Repaired Dockerfile paths, missing Nginx SPA/proxy configuration, requirements includes, secret exclusion from image contexts, Node build runtime, persistent production volumes and single-worker startup.

## Verification

- Backend: full suite, `npm run test:backend` with `PYTEST_ADDOPTS=--basetemp=./data/pytest-reviewed` and cached/offline model mode: **45 passed**, including four BibTeX entry-type regressions.
- Frontend: typecheck, lint, production build passed; Vitest **19 passed**.
- Launcher: `npm test`: **8 passed**.
- Collections browser: `cd frontend && npx playwright test --config playwright.collections.config.ts`: **3 passed**, at 390/768/1440 CSS pixels. Real FastAPI, JWT authentication, SQLite, upload/PDF parsing and persistence; only embeddings are deterministic test values. Verifies collection creation/membership/filtering, editing metadata, actual UTF-8 .bib contents, cleared year, tags and reload persistence. Axe WCAG A/AA checks and Escape/reduced motion included.
- Existing browser suite: `cd frontend && npx playwright test --project=edge --workers=2`: **10 passed, 1 skipped**. The Chromium-only live AI flow was skipped in the Edge run, then executed separately against the real local app: **1 passed**. It verified registration, real local embeddings/PDF ingestion, streamed Gemini chat, visible sources, history after reload and logout.
- Real configured AI generation: a small authenticated provider request returned text successfully with network access. This is separate from deterministic browser tests.
- Alembic: fresh SQLite `upgrade head` and repeat `upgrade head` passed. Legacy schema preservation and repeat bootstrap covered by backend tests. Production PostgreSQL schema checked read-only before deployment; post-deploy checks recorded below.
- Docker execution: **not run**; Docker is not installed in this environment. Config/source repaired; container builds remain unverified.
- No real BibTeX parser is installed; escaping, entry types, Unicode, missing fields, author separators and duplicate keys have explicit tests. Full CSL compliance is not claimed.

## Local operation

The real `npm run dev` and `npm run doctor` both succeeded: SQLite connected, Chroma connected, local MiniLM embeddings loaded, frontend/CORS connected, and a real Gemini response returned. The app is running locally at http://127.0.0.1:5173. Collections, tags, metadata and bibliography export require no AI service. AI features require configured provider access and either downloaded local embedding weights or Gemini embedding access. Never use `backend/tests/browser_server.py` for normal or production startup.

## Screenshots

Reviewed Library and citation detail screenshots at all three widths:

- [Library 390](screenshots/collection-library-390.png), [citation 390](screenshots/citation-editor-390.png)
- [Library 768](screenshots/collection-library-768.png), [citation 768](screenshots/citation-editor-768.png)
- [Library 1440](screenshots/collection-library-1440.png), [citation 1440](screenshots/citation-editor-1440.png)

## Deployment

Existing Render services are in the user-confirmed My Workspace and automatically deploy main. PostgreSQL is available. Its current free instance expires **2026-12-13**; select an appropriate retention plan before that date. Original uploaded PDFs still need persistent hosting storage for reliable post-restart file access/retries; completed extracted text/vectors persist in PostgreSQL. See [Render settings](../RENDER_DEPLOYMENT.md) and [Render Blueprint reference](https://render.com/docs/blueprint-spec).

Implementation commit `97e3004` was pushed to `main`; both automatic Render deployments reached **live**:

- Frontend: [ResearchMate](https://researchmate-frontend.onrender.com), deployment `dep-dbs2mjeq1p3s73eb1200`.
- Backend: [API liveness](https://researchmate-backend-djg9.onrender.com/health/live), deployment `dep-dbs2mjeq1p3s73eb11m0`.

Read-only production smoke checks passed: frontend/liveness HTTP 200; collection/tag/BibTeX routes and structured-author schema present in OpenAPI; unauthenticated collection access 401; exact frontend CORS origin allowed; deep health HTTP 200 with PostgreSQL, embeddings and vectors connected. A read-only PostgreSQL query confirmed new tables and citation columns. No application error logs were returned for the deployment window. No production test accounts or papers were created, and no new paid resources were provisioned.

A final frontend correction aligns preview keys for multiword structured surnames and punctuation with backend exports; its follow-up deployment is tracked in the final chat result.
