# 01 — Project scaffolding, config module, and test harness

**What to build:** Prefactoring only — no user-visible behaviour. Clears the `create-next-app`
boilerplate out of the way and puts the two things every later ticket depends on in place: a
single config module holding every tunable limit, and a working test runner.

This is separated out because every subsequent slice needs both, and doing it inline would mean
the first slice carries setup noise unrelated to the behaviour it delivers.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Default Next.js boilerplate page and unused starter assets are removed; the app renders an empty shell that builds cleanly
- [ ] A single config module exports every tunable value: max items per batch (20), max file size (10MB), max characters per item (50,000), request concurrency (3), and request timeout
- [ ] Config values are read from environment variables where deployment-specific, with the documented defaults as fallbacks
- [ ] Vitest is installed and configured for TypeScript, with a `test` script in `package.json`
- [ ] A trivial passing test proves the harness runs
- [ ] `npm run lint` and `npm run build` both pass
