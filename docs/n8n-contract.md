# n8n webhook contract

This is the fixed target the n8n workflow is built against. The app's server
route handler (`app/api/format/route.ts`) is the only thing that ever calls
this webhook — the browser never contacts n8n directly, and the webhook URL
and secret are never sent to the client.

## Request: app → route handler

The browser calls the app's own route handler, one call per queue item:

```
POST /api/format
Content-Type: application/json

{ "text": string, "sourceName": string }
```

- `text` — the lyrics to format. Always plain text; PDF and file extraction
  happen in the browser before this call, so n8n never sees file bytes.
- `sourceName` — the pasted item's placeholder name or the uploaded file's
  name. Informational only; not currently used to control formatting.
- No formatting options are sent. The transformation is fixed and owned
  entirely by the n8n workflow.

## Request: route handler → n8n

The route handler forwards the same body to the configured webhook, with the
shared secret attached as a header:

```
POST <N8N_WEBHOOK_URL>
Content-Type: application/json
X-Webhook-Secret: <N8N_WEBHOOK_SECRET>

{ "text": string, "sourceName": string }
```

If `N8N_WEBHOOK_URL` is unset, the route handler serves a mock formatter
instead of calling out — see `lib/mock-formatter.ts`. This is the local
development path, not a temporary stub.

The route handler applies an outbound fetch timeout (`REQUEST_TIMEOUT_MS` in
`lib/config.ts`, default 45s) below its own `maxDuration` (55s), so a slow
workflow run fails with a legible timeout message rather than a dead
connection.

## Response: n8n → route handler → app

n8n must respond with this envelope:

```json
{
  "files": [
    { "filename": "string", "content": "string" }
  ]
}
```

- `files` — a non-empty array. One item can produce several files (e.g. a
  multi-song document); n8n owns all song-boundary splitting. The client
  applies no boundary-detection heuristics of its own.
- `filename` — a plain string. May be empty; the client sanitises, applies a
  fallback name, and de-duplicates across the batch before it's ever shown or
  downloaded, so n8n doesn't need to guarantee uniqueness.
- `content` — the formatted lyrics as plain text. The client builds the
  downloadable `.txt` from this locally; no file bytes transit the network in
  either direction.

### Validation

The response is validated at the boundary (`lib/validate-response.ts`) before
it reaches the UI. Any malformed shape — a non-object response, a missing or
non-array `files`, an empty `files` array, or a file entry with a non-string
`filename`/`content` — is rejected with an error naming the offending field,
never a crash inside the UI.

### Status codes

- `2xx` — response body is parsed and validated as above.
- `4xx` — treated as a non-retryable failure (bad input); the client never
  retries automatically.
- `5xx` or a network failure — treated as transient; the client retries once,
  automatically and silently, before surfacing an error.

## Example

Request:

```json
{ "text": "Amazing grace\nhow sweet the sound", "sourceName": "amazing-grace.txt" }
```

Response:

```json
{
  "files": [
    { "filename": "Amazing Grace.txt", "content": "Amazing grace\nHow sweet the sound" }
  ]
}
```
