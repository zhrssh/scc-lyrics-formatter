# 02 — Paste one song, format it, preview and download

**What to build:** The tracer bullet. An operator pastes lyrics into a box, submits, waits,
sees the formatted result rendered with its spacing intact, and downloads it as a `.txt` file.

This cuts the full path — UI, route handler, n8n contract, validation, preview, download — for
exactly one item. Everything afterwards widens this path rather than extending it.

Because the n8n workflow doesn't exist yet, the route handler serves a mock formatter when the
webhook URL is unconfigured. The mock is not a stub to be replaced later; it stays as the local
development path.

**Blocked by:** 01 — Project scaffolding, config module, and test harness

**Status:** ready-for-agent

- [ ] A single textarea accepts pasted lyrics, with a submit action disabled while the box is empty
- [ ] Submitting sends one request to a server route handler carrying the text and a source name
- [ ] The route handler reads the n8n webhook URL and shared secret from environment variables and never exposes either to the client
- [ ] The route handler forwards the request to n8n with the secret attached as a header
- [ ] When the webhook URL is unset, the route handler serves a mock formatter with a realistic delay instead of failing
- [ ] The n8n response is validated at the boundary; a malformed envelope produces an error naming the offending field rather than a crash
- [ ] The response envelope shape is `{ files: [{ filename, content }] }`, and a response containing several files renders all of them
- [ ] Each result renders in a monospace block preserving line breaks and leading whitespace exactly
- [ ] Each result has a download action producing a `.txt` file built in the browser, and a copy-to-clipboard action
- [ ] The route handler declares an explicit max duration, and the outbound fetch times out below it so a slow call fails with a legible message
- [ ] Response validation is covered by tests: well-formed envelopes parse, and each malformed shape reports its offending field
- [ ] `docs/n8n-contract.md` documents the exact request and response shapes, including the secret header, for the workflow to be built against
