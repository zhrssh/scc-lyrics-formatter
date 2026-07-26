# Issue tracker: Local Markdown

Issues for this repo live as markdown files in `.issues/`. They are committed to git, not
scratch files. The spec (you may know a spec as a PRD) is the single `SPEC.md` at the repo root.

## Conventions

- One flat directory — `.issues/`. There are no per-feature subdirectories.
- One file per ticket: `.issues/<NN>-<slug>.md`, numbered from `01` — never a single
  combined tickets file.
- The first line is `# NN — Title`, matching the filename's number and slug.
- Fields are bolded inline labels near the top, in this order:
  - `**What to build:**` — a short prose description of the behaviour delivered, and why
    this slice is separated out.
  - `**Blocked by:**` — `None — can start immediately.`, or a comma-separated list of
    ticket numbers with their titles. A ticket is unblocked when every ticket it lists is
    complete.
  - `**Status:**` — one of the role strings in `triage-labels.md`.
- The body is a checklist of acceptance criteria, one `- [ ]` per observable behaviour.
- Comments and conversation history append to the bottom of the file under a `## Comments`
  heading.

## When a skill says "publish to the issue tracker"

Create a new file in `.issues/`, numbered one higher than the highest existing ticket.

## When a skill says "fetch the relevant ticket"

Read the file in `.issues/`. The user will normally pass the ticket number or the path directly.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.issues/map.md` — the Notes / Decisions-so-far / Fog body.
- **Child ticket**: `.issues/NN-<slug>.md`, as above. A `**Type:**` line records the ticket
  type (`research`/`prototype`/`grilling`/`task`); the `**Status:**` line records
  `claimed`/`resolved`.
- **Blocking**: the existing `**Blocked by:**` line.
- **Frontier**: scan `.issues/` for tickets that are open, unblocked, and unclaimed; first
  by number wins.
- **Claim**: set `**Status:** claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `**Status:** resolved`,
  then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
