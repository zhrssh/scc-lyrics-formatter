/**
 * The app's one seam: an injected submit function makes concurrency and
 * result aggregation testable with no network, no DOM, no real timers.
 */
export interface BatchOutcome<TResult> {
  itemId: string;
  status: "success" | "error";
  result?: TResult;
  error?: unknown;
}

export interface RunBatchOptions<TItem extends { id: string }, TResult> {
  submit: (item: TItem) => Promise<TResult>;
  concurrency: number;
  /** Called as each item settles, so the UI can render results before the whole batch finishes. */
  onSettle?: (outcome: BatchOutcome<TResult>) => void;
}

export async function runBatch<TItem extends { id: string }, TResult>(
  items: TItem[],
  { submit, concurrency, onSettle }: RunBatchOptions<TItem, TResult>
): Promise<BatchOutcome<TResult>[]> {
  const outcomes: BatchOutcome<TResult>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    for (;;) {
      const index = nextIndex++;
      if (index >= items.length) return;
      const item = items[index];
      let outcome: BatchOutcome<TResult>;
      try {
        const result = await submit(item);
        outcome = { itemId: item.id, status: "success", result };
      } catch (error) {
        outcome = { itemId: item.id, status: "error", error };
      }
      outcomes[index] = outcome;
      onSettle?.(outcome);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return outcomes;
}
