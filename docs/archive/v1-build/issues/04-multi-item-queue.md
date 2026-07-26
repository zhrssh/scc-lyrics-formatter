# 04 — Multi-item queue with capped concurrent submission

**What to build:** Widens the tracer bullet from one song to many. The operator builds a queue of
pasted blocks, sees each as its own row, removes or edits rows before submitting, and submits the
whole queue at once. Items are sent to n8n independently with a concurrency cap, so each row shows
its own progress and finished items reveal their results while others are still running.

This introduces the app's central seam: the batch runner takes its submit function as a dependency,
making concurrency and result aggregation testable without a network.

**Blocked by:** 02 — Paste one song, format it, preview and download

**Status:** ready-for-agent

- [ ] An operator can add several pasted blocks to a queue, each appearing as its own removable row
- [ ] A queued pasted block can be edited in place before submitting
- [ ] Submitting runs the whole queue, sending one request per item
- [ ] No more than the configured number of requests are in flight at once
- [ ] Each row shows its own status: queued, running, or complete
- [ ] An item that finishes early shows its results immediately, without waiting for the rest of the batch
- [ ] An item producing several files renders all of them under that item
- [ ] The batch runner accepts its submit function as an injected dependency
- [ ] Batch runner tests cover: the concurrency cap is respected, results are attributed to the right items, and every item completes independently
- [ ] A clear action empties the queue and its results, returning the app to its initial state
