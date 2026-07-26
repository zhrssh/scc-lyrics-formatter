"use client";

import { useState } from "react";
import type { ItemResult, QueueItem } from "@/lib/types";

interface ResolvedFile {
  filename: string;
  content: string;
}

interface QueueRowProps {
  item: QueueItem;
  result: ItemResult | undefined;
  resolvedFiles: ResolvedFile[];
  onEditText: (text: string) => void;
  onRemove: () => void;
  onRetry: () => void;
  disabled: boolean;
}

function sourceLabel(item: QueueItem): string {
  return item.source.kind === "file" ? item.source.fileName : "Pasted";
}

type StatusTone = "waiting" | "success" | "danger";

const TONE_CLASSES: Record<StatusTone, string> = {
  waiting: "bg-waiting-tint text-waiting",
  success: "bg-success-tint text-success",
  danger: "bg-danger-tint text-danger",
};

function statusInfo(status: ItemResult["status"] | "idle"): { text: string; tone: StatusTone } {
  switch (status) {
    case "running":
      return { text: "Formatting…", tone: "waiting" };
    case "done":
      return { text: "Ready", tone: "success" };
    case "error":
      return { text: "Needs another try", tone: "danger" };
    case "queued":
    default:
      return { text: "Waiting", tone: "waiting" };
  }
}

async function downloadFile(file: ResolvedFile) {
  const blob = new Blob([file.content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function QueueRow({
  item,
  result,
  resolvedFiles,
  onEditText,
  onRemove,
  onRetry,
  disabled,
}: QueueRowProps) {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const isPaste = item.source.kind === "paste";
  const status = statusInfo(result?.status ?? "idle");

  async function handleCopy(file: ResolvedFile) {
    await navigator.clipboard.writeText(file.content);
    setCopiedFile(file.filename);
    setTimeout(() => setCopiedFile((current) => (current === file.filename ? null : current)), 1500);
  }

  return (
    <li className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-medium text-brand-text">
            {isPaste ? "Pasted block" : "File"}
          </span>
          <p className="mt-1.5 truncate text-sm font-medium text-ink">{sourceLabel(item)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[status.tone]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.text}
          </span>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove ${sourceLabel(item)} from the queue`}
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs text-ink-subtle hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>

      {item.blockedReason && (
        <p className="mt-2 rounded-lg bg-waiting-tint px-3 py-2 text-xs text-waiting">{item.blockedReason}</p>
      )}

      {isPaste ? (
        <textarea
          value={item.text}
          onChange={(e) => onEditText(e.target.value)}
          disabled={disabled}
          rows={4}
          aria-label="Edit pasted lyrics"
          className="mt-2 w-full resize-y rounded-lg border border-line-strong bg-surface p-2.5 font-mono text-xs text-ink transition-colors focus:border-brand disabled:opacity-60"
        />
      ) : (
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-sunken p-2.5 font-mono text-xs text-ink-muted">
          {item.text.length > 0 ? item.text : "(no text extracted)"}
        </pre>
      )}

      {result?.status === "error" && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border-l-4 border-danger bg-danger-tint px-3 py-2">
          <p className="text-xs text-danger">{result.error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg bg-brand px-3 text-xs font-medium text-white hover:bg-brand-hover"
          >
            Retry
          </button>
        </div>
      )}

      {resolvedFiles.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {resolvedFiles.map((file) => (
            <li key={file.filename} className="rounded-lg border border-line">
              <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
                <span className="truncate text-xs font-medium text-ink">{file.filename}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => handleCopy(file)}
                    aria-label={`Copy ${file.filename}`}
                    className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-xs text-ink-muted hover:text-ink"
                  >
                    {copiedFile === file.filename ? "Copied!" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadFile(file)}
                    aria-label={`Download ${file.filename}`}
                    className="inline-flex min-h-11 items-center rounded-lg px-2.5 text-xs text-ink-muted hover:text-ink"
                  >
                    Download
                  </button>
                </div>
              </div>
              <div aria-live="polite" className="sr-only">
                {copiedFile === file.filename ? `${file.filename} copied to clipboard.` : ""}
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs text-ink">
                {file.content}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
