# 09 — Batch survives a page refresh

**What to build:** Stops an accidental reload from discarding work already paid for. The current
batch — queue items, results, and per-item error states — is restored when the page reloads, and
clears when the tab closes.

A batch of ten items is several minutes of waiting and real formatting spend. Losing that to a
stray refresh means paying for it twice.

**Blocked by:** 05 — Classified retry and per-item failure handling

**Status:** ready-for-agent

- [ ] Queue items, their results, and their error states are restored after a page refresh
- [ ] Restored failed items can still be retried individually
- [ ] State is scoped to the tab: closing it discards the batch, and a new tab starts clean
- [ ] An item still running when the page reloads is restored as failed-and-retryable, not as permanently in-flight
- [ ] Clearing the batch removes the stored state as well as the in-memory state
- [ ] Corrupt or outdated stored state is discarded silently and the app starts clean rather than crashing on load
- [ ] Exceeding the browser's storage quota degrades to an unpersisted session rather than breaking the batch
