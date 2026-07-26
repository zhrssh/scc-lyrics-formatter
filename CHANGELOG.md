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

## Redesign — planning

### Spec and tracker reset

- The v1 build is complete; its spec and its nine tickets moved to
  `docs/archive/v1-build/` (via `git mv`, so history follows them). That spec
  remains the reference for the app's functional design — item model, n8n
  contract, retry classification, guardrails, persistence, testing decisions —
  none of which the redesign changes.
- New root `SPEC.md` covers the app's visual and interaction design: the
  "warm sanctuary" direction, light-only, Lora headings with Geist Sans for UI
  and Geist Mono retained for all lyric text.
- New tickets `.issues/01`–`06`, renumbered from `01`: design tokens, brand
  assets, access gate, queue page shell, queue row, and a final accessibility
  and responsive pass.

### Two research findings that constrained the design

- **The supplied palette cannot be used as given.** Measured against the
  `#FDF8F5` canvas, four of its five colours fail WCAG AA behind white text —
  only `#D83B3C` scarlet-rush reaches 4.55:1. It becomes the primary fill; the
  three lighter tones are decorative only, never a text colour and never a
  button fill with a label on it. The ink scale is invented, since the palette
  supplies no neutral. Errors are pushed to a browner maroon so failure never
  reads as branding.
- **The logo needs preparing before use.** `app/scc.png` is 2048² with an
  opaque white background, and the mark fills only 55% × 44% of it, so it must
  be cropped. A flood fill from the edges reaches every white pixel including
  the cross — it is an open knockout, not an enclosed shape — which makes
  white→transparent correct for in-page use (the cross shows the surface
  behind it) and wrong for the tab icon, which keeps an opaque background.

No source files changed in this step. The tickets describe the work; they do
not do it.

## Redesign — implementation

### 01 — Design tokens and light-only theme

- `app/globals.css`: the SCSS variable dump and the `@media
  (prefers-color-scheme: dark)` block are gone, replaced by a single `@theme`
  block holding every token from `SPEC.md` — canvas/surface/sunken, the ink
  scale, line tones, the full brand ramp, and the danger/success/waiting
  pairs. `npm run build` now reports zero CSS warnings, down from 24.
- One global `:focus-visible` rule draws a 2px brand outline with a 2px
  offset, so no component has to remember its own focus ring; `:root`
  declares `color-scheme: light`.
- `app/layout.tsx` loads `Lora` via `next/font/google` as `--font-lora`,
  mapped to `font-serif` alongside the existing Geist Sans/Mono variables.

### 02 — Brand assets and app identity

- `public/scc-logo.png` and `app/icon.png` generated from `app/scc.png`:
  cropped to the mark's measured bounding box with ~5% padding, white keyed
  to transparent with a soft (anti-aliased) threshold rather than a hard
  cutoff. The icon is composited onto an opaque `#FDF8F5` square instead, so
  the open-knockout cross doesn't pick up dark browser chrome. `app/scc.png`
  itself is untouched; `app/favicon.ico` is deleted so only one icon link is
  emitted.
- `components/Logo.tsx`: a shared `next/image` wrapper with an explicit size
  prop, church-naming alt text (or `aria-hidden` when purely decorative), and
  `preload` (not the Next.js 16-deprecated `priority` prop) for above-the-fold
  use.
- `metadata.description` in `app/layout.tsx` now names the church in plain
  language.

### 03 — Access gate restyle

- `components/AccessGate.tsx` rebuilt on the new tokens: a centred white card
  on the cream canvas, the shared `Logo`, an eyebrow/serif heading, a real
  `<label>` on the access-code input, and `outline-none` removed entirely —
  focus now comes from the ticket-01 global rule. The error message carries
  `role="alert"` on the danger tokens. No `dark:` utilities remain, and
  `handleSubmit`/the `/api/auth` call/`router.refresh()` are untouched.

### 04 — Queue page shell

- `components/QueueApp.tsx` rebuilt as a branded header (logo, eyebrow, serif
  title, a gradient hairline through the three decorative palette tones into
  brand scarlet) followed by two numbered cards: "Add your lyrics" (merged
  paste box + drop zone with an `— or —` divider) and "Queue — N songs".
- "Clear batch" moved out of the header into the queue card as "Clear all"
  and now asks for confirmation before running — the one behavioural change
  in this ticket, added as a guard around the existing `handleClear` call,
  not a change to `setBatchState`.
- The empty queue shows a friendly next-step message instead of "The queue is
  empty."; the primary action reads "Format songs" and bulk download reads
  "Download all (.zip)". Both live in a bottom action bar that stays reachable
  without scrolling through a long queue, with enough reserved padding below
  the queue card that it never covers the last row.
- The batch summary is wrapped in `aria-live="polite"`; every handler
  (`handleSubmit`, `handleAddFiles`, `runItems`, the results `useMemo`, the
  `useSyncExternalStore` wiring) is unchanged.

### 05 — Queue row restyle

- `components/QueueRow.tsx`: status renders as a tinted pill with a dot and
  plain wording (waiting / formatting / ready / "needs another try") rather
  than bare coloured text, on the waiting/success/danger token pairs — never
  brand scarlet. The source badge sits on the brand tint; the extracted-text
  preview moved to the sunken surface; the error block gained a danger
  left-border accent. Copy/Download/Remove all carry accessible names
  identifying which file or item they act on, and the "Copied!" confirmation
  is also announced via an `aria-live` region. Only `lib/types.ts`'s
  `ItemStatus` union stayed put — only the display strings changed.

### 06 — Accessibility and responsive verification pass

- Verified with an automated pass (axe-core against both pages in every
  reachable state, plus a scripted keyboard-tab walk) rather than assumed:
  two real defects surfaced and were fixed — neither page had a `<main>`
  landmark, and the per-row paste textarea (added in 05) had no accessible
  name. Both are fixed; a re-run reports zero violations on the access gate
  and the queue page.
- The bottom action bar originally clipped "Format songs" onto two lines
  inside a fixed-height button once "Download all (.zip)" no longer fit
  beside it at 320px. Fixed by letting the bar wrap onto two full-height rows
  (`flex-wrap` + `whitespace-nowrap` + `min-h-11` instead of a fixed `h-11`)
  instead of squeezing wrapped text into a fixed box; confirmed by measuring
  that the last queue row's controls stay clickable and uncovered at both
  320px and 1280px.
- Confirmed: `grep -r "dark:" app components` is empty, `npm test` passes
  with no test file touched, `npm run lint` and `npm run build` are clean,
  and the app still renders light and legible with the OS forced to dark.
