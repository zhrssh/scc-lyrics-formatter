"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Logo } from "./Logo";

export function AccessGate() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const codeInputId = useId();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        setError("Incorrect access code.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm"
      >
        <div className="flex justify-center">
          <Logo size={56} />
        </div>

        <p className="mt-5 text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">
          Solace of Christ Church
        </p>
        <h1 className="mt-1 font-serif text-2xl text-ink">Lyrics Formatter</h1>
        <p className="mt-2 text-sm text-ink-muted">Enter the access code to continue.</p>

        <div className="mt-6 text-left">
          <label htmlFor={codeInputId} className="mb-1.5 block text-sm font-medium text-ink">
            Access code
          </label>
          <input
            id={codeInputId}
            type="password"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink transition-colors focus:border-brand"
          />
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger-tint px-3 py-2 text-left text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || code.length === 0}
          className="mt-5 h-11 w-full rounded-lg bg-brand text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
