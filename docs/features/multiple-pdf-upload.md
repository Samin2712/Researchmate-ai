# Multiple PDF upload

The Paper library accepts multiple files in its file picker or a single drag-and-drop operation. Files are transferred independently through the existing authenticated upload API, with at most two transfers in flight. The backend's existing single-document processing semaphore bounds ingestion memory; no new bulk API, database schema, or service is required.

Every file has its own queued/uploading/uploaded/failed/canceled state, transfer progress, and error. Invalid extension/MIME, empty files, files above the per-paper limit (10 MB by default), and invalid PDF signatures fail independently. Other valid files continue. A successful transfer is shown separately from processing readiness/failure.

Users can add more files while transfers run, cancel individual queued or active transfers, retry a failed transfer, and clear finished queue entries. Retrying a failed entry does not resubmit successful files. Canceling an in-flight HTTP request cannot guarantee the server has not accepted the file, so its row advises checking the library before retrying. Format/signature errors require a corrected file rather than an identical retry.

The queue lives on the current page. Keep it open until transfers finish. Completed documents remain in the library after navigation/reload; unfinished queue entries are not persisted. Processing retries remain available through the existing library controls. Starter questions for the latest uploaded paper retain the existing behavior; all papers' questions remain accessible in their details/chat.

## Verification

From the root:

```powershell
npm.cmd run test:e2e:uploads --prefix frontend
npm.cmd test --prefix frontend
npm.cmd run lint --prefix frontend
npm.cmd run build --prefix frontend
```

The upload suite starts a production frontend build on port 5177 and an isolated temporary backend on port 8013, with desktop and mobile Edge projects. Microsoft Edge and the existing backend/frontend dependencies are required. It does not use or change the developer's database or send email.

Checks cover:

- Four-file picker selection, individual progress, a maximum of two requests, queued remainder, clear-finished, responsive layout, and axe accessibility checks.
- Mixed valid/invalid/empty/oversized/signature-invalid files and a server failure, followed by retry of only the failed transfer.
- Canceling queued and active files, appending files during transfer, and retrying a canceled queued file.
- Drag-and-drop of three PDFs.
- Three PDFs selected once through the real local authentication/upload/PDF extraction/processing/database APIs, completed page counts, library persistence after refresh, and cleanup of test uploads. Only external embeddings and generated text are deterministic in this test harness.

To check the shipped frontend separately after deployment:

```powershell
$env:UPLOAD_HOSTED_URL='https://researchmate-frontend.onrender.com'
npm.cmd run test:e2e:uploads --prefix frontend
Remove-Item Env:UPLOAD_HOSTED_URL
```

Hosted mode uses the deployed frontend assets with controlled API responses to exercise UI states without modifying production accounts/documents. It skips the real-local-API test. Verify real production service readiness separately; a controlled UI test alone does not prove live processing or provider quota.

## Local results - 21 November 2026

- Upload suite: 10 passed across desktop/mobile, including the real isolated upload/processing/persistence checks.
- Existing single-upload progress/retry, validation/export, and starter-question regression checks: 3 passed in Edge.
- Frontend units: 27 passed; ESLint and production build/typecheck passed.
- Desktop/mobile screenshots inspected. Per-file success pop-ups were removed because they obscured the queue on mobile; the queue provides visible results and an accessible summary instead.
