# 06 — File upload with browser-side text extraction

**What to build:** The second input source. The operator adds `.txt` and `.pdf` files to the same
queue as pasted blocks — one item per file, mixable in a single batch. Text is extracted in the
browser before submission, so only text crosses the network and the n8n webhook keeps its single
input shape.

The operator sees the extracted text on each row before submitting, which is what makes a bad
extraction catchable rather than something discovered in the output.

**Blocked by:** 04 — Multi-item queue with capped concurrent submission

**Status:** ready-for-agent

- [ ] Files can be added by picker and by drag-and-drop, several at once, each becoming one queue item
- [ ] Uploaded file items sit in the same queue as pasted items and submit together in one batch
- [ ] `.txt` files are read as text; `.pdf` files have their text layer extracted in the browser
- [ ] PDF parsing is lazy-loaded, so no PDF-parsing code is downloaded by an operator who only pastes
- [ ] Each row shows the extracted text and identifies which file it came from
- [ ] A PDF yielding no text is flagged at queue time as a likely scanned document and is excluded from submission
- [ ] Unsupported file types are rejected at selection time with a message naming the supported types
- [ ] Raw file bytes are never sent to the server; requests carry extracted text only
