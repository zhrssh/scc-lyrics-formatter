import { FormatRequestError } from "./retry";
import type { FormatResultFile, QueueItem } from "./types";
import { ResponseValidationError, validateFormatResponse } from "./validate-response";

function sourceNameFor(item: QueueItem): string {
  return item.source.kind === "file" ? item.source.fileName : "pasted-lyrics.txt";
}

/** Calls the /api/format route for one item and returns its result files. */
export async function submitItem(item: QueueItem): Promise<FormatResultFile[]> {
  let response: Response;
  try {
    response = await fetch("/api/format", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: item.text, sourceName: sourceNameFor(item) }),
    });
  } catch {
    throw new FormatRequestError("Could not reach the server.", "network");
  }

  if (response.status === 401) {
    let message = "You've been signed out.";
    const body = await response.json().catch(() => null);
    if (typeof body?.error === "string") message = body.error;
    throw new FormatRequestError(message, "unauthenticated", 401);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    const body = await response.json().catch(() => null);
    if (typeof body?.error === "string") message = body.error;
    throw new FormatRequestError(message, "http", response.status);
  }

  const body = await response.json().catch(() => null);
  try {
    return validateFormatResponse(body).files;
  } catch (error) {
    const message =
      error instanceof ResponseValidationError ? error.message : "Received a malformed response.";
    throw new FormatRequestError(message, "validation");
  }
}
