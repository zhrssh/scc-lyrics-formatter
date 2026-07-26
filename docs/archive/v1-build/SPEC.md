# SCC Lyrics Formatter — Spec

## Problem Statement

Someone preparing lyrics for a service has songs scattered across pasted text and PDF or
text files, in inconsistent shapes. Getting them into a consistent, usable format is manual,
repetitive work done one song at a time.

The formatting intelligence already has a home — an n8n workflow. What's missing is a way to
feed it work and get results back. Without a client, the operator has no way to submit a
dozen songs at once, no way to see whether the output is right before saving it, and no way
to recover the good results when one song fails.

## Solution

A web app that acts as the front door to the n8n workflow.

The operator builds a **queue** of items — each pasted block of lyrics is one item, each
uploaded file is one item, and a single queue can mix both. Submitting the queue sends every
item to n8n independently, so progress is visible per item and a failure is contained to the
item that caused it.

n8n returns formatted lyrics as one or more named text files per item. The operator sees each
result as a preview that preserves the formatting exactly, then downloads individual files or
the whole batch as a zip. Results survive a page refresh, so an accidental reload doesn't
discard several minutes of work.

## User Stories

1. As an operator, I want to paste lyrics into a text box, so that I can format a song I copied from somewhere without saving it to a file first.
2. As an operator, I want to add several pasted blocks to one queue, so that I can format multiple songs in a single run.
3. As an operator, I want to upload a `.txt` file, so that I can format lyrics I already have on disk.
4. As an operator, I want to upload a `.pdf` file, so that I can format lyrics from a document someone sent me.
5. As an operator, I want to upload several files at once, so that I don't have to add them one at a time.
6. As an operator, I want to mix pasted blocks and uploaded files in the same queue, so that I don't have to run two separate batches for one service.
7. As an operator, I want to see each queued item as its own row, so that I understand exactly how many units of work I'm about to submit.
8. As an operator, I want to see where each queued item came from, so that I can tell a pasted block apart from an uploaded file at a glance.
9. As an operator, I want to remove an item from the queue before submitting, so that I can correct a mistake without starting over.
10. As an operator, I want to edit a pasted block after adding it, so that I can fix a typo without deleting and re-adding the item.
11. As an operator, I want to see the text extracted from an uploaded file, so that I can confirm the file was read correctly before spending a formatting run on it.
12. As an operator, I want to be told when a PDF contains no readable text, so that I don't submit a scanned document that cannot possibly succeed.
13. As an operator, I want files of unsupported types to be rejected with a message naming what is supported, so that I know what to do instead of guessing.
14. As an operator, I want to submit the whole queue with one action, so that I can start the run and step away.
15. As an operator, I want to see per-item progress while the batch runs, so that I know the app is working and roughly how far along it is.
16. As an operator, I want items that finish early to show their results immediately, so that I can start reviewing before the whole batch completes.
17. As an operator, I want a formatted result shown as a preview with its spacing and line breaks intact, so that I can judge whether the formatting is correct before saving it.
18. As an operator, I want one item to be able to produce several result files, so that a document containing several songs comes back as several songs.
19. As an operator, I want each result file to show its filename, so that I know what I'm about to save.
20. As an operator, I want to download a single result file, so that I can grab just the one song I need.
21. As an operator, I want to copy a result to the clipboard, so that I can paste it straight into another tool without a round trip through my filesystem.
22. As an operator, I want to download every result in the batch as one zip, so that saving twenty songs takes one action rather than twenty.
23. As an operator, I want result files with clashing names to be made unique automatically, so that saving a batch doesn't silently overwrite one song with another.
24. As an operator, I want a transient network failure to be retried automatically, so that a momentary blip doesn't turn into an error I have to act on.
25. As an operator, I want an item that genuinely fails to show me its error message, so that I can tell a bad input apart from a broken service.
26. As an operator, I want to retry a single failed item, so that I don't have to re-run and re-pay for the items that already succeeded.
27. As an operator, I want the rest of the batch to complete when one item fails, so that one bad song doesn't cost me the whole run.
28. As an operator, I want my results to still be there after an accidental page refresh, so that I don't lose work I already waited for.
29. As an operator, I want to be stopped before submitting an unreasonably large batch, so that a mis-drop of a whole folder doesn't cost a fortune in formatting runs.
30. As an operator, I want to know which limit I exceeded and by how much, so that I can fix the queue rather than guess.
31. As an operator, I want to enter an access code once and stay signed in, so that I'm not re-authenticating on every visit.
32. As the owner, I want the app gated behind an access code, so that a stranger who finds the URL can't run up my costs.
33. As the owner, I want the n8n webhook URL and its secret held only on the server, so that they can't be extracted from the browser and used directly.
34. As the owner, I want concurrent requests to n8n capped, so that a large batch doesn't overwhelm the workflow instance.
35. As the owner, I want a malformed n8n response to surface a clear error naming the problem, so that I can fix the workflow instead of debugging the UI.
36. As the owner, I want a documented request and response contract, so that I can build the n8n workflow against a fixed target.
37. As a developer, I want the app to run fully without a live n8n instance, so that I can build and verify every state before the workflow exists.
38. As a developer, I want the mock to produce failures and multi-file responses sometimes, so that error handling and multi-file rendering are exercised rather than assumed.
39. As a developer, I want limits and concurrency in one config module, so that tuning them once real throughput is known is a single edit.
40. As an operator, I want to clear the batch and start a new one, so that a fresh service doesn't inherit the previous run's results.

