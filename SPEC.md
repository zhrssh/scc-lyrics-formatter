# SCC Lyrics Formatter — Design Spec

> This spec covers the app's **visual and interaction design**. Its functional design — the
> item model, the n8n contract, guardrails, retry classification, persistence, and testing
> decisions — was settled in the v1 build and is unchanged. That spec is preserved at
> [`docs/archive/v1-build/SPEC.md`](docs/archive/v1-build/SPEC.md) and remains the reference
> for how the app *behaves*. See [Unchanged from v1](#unchanged-from-v1).

## Problem Statement

The app works. Every user story from the v1 build ships. But it looks like the scaffolding it
grew out of: default Geist type, zinc greys, no logo, no colour that means anything, and a
dark-mode branch nobody asked for and nobody designed.

That matters more here than it would for an internal tool, because the person using it is not
an operator in the abstract — it's a volunteer on the worship team, on a Saturday, preparing
Sunday's songs. They may open this three times a year. They may open it on a phone. The
current UI gives them nothing to recognise and no sense of where to start: three unlabelled
regions stacked vertically, a "Submit queue" button that sounds like a database operation, and
a "Clear batch" link in the top-right that silently destroys results if it's misclicked.

The church also has an identity — a logo and a palette — that the app does not use at all.

## Solution

A warm, light-only design system derived from the church's own logo palette, applied across
all three components, plus the lightest UX polish that makes the tool self-explanatory to
someone who isn't technical.

The direction is **warm sanctuary**: a cream canvas rather than clinical white, white cards
with soft shadows, a serif for headings, generous whitespace, and a single scarlet accent
carrying the primary action. Calm and welcoming rather than energetic — the logo sits on it
naturally, and long passages of lyrics stay comfortable to read.

The polish is deliberately narrow. The flow does not change: paste or drop, review the queue,
format, download. What changes is that the flow is now *numbered and named*, the queue tells
you plainly what state each song is in, the destructive action asks first, the primary action
is reachable on a phone, and every control can be reached and seen by keyboard.

**No application logic changes.** `lib/` and `app/api/` are untouched, and the existing test
suite must pass unmodified. If a test breaks, the redesign has overstepped.

## User Stories

1. As a volunteer, I want the church's logo and colours on the page, so that I can tell at a glance this tool belongs to my church and isn't something I've landed on by mistake.
2. As a volunteer, I want the page to show me numbered steps, so that I know where to start without being told.
3. As a volunteer, I want buttons labelled in plain language, so that I don't have to guess whether "Submit queue" is the thing that formats my songs.
4. As a volunteer, I want each song in the queue to say plainly whether it's waiting, being formatted, ready, or failed, so that I can read the state of a batch without decoding colours.
5. As a volunteer, I want to be asked before clearing everything, so that a misclick doesn't destroy results I waited minutes for.
6. As a volunteer, I want the empty queue to tell me what to do next, so that a blank page doesn't read as something being broken.
7. As a volunteer on a phone, I want the format and download actions reachable without scrolling to the bottom of a long queue, so that a batch of twenty songs doesn't bury the button I need.
8. As a volunteer using a keyboard, I want to see which control I'm on, so that I can work through the page without a mouse.
9. As a volunteer using a screen reader, I want to be told when the batch finishes and when a result is copied, so that I'm not waiting on a change I can't see.
10. As a volunteer, I want every label and message to be comfortably readable, so that low-contrast grey text isn't the reason I mis-set something.
11. As a volunteer, I want an error to look clearly like an error, so that I don't mistake a failure notice for the app's ordinary branding.
12. As a volunteer, I want formatted lyrics shown with their spacing and line breaks exactly as they'll be saved, so that the preview is worth trusting.
13. As the owner, I want the app to look the same for everyone, so that I'm not maintaining a second theme I never designed.

## Implementation Decisions

### Direction and typography

- **Warm sanctuary**, light only. A cream `#FDF8F5` canvas with white cards, not white-on-white.
- **Lora** for headings — a warm, calligraphic-rooted serif that reads as welcoming rather
  than corporate, without tipping into the formality of a hymnal face.
- **Geist Sans** is retained for all UI text. It's already loaded; adding a second body face
  would cost weight for no gain.
- **Geist Mono is retained for every piece of lyric text** — the paste box, extracted-text
  previews, and formatted results. This is not stylistic. The v1 spec requires previews to
  preserve formatting exactly, and a proportional face silently misrepresents alignment and
  indentation the operator is being asked to judge.

### The palette is not usable as supplied

The church palette is five warm tones and white: `#F6A07B` tangerine-dream, `#F07A50`
burnt-peach, `#E55E47` fiery-terracotta, `#D83B3C` scarlet-rush, `#FEFEFE` white. It contains
no neutral and no accessible text colour. Measured against the `#FDF8F5` canvas:

| Pair | Ratio | Verdict |
| --- | --- | --- |
| White on `#E55E47` fiery-terracotta | 3.49 | ✗ fails AA |
| White on `#F07A50` burnt-peach | 2.76 | ✗ fails |
| White on `#F6A07B` tangerine-dream | 2.05 | ✗ fails |
| White on `#D83B3C` scarlet-rush | **4.55** | ✓ AA |
| `#E55E47` as text on cream | 3.31 | ✗ small text; ✓ large/decorative only |

Consequences, and they are load-bearing:

- **`#D83B3C` scarlet-rush is the only supplied colour that can carry white text**, so it is
  the primary fill. Every labelled primary button is this colour.
- **The three lighter tones are decorative only.** They appear in the header's gradient
  hairline, drag-over tints, and badge washes. They are never a text colour, and never a
  button fill with a label on top of it.
- The ink scale is invented, not supplied — warm browns rather than neutral greys, so text
  doesn't read as cold against cream.

### Brand red and error red must not collide

The brand is red. The error state is also red. Left alone, a failure notice reads as
branding, and a branded button reads as a warning.

Errors are therefore given a deeper, browner maroon (`#8F2A1F`) that is visibly not the
brand scarlet, plus a left-border accent, so failure is distinguished by weight and shape and
not by hue alone. Success and in-progress states are pulled off the brand hue entirely —
green and amber — for the same reason.

Status is never communicated by colour alone. Every status pill carries its own text label.

### Design tokens

Defined once in `app/globals.css` as a Tailwind v4 `@theme` block. Measured ratios are
against the cream canvas.

```
Canvas       --color-canvas         #FDF8F5   warm cream page background
             --color-surface        #FFFFFF   cards
             --color-surface-sunken #FAF4F0   read-only panes, previews

Ink          --color-ink            #2E2724   body text          13.9:1 ✓
             --color-ink-muted      #6B5B54   secondary text      6.1:1 ✓
             --color-ink-subtle     #857069   meta / large only   4.4:1

Lines        --color-line           #EADFD8
             --color-line-strong    #DCC9BE

Brand        --color-brand          #D83B3C   primary fill, white text 4.55:1 ✓
             --color-brand-hover    #C43A2D   hover / pressed          5.26:1 ✓
             --color-brand-text     #B93326   brand-coloured TEXT      5.59:1 ✓
             --color-brand-accent   #E55E47   decorative fills only
             --color-brand-soft     #F07A50   decorative only
             --color-brand-pale     #F6A07B   decorative only
             --color-brand-tint     #FDEFEA   badge / hover wash

Semantics    --color-danger         #8F2A1F   + --color-danger-tint  #FBEDEA
             --color-success        #2F6B4F   + --color-success-tint #E9F2EC
             --color-waiting        #8A5A12   + --color-waiting-tint #FBF0DF
```

### Light only

The dark-mode branch is removed, not rewritten. It was inherited from the scaffold, never
designed, and applied as scattered `dark:` utilities with no dark palette behind them. A warm
dark theme is a genuine design problem — the cream, the tints, and the decorative tones all
need re-deriving — and maintaining two themes doubles the surface on which this small tool can
look wrong. `color-scheme: light` is declared so browsers stop auto-theming form controls.

### The logo asset needs work before it can be used

`app/scc.png` is 2048×2048, **RGB with an opaque white background**. Two measured facts
determine how it's handled:

- The mark's bounding box is `(460, 624) → (1588, 1524)` — it occupies only **55% of the
  width and 44% of the height**. Placed as-is at a 40px box, the visible mark is roughly
  20px, adrift in padding. It must be cropped to its bounding box before use.
- A flood fill from the image edges reaches **all 3,598,977 white pixels**, including the
  cross. The cross is an open knockout whose stem runs off the bottom of the figure, not an
  enclosed shape.

So converting white to transparent is safe and is what the mark intends: the cross renders in
whatever colour sits behind it, cream on the canvas and white on a card. Both read correctly.
The browser-tab icon is the exception — it keeps an **opaque** cream background, so the
knockout doesn't pick up dark browser chrome and lose the cross.

Two derived assets are generated from the source, which is left untouched:

- `public/scc-logo.png` — cropped, transparent, for in-page use.
- `app/icon.png` — cropped, squared on opaque cream, for the browser tab. The stock
  `app/favicon.ico` is deleted; leaving both would emit two competing `<link rel="icon">` tags.

### Framework notes

Per `AGENTS.md`, this Next.js release diverges from widely-known conventions. Relevant here:
`<Image>`'s `priority` prop is **deprecated in favour of `preload`** as of Next.js 16.

### Accessibility floor

- Every text pair meets WCAG AA — 4.5:1 for body text, 3:1 for large or decorative elements.
  `--color-ink-subtle` at 4.4:1 is for large text and non-essential meta only.
- One shared `:focus-visible` rule, so a visible focus ring can't be forgotten per component.
  The access-code input's current `outline-none` — which removes the ring with no replacement
  — is a real defect and is fixed.
- The paste box and the access-code input get real `<label>` elements. Placeholders are not
  labels; they vanish on the first keystroke.
- Tap targets are at least 44px. No horizontal scroll at 320px.
- Batch completion and copy confirmation are announced via `aria-live="polite"`.

## Unchanged from v1

Out of scope for this spec, and unchanged — see
[`docs/archive/v1-build/SPEC.md`](docs/archive/v1-build/SPEC.md):

- The item model: one input unit is one item, one item is one request, one item may produce
  many files.
- Browser-side PDF and text extraction, and the accepted-types rule.
- The n8n request/response contract, also documented at [`docs/n8n-contract.md`](docs/n8n-contract.md).
- Classified retry, per-item failure containment, and manual retry.
- The access-code gate and its httpOnly cookie.
- `sessionStorage` persistence and the `useSyncExternalStore` approach that makes hydration
  match. This is deliberate and documented in `CHANGELOG.md` — a mount-effect restore was
  tried first and rejected. It is not to be refactored.
- All guardrail limits and the single config module holding them.
- Filename sanitisation, de-duplication, and browser-side zipping.
- The mock formatter, and the test suite with the batch runner as its one seam.

## Out of Scope

- Dark mode, in any form.
- A component library or extracted design-system package. Three components do not justify one.
- Animation beyond simple colour and shadow transitions.
- Any change to `lib/`, `app/api/`, the n8n contract, or the config limits.
- New functional behaviour. Nothing in this spec adds a capability the app doesn't have.
- Redesigning the logo itself. The supplied mark is cropped and made transparent, never redrawn.
- A marketing or landing page. This is a tool, entered through the access gate.
- Component-level tests for the redesigned UI. The v1 spec's reasoning still holds — these
  components are thin, and tests would assert framework behaviour.

## Further Notes

**The palette constrains the design more than it appears to.** Four of the five supplied
colours can't carry text. If a future change wants a second labelled colour — a distinct
secondary button, say, or a coloured link — it needs a new value derived for contrast, not
another pick from the palette. The `--color-brand-text` token exists for exactly this reason.

**The knockout cross depends on its background.** The transparent logo is correct on cream and
on white. Placed on a busy or dark surface — a photo header, a coloured banner — the cross
fills with that surface and the mark stops reading. Any future use outside the two designed
surfaces needs the opaque variant instead.

**"Light UX polish" is a boundary, not a mood.** The flow, the state model, and the handlers
are untouched; the numbered steps describe the existing three regions rather than introducing
new ones. A restructure into genuine multi-step navigation was considered and deliberately not
taken — it would change what the components do, and the current single-page flow is right for
a batch you want to see all of at once.
