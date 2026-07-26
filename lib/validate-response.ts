import type { FormatResponse, FormatResultFile } from "./types";

/** Thrown with a message naming the specific offending field. */
export class ResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResponseValidationError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateFile(value: unknown, index: number): FormatResultFile {
  if (!isPlainObject(value)) {
    throw new ResponseValidationError(`files[${index}] must be an object`);
  }
  if (typeof value.filename !== "string") {
    throw new ResponseValidationError(`files[${index}].filename must be a string`);
  }
  if (typeof value.content !== "string") {
    throw new ResponseValidationError(`files[${index}].content must be a string`);
  }
  return { filename: value.filename, content: value.content };
}

/**
 * Validates the n8n response envelope: `{ files: [{ filename, content }] }`.
 * Throws ResponseValidationError naming the offending field on any malformed shape.
 */
export function validateFormatResponse(data: unknown): FormatResponse {
  if (!isPlainObject(data)) {
    throw new ResponseValidationError("response must be an object");
  }
  if (!("files" in data)) {
    throw new ResponseValidationError("response is missing 'files'");
  }
  if (!Array.isArray(data.files)) {
    throw new ResponseValidationError("'files' must be an array");
  }
  if (data.files.length === 0) {
    throw new ResponseValidationError("'files' must contain at least one file");
  }
  return { files: data.files.map(validateFile) };
}
