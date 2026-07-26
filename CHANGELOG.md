# Changelog

All notable changes to this project, in the order they were built.

## [Unreleased]

### 01 — Project scaffolding, config module, and test harness

- Removed the `create-next-app` boilerplate page and unused starter SVGs.
- Added `lib/config.ts`, the single home for every tunable limit (max items
  per batch, max file size, max chars per item, request concurrency, request
  timeout, route max duration), each overridable via environment variable
  with the documented defaults as fallbacks.
- Installed and configured Vitest (`vitest.config.ts`, `npm test`).

### 02 — Paste one song, format it, preview and download

- `app/api/format/route.ts`: server route handler that forwards `{ text,
  sourceName }` to the configured n8n webhook (secret attached as an
  `X-Webhook-Secret` header) or, when `N8N_WEBHOOK_URL` is unset, serves
  `lib/mock-formatter.ts` — a realistic-delay mock that occasionally fails or
  returns multiple files. This is the local development path, not a
  temporary stub.
- `lib/validate-response.ts`: validates the `{ files: [{ filename, content
  }] }` envelope at the boundary; a malformed shape throws naming the
  offending field rather than crashing the UI.
- Outbound fetch to n8n times out below the route's declared `maxDuration`.
- `docs/n8n-contract.md`: the request/response contract for the n8n workflow
  to be built against.
- Preview renders results in a monospace block with exact whitespace; each
  result has copy-to-clipboard and per-file download.

### 03 — Access code gate

- `lib/session.ts`: a single shared access code (`ACCESS_CODE`) verified
  server-side with a constant-time comparison; sessions are an HMAC-signed,
  expiring token in an httpOnly cookie, so the cookie can't be forged even
  though it isn't a database-backed session.
- `app/api/auth/route.ts`: verifies the code and sets/clears the session
  cookie. An incorrect code reports failure without revealing whether a code
  is configured.
- `app/page.tsx` checks the session server-side and renders `AccessGate` or
  `QueueApp` accordingly; `/api/format` rejects any request without a valid
  session before contacting n8n.
- A session that expires mid-batch is classified as `unauthenticated` (see
  05) and surfaces as a dedicated "you've been signed out" banner rather than
  a per-item error.

### 04 — Multi-item queue with capped concurrent submission

- `lib/batch-runner.ts`: `runBatch(items, { submit, concurrency })` — the
  app's one seam. Runs a worker pool capped at `concurrency`, attributes
  each outcome back to its item regardless of finish order, and never lets
  one item's failure stop the others.
- The queue UI (`components/QueueApp.tsx`, `components/QueueRow.tsx`) shows
  each item as its own row with live status (queued/running/done/error),
  reveals results as soon as each item finishes, and renders every file an
  item produces.
- A "Clear batch" action resets the queue and results to the initial state.

### 05 — Classified retry and per-item failure handling

- `lib/retry.ts`: `isRetryable` is a pure predicate — network errors and 5xx
  are eligible for one silent automatic retry; 4xx and response-validation
  failures are not, since they'd fail identically again.
- Failed rows show the underlying error message with a manual retry that
  re-runs only that item (`runBatch` called again with a one-item array).
- The batch reports a succeeded/failed summary when it settles.

### 06 — File upload with browser-side text extraction

- `lib/extract-text.ts`: `.txt` is read directly; `.pdf` text is extracted
  with `pdfjs-dist`, lazy-loaded via dynamic `import()` so an operator who
  only pastes never downloads the parser.
- Files can be added by picker or drag-and-drop, several at once, each
  becoming its own queue item alongside pasted blocks in the same batch.
- A PDF that extracts to empty text is flagged as a likely scanned document
  and excluded from submission; unsupported extensions are rejected at
  selection with a message naming the accepted types (`.txt`, `.pdf`).
- Only extracted text ever reaches `/api/format` — raw file bytes never
  leave the browser.

### 07 — Input guardrails

- `lib/limits.ts`: pure, boundary-tested `checkBatchSize`, `checkFileSize`,
  `checkCharCount`, each reading its threshold from `lib/config.ts` and
  reporting which limit was hit, by how much, and (for file/char limits)
  which item.
- Guardrails reject outright — batch size and char-count violations block
  submission entirely (nothing is truncated or silently dropped); file size
  is rejected at selection time.

### 08 — Bulk zip download and filename collision handling

- `lib/filenames.ts`: `sanitizeFilename` strips path separators and control
  characters with a fallback for empty/missing names; `dedupeFilenames`
  numbers clashes (`song (1).txt`); `resolveBatchFilenames` composes both
  across the whole batch in one pass.
- `lib/zip.ts`: zips every result via a lazy-loaded `jszip`, downloaded only
  when bulk download is first used.
- Single-file and bulk downloads share the same resolved filenames, so they
  never disagree. Bulk download is disabled until the batch has produced at
  least one result.

### 09 — Batch survives a page refresh

- `lib/batch-store.ts`: an external store (mirrored to `sessionStorage` via
  `lib/batch-storage.ts`) read through `useSyncExternalStore`, so the first
  client render matches the server's empty render and hydration never
  mismatches — restoring from storage inside a mount effect was tried first
  and rejected; it set state after hydration completed and produced a
  visible mismatch.
- Items still `running` when the page reloaded are restored as
  failed-and-retryable, never as stuck in-flight.
- Corrupt/unparseable stored state, and a full storage quota, both degrade
  silently to a clean/unpersisted session rather than crashing.
- Clearing the batch removes the persisted state as well as in-memory state.
