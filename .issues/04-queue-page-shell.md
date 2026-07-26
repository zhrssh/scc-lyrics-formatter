# 04 — Queue page shell: header, stepped cards, empty state, action bar

**What to build:** The main screen's frame — a branded header, the three existing regions turned
into numbered and named cards, a friendly empty state, and the primary actions kept reachable on
a phone.

This is where the "self-explanatory to a volunteer" goal is actually delivered. The regions
already exist; this ticket names them, orders them visibly, and fixes the two interaction
problems worth fixing: a destructive "Clear batch" sitting unguarded in the header, and a primary
action that sinks below the fold once a queue gets long.

Row-level styling is ticket 05. This ticket stops at the container.

**Blocked by:** 01 — Design tokens and light-only theme, 02 — Brand assets and app identity

**Status:** ready-for-agent

- [ ] A header renders the church mark, the "Solace of Christ Church" eyebrow, and a serif page title
- [ ] A thin gradient hairline sits beneath the header, running through the three decorative palette tones into the brand scarlet — the only place those tones appear
- [ ] The paste box and the file drop zone are combined into one card titled "Add your lyrics", carrying a numbered badge, with an `— or —` divider between the two inputs
- [ ] The paste textarea has a real `<label>`, and keeps its monospace face
- [ ] The drop zone states the accepted file types in plain language, and shifts to the brand tint and a brand border while a file is dragged over it
- [ ] The queue is a second numbered card whose heading includes the current count, pluralised correctly
- [ ] "Clear batch" moves out of the page header into the queue card, worded as "Clear all" and styled as a quiet secondary action
- [ ] Clearing asks for confirmation before running, since it destroys formatted results that took minutes to produce
- [ ] The empty queue shows a friendly message inside the card explaining what to do next, not a bare "The queue is empty."
- [ ] The primary action reads "Format songs" rather than "Submit queue", and uses the brand fill with white text
- [ ] The bulk download reads "Download all (.zip)" and is styled as a secondary outline button
- [ ] Both actions stay reachable on a small screen once the queue is non-empty, rather than sitting below a long list
- [ ] The batch summary is wrapped in an `aria-live="polite"` region and worded in plain language
- [ ] Notices use the waiting tokens, and each dismiss control is a real button with an accessible name
- [ ] The signed-out banner uses the danger tokens with a left-border accent
- [ ] Every `dark:` utility is removed from the component
- [ ] All state, handlers, and effects are untouched — `handleSubmit`, `handleAddFiles`, `runItems`, the `useMemo` over results, and the `useSyncExternalStore` wiring are unchanged
- [ ] Adding, editing, removing, submitting, retrying, downloading, and refresh persistence all behave exactly as before

## Comments

The confirmation on clear is the one behavioural change in this ticket, and it is contained to the
component — a guard in the click handler, not a change to `setBatchState` or anything in `lib/`.