## Implementation Decisions

### Architecture

- Next.js App Router client. All formatting intelligence lives in n8n; the app is transport,
  presentation, and guardrails only.
- The browser never contacts n8n directly. A server route handler holds the webhook URL and
  shared secret, so neither is retrievable from client code.

### The item model

- **One input unit is one item.** A pasted block is one item; an uploaded file is one item,
  regardless of how many songs it contains.
- **One item is one request to n8n.** Requests fan out with a concurrency cap rather than
  being batched into a single long-running call. This keeps every request well inside the
  hosting platform's function duration limit, gives each item independent progress and retry,
  and contains failure to the item that caused it.
- **One item may produce many files.** Splitting a multi-song document into separate songs is
  n8n's responsibility, not the client's. The client applies no boundary-detection heuristics.
  This is deliberate: guessing wrong on a real songsheet is worse than not guessing.

### Text extraction

- PDF and text extraction happens **in the browser**, before submission. Only extracted text
  crosses the network.
- Consequence: request bodies stay in the kilobytes regardless of source file size, so
  platform body-size limits are never a factor even for large PDFs.
- Consequence: the n8n webhook has exactly one input shape — text. Pasted and uploaded items
  are indistinguishable by the time they reach it.
- PDF parsing is lazy-loaded, so the cost is paid only by users who upload a PDF.
- A PDF with no text layer (scanned or photographed) extracts to an empty string. This is
  detected at queue time and reported as such. It is never submitted.
- Accepted types are `.pdf` and `.txt`. Anything else is rejected at selection time.

### API contract

Client to route handler, one call per item:

```
POST /api/format
{ text: string, sourceName: string }
```

Route handler to n8n: the same body, plus the shared secret as a header.

n8n response envelope:

```
{ files: [{ filename: string, content: string }] }
```

- The envelope is JSON rather than raw bytes because one item can yield several files, and a
  single HTTP body cannot carry several files without zipping or multipart — both of which
  would block the preview.
- `content` is the formatted lyrics as plain text. The client builds the downloadable `.txt`
  from it locally; no file bytes ever transit the network.
- The response is validated at the boundary. A malformed envelope produces an error naming
  the offending field, not a crash inside the UI.
- The request carries no formatting options. The transformation is fixed and owned entirely
  by the workflow, so changing it requires no client change.
- The contract is documented separately so the n8n workflow can be built against it.

### Failure handling

- Retries are **classified, not blanket**. Network errors and 5xx responses are retried once,
  silently. 4xx responses and validation failures are never retried — they will fail
  identically and a retry only wastes a formatting run.
- An item still failing after its automatic retry becomes an error row showing the message,
  with a manual retry that re-runs only that item.
- A failing item never affects its siblings. The batch completes around it.

### Access control

- A single shared access code, verified server-side and held in an httpOnly cookie.
- Chosen over per-user accounts because it stops drive-by abuse without introducing an auth
  provider or a database. It is weak against a leaked code, which is proportionate for an
  internal tool.

