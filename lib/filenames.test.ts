import { describe, expect, it } from "vitest";
import { dedupeFilenames, resolveBatchFilenames, sanitizeFilename } from "./filenames";

describe("sanitizeFilename", () => {
  it("strips path separators", () => {
    expect(sanitizeFilename("../../etc/passwd", "fallback.txt")).toBe("....etcpasswd");
    expect(sanitizeFilename("some\\dir\\file.txt", "fallback.txt")).toBe("somedirfile.txt");
  });

  it("strips control characters", () => {
    expect(sanitizeFilename("song\x00.txt", "fallback.txt")).toBe("song.txt");
  });

  it("falls back on an empty name", () => {
    expect(sanitizeFilename("", "fallback.txt")).toBe("fallback.txt");
    expect(sanitizeFilename("   ", "fallback.txt")).toBe("fallback.txt");
  });

  it("falls back on a missing name", () => {
    expect(sanitizeFilename(undefined, "fallback.txt")).toBe("fallback.txt");
    expect(sanitizeFilename(null, "fallback.txt")).toBe("fallback.txt");
  });

  it("leaves an ordinary filename untouched", () => {
    expect(sanitizeFilename("Amazing Grace.txt", "fallback.txt")).toBe("Amazing Grace.txt");
  });
});

describe("dedupeFilenames", () => {
  it("leaves unique names untouched", () => {
    expect(dedupeFilenames(["a.txt", "b.txt"])).toEqual(["a.txt", "b.txt"]);
  });

  it("suffixes repeated names with an incrementing counter", () => {
    expect(dedupeFilenames(["song.txt", "song.txt", "song.txt"])).toEqual([
      "song.txt",
      "song (1).txt",
      "song (2).txt",
    ]);
  });

  it("preserves the extension when suffixing", () => {
    expect(dedupeFilenames(["a.txt", "a.txt"])).toEqual(["a.txt", "a (1).txt"]);
  });

  it("handles several items returning identical names, mixed with unique ones", () => {
    expect(dedupeFilenames(["x.txt", "dup.txt", "y.txt", "dup.txt", "dup.txt"])).toEqual([
      "x.txt",
      "dup.txt",
      "y.txt",
      "dup (1).txt",
      "dup (2).txt",
    ]);
  });

  it("suffixes names with no extension too", () => {
    expect(dedupeFilenames(["README", "README"])).toEqual(["README", "README (1)"]);
  });
});

describe("resolveBatchFilenames", () => {
  it("sanitises and de-duplicates in one pass", () => {
    expect(resolveBatchFilenames(["a/b.txt", "a/b.txt"])).toEqual(["ab.txt", "ab (1).txt"]);
  });

  it("gives missing or empty filenames a generated, index-based fallback", () => {
    expect(resolveBatchFilenames(["", undefined, null])).toEqual([
      "result-1.txt",
      "result-2.txt",
      "result-3.txt",
    ]);
  });

  it("de-duplicates fallback names against real ones", () => {
    expect(resolveBatchFilenames(["result-2.txt", ""])).toEqual(["result-2.txt", "result-2 (1).txt"]);
  });
});
