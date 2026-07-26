# 08 — Bulk zip download and filename collision handling

**What to build:** Makes saving a batch one action instead of twenty. Every result in the batch
downloads as a single zip, and clashing filenames are made unique first so no song silently
overwrites another.

Zipping rather than firing many downloads is a correctness matter, not a nicety: browsers prompt
for permission on multiple downloads and drop files past roughly ten, which is well inside the
batch sizes this app targets.

**Blocked by:** 04 — Multi-item queue with capped concurrent submission

**Status:** ready-for-agent

- [ ] A download-all action produces one zip containing every result file in the batch
- [ ] The zip library is lazy-loaded, downloaded only when bulk download is first used
- [ ] Filenames from n8n are sanitised: path separators and control characters are stripped
- [ ] Filenames clashing across the whole batch are made unique with numeric suffixes before zipping
- [ ] The same de-duplicated names are used for individual downloads, so single and bulk downloads agree
- [ ] A result with a missing or empty filename gets a sensible generated fallback
- [ ] Bulk download is unavailable when the batch has produced no results
- [ ] Sanitisation and collision resolution are pure functions covered by tests, including several items returning identical names
