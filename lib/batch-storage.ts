import type { ItemResult, QueueItem } from "./types";

const STORAGE_KEY = "scc-lyrics-formatter:batch";

export interface PersistedBatchState {
  items: QueueItem[];
  results: Record<string, ItemResult>;
}

function isPersistedBatchState(value: unknown): value is PersistedBatchState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.items) && typeof candidate.results === "object" && candidate.results !== null;
}

/** Persists the current batch so a refresh doesn't discard work already paid for. */
export function saveBatchState(state: PersistedBatchState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Over quota, storage disabled, or private-browsing restrictions:
    // degrade to an unpersisted session rather than breaking the batch.
  }
}

/**
 * Restores a previously saved batch. Anything still mid-flight when the page
 * reloaded is surfaced as failed-and-retryable, never as permanently running.
 * Corrupt or outdated state is discarded silently.
 */
export function loadBatchState(): PersistedBatchState | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPersistedBatchState(parsed)) return null;

  const results: Record<string, ItemResult> = {};
  for (const [itemId, result] of Object.entries(parsed.results)) {
    if (result.status === "running" || result.status === "queued") {
      results[itemId] = {
        itemId,
        status: "error",
        error: "This item was interrupted by a page reload before it finished.",
      };
    } else {
      results[itemId] = result;
    }
  }

  return { items: parsed.items, results };
}

export function clearBatchState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
