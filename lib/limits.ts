export interface LimitViolation {
  limit: "maxItemsPerBatch" | "maxFileSizeBytes" | "maxCharsPerItem";
  message: string;
}

/** Rejects a batch outright at the boundary; never truncates. */
export function checkBatchSize(itemCount: number, max: number): LimitViolation | null {
  if (itemCount <= max) return null;
  return {
    limit: "maxItemsPerBatch",
    message: `The batch has ${itemCount} items, which exceeds the limit of ${max}.`,
  };
}

export function checkFileSize(fileSizeBytes: number, max: number, fileName: string): LimitViolation | null {
  if (fileSizeBytes <= max) return null;
  return {
    limit: "maxFileSizeBytes",
    message: `"${fileName}" is ${fileSizeBytes} bytes, which exceeds the limit of ${max} bytes.`,
  };
}

export function checkCharCount(charCount: number, max: number, itemLabel: string): LimitViolation | null {
  if (charCount <= max) return null;
  return {
    limit: "maxCharsPerItem",
    message: `"${itemLabel}" is ${charCount} characters, which exceeds the limit of ${max} characters.`,
  };
}
