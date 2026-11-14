# Evidence source contract

## References and page conventions

Sources are identified by owned `document_id`, optional relational `chunk_id`, and
1-based physical `page_number`. PDF.js `getPage` uses the same 1-based convention;
PyMuPDF accesses `pdf[page_number - 1]`. `page_label` is display text only.
Identical page numbers from different documents never share an identity.

`GET /api/v1/evidence/documents/{id}/evidence-detail` accepts optional `page_number`,
`chunk_id`, and `quote`. It returns document metadata, SHA256 `content_hash`, resolved
`source_quote`, `chunk_id`, page, label, normalized `rects`, and `highlight_status`.
Rects use top-left coordinates and fractions of the unrotated physical page.
Only a unique exact text occurrence receives geometry. Repeated text, rotated
pages, or whitespace-normalized chunks fall back without a fabricated highlight.
Statuses: `available`, `unavailable`, `ambiguous`, `unknown_page`,
`no_extractable_text`. Unknown pages explicitly show page 1 without enabling save.
Scanned pages show the PDF but require OCR before quoting.

The existing chunker may normalize extraction whitespace. Chunk snapshots are
preserved exactly as stored; they must also match the current page after whitespace
normalization. They are never generated claims. New citations retain the full
chunk rather than appending ellipses. Legacy truncated snippets resolve only when
one chunk on the owned document/page has that prefix. Unresolvable legacy text
produces an error; it is never silently treated as a verbatim quote.

## Authentication and PDF lifetime

Both detail and PDF routes require Bearer authorization headers. Never put a JWT in
a URL. The frontend uses the shared authenticated Axios client with AbortSignal,
creates a blob URL, and revokes it on close/switch. The viewer and bundled worker
load lazily; rendering tasks and PDF documents are cancelled/destroyed on cleanup.
The worker is served by the application, with no CDN dependency.

`GET .../pdf` returns `application/pdf`, `Cache-Control: private, no-store`,
`Content-Disposition: inline`, and `X-Content-Type-Options: nosniff`.
Ownership and resolved upload-directory containment are checked before reading.
The complete authenticated blob is fetched; range support is unnecessary.

New uploads store original PDF bytes in the application database (`pdf_content`),
in addition to local processing files. Successful processing and evidence lookup
backfill originals that still exist locally. This keeps originals available across
Render free-instance filesystem resets without a paid disk or object bucket.
Legacy originals already lost before this release cannot be recovered: reupload.
The existing 10 MB upload limit bounds each original. Database storage grows with
uploads; at larger scale, migrate originals to private object storage.

## Notebook provenance and persistence

`POST /evidence/notes` validates document/chunk ownership, physical page agreement,
exact quote provenance, and collection ownership. Quotes are immutable snapshots;
only title, personal note, tags, and collection may be patched. Client quote bounds
are not trusted or used. No LLM request is made when saving/editing/exporting.

List supports page/page_size (1–100), search, collection_id, and document_id.
GET/PATCH/DELETE `/evidence/notes/{id}` authorize ownership on every operation.
PATCH distinguishes omitted fields from explicit null, allowing annotations and
collection associations to be cleared. POST `/evidence/notes/export` accepts
`note_ids` and optional collection grouping; every requested note must be owned.
Exports preserve UTF-8, use blockquotes for every quotation line, label personal
notes separately, and include source title and physical/display page references.
The notebook exports Markdown. Existing chat PDF export remains available; its
built-in font does not support every non-Latin script, so use Markdown for Unicode.

SHA256 revisions are computed during successful processing, source lookup, save,
and notebook listing. A mismatched or unknown saved revision marks a note stale.
Retry clears chunk references and marks existing notes stale before rebuilding
chunks. Document/chunk/collection deletion nulls the corresponding references while
retaining note/quote/title snapshots. User deletion removes that user's notes.
Missing originals mark notes stale; deleted document references show unavailable.
A stale note can retain its historical quote even when current-source verification
fails, rather than replacing that snapshot with new content.

## Upgrades and later consumers

The app's existing startup `upgrade_schema` adds missing columns non-destructively
and creates the notebook table. Alembic 0004/0005 reuse the idempotent bootstrap,
so fresh databases and databases previously initialized by startup both work.
Render's existing Uvicorn start command therefore applies this schema update.

Later tools should call `openSourcePanel(source, messageId, sourceIndex)` and consume
the detail contract. Never infer correctness from a citation or retrieval signal.
The panel resolves current server evidence before enabling save and separates the
source quotation from the chat claim and the user's editable interpretation.

## Verification

Run `npm run test:backend`, root `npm test`, and frontend `npm run typecheck`,
`npm run lint`, `npm test`, `npm run build`. Browser checks:

1. Start `backend/venv/Scripts/python.exe backend/tests/browser_server.py` with
   `BROWSER_API_PORT=8011` (isolated temporary SQLite and uploads).
2. In frontend, run `npx playwright test --config playwright.evidence.config.ts`.

The harness uses real auth, upload, PDF extraction, retrieval, schema, database,
notes, and downloads. Only embeddings and generated answer text are deterministic;
the production app never imports this test harness. Failure tests explicitly
intercept the PDF request; the legacy test transforms saved chat snippets.
Viewports: 1440, 768, 390; axe and reduced-motion checks included. Screenshots and
traces are written below frontend/evidence-test-results, which is intentionally ignored.
