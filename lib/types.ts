export interface FormatResultFile {
  filename: string;
  content: string;
}

export interface FormatResponse {
  files: FormatResultFile[];
}

export type ItemSource =
  | { kind: "paste" }
  | { kind: "file"; fileName: string };

export interface QueueItem {
  id: string;
  text: string;
  source: ItemSource;
  /** Set when a PDF/file item can't be submitted (empty extraction, over a limit). */
  blockedReason?: string;
}

export type ItemStatus = "queued" | "running" | "done" | "error";

export interface ItemResult {
  itemId: string;
  status: ItemStatus;
  files?: FormatResultFile[];
  error?: string;
}
