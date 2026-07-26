"use client";

import { useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { QueueRow } from "./QueueRow";
import { Logo } from "./Logo";
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

function summaryText(succeeded: number, failed: number): string {
  const succeededText = `${succeeded} song${succeeded === 1 ? "" : "s"} formatted`;
  if (failed === 0) return `${succeededText}.`;
  return `${succeededText}, ${failed} song${failed === 1 ? "" : "s"} need${failed === 1 ? "s" : ""} another try.`;
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
  const pasteInputId = useId();

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

  function handleClearClick() {
    if (
      window.confirm("Clear the whole queue? This removes every song and any formatted results — this can't be undone.")
    ) {
      handleClear();
    }
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

  const hasItems = items.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-5">
          <Logo size={40} preload />
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">Solace of Christ Church</p>
            <h1 className="font-serif text-xl text-ink">Lyrics Formatter</h1>
          </div>
        </div>
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(to right, var(--color-brand-pale), var(--color-brand-soft), var(--color-brand-accent), var(--color-brand))",
          }}
        />
      </header>

      <main className={`mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 ${hasItems ? "pb-36" : ""}`}>
        {signedOut && (
          <div className="flex items-center justify-between gap-3 rounded-xl border-l-4 border-danger bg-danger-tint px-4 py-3 text-sm text-danger">
            <span>You&apos;ve been signed out.</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-9 shrink-0 rounded-lg bg-danger px-3 text-xs font-medium text-white"
            >
              Reload to sign in
            </button>
          </div>
        )}

        {notices.length > 0 && (
          <ul className="flex flex-col gap-2">
            {notices.map((notice, index) => (
              <li
                key={`${notice}-${index}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-waiting-tint px-4 py-3 text-sm text-waiting"
              >
                <span>{notice}</span>
                <button
                  type="button"
                  onClick={() => dismissNotice(index)}
                  aria-label={`Dismiss notice: ${notice}`}
                  className="shrink-0 text-xs font-medium underline decoration-dotted underline-offset-2"
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        )}

        <div aria-live="polite">
          {summary && (
            <p className="rounded-xl bg-surface-sunken px-4 py-3 text-sm text-ink">
              Batch finished: {summaryText(summary.succeeded, summary.failed)}
            </p>
          )}
        </div>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              1
            </span>
            <h2 className="font-serif text-lg text-ink">Add your lyrics</h2>
          </div>

          <label htmlFor={pasteInputId} className="mb-1.5 block text-sm font-medium text-ink">
            Paste lyrics
          </label>
          <textarea
            id={pasteInputId}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste lyrics here…"
            rows={6}
            className="w-full resize-y rounded-lg border border-line-strong bg-surface p-3 font-mono text-sm text-ink transition-colors focus:border-brand"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleAddPaste}
              disabled={pasteText.trim().length === 0}
              className="h-11 rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to queue
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-subtle">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <div
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
            className={`rounded-xl border-2 border-dashed p-6 text-center text-sm transition-colors ${
              isDragging ? "border-brand bg-brand-tint" : "border-line-strong"
            }`}
          >
            <p className="text-ink-muted">Drag .txt or .pdf files here, or</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 h-11 rounded-lg border border-line-strong px-4 text-sm text-ink hover:bg-surface-sunken"
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
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                2
              </span>
              <h2 className="font-serif text-lg text-ink">
                Queue — {items.length} song{items.length === 1 ? "" : "s"}
              </h2>
            </div>
            {hasItems && (
              <button
                type="button"
                onClick={handleClearClick}
                className="h-9 shrink-0 text-sm text-ink-muted underline decoration-dotted underline-offset-2 hover:text-ink"
              >
                Clear all
              </button>
            )}
          </div>

          {hasItems ? (
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
          ) : (
            <p className="rounded-xl bg-surface-sunken px-4 py-6 text-center text-sm text-ink-muted">
              Nothing queued yet. Paste a song or drop a file above to get started.
            </p>
          )}
        </section>
      </main>

      {hasItems && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 px-4 py-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || items.length === 0}
              className="min-h-11 shrink-0 whitespace-nowrap rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Formatting…" : "Format songs"}
            </button>
            <button
              type="button"
              onClick={() => void handleBulkDownload()}
              disabled={allResolvedFiles.length === 0}
              className="min-h-11 shrink-0 whitespace-nowrap rounded-lg border border-line-strong px-5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download all (.zip)
            </button>
          </div>
        </div>
      )}

      <footer className="px-4 py-6 text-center text-xs text-ink-subtle">Built by Zherish Galvin Mayordo</footer>
    </div>
  );
}
