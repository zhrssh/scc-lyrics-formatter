# 07 — Input guardrails

**What to build:** Stops an accidental folder-drop from becoming an expensive afternoon. Every
limit from the config module is enforced before submission, and exceeding one produces a message
naming which limit was hit and by how much — enough for the operator to fix the queue rather than
guess at it.

**Blocked by:** 06 — File upload with browser-side text extraction

**Status:** ready-for-agent

- [ ] A queue exceeding the maximum item count cannot be submitted, and reports the limit and the current count
- [ ] A file exceeding the maximum file size is rejected at selection time, naming the limit and the file's size
- [ ] An item whose text exceeds the maximum character count is rejected, naming the limit and the item's length
- [ ] Over-limit input is always rejected outright — never silently truncated
- [ ] Rejections identify the specific offending item or file, not just the batch
- [ ] Limits are read from the config module; no threshold is hardcoded at its point of use
- [ ] Limit checks are pure functions covered by tests, including exact-boundary cases
