# Candidate research gaps and agreement/disagreement explorer

## Behavior and contracts

Both workspaces use authenticated persisted analysis runs with 2–10 explicitly selected, owned, processed papers. Gap candidates distinguish author-stated limitations, model inference and missing reporting. Each includes supporting quotes, rationale, uncertainty, search terms and a student investigation configured to time/resource budgets. Dataset availability, permissions, suitability and feasibility require independent verification.

The relationship list supports theme/type/search filters, side-by-side claims and context, and clickable source verification in the existing PDF panel. Saving evidence writes to the notebook. “Send to review” copies relationship type, claims, rationale, source IDs and exact quotes to paste into a review; clipboard errors are reported. It requires evidence on both sides.

Candidate saved/dismissed states reload from the server. Project briefs preserve assumptions and source IDs and can be inspected, exported and deleted. Individual and full Markdown exports retain evidence and uncertainty. Empty analysis results are valid; evidence-free notebook saves are rejected.

API additions (all owner-scoped):

- `POST /api/v1/analysis/runs`: kinds `gap_analysis` and `disagreement`; shared run list/detail/cancel/delete endpoints remain compatible.
- `GET /api/v1/analysis/runs/{id}/gaps`: candidate review states.
- `PATCH /api/v1/analysis/runs/{id}/gaps/{candidate_id}`: `status` (`saved`, `dismissed`, or null), optional `comment`. Unknown candidates and invalid status values are rejected.
- `POST /api/v1/analysis/runs/{id}/gaps/{candidate_id}/brief`: assumptions/time_budget/resource_budget; returns 201.
- `GET /api/v1/analysis/briefs`; `DELETE /api/v1/analysis/briefs/{id}` returns 204.
- `POST /api/v1/analysis/runs/{id}/relationships/{relationship_id}/save`: optional note; returns `{ "saved": true }` after actual evidence persistence.

`candidate_reviews` uses status/comment and unique `(user_id, analysis_run_id, candidate_id)`. `project_briefs` uses analysis_run_id, research_question, method, steps, linked_source_ids and assumptions. Its nullable run foreign key uses ON DELETE SET NULL, preserving briefs after run deletion.

Migration file: `0007_gap_analysis_and_disagreements.py`; revision ID: `0007_gaps_disagreements`, within Alembic's default 32-character limit. It adds both tables and PostgreSQL enum values. Startup bootstrap supports hosted services that start Uvicorn directly. No additional external service or paid disk is needed for this feature.

## Evidence and execution limits

- Extraction reads actual SQL chunk IDs: at most 12 excerpts, 2,500 characters per excerpt and 16,000 total characters per paper. Coverage is partial excerpt analysis. Coverage notes therefore always say “Not found in the analyzed evidence”; absence is never proof of worldwide novelty or full-paper absence.
- Synthesis quotes must be nonempty exact substrings of supplied verified evidence. Unknown IDs, fabricated text, wrong-side evidence, unselected study IDs and malformed payloads fail after one correction attempt. Author-stated gaps require limitation evidence. Prompt version 2.1 invalidates older analysis caches.
- Supported relationships require evidence on both sides; missing evidence yields insufficient evidence. Text matching establishes provenance, not semantic entailment or correct scientific classification. Model judgments need human review.
- Brief/notebook saves recheck source ownership, revision hashes and current chunk quotes. Changed/deleted sources require a new analysis. Saved notebook evidence carries the source content hash.
- Maximum three active runs per user and three provider calls per process; 90-second call timeout, bounded transient retries, 600-second run deadline. At most eight gap candidates or twenty relationships. One bounded synthesis over the selection avoids full-library all-pairs calls.
- Compatible comparison extractions are reused by owner, provider/model, question, revisions and prompt/schema versions. Cancellation/interrupted-run recovery use the shared infrastructure. The current deployment runs one process; a durable multi-process worker queue is outside its design.

## Independent verification — 2026-11-15

| Check | Result |
| --- | --- |
| Feature backend suite | 19 passed |
| Full backend suite | 81 passed |
| Frontend units | 24 passed |
| Frontend production build/typecheck | Passed |
| Frontend ESLint | Passed |
| Root launcher tests | 8 passed |
| Fresh isolated SQLite Alembic upgrade | `0007_gaps_disagreements (head)` |
| Targeted feature and prompt-3 Edge tests | 2 passed; zero workspace axe violations |
| Full Edge suite | 12 passed, 1 opt-in live-backend test skipped |

Commands:

```powershell
# Create backend/tmp first if absent; basetemp avoids inaccessible Windows sandbox temp folders.
cd backend
.\venv\Scripts\python.exe -m pytest --basetemp=./tmp/final-audit
.\venv\Scripts\python.exe -m pytest tests/test_gaps_disagreements.py --basetemp=./tmp/gaps-audit
cd ../frontend
npm test
npm run lint
npm run build
npx playwright test tests/e2e/gaps_disagreements.spec.ts tests/e2e/analysis.spec.ts --project=edge --workers=1
```

Tests cover author/inferred distinctions, context versus insufficient evidence, exact quotes, candidate-state reload, ownership, unknown candidates/status, forged synthesis quotes/sources, wrong-side evidence, unselected studies, malformed output, stale-source saves, empty results and evidence-free notebook saves. Shared regression tests cover provider errors, rate limits, cancellation and partial extraction. Deterministic fixture categories do not establish live classification accuracy. A human-audited live evaluation of comparable agreement/opposite findings remains necessary.

Browser checks verify paper selection, evidence disclosures, saved brief assumptions/source IDs and their export, dismissal reload, Markdown downloads and 390/768/1440px screenshots. Removing opacity from dismissed cards corrected the contrast violation found by the expanded axe test.

Local startup verified SQLite, Chroma, cached local embeddings, frontend and API CORS. The configured live model is `gemini-2.5-flash`. A real Gemini generation attempt returned daily quota exhaustion (429), so successful live generation and semantic quality are unverified. Restore quota or configure an available provider/model, then run these from the repository root:

```powershell
backend/venv/Scripts/python.exe scripts/verify-analysis-live.py gap_analysis
backend/venv/Scripts/python.exe scripts/verify-analysis-live.py disagreement
```

The local UI/backend run on this machine; generation uses the external AI provider and internet. This is not fully offline AI inference. `npm run dev` starts the app; `npm run doctor` checks actual provider access as well as readiness. Cached embeddings can run with HF_HUB_OFFLINE=1 and TRANSFORMERS_OFFLINE=1.

## Screenshots

| Workspace | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| Gaps | [390px](screenshots/gaps-390.png) | [768px](screenshots/gaps-768.png) | [1440px](screenshots/gaps-1440.png) |
| Relationships | [390px](screenshots/disagreement-390.png) | [768px](screenshots/disagreement-768.png) | [1440px](screenshots/disagreement-1440.png) |

## Deployment

Existing Render services auto-deploy GitHub main. Check both resulting deploys reach live at the pushed commit, then verify backend readiness, frontend routes and API schema. A live deploy establishes availability; it does not restore provider quota or establish scientific accuracy. Both agent-prompt/ and agent-prompts/ are ignored and untracked.
