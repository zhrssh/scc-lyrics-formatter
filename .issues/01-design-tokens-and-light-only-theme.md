# 01 — Design tokens and light-only theme

**What to build:** The foundation every other redesign ticket consumes — one `@theme` block in
`app/globals.css` holding the full token set, the Lora heading face wired up, and the inherited
dark-mode branch removed.

This is separated out because tokens are the shared vocabulary of tickets 02–05. Doing it inline
would mean whichever component was styled first invented the palette, and the rest inherited
whatever it happened to pick. Nothing user-visible changes beyond the page turning cream —
components still carry their old greys until their own tickets land.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `app/globals.css` defines every token from the spec's token table in a Tailwind v4 `@theme` block: canvas, surface, surface-sunken; the ink scale; line and line-strong; the full brand ramp; and the danger, success, and waiting pairs
- [ ] Each token generates working utilities — `bg-canvas`, `text-ink-muted`, `border-line` and friends resolve rather than falling through to Tailwind defaults
- [ ] The `@media (prefers-color-scheme: dark)` block is deleted
- [ ] The inert SCSS `$variable` dump (the `$tangerine-dream` block and the gradient list) is deleted — it is not valid CSS and does nothing today
- [ ] `npm run build` reports zero CSS warnings, down from the 24 the SCSS dump currently produces
- [ ] `:root` declares `color-scheme: light`, so browsers stop auto-theming form controls under a dark OS setting
- [ ] A single global `:focus-visible` rule draws a 2px brand outline with 2px offset, so no component has to remember its own focus ring
- [ ] `body` uses the canvas and ink tokens rather than the old `--background` / `--foreground` pair, and those two legacy variables are gone
- [ ] `Lora` is loaded in `app/layout.tsx` via `next/font/google` as `--font-lora`, with the latin subset, and its variable is applied to `<html>` alongside the existing Geist variables
- [ ] `--font-serif` maps to `var(--font-lora)` in `@theme inline`, so `font-serif` is available as a utility
- [ ] Geist Sans and Geist Mono remain loaded and mapped; no existing font wiring is removed
- [ ] `npm run lint` and `npm run build` pass, and `npm test` is unaffected

## Comments

Token values, including the measured contrast ratio behind each one, are in `SPEC.md` under
"Design tokens". They are not free parameters — four of the five supplied brand colours fail
AA against the canvas, which is why the ramp splits fill, hover, and text into separate tokens.

The SCSS dump is not merely untidy: `npm run build` currently emits **24 CSS warnings**
("Unexpected token Semicolon") from it. Deleting the block is what clears them, and a clean
build is the check that it's fully gone.
