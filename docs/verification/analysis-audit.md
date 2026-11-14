# Analysis implementation audit — 15 November 2026

The initial implementation was not deployment-ready. Review found broken run navigation/history, exports ignoring saved edits, unescaped HTML rendering, unverified evidence, SQL/vector ID confusion, cancellation being overwritten, missing restart recovery, and PostgreSQL enum/migration mismatches. Those paths have been corrected.

## Verified so far

- Backend regression suite: 62 tests passed, including 13 new deterministic analysis cases and three synthetic papers.
- Frontend typecheck, lint, build, 21 unit tests and eight launcher tests passed.
- Desktop and mobile Playwright analysis flows passed, including selection, comparison, source panel, review, edit/save/reload, export content, history, retry and unsaved-change protection. Axe found no violations in comparison and review workspaces. Screenshots were inspected at 390, 768 and 1440 pixels; the duplicate desktop/mobile matrix cascade was corrected.
- Fresh isolated SQLite database: Alembic upgrade to head, repeated upgrade, and current revision passed.
- Local API starts with connected SQLite, local Chroma and loaded CPU embeddings. Frontend responds locally.
- Live Gemini comparison preserved 5 percentage points versus 5 ms and 80% recall. An embedded instruction to claim 100% recall was ignored.

## Full-project browser regression

A full desktop/mobile run completed with 22 passes, one intentional mobile live-test skip, and one live-chat failure caused by the same Gemini daily quota. The failure is recorded rather than hidden or reclassified as a pass. After the router blocker change, all 22 controlled desktop/mobile browser flows passed again, including authentication, uploads, streaming, exports, graph, profile, errors, keyboard and accessibility. Local upload/processing reached the chat step before the provider rejected generation.

## External limit

Live literature-review validation exposed provider citation formatting; grouped citation normalization and a correction retry were added. A further live review attempt hit the configured Gemini model's daily free-tier quota (20 requests/day reported by the provider). Final successful live review generation cannot be claimed until that quota renews or an available provider is configured. No billing plan or provider credentials were changed. Deterministic review generation and browser persistence/export tests cover the implemented flow separately.

## Known operational limits

- One API worker/instance. Jobs do not survive restart; interrupted runs become retryable failures. Provider requests already in flight cannot be remotely cancelled.
- Evidence checks validate source IDs and exact quotes, not the truth of every model interpretation.
- Long papers use bounded source excerpts; generated reviews are selected-paper drafts.
- PDF export supports Latin text. Unsaved edits are guarded during in-app links, workspace Back, browser history and browser close/reload.

## Reproduction

```powershell
npm test
npm run test:backend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run test --prefix frontend
npm run build --prefix frontend
$env:PLAYWRIGHT_CHROMIUM_PATH='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm run test:e2e --prefix frontend -- --project=chromium --project=mobile --workers=2
npm run dev
```

The opt-in live provider check is `scripts/verify-analysis-live.py`; launch it with the same environment as the backend. It creates an isolated temporary SQLite database and uses synthetic papers, without writing test papers into production.

Screenshot paths (ignored generated artifacts):

- `frontend/test-results/analysis-compare-inspect-e-c9571-edit-save-reload-and-export-chromium/comparison.png`
- `frontend/test-results/analysis-compare-inspect-e-c9571-edit-save-reload-and-export-chromium/review.png`
- Corresponding `-mobile` directory for narrow-screen checks.

Git ignores both `/agent-prompts/` (the actual local folder) and `/agent-prompt/`; neither is tracked. Secrets and generated browser artifacts remain ignored.
