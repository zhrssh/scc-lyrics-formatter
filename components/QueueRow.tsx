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

function statusLabel(status: ItemResult["status"] | "idle"): { text: string; className: string } {
  switch (status) {
    case "running":
      return { text: "Running…", className: "text-amber-600 dark:text-amber-400" };
    case "done":
      return { text: "Done", className: "text-green-600 dark:text-green-400" };
    case "error":
      return { text: "Failed", className: "text-red-600 dark:text-red-400" };
    case "queued":
      return { text: "Queued", className: "text-zinc-500" };
    default:
      return { text: "Not submitted", className: "text-zinc-400" };
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
  const status = statusLabel(result?.status ?? "idle");

  async function handleCopy(file: ResolvedFile) {
    await navigator.clipboard.writeText(file.content);
    setCopiedFile(file.filename);
    setTimeout(() => setCopiedFile((current) => (current === file.filename ? null : current)), 1500);
  }

  return (
    <li className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {isPaste ? "Pasted block" : "File"}
          </span>
          <p className="mt-1 truncate text-sm font-medium">{sourceLabel(item)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`text-xs font-medium ${status.className}`}>{status.text}</span>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="text-xs text-zinc-400 hover:text-red-600 disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </div>

      {item.blockedReason && (
        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          {item.blockedReason}
        </p>
      )}

      {isPaste ? (
        <textarea
          value={item.text}
          onChange={(e) => onEditText(e.target.value)}
          disabled={disabled}
          rows={4}
          className="mt-2 w-full resize-y rounded-md border border-black/10 bg-transparent p-2 font-mono text-xs disabled:opacity-60 dark:border-white/10"
        />
      ) : (
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-2 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          {item.text.length > 0 ? item.text : "(no text extracted)"}
        </pre>
      )}

      {result?.status === "error" && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded bg-red-50 px-2 py-1.5 dark:bg-red-950/40">
          <p className="text-xs text-red-700 dark:text-red-400">{result.error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {resolvedFiles.length > 0 && (
        <ul className="mt-3 space-y-2">
          {resolvedFiles.map((file) => (
            <li key={file.filename} className="rounded-md border border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between gap-2 border-b border-black/10 px-2 py-1 dark:border-white/10">
                <span className="truncate text-xs font-medium">{file.filename}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(file)}
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {copiedFile === file.filename ? "Copied!" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadFile(file)}
                    className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Download
                  </button>
                </div>
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap p-2 font-mono text-xs">
                {file.content}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
