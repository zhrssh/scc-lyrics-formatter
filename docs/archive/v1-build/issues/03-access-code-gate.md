# 03 — Access code gate

**What to build:** Closes the app to strangers. An operator visiting without a valid session is
shown a single access-code prompt; entering the correct code signs them in and keeps them signed
in across visits. Every formatting request is rejected without a valid session.

The route handler already hides the webhook URL, but the route handler itself is public — this
ticket is what actually stops someone who finds the URL from spending the owner's formatting
budget.

**Blocked by:** 02 — Paste one song, format it, preview and download

**Status:** ready-for-agent

- [ ] An operator without a valid session sees an access-code prompt instead of the app
- [ ] The code is verified server-side and compared against an environment variable; it is never sent to or held in client code
- [ ] A correct code establishes a session in an httpOnly cookie that survives a browser restart
- [ ] An incorrect code reports the failure without revealing whether a code is configured at all
- [ ] The format route handler rejects requests without a valid session, before contacting n8n
- [ ] A session expiring mid-batch surfaces as a clear "signed out" state rather than a generic item failure
