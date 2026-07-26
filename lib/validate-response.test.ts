import { describe, expect, it } from "vitest";
import { ResponseValidationError, validateFormatResponse } from "./validate-response";

describe("validateFormatResponse", () => {
  it("parses a well-formed single-file envelope", () => {
    const result = validateFormatResponse({
      files: [{ filename: "song.txt", content: "line one\nline two" }],
    });
    expect(result.files).toEqual([{ filename: "song.txt", content: "line one\nline two" }]);
  });

  it("parses a well-formed multi-file envelope", () => {
    const result = validateFormatResponse({
      files: [
        { filename: "a.txt", content: "A" },
        { filename: "b.txt", content: "B" },
      ],
    });
    expect(result.files).toHaveLength(2);
  });

  it("allows an empty filename (handled later by filename resolution)", () => {
    const result = validateFormatResponse({
      files: [{ filename: "", content: "x" }],
    });
    expect(result.files[0].filename).toBe("");
  });

  it.each([
    ["null", null],
    ["a string", "not an object"],
    ["an array", []],
  ])("rejects a response that is %s", (_label, value) => {
    expect(() => validateFormatResponse(value)).toThrow(ResponseValidationError);
  });

  it("names the missing 'files' field", () => {
    expect(() => validateFormatResponse({})).toThrow(/files/);
  });

  it("rejects 'files' that isn't an array", () => {
    expect(() => validateFormatResponse({ files: "nope" })).toThrow(/'files' must be an array/);
  });

  it("rejects an empty 'files' array", () => {
    expect(() => validateFormatResponse({ files: [] })).toThrow(/at least one file/);
  });

  it("names a non-string filename at its index", () => {
    expect(() =>
      validateFormatResponse({ files: [{ filename: 123, content: "x" }] })
    ).toThrow(/files\[0\]\.filename/);
  });

  it("names a non-string content at its index", () => {
    expect(() =>
      validateFormatResponse({ files: [{ filename: "a.txt", content: null }] })
    ).toThrow(/files\[0\]\.content/);
  });

  it("names a non-object file entry at its index", () => {
    expect(() => validateFormatResponse({ files: ["nope"] })).toThrow(/files\[0\]/);
  });
});
