# ResearchMate frontend

To start **both** backend and frontend, run `npm run dev` from the repository root.
See [one-command startup](../docs/LOCAL_STARTUP.md). The commands below start only this frontend.

React 18, TypeScript, Vite, Tailwind CSS, Motion, React Query, Axios, Zustand, and React Flow.
The application uses the real API in `src/services`; controlled responses exist only in browser tests.

## Run locally

Use Node.js 20.19+ or 22.12+ (verified with Node 24). From the repository root:

```powershell
cd frontend
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:5173`. On shells without the PowerShell execution-policy restriction, `npm` also works.

Environment variables, read by Vite at startup/build time:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | API origin **including** `/api/v1`; no trailing slash required |
| `VITE_MAX_UPLOAD_BYTES` | `10485760` | Client PDF limit; keep this equal to backend `MAX_UPLOAD_SIZE` |

The backend must allow the frontend origin in `CORS_ORIGINS`. For another device on your network,
set `VITE_API_URL` to the backend computer's reachable address and allow the frontend's origin.
Only public configuration belongs in `VITE_*` variables. `VITE_WS_URL` is unused: the implemented backend
streams via authenticated **POST `/chat/stream` SSE**, not WebSockets.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium msedge
npm.cmd run test:e2e
```

Browser tests start a production build and Vite preview on port 5173. Stop an existing development
server to test the production bundle. Projects cover desktop Chromium, a 390px mobile Chromium viewport,
and Microsoft Edge. Mobile emulation does not verify iOS Safari. Firefox and Safari have not been tested.

An existing Chromium executable can be selected without another download:

```powershell
$env:PLAYWRIGHT_CHROMIUM_PATH = 'C:/path/to/chrome.exe'
npm.cmd run test:e2e
```

Controlled API tests exercise registration, authentication, upload and retry, streaming and stopping,
saved history, citations, summaries, exports, search, deletion, the map, keyboard access, and axe audits.
The separate live test registers a uniquely named test account, uploads `backend/sample_ai_research.pdf`,
asks a question, and logs out. It skips explicitly when `localhost:8000/health` is unreachable;
it never substitutes controlled responses for live integration. It leaves that test account and its
paper/conversation in the backend for inspection.

## Behavior and boundaries

- JWT is stored in localStorage as required by task 3.3. `/auth/me` verifies restored sessions;
  token expiry and HTTP 401 clear authentication. The backend has no refresh or logout endpoint.
- Upload checks filename, MIME type when supplied, byte size, nonempty content, and PDF signature.
  Axios reports actual transfer progress; a completed transfer is distinguished from server confirmation.
  Library polling tracks `uploading` and `processing` until completion/failure. The backend has no retry-processing
  endpoint: failed processing explains how to delete the paper and upload a readable PDF again.
- Chat supports document scope, persisted sessions, source excerpts and paper links, retrieval confidence,
  cancellation, timeout, retry input recovery, auto-scroll, and interrupted-stream errors.
- Summaries use the existing chat SSE endpoint scoped to one paper and create a saved conversation.
  The backend has no separate summarization endpoint.
- Knowledge-map edges come from shared author metadata or papers cited in one answer. They are not inferred
  scientific relationships. The map offers zoom, keyboard-accessible paper links, and a text connection list.
- Citation drafts use available author/title/year metadata in APA, MLA, or Chicago layouts. Missing journal,
  DOI, volume, and publication information must be checked against the original paper.
- Markdown exports preserve Unicode. Downloaded PDF exports use the built-in PDF Latin font; use Markdown
  for non-Latin scripts. The API does not expose a secure original-PDF download endpoint, so source links
  open paper metadata and excerpts rather than filesystem URLs.
- Profile editing and dark mode are not exposed; the backend has no profile update endpoint, and dark mode
  is optional in Phase 3. Settings save the animation preference locally.

## Design and structure

The design follows the repository's frontend-design skill: a quiet research workbench, with the paper-to-evidence
connection diagram as its main visual motif. Self-hosted Manrope headings and DM Sans text provide the type hierarchy.
Tokens: ink `#193a51`, teal `#116e64`, paper `#f5f8fa`, white `#ffffff`, muted `#607480`, rule `#dce5eb`.
Desktop keeps navigation beside the work area; mobile moves navigation into a native modal menu.
Brief fades and action-driven feedback follow [Motion's accessibility guidance](https://motion.dev/docs/react-accessibility).
System reduced motion is respected, with an additional workspace preference.

`src/pages` contains route screens; `components` contains document/chat/tool/shared modules;
`services` owns the typed API, SSE decoder, and query hooks; `store` owns authentication and local preferences.
Route pages, the graph, and PDF export are split into separate bundles. The chat message component is memoized,
and expensive filter/map derivations are memoized.

See `../docs/PHASE3_VERIFICATION.md` for actual verification results and environment blockers.
