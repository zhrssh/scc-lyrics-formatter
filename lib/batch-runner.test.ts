import { describe, expect, it, vi } from "vitest";
import { runBatch } from "./batch-runner";

interface Item {
  id: string;
  value: number;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("runBatch", () => {
  it("respects the concurrency cap", async () => {
    const items: Item[] = Array.from({ length: 6 }, (_, i) => ({ id: `${i}`, value: i }));
    let active = 0;
    let maxActive = 0;

    await runBatch(items, {
      concurrency: 2,
      submit: async (item) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await delay(10);
        active--;
        return item.value * 2;
      },
    });

    expect(maxActive).toBe(2);
  });

  it("attributes results to the right items regardless of finish order", async () => {
    const items: Item[] = [
      { id: "slow", value: 1 },
      { id: "fast", value: 2 },
    ];

    const outcomes = await runBatch(items, {
      concurrency: 2,
      submit: async (item) => {
        await delay(item.id === "slow" ? 30 : 5);
        return item.value * 10;
      },
    });

    expect(outcomes.find((o) => o.itemId === "slow")?.result).toBe(10);
    expect(outcomes.find((o) => o.itemId === "fast")?.result).toBe(20);
  });

  it("completes every item independently when one fails", async () => {
    const items: Item[] = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "c", value: 3 },
    ];

    const outcomes = await runBatch(items, {
      concurrency: 3,
      submit: async (item) => {
        if (item.id === "b") throw new Error("boom");
        return item.value;
      },
    });

    expect(outcomes.map((o) => o.status)).toEqual(["success", "error", "success"]);
    expect(outcomes[0].result).toBe(1);
    expect(outcomes[2].result).toBe(3);
    expect(outcomes[1].error).toBeInstanceOf(Error);
  });

  it("calls onSettle as each item finishes, not just at the end", async () => {
    const items: Item[] = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
    ];
    const settled: string[] = [];

    await runBatch(items, {
      concurrency: 2,
      submit: async (item) => {
        await delay(item.id === "a" ? 20 : 1);
        return item.value;
      },
      onSettle: (outcome) => settled.push(outcome.itemId),
    });

    expect(settled).toEqual(["b", "a"]);
  });

  it("re-runs only the item asked for on a manual retry", async () => {
    const submit = vi.fn(async (item: Item) => item.value);

    await runBatch([{ id: "a", value: 1 }], { concurrency: 3, submit });
    await runBatch([{ id: "b", value: 2 }], { concurrency: 3, submit });

    expect(submit).toHaveBeenCalledTimes(2);
    expect(submit).toHaveBeenNthCalledWith(1, { id: "a", value: 1 });
    expect(submit).toHaveBeenNthCalledWith(2, { id: "b", value: 2 });
  });
});
