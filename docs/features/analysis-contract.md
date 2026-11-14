# Comparison and literature review contract

Analysis is available at `/analysis` (Sidebar → Analysis). Comparisons accept 2–5 processed papers; reviews accept 2–10. Research focus is optional; review length is short/medium/long.

## API and ownership

All routes require authentication under `/api/v1/analysis`:

- `POST /runs`: `{kind, document_ids, parameters?, force?}` → persisted run, HTTP 201. `force` bypasses the completed-run cache for explicit regeneration.
- `GET /runs?kind=&limit=`: owner-scoped history (maximum 100).
- `GET /runs/{id}`: owner-scoped status and structured result; foreign IDs return 404.
- `POST /runs/{id}/cancel`: stops further work and preserves cancelled status.
- `DELETE /runs/{id}`: deletes terminal runs and edits; cancel active runs first.
- `POST /runs/{id}/edits`: versioned review Markdown, separate from raw generated output.
- `GET /runs/{id}/edits/latest`: latest owned saved version, or null.

Selections must contain distinct positive IDs, belong to the current user, exist, and be processed. Combined file size is limited to 100 MB. Research focus is limited to 2,000 characters. Edits are limited to 100,000 characters. Unknown parameters and invalid lengths are rejected.

## Execution and recovery

States are `pending`, `extracting`, `synthesizing`, `completed`, `failed`, and `cancelled`. Work runs in the API process with its own database session. Deploy with **one worker and one instance**. This is bounded single-process execution, not a durable queue. Restarted pending/running jobs are marked failed with retry guidance; completed runs and saved edits remain in the database. Start a new analysis to retry. Do not horizontally scale this runner without introducing distributed coordination.

Each user can have three active runs. A process-wide semaphore permits three provider operations. Calls have a 90-second deadline, up to three attempts for transient failures, and respect reported short retry delays (capped at 60 seconds). Daily quota exhaustion fails clearly without pointless retries. A run has a ten-minute deadline. Cancellation prevents later completion but cannot revoke a provider request already in flight. Progress reflects completed paper extraction, then synthesis; it is not a time estimate. Request reloads reconnect using the run ID in the URL.

## Sources and structured results

Every selected paper is read independently from owned SQL chunk rows. The same approach works with local Chroma or hosted database vectors without relying on opaque vector IDs. Beginning/end and relevant passages are selected using research terms and section terms. There are at most 12 excerpts per paper, 2,500 characters per excerpt, and 16,000 characters total per paper. This is bounded excerpt analysis and may omit information elsewhere in a long paper.

An extraction contains research question, study type, population/dataset, findings, and limitations. Each field is validated with Pydantic. Reported values require a real `doc{document_id}_chunk{chunk_id}` source and an exact quote from text actually supplied to the model. Missing information becomes `Not reported` without a supporting reference. Results preserve units and sample contexts; comparison results warn against equating different metrics. PDF text and metadata are untrusted data, with explicit instructions to ignore embedded commands.

Matrix results contain rows, document IDs/titles, field-level coverage, warnings and evidence. Partial failures remain visible for their paper; zero supported evidence fails the run. Review results contain title, scope abstract, thematic sections, bibliography keyed by stable chunk source IDs, themes and document coverage (`included`, `insufficient`, `failed`). Synthesis receives evidence from every successfully extracted paper without a global truncation that excludes later papers. Grouped known citations are normalized; unknown citations and uncited sections fail validation, with one bounded correction attempt.

Exact source/quote checks establish provenance, **not semantic proof that a quote entails a generated claim**. Readers must verify claims in the source panel. Reviews are drafts based on selected papers, not systematic reviews.

## Cache and edits

Completed-run caching includes owner, ordered selection, a hash of each document's current chunks and citation metadata, parameters, provider/model, prompt and schema versions. Active, failed and cancelled runs are not reused. Forced regeneration creates a separate run, preserving previous edits. Matching per-paper evidence from completed comparisons is reused for review synthesis to reduce provider usage; this includes revision, focus, provider/model and prompt/schema checks.

Saved edits carry version numbers and referenced source IDs; edited claims are explicitly labelled unvalidated. Unknown citation IDs are rejected on save/export. Source IDs remain stable when paragraphs are reordered. Browser close/reload, in-app link navigation and workspace Back/Cancel protect unsaved edits. Browser Back/Forward also prompts before discarding an edited draft.

## Frontend and exports

Desktop uses a semantic comparison table with sticky headings; narrow screens use stacked fields. Expandable evidence opens the existing source verification panel and notebook save flow. Motion respects app and OS reduced-motion settings. Review Markdown is rendered safely without injecting HTML, and citations open sources through React buttons. Bibliography rendering and Markdown export reuse the shared APA citation formatter.

Comparison Markdown preserves full cells and quotes, coverage and warnings. CSV includes evidence and neutralizes spreadsheet formulas, including leading whitespace. Review exports use the saved edited version, references, source quotes and coverage. The shared exporter provides Markdown and paginated PDF (Latin text); existing chat exports are preserved.

## Local and Render setup

Run `npm run dev` from the repository root. Existing local `.env` values are respected. SQLite, Chroma and local CPU embeddings are supported; analysis additionally needs an AI provider with available quota. Local execution is not fully offline AI inference.

The application lifespan performs a data-preserving schema bootstrap on local startup and on the existing Render service. The optional Alembic path is:

```powershell
cd backend
.\venv\Scripts\python.exe -m alembic upgrade head
```

Migration `0006_analysis_runs_review_edits` supports fresh/bootstrap-created tables and uses matching lowercase PostgreSQL enum values without duplicate type creation. No Redis, separate worker, paid disk, or new database is required for this feature. The existing hosted PostgreSQL database preserves analyses and edits. Existing backend startup can remain `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1` because lifespan creates the tables.

See `docs/verification/analysis-audit.md` for observed checks and remaining external limits.
