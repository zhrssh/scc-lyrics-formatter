import type { ItemResult, QueueItem } from "./types";
import { clearBatchState, loadBatchState, saveBatchState } from "./batch-storage";

export interface BatchState {
  items: QueueItem[];
  results: Record<string, ItemResult>;
}

const EMPTY_STATE: BatchState = { items: [], results: {} };

/**
 * sessionStorage is the actual source of truth for the batch; this module is
 * a small external store over it so React can read it via
 * useSyncExternalStore. That's what lets the first client render match the
 * server's (both see the empty snapshot) — reading sessionStorage inside a
 * mount effect instead would set state after hydration and mismatch it.
 */
let state: BatchState = EMPTY_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (state.items.length === 0 && Object.keys(state.results).length === 0) {
    clearBatchState();
  } else {
    saveBatchState(state);
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): BatchState {
  if (!hydrated) {
    state = loadBatchState() ?? EMPTY_STATE;
    hydrated = true;
  }
  return state;
}

export function getServerSnapshot(): BatchState {
  return EMPTY_STATE;
}

export function setBatchState(updater: (prev: BatchState) => BatchState): void {
  state = updater(state);
  persist();
  for (const listener of listeners) listener();
}
