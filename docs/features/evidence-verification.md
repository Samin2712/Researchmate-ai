# Evidence verification — 14 November 2026

## Scope

Reviewed prompt 02 against the initial code, fixed implementation gaps, and tested
auth, source/PDF access, notebook persistence, provenance, exports, deletion,
revision handling, responsive UI, and deployment compatibility.

## Completed checks

- Root `npm test`: 8 launcher tests passed.
- `npm run doctor`: local API, SQLite, embeddings, Chroma and frontend CORS healthy.
  The health endpoint explicitly does not check LLM network connectivity.
- `npm run test:backend`: 49 passed, 34 dependency/deprecation warnings.
- Frontend typecheck and ESLint: passed.
- Frontend Vitest: 19 passed across 4 files.
- Production build: passed (also built by the evidence Playwright web server).
- `playwright.evidence.config.ts`: 3 passed at 1440/768/390 pixels, reduced motion.
  Includes real PDF/API/SQLite, citation page 2, rendering/navigation, save, edit,
  browser reload, Bengali Markdown export, focus return, axe, no page errors,
  missing-PDF error, legacy truncated sources, and rapid close/reopen cancellation.
  Embeddings and answer generation are deterministic only in this isolated test
  harness. Missing-PDF and legacy tests explicitly intercept requests.
- Existing Edge browser suite: 10 passed, 1 Chromium-only live test skipped.
  Covers registration, upload, streaming/history, export, tables, profile/photo,
  graph, errors, expiry/logout, accessibility and reduced motion with controlled APIs.
- Fresh `alembic upgrade head`: passed; repeated upgrade: passed.
- Restart regression: saved note, PDF, profile and vectors survive a process restart.
- `npm audit --omit=dev`: zero advisories. Full audit retains 7 moderate findings
  in TypeScript ESLint's transitive minimatch dependency. No critical/high findings.
- Unmocked isolated local API smoke test: passed with the synthetic repository PDF,
  real Gemini embeddings and generation, real SQLite/database vectors, original
  PDF/page verification, note edits/relogin, Bengali export and deletion snapshots.
- `git diff --check`: passed.

## Visual inspection

Desktop source panel/highlights and tablet notebook screenshots were visually
inspected. Current browser screenshots are local and intentionally ignored:

- frontend/evidence-test-results/evidence-citation-real-PDF-5ea6e-ode-export-and-focus-return-desktop/source-panel.png
- frontend/evidence-test-results/evidence-citation-real-PDF-5ea6e-ode-export-and-focus-return-tablet/notebook.png
- frontend/evidence-test-results/evidence-citation-real-PDF-5ea6e-ode-export-and-focus-return-mobile/source-panel.png
- frontend/evidence-test-results/evidence-citation-real-PDF-5ea6e-ode-export-and-focus-return-mobile/notebook.png

## Deployment and remaining limits

The existing Render backend uses PostgreSQL, database vectors, Gemini embeddings
and Gemini generation; frontend and backend were HTTP 200 before this release.
No additional paid disk, worker, Redis or storage bucket is required. New original
PDFs persist in the existing database and are protected by document ownership.
Startup upgrades the schema even with the current Uvicorn-only Render command.

Scanned PDFs still require OCR; ambiguous or rotated passages use an honest
highlight-unavailable state. Legacy originals already lost from temporary hosting
must be uploaded again. Notebook Markdown preserves Unicode; the existing chat PDF
export still has built-in font limitations. AI operations require configured
provider credentials and provider network/quota availability locally and hosted.

Use `node scripts/smoke-evidence.mjs <API_URL>` for an unmocked check of upload,
embeddings, AI citations, original PDF access, page mapping, note CRUD/persistence,
Unicode export, and snapshot retention after source deletion. It cleans up its test
paper, note and conversation; its isolated test account remains.
