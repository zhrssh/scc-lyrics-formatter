# 03 — Access gate restyle and input accessibility

**What to build:** The first screen anyone sees, rebuilt on the new tokens — church mark, church
name, serif title, and a code field that is properly labelled and shows focus.

Separated as its own slice because it's the smallest complete surface in the app and shares no
markup with the queue. It also carries a real defect worth fixing on its own: the code input sets
`outline-none` with nothing in its place, so a keyboard user has no idea where they are.

**Blocked by:** 01 — Design tokens and light-only theme, 02 — Brand assets and app identity

**Status:** ready-for-agent

- [ ] The gate renders a centred white card on the cream canvas, using the surface, line, and ink tokens
- [ ] The church mark appears above the heading, rendered through the shared `Logo` component
- [ ] An eyebrow line reads "Solace of Christ Church" in tracked, muted small caps above a serif `<h1>` naming the tool
- [ ] The access-code input has a real `<label>`, not a placeholder standing in for one
- [ ] `outline-none` is removed from the input; focus is visible via the global `:focus-visible` rule, and the border shifts to a brand tone on focus
- [ ] The submit button uses the brand fill with white text, and darkens to the hover token on hover and press
- [ ] The submit button is at least 44px tall and spans the card width
- [ ] The error message uses the danger and danger-tint tokens — visibly not the brand scarlet — and carries `role="alert"` so it is announced
- [ ] The disabled and submitting states remain distinguishable from the enabled state without relying on colour alone
- [ ] Every `dark:` utility is removed from the component
- [ ] Entering a wrong code still shows the error, and a correct code still refreshes into the queue — behaviour is unchanged
- [ ] The whole form is operable by keyboard alone, with a visible focus indicator at each stop

## Comments

Only markup and classes change here. `handleSubmit`, the `/api/auth` call, and the router refresh
are untouched.
