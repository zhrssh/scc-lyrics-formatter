/**
 * Thrown by the client-side submit function so callers can classify failures
 * without inspecting fetch internals.
 */
export class FormatRequestError extends Error {
  kind: "network" | "http" | "validation" | "unauthenticated";
  status?: number;

  constructor(
    message: string,
    kind: "network" | "http" | "validation" | "unauthenticated",
    status?: number
  ) {
    super(message);
    this.name = "FormatRequestError";
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Pure predicate: network errors and 5xx responses are eligible for a single
 * automatic retry. 4xx responses and validation failures are not — they will
 * fail identically on a second attempt, so retrying only burns a formatting run.
 */
export function isRetryable(error: unknown): boolean {
  if (!(error instanceof FormatRequestError)) return false;
  if (error.kind === "network") return true;
  if (error.kind === "http") return (error.status ?? 0) >= 500;
  return false;
}

/**
 * Wraps a submit call with the classified-retry rule: retry once, silently,
 * only for network errors and 5xx responses.
 */
export async function submitWithClassifiedRetry<T>(submit: () => Promise<T>): Promise<T> {
  try {
    return await submit();
  } catch (error) {
    if (!isRetryable(error)) throw error;
    return await submit();
  }
}
