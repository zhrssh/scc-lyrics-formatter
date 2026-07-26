# 05 — Classified retry and per-item failure handling

**What to build:** Makes a failing item survivable. A transient blip is retried once and heals
invisibly. A genuine failure becomes an error row showing what went wrong, with a retry that
re-runs only that item. The rest of the batch always completes.

The retry rule is classified rather than blanket, and that distinction is the point: a 4xx or a
validation failure will fail identically on a second attempt, so retrying it only burns a second
formatting run for nothing.

**Blocked by:** 04 — Multi-item queue with capped concurrent submission

**Status:** ready-for-agent

- [ ] Network errors and 5xx responses are retried once, automatically, with no error shown unless the retry also fails
- [ ] 4xx responses and response-validation failures are never retried automatically
- [ ] An item that fails after its automatic retry renders as an error row showing the underlying message
- [ ] A failed row offers a manual retry that re-runs only that item and leaves every other item untouched
- [ ] A failing item never prevents its siblings from completing; the batch finishes around it
- [ ] The batch reports a summary when it settles, distinguishing succeeded from failed items
- [ ] Retry classification is a pure predicate covered by tests: 5xx and network errors are eligible, 4xx and validation failures are not
- [ ] Batch runner tests cover partial failure: given a mixed set of outcomes, successful items still produce results
