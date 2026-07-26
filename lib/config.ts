// Central home for every tunable limit. Tune throughput here once real
// n8n numbers are known — nowhere else should hardcode a threshold.

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  /** Maximum number of items allowed in a single batch. */
  maxItemsPerBatch: numberFromEnv("MAX_ITEMS_PER_BATCH", 20),
  /** Maximum size, in bytes, of a single uploaded file. */
  maxFileSizeBytes: numberFromEnv("MAX_FILE_SIZE_BYTES", 10 * 1024 * 1024),
  /** Maximum character count for a single item's text. */
  maxCharsPerItem: numberFromEnv("MAX_CHARS_PER_ITEM", 50_000),
  /** Number of requests to n8n allowed in flight at once. */
  requestConcurrency: numberFromEnv("REQUEST_CONCURRENCY", 3),
  /** Outbound fetch timeout to n8n, in milliseconds. */
  requestTimeoutMs: numberFromEnv("REQUEST_TIMEOUT_MS", 45_000),
  /** Route handler max duration, in seconds (Vercel Hobby plan limit is 60). */
  routeMaxDurationSeconds: numberFromEnv("ROUTE_MAX_DURATION_SECONDS", 55),
} as const;

export type Config = typeof config;
