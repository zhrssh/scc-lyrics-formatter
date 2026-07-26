# 05 — Queue row restyle: status pills, error and result treatments

**What to build:** The per-song row on the new tokens — a legible status pill, a source badge, a
sunken preview surface, an error block that doesn't read as branding, and result files with
properly named controls.

Separated from the page shell because the row is self-contained and depends only on tokens, so it
can be built in parallel with 04. It also carries the design decision with the most user impact:
today's status is bare coloured text in four hues, three of which sit close to the brand red.

**Blocked by:** 01 — Design tokens and light-only theme

**Status:** ready-for-agent

- [ ] The row is a white card on the line token with a soft shadow and the shared card radius
- [ ] Status renders as a tinted pill with a dot, not bare coloured text
- [ ] Status wording is plain: waiting, formatting, ready, and a failure state worded as something a volunteer would say rather than "Failed"
- [ ] Every status pill carries its text label, so no state is distinguished by colour alone
- [ ] The running, done, and error states use the waiting, success, and danger token pairs respectively — none of them the brand scarlet
- [ ] The source badge ("Pasted block" / "File") sits on the brand tint using the brand text token
- [ ] The editable paste textarea and the read-only extracted-text preview both keep their monospace face, since the preview must represent the formatting exactly
- [ ] The read-only extracted-text preview sits on the sunken surface token
- [ ] The blocked-reason notice uses the waiting tokens
- [ ] The error block uses the danger tint with a left-border accent in the danger tone, so failure is signalled by shape as well as hue
- [ ] The retry button uses the brand fill with white text
- [ ] Result files render on a bordered card with a header strip carrying the filename and its controls
- [ ] Copy and Download are buttons with accessible names that identify which file they act on
- [ ] The "Copied!" confirmation is announced via an `aria-live` region rather than only appearing visually
- [ ] The formatted result preview keeps its monospace face and preserves whitespace exactly
- [ ] Remove is reachable by keyboard with a visible focus ring, and its disabled state is legible
- [ ] Every `dark:` utility is removed from the component
- [ ] Every interactive element has a tap target of at least 44px on small screens
- [ ] Editing, removing, retrying, copying, and downloading all behave exactly as before — only markup and classes change

## Comments

Status labels are user-facing copy, not identifiers. The `ItemStatus` union in `lib/types.ts`
(`queued` / `running` / `done` / `error`) stays exactly as it is; only the strings rendered from
`statusLabel` change.