### State and persistence

- The current batch is held in `sessionStorage`: it survives a refresh or accidental
  navigation and clears when the tab closes.
- No database. Nothing is persisted server-side; the app is stateless between requests apart
  from the access cookie.

### Guardrails

All limits live in one config module so they can be tuned in a single edit once real n8n
throughput is known. Initial values: 20 items per batch, 10MB per file, ~50,000 characters
per item, 3 concurrent requests.

### Result handling

- Filenames returned by n8n are sanitised (path separators and control characters stripped)
  and de-duplicated across the batch with numeric suffixes, so no result silently overwrites
  another on download.
- Bulk download zips in the browser. Triggering many sequential downloads is unreliable —
  browsers prompt for permission and drop files past roughly ten — so a zip is the only
  approach that scales to the batch sizes this app is built for. The zip library is
  lazy-loaded on first use.

### Development without n8n

When the webhook URL is unconfigured, the route handler serves a mock formatter with a
realistic delay that sometimes fails and sometimes returns several files. Every UI state —
in-flight, partial failure, retry, multi-file results, zip download — is therefore reachable
before the workflow exists.

### Hosting

Deployed to Vercel. The route handler declares an explicit max duration, and the outbound
fetch has a timeout set below it, so a slow item fails with a legible message rather than a
dead connection. Values assume the Hobby plan's 60-second function limit.

## Testing Decisions

**What makes a good test here:** it exercises observable behaviour through a module's public
interface. A test that asserts how many times an internal helper was called, or reaches into
component internals, is testing implementation and will break on every refactor. Tests should
survive a rewrite of the code they cover.

**One seam.** The batch runner takes its submit function as a dependency:

```ts
runBatch(items, { submit, concurrency })
```

Injecting a fake `submit` makes the interesting behaviour testable with no network, no DOM,
and no timers beyond fake ones. This is the only seam introduced. Everything else worth
testing is a pure function that needs none.

**Modules under test:**

- **Batch runner** — respects the concurrency cap; results are independent; one failing item
  doesn't stop the others; retry re-runs only the item asked for.
- **Retry classification** — network errors and 5xx are eligible; 4xx and validation failures
  are not. This is a pure predicate and the most cost-sensitive rule in the app.
- **Response validation** — well-formed envelopes parse; each malformed shape produces an
  error naming the offending field.
- **Filename handling** — sanitisation strips dangerous characters; collisions across a batch
  resolve to distinct names.
- **Limit checks** — each guardrail rejects at its boundary and reports which limit was
  exceeded.

**Not tested:** React components, the route handler, and PDF extraction. The first two are
thin enough that tests would assert framework behaviour; the third is a wrapper around a
third-party parser whose real failure modes are actual PDFs, which a unit test can't
meaningfully supply.

**Prior art:** none — this is the repo's first test suite. Vitest, colocated `*.test.ts`
files, no component testing library.

## Out of Scope

- The n8n workflow itself, including all formatting logic and song-boundary splitting.
- Any output format other than plain text.
- Editing formatted results in the browser.
- `.docx`, `.md`, `.rtf`, and other input formats.
- OCR or any handling of scanned PDFs beyond detecting and reporting them.
- Per-user accounts, roles, or an audit trail.
- Server-side persistence, cross-device access, and shareable result links.
- Batch history beyond the current session.
- User-selectable formatting styles or presets.
- Client-side song-boundary detection.

## Further Notes

**The latency estimate is unverified.** Everything is sized on an expectation of 5–30 seconds
per formatting run, for a workflow that does not exist yet. If real calls land beyond the
platform's function limit, the operator sees a failure after the formatting run has already
been paid for. Mock mode cannot surface this — only the first real request can. The fallback
is a submit-and-poll model, which requires server-side job state and therefore a database.

**Song splitting is load-bearing on the n8n side.** The client is deliberately incapable of
detecting song boundaries. If the workflow returns one merged file where the operator expected
five, that is a workflow change, and the client has no way to detect the discrepancy or warn
about it.

**Next.js version.** This project uses a Next.js release with breaking changes relative to
widely-known conventions. Per `AGENTS.md`, the relevant guides under `node_modules/next/dist/docs/`
must be read before writing code in an unfamiliar area.
