# Prompt 5 independent integration audit — 2026-11-17

## Outcome and scope

Reviewed the actual repository prompt `agent-prompts/05-simple-explanations-and-upload-questions.md`, implementation, API contracts, database upgrade paths, local startup, existing regression tests, browser behavior and Render service configuration. The separately mentioned Downloads attachment was unavailable. Its instructions were not treated as deployment authorization; the user's explicit request authorized push and deployment.

The initial implementation had working UI and passing tests but was not ready to ship unchanged. Fixes include:

- Ingestion now persists a pending question record before scheduling optional generation. Previously the worker returned immediately because no record existed.
- GET question reads never schedule generation. Added explicit regeneration cooldown, scheduling lock, bounded pending queue, model-aware cache keys and provider checks.
- Fabricated quotes, missing support, wrong pages and malformed question sets are rejected. Evidence comes from representative bounded excerpts.
- Revision and owner checks protect queued generation; deleting papers cascades glossary/question cleanup. Shutdown cancels optional tasks and restart surfaces truthful retry states.
- Upload UI waits for completed indexing before fetching questions and follows library polling to reveal the result.
- General prompts remain available in scoped chat. Account preference is loaded from the server; explicit composer mode persists per account on the browser and saved replies retain their own mode.
- Terminology dialog traps/restores focus and renders Markdown. Status messages, contrast, selected-mode appearance, keyboard arrows and reduced motion were improved. Preference save failures are reported.
- Both chat paths preserve chronological prior exchanges. Current requests are excluded from their own history.
- Live review caught an analogy confusing a percentage-point change with a relative percentage. Simple-mode analogies are now explicitly qualitative. Terminology prompt v2 separates general definitions from quoted paper usage and prohibits inferred study details.
- Backend citation extraction and frontend links handle Gemini's `[Source X, Page Y]` markers as well as the existing marker order. The live test exposed this missing-source bug.

## Verification evidence

| Check | Result / boundary |
| --- | --- |
| Root launcher tests | 8 passed |
| Backend full regression | 108 passed |
| Final focused learning/citation tests, including added history checks | 28 passed |
| Frontend unit tests | 27 passed |
| TypeScript and production build | Passed |
| ESLint | Passed |
| Database migration | Fresh isolated SQLite upgraded through Alembic 0008 successfully; startup bootstrap and legacy preservation tests passed |
| Browser regression | 15 passed, 1 intentionally skipped (Edge); controlled API tests exercise auth/upload/chat/history, comparison, review, gaps, disagreement, source panels, notebook, export, profiles, graph and accessibility |
| Added learning browser tests | 3 passed: upload-processing transition, scoped editable question/simple reply/term/history, provider failure recovery/keyboard/reduced motion |
| Real API/browser evidence workflow | Desktop passed against an isolated persisted test API: real PDF rendering, citation, note save/edit/reload, Unicode export and focus return; only AI/embeddings deterministic |
| Real local provider | Full live feature check passed; see `learning-local-live.json` |
| Local startup | `npm run dev` started SQLite, Chroma and local embeddings; `npm run doctor` confirmed frontend/API/CORS and a real Gemini response |

Local live validation uses real PDF extraction, embeddings, Gemini questions, simple non-streamed chat, terminology generation, streamed override, persisted history, and paper/chat deletion. Manually inspected the response sample: 40 adults, 70% to 75%, 5 percentage points and p < 0.05 were preserved; preliminary association and lack of causation were retained; analogy was labeled; an adversarial instruction to claim 100% was ignored. Questions cover pages 1–3. This sample supports the behavior without proving every future model answer correct.

Mocked browser fixtures, deterministic API harness tests, and real-provider checks are reported separately. The Edge regression deliberately skips the legacy Chromium-only live test; the independent live script covers the actual provider instead. Responsive learning checks ran at 390/768/1440 pixels with axe checks and screenshots. Screenshots were visually inspected.

## Ten-feature integration inventory

| Feature | Verified integration |
| --- | --- |
| Collections | Authenticated CRUD, membership, filters and owner isolation in backend regression |
| Citation manager | Metadata validation and BibTeX cases in backend tests; browser citation/export flows |
| Source verification | Real PDF page rendering, exact source excerpts, keyboard focus and live API browser test |
| Evidence notebook | Save, edit, reload, Unicode export and provenance/deletion tests |
| Comparison | Controlled-browser compare/inspect/export and strict backend evidence validation |
| Literature review | Generate, edit, save and reload flow plus backend ownership/revision tests |
| Research gaps | Candidate distinction, evidence, review state, project briefs, export and responsive browser flow |
| Agreement/disagreement | Relationship classification, source support, notebook integration and responsive browser flow |
| Simple explanations / terminology | Valid modes, defaults, overrides, account preference, legacy history, streamed/non-streamed prompts, glossary grounding/cache and browser interaction |
| Upload questions | Automatic post-ingestion scheduling, exactly three supported categories, cache/read/cooldown/dedup/stale/delete failures, upload reveal and editable scoped drafts |

Existing authentication, PDF ingestion/indexing, summarizer, knowledge graph and exports are covered by broader regression checks. This does not claim a separate real-provider evaluation of every earlier synthesis feature in this audit.

## Deployment

Existing Render services are linked to GitHub `Samin2712/Researchmate-ai`, branch `main`, with automatic deployment enabled. The existing frontend is a static Vite build; the backend is a single-worker FastAPI service. No new paid resource or external integration is needed for prompt 5. The deployed `/health` check confirmed healthy PostgreSQL, database-backed vectors, Gemini remote embeddings and Gemini 2.5 Flash. The existing settings select Gemini 2.5 Flash, not Gemini 3.8 Flash. Initial release `8618b59` became live on both services, and both hosted API and unmocked browser checks passed. A subsequent wording correction is verified and published separately; final deploy IDs are recorded in the deployment evidence file.

## Operational limits

One backend worker/instance is required because optional task locks are process-local. Interrupted optional tasks require explicit retry. Provider quota/network failures remain possible and must be displayed truthfully. No OCR is added for scanned PDFs. Audit accounts remain because no account-delete endpoint exists; the audit script removes its paper and conversation. See the feature contract for API and cache details.
