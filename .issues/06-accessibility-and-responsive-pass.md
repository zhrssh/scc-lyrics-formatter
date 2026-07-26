# 06 — Accessibility and responsive verification pass

**What to build:** No new UI. A verification sweep across the finished redesign, checking the
claims the earlier tickets make rather than trusting them, and fixing whatever fails.

Separated out because per-ticket checks catch per-component problems, and the ones that matter
here are cross-cutting: tab order across a whole page, contrast of a token used in three places,
a sticky bar overlapping content only at one width. Those are invisible until the pieces are
together.

**Blocked by:** 03 — Access gate restyle and input accessibility, 04 — Queue page shell: header,
stepped cards, empty state, action bar, 05 — Queue row restyle: status pills, error and result
treatments

**Status:** ready-for-agent

- [ ] Every body-text pair measures at least 4.5:1 against its actual background, checked in the browser rather than assumed from the token table
- [ ] Every large or decorative element measures at least 3:1
- [ ] `--color-ink-subtle` appears only on large text or non-essential meta, never on body copy
- [ ] Tabbing through the access gate reaches every control in a sensible order, each with a visible focus ring
- [ ] Tabbing through the queue page does the same, including controls inside queue rows and result files
- [ ] No interactive element is reachable only by mouse, and none is focusable but invisible
- [ ] Every icon-only control has an accessible name
- [ ] At 320px wide, no page scrolls horizontally — long filenames, long result lines, and the header all contained
- [ ] Wide content that cannot shrink scrolls within its own container rather than pushing the page
- [ ] Interactive elements meet a 44px minimum tap target on small screens
- [ ] The sticky action bar does not obscure the last queue row or any control at any width
- [ ] With the OS set to dark, the app renders light and fully legible — no inverted form controls, no leftover `dark:` utility anywhere in `components/` or `app/`
- [ ] `grep -r "dark:" app components` returns nothing
- [ ] Batch completion and copy confirmation are actually announced, verified with a screen reader or an accessibility inspector
- [ ] A full run against the mock formatter exercises every visual state: empty, waiting, formatting, ready, multi-file result, blocked item, item-level failure with retry, batch summary, notice, and signed-out banner
- [ ] `npm test` passes unmodified — no test file was edited during the redesign
- [ ] `npm run lint` and `npm run build` pass

## Comments

`npm test` passing without any test file having changed is the check that the redesign stayed in
its lane. The suite covers `lib/` only; if it needed editing, something moved that shouldn't have.
