import { describe, expect, it, vi } from "vitest";
import { FormatRequestError, isRetryable, submitWithClassifiedRetry } from "./retry";

describe("isRetryable", () => {
  it("is eligible for a network error", () => {
    expect(isRetryable(new FormatRequestError("offline", "network"))).toBe(true);
  });

  it("is eligible for every 5xx status", () => {
    expect(isRetryable(new FormatRequestError("boom", "http", 500))).toBe(true);
    expect(isRetryable(new FormatRequestError("boom", "http", 503))).toBe(true);
    expect(isRetryable(new FormatRequestError("boom", "http", 599))).toBe(true);
  });

  it("is not eligible for any 4xx status", () => {
    expect(isRetryable(new FormatRequestError("bad", "http", 400))).toBe(false);
    expect(isRetryable(new FormatRequestError("bad", "http", 404))).toBe(false);
    expect(isRetryable(new FormatRequestError("bad", "http", 429))).toBe(false);
  });

  it("is not eligible for a validation failure", () => {
    expect(isRetryable(new FormatRequestError("malformed", "validation"))).toBe(false);
  });

  it("is not eligible for an unauthenticated failure", () => {
    expect(isRetryable(new FormatRequestError("signed out", "unauthenticated", 401))).toBe(false);
  });

  it("is not eligible for a plain, non-classified error", () => {
    expect(isRetryable(new Error("generic"))).toBe(false);
  });
});

describe("submitWithClassifiedRetry", () => {
  it("retries once, silently, on a network error, and returns the retry's result", async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new FormatRequestError("offline", "network"))
      .mockResolvedValueOnce("ok");

    await expect(submitWithClassifiedRetry(submit)).resolves.toBe("ok");
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("retries once on a 5xx and surfaces the second failure if it also fails", async () => {
    const secondError = new FormatRequestError("still down", "http", 502);
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new FormatRequestError("down", "http", 500))
      .mockRejectedValueOnce(secondError);

    await expect(submitWithClassifiedRetry(submit)).rejects.toBe(secondError);
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it("never retries a 4xx", async () => {
    const error = new FormatRequestError("bad input", "http", 400);
    const submit = vi.fn().mockRejectedValueOnce(error);

    await expect(submitWithClassifiedRetry(submit)).rejects.toBe(error);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("never retries a validation failure", async () => {
    const error = new FormatRequestError("malformed", "validation");
    const submit = vi.fn().mockRejectedValueOnce(error);

    await expect(submitWithClassifiedRetry(submit)).rejects.toBe(error);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
