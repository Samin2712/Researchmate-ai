# ResearchMate UI refinements

Validated locally on November 24, 2026 (Asia/Dhaka).

## Changes

- Gap and disagreement cards put findings, evidence status, and actions first. Native keyboard-accessible disclosures contain explanations, study claims, project details, and source quotes. Uncertainty, incomplete evidence, and coverage warnings remain visible. Existing source panels, save actions, and exports retain the underlying research evidence.
- Notifications appear one at a time in a dedicated row above the page content. Pending feedback is queued with a count. Errors require dismissal; success messages stay for eight seconds after becoming visible and pause on pointer hover or keyboard focus. Existing screen-reader status/alert semantics remain available.
- Paper titles are 16px, author metadata 14px, and page/date metadata 13px. Existing Manrope headings, DM Sans body text, navy ink, teal actions, and visible focus indicators are retained.
- Collections collapse without clearing selection or filters; small screens start collapsed. Names wrap in the panel, remain available as native titles, and appear in full above the selected collection's papers. Collection action buttons stay visible for touch and keyboard users.
- The compact list reuses DocumentCard, retaining details, tags, summary, chat, deletion, selection, and bulk actions. The URL retains the chosen view and filters through reload.
- Returning users see recent conversations and papers needing attention first. Confirmed empty workspaces retain onboarding. Dashboard shortcuts and the analysis entry screen explicitly expose Compare papers and Find research gaps.

## Local validation

- Production build and TypeScript compilation passed (`npm run build`).
- ESLint passed (`npm run lint`).
- All 27 unit tests passed (`npm run test`).
- 16 relevant Playwright interaction tests passed across the final production-build run and a focused rerun of the corrected notification fixture. One existing opt-in live-backend test was skipped because no local backend was started.
- Browser: Microsoft Edge's Chromium executable, through Playwright. Viewports: 390×900, 768×900, and 1440×900.
- Screenshots captured and reviewed for returning dashboard, analysis entry, library cards/list, notifications, gap findings, and disagreement findings. No horizontal overflow was detected at the tested widths.
- Automated axe WCAG A/AA checks passed on tested dashboard, analysis entry, library, notifications, gap, and disagreement screens; these include rendered text contrast. Keyboard and reduced-motion flows passed. Automated checks do not replace a complete manual assistive-technology audit.
- Metadata `#526674` contrast is 5.98:1 on white and 5.61:1 on `#f5f8fa`; teal `#116e64` on white is 6.11:1. These exceed the 4.5:1 WCAG AA threshold for normal text.
- Interaction coverage includes onboarding, research shortcuts, recent conversation links, attention links, collection filtering/collapse, view switching, persistent filters, paper details, bulk selection, notification queue/dismissal, timed success feedback with focus/hover pauses, persistent errors, source evidence, saved project briefs, comparison, review edits, exports, chat streaming/recovery, uploads/retry, authentication, and mobile navigation.

The browser tests use controlled API responses. Routes and API contracts were preserved; no backend or research-generation changes were made.

## Local screenshot artifacts

`frontend/test-results/verified/` contains per-test screenshot folders with width-specific PNGs. `frontend/test-results/notification-timing/` contains the focused notification timing run. These generated browser artifacts are intentionally excluded from the commit.

## Deployment verification

The target is the existing `main` branch of `Samin2712/Researchmate-ai`, with Render's **My Workspace** (`tea-dbrknih5efls73d73100`). Both existing services have automatic deployment enabled. Deployment success must be checked against the pushed commit, followed by live HTTP checks.
