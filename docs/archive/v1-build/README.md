# v1 build — archived

The initial build of the SCC Lyrics Formatter: the spec it was built from, and the nine
tickets it was built through. Every ticket shipped; what each one delivered is recorded in
`CHANGELOG.md` at the repo root.

These files are kept because the v1 spec is still the authoritative record of the app's
*functional* design — the item model, the n8n request/response contract, retry
classification, guardrails, persistence, and the testing decisions. None of that changed
in the redesign that superseded it.

- **`SPEC.md`** — the v1 product spec. Still the reference for how the app behaves.
- **`issues/`** — tickets `01`–`09`, all complete.

The live spec is `SPEC.md` at the repo root, and live tickets are in `.issues/`. The
request/response contract also has its own standalone doc at `docs/n8n-contract.md`.
