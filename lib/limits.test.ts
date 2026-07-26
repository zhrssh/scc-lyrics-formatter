import { describe, expect, it } from "vitest";
import { checkBatchSize, checkCharCount, checkFileSize } from "./limits";

describe("checkBatchSize", () => {
  it("allows exactly the limit", () => {
    expect(checkBatchSize(20, 20)).toBeNull();
  });

  it("rejects one over the limit, naming the limit and the count", () => {
    const violation = checkBatchSize(21, 20);
    expect(violation?.limit).toBe("maxItemsPerBatch");
    expect(violation?.message).toContain("21");
    expect(violation?.message).toContain("20");
  });
});

describe("checkFileSize", () => {
  it("allows a file exactly at the limit", () => {
    expect(checkFileSize(1024, 1024, "song.pdf")).toBeNull();
  });

  it("rejects a file one byte over, naming the limit and the file", () => {
    const violation = checkFileSize(1025, 1024, "song.pdf");
    expect(violation?.limit).toBe("maxFileSizeBytes");
    expect(violation?.message).toContain("song.pdf");
    expect(violation?.message).toContain("1025");
    expect(violation?.message).toContain("1024");
  });
});

describe("checkCharCount", () => {
  it("allows text exactly at the limit", () => {
    expect(checkCharCount(50_000, 50_000, "Item 1")).toBeNull();
  });

  it("rejects text one character over, naming the limit and the item", () => {
    const violation = checkCharCount(50_001, 50_000, "Item 1");
    expect(violation?.limit).toBe("maxCharsPerItem");
    expect(violation?.message).toContain("Item 1");
    expect(violation?.message).toContain("50001");
    expect(violation?.message).toContain("50000");
  });
});
