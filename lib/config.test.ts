import { describe, expect, it } from "vitest";
import { config } from "./config";

describe("config", () => {
  it("exposes the documented defaults", () => {
    expect(config.maxItemsPerBatch).toBe(20);
    expect(config.maxFileSizeBytes).toBe(10 * 1024 * 1024);
    expect(config.maxCharsPerItem).toBe(50_000);
    expect(config.requestConcurrency).toBe(3);
  });
});
