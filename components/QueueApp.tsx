"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { QueueRow } from "./QueueRow";
import { config } from "@/lib/config";
import { runBatch } from "@/lib/batch-runner";
import { submitWithClassifiedRetry } from "@/lib/retry";
import { submitItem } from "@/lib/submit-item";
import { extractText, isAcceptedFile, unsupportedFileTypeMessage } from "@/lib/extract-text";
import { checkBatchSize, checkCharCount, checkFileSize } from "@/lib/limits";
import { resolveBatchFilenames } from "@/lib/filenames";
import { createResultsZip } from "@/lib/zip";
import { getServerSnapshot, getSnapshot, setBatchState, subscribe } from "@/lib/batch-store";
import type { ItemResult, QueueItem } from "@/lib/types";

interface ResolvedFile {
  filename: string;
  content: string;
}

function sourceLabelFor(item: QueueItem): string {
  return item.source.kind === "file" ? item.source.fileName : "Pasted block";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function QueueApp() {
  // Sourced from an external store (mirrored to sessionStorage) rather than
  // local state initialized from storage, so the first client render matches
  // the server's — both see the same empty snapshot — and hydration never mismatches.
  const { items, results } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [pasteText, setPasteText] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [summary, setSummary] = useState<{ succeeded: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { filesByItem, allResolvedFiles } = useMemo(() => {
    const entries: { itemId: string; filename: string; content: string }[] = [];
    for (const item of items) {
      const result = results[item.id];
      if (result?.status === "done" && result.files) {
        for (const file of result.files) {
          entries.push({ itemId: item.id, filename: file.filename, content: file.content });
        }
      }
    }
    const resolvedNames = resolveBatchFilenames(entries.map((e) => e.filename));
    const filesByItem: Record<string, ResolvedFile[]> = {};
    const allResolvedFiles: ResolvedFile[] = [];
    entries.forEach((entry, index) => {
      const resolved = { filename: resolvedNames[index], content: entry.content };
      allResolvedFiles.push(resolved);
      filesByItem[entry.itemId] = [...(filesByItem[entry.itemId] ?? []), resolved];
    });
    return { filesByItem, allResolvedFiles };
  }, [items, results]);

  function addNotice(message: string) {
    setNotices((prev) => [...prev, message]);
  }

  function dismissNotice(index: number) {
    setNotices((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddPaste() {
    if (pasteText.trim().length === 0) return;
    const id = crypto.randomUUID();
    setBatchState((prev) => ({
      ...prev,
      items: [...prev.items, { id, text: pasteText, source: { kind: "paste" } }],
    }));
    setPasteText("");
  }

  async function handleAddFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    for (const file of files) {
      if (!isAcceptedFile(file)) {
        addNotice(unsupportedFileTypeMessage(file.name));
        continue;
      }
      const sizeViolation = checkFileSize(file.size, config.maxFileSizeBytes, file.name);
      if (sizeViolation) {
        addNotice(sizeViolation.message);
        continue;
      }

      const id = crypto.randomUUID();
      setBatchState((prev) => ({
        ...prev,
        items: [
          ...prev.items,
          { id, text: "", source: { kind: "file", fileName: file.name }, blockedReason: "Extracting text…" },
        ],
      }));

      try {
        const text = await extractText(file);
        setBatchState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  text,
                  blockedReason:
                    text.trim().length === 0
                      ? "No readable text found — likely a scanned document. Excluded from submission."
                      : undefined,
                }
              : item
          ),
        }));
      } catch {
        setBatchState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === id ? { ...item, blockedReason: "Could not read this file." } : item
          ),
        }));
      }
    }
  }

  function handleEditText(id: string, text: string) {
    setBatchState((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, text } : item)),
    }));
  }

  function handleRemove(id: string) {
    setBatchState((prev) => {
      const nextResults = { ...prev.results };
      delete nextResults[id];
      return { items: prev.items.filter((item) => item.id !== id), results: nextResults };
    });
  }

  function handleClear() {
    setBatchState(() => ({ items: [], results: {} }));
    setNotices([]);
    setSummary(null);
    setSignedOut(false);
  }

  async function runItems(toRun: QueueItem[]) {
    setBatchState((prev) => {
      const next = { ...prev.results };
      for (const item of toRun) next[item.id] = { itemId: item.id, status: "running" };
      return { ...prev, results: next };
    });

    const outcomes = await runBatch(toRun, {
      concurrency: config.requestConcurrency,
      submit: (item) => submitWithClassifiedRetry(() => submitItem(item)),
      onSettle: (outcome) => {
        if (
          outcome.status === "error" &&
          outcome.error &&
          typeof outcome.error === "object" &&
          "kind" in outcome.error &&
          (outcome.error as { kind: string }).kind === "unauthenticated"
        ) {
          setSignedOut(true);
        }
        setBatchState((prev) => {
          const result: ItemResult =
            outcome.status === "success"
              ? { itemId: outcome.itemId, status: "done", files: outcome.result }
              : {
                  itemId: outcome.itemId,
                  status: "error",
                  error: outcome.error instanceof Error ? outcome.error.message : "Something went wrong.",
                };
          return { ...prev, results: { ...prev.results, [outcome.itemId]: result } };
        });
      },
    });

    return outcomes;
  }

  async function handleSubmit() {
    setSummary(null);
    setNotices([]);

    const batchViolation = checkBatchSize(items.length, config.maxItemsPerBatch);
    if (batchViolation) {
      addNotice(batchViolation.message);
      return;
    }

    const submittable = items.filter((item) => !item.blockedReason);
    const charViolations = submittable
      .map((item) => checkCharCount(item.text.length, config.maxCharsPerItem, sourceLabelFor(item)))
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (charViolations.length > 0) {
      setNotices(charViolations.map((v) => v.message));
      return;
    }

    if (submittable.length === 0) return;

    setIsSubmitting(true);
    try {
      const outcomes = await runItems(submittable);
      const succeeded = outcomes.filter((o) => o.status === "success").length;
      const failed = outcomes.filter((o) => o.status === "error").length;
      setSummary({ succeeded, failed });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRetry(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setSummary(null);
    await runItems([item]);
  }

  async function handleBulkDownload() {
    if (allResolvedFiles.length === 0) return;
    const blob = await createResultsZip(allResolvedFiles);
    downloadBlob(blob, "lyrics.zip");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">SCC Lyrics Formatter</h1>
        <button
          type="button"
          onClick={handleClear}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Clear batch
        </button>
      </div>

      {signedOut && (
        <div className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          <span>You&apos;ve been signed out.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Reload to sign in
          </button>
        </div>
      )}

      {notices.length > 0 && (
        <ul className="space-y-1">
          {notices.map((notice, index) => (
            <li
              key={`${notice}-${index}`}
              className="flex items-start justify-between gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
            >
              <span>{notice}</span>
              <button type="button" onClick={() => dismissNotice(index)} className="shrink-0 text-xs opacity-70">
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}

      {summary && (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
          Batch finished: {summary.succeeded} succeeded, {summary.failed} failed.
        </p>
      )}

      <section className="flex flex-col gap-2">
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste lyrics here…"
          rows={6}
          className="w-full resize-y rounded-md border border-black/10 bg-transparent p-3 font-mono text-sm dark:border-white/10"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAddPaste}
            disabled={pasteText.trim().length === 0}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add to queue
          </button>
        </div>
      </section>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleAddFiles(e.dataTransfer.files);
        }}
        className={`rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors ${
          isDragging ? "border-zinc-500 bg-zinc-50 dark:bg-zinc-900" : "border-black/15 dark:border-white/15"
        }`}
      >
        <p className="text-zinc-500">Drag .txt or .pdf files here, or</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-white/15 dark:hover:bg-zinc-900"
        >
          Browse files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </section>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <QueueRow
            key={item.id}
            item={item}
            result={results[item.id]}
            resolvedFiles={filesByItem[item.id] ?? []}
            onEditText={(text) => handleEditText(item.id, text)}
            onRemove={() => handleRemove(item.id)}
            onRetry={() => void handleRetry(item.id)}
            disabled={isSubmitting}
          />
        ))}
      </ul>

      {items.length === 0 && <p className="text-center text-sm text-zinc-400">The queue is empty.</p>}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || items.length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isSubmitting ? "Submitting…" : "Submit queue"}
        </button>
        <button
          type="button"
          onClick={() => void handleBulkDownload()}
          disabled={allResolvedFiles.length === 0}
          className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/15"
        >
          Download all as .zip
        </button>
      </div>
    </div>
  );
}
