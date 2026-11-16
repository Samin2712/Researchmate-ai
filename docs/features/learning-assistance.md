# Learning assistance contract

Verified against prompt 5 on 2026-11-17. See [the integration audit](../verification/learning-assistance-audit.md) for independent results. Earlier implementation claims have been replaced with the actual contracts below.

## Explain simply

POST `/api/v1/chat/ask` and `/api/v1/chat/stream` accept `explanation_mode`: `standard` or `simple`. Omission inherits the account preference; old accounts default to standard. PATCH `/api/v1/auth/me` persists `default_explanation_mode`. Generated assistant messages persist the mode used; legacy messages read as standard. The composer stores an explicit selection per account on this browser, above the account default. Changing either control affects future answers, not existing messages. Both chat paths retain chronological conversation history and existing paper/owner scope.

Simple-mode prompts preserve numbers, units, uncertainty, and citations, define technical terms, and explicitly label analogies. They treat paper text as untrusted data. This is model behavior, not a mathematical guarantee of accuracy. Source markers support `[Page X]`, `[Source X]`, `[Page X, Source Y]`, and `[Source Y, Page X]` in both backend extraction and frontend links.

## Terminology

POST `/api/v1/chat/explain-term` or `/api/v1/documents/{id}/explain-term` accepts `{document_id, term, context?, page_number?}`. The document route still requires the request schema's document_id; the route ID is authoritative. Terms are bounded to 150 characters and optional context to 1000. Responses return `{term, document_id, explanation, grounded_in_paper, status, source_quote, page_number}`. Matching terms receive an extracted paper quote. Absent terms receive an explicitly labeled general scientific definition with no paper quote. Provider errors return 502 rather than invented success.

The keyboard-accessible dialog traps focus, closes on Escape, restores focus, and opens existing source verification. Definitions render Markdown. Cache keys include owner, document revision, normalized term lookup, passage/page context, prompt version, provider, and model fingerprint. Generation is serialized in the single worker to avoid duplicate glossary writes.

## Paper-specific starter questions

GET `/api/v1/documents/{id}/questions` is read-only. It never schedules or calls a provider. Missing/current-version-invalidated sets return `unavailable`. POST `/api/v1/documents/{id}/questions/regenerate` explicitly schedules generation. Successful ingestion schedules the first set after committing the completed paper and creating its pending question record. Optional failures never fail ingestion.

States: `pending`, `ready`, `unavailable`, `failed`. Exactly three questions cover comprehension, methodology, and critical thinking. Each response includes question text plus `evidence_quotes` and `page_numbers`. Quotes must match normalized extracted text on their claimed page; unsupported or malformed output fails the set. Up to six excerpts span the paper; each excerpt is capped at 4000 characters. Calls have a 75-second deadline and a 1500-token output budget.

Scheduling is deduplicated within the deployed single worker, with database uniqueness by document/revision/version. A semaphore allows two concurrent question generations; new sets are limited to a queue of 20 pending records. Regeneration has a 60-second cooldown per current set and checks provider availability. Cache versions fingerprint prompt version, provider, and model. Language selection is not implemented. On restart, pending sets become failed with an explicit retry message. Deleting a document cascades question/glossary deletion; queued jobs recheck ownership, status, and revision. Shutdown cancels tracked optional tasks.

The upload panel waits for completed processing before fetching questions. Questions also appear in paper details and scoped empty chat. Selecting one opens a single-paper chat and inserts an editable draft; sending remains explicit. Clearly labeled general exploration prompts remain available if generation fails. Status changes are announced to screen readers. The mode control supports keyboard activation and arrow keys; reduced motion is respected.

## Persistence and deployment

Alembic migration `0008_learning_assistance` adds the two preference/message fields and question/glossary tables. Startup bootstrap also upgrades existing databases for services launched directly with Uvicorn. No new external service is required. Local setup uses the existing SQLite/Chroma/local embeddings; hosted setup uses the existing PostgreSQL/database vectors/remote embeddings. Run `npm run dev`, then `npm run doctor` for a real connectivity check.

The configured and live-tested model is Gemini 2.5 Flash, not Gemini 3.8 Flash. Generation consumes the existing provider quota: one optional structured request after each successful upload, explicit regenerations, uncached terminology requests, and normal chat requests. GET polling is free of generation calls. Never commit API keys.

## Limits

Run one backend worker/instance: locks and optional task scheduling are process-local, not a distributed job queue. Long-running optional work interrupted by deployment needs explicit retry. Cached model versions are retained until the owning paper is deleted. Evidence validation verifies quoted support and page provenance; it cannot prove that every generated question or educational analogy is scientifically correct. Live audit accounts remain because the API has no account-delete endpoint; their uploaded papers and chats are removed by the audit script.
