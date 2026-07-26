# 02 — Brand assets and app identity

**What to build:** The church mark, prepared for screen use and wired into a shared component,
plus the browser-tab icon and honest page metadata.

Separated from the components that display it because the source PNG is not usable as-is — it
needs cropping and a transparency pass — and because both the access gate (03) and the queue
header (04) render the same mark. Preparing it once, behind one component, stops the two from
sizing it differently.

**Blocked by:** 01 — Design tokens and light-only theme

**Status:** ready-for-agent

- [ ] `public/scc-logo.png` is generated from `app/scc.png`: cropped to the mark's bounding box `(460, 624) → (1588, 1524)` with roughly 5% padding, white converted to transparent, resized to 512px on its long edge
- [ ] `app/icon.png` is generated from the same crop, squared and padded on an **opaque** `#FDF8F5` background at 512×512, so the knockout cross does not pick up dark browser chrome
- [ ] `app/scc.png` is left in place, unmodified, as the source of both
- [ ] `app/favicon.ico` is deleted, so only one `<link rel="icon">` is emitted
- [ ] A `components/Logo.tsx` renders the mark through `next/image` with an explicit size prop, so the gate and the queue header cannot disagree on dimensions
- [ ] The logo carries meaningful alt text naming the church, and is marked decorative where it appears purely as ornament
- [ ] Where the logo is above the fold it uses `preload`, not the `priority` prop deprecated in Next.js 16
- [ ] The transparent logo renders correctly on both designed surfaces — the cream canvas and a white card — with the cross legible in each
- [ ] `metadata.description` in `app/layout.tsx` describes the app in plain language and names the church
- [ ] `metadata.title` remains accurate for the browser tab
- [ ] `npm run build` passes and the tab shows the church mark rather than the Next.js default

## Comments

The measurements above are not estimates. The mark occupies 55% of the source width and 44% of
its height, and a flood fill from the image edges reaches all 3,598,977 white pixels — the cross
is an open knockout, not an enclosed shape. See `SPEC.md`, "The logo asset needs work before it
can be used", for why that makes white→transparent the correct treatment for in-page use and the
wrong one for the tab icon.
