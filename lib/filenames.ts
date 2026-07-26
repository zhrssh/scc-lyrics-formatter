/** Strips path separators and control characters; empty or missing names fall back. */
export function sanitizeFilename(rawName: string | undefined | null, fallback: string): string {
  const stripped = (rawName ?? "")
    .replace(/[/\\]/g, "")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
  return stripped.length > 0 ? stripped : fallback;
}

/** Makes clashing names unique across a batch with numeric suffixes: "song (1).txt". */
export function dedupeFilenames(names: string[]): string[] {
  const seenCounts = new Map<string, number>();
  return names.map((name) => {
    const count = seenCounts.get(name) ?? 0;
    seenCounts.set(name, count + 1);
    if (count === 0) return name;

    const dotIndex = name.lastIndexOf(".");
    const hasExtension = dotIndex > 0;
    const base = hasExtension ? name.slice(0, dotIndex) : name;
    const extension = hasExtension ? name.slice(dotIndex) : "";
    return `${base} (${count})${extension}`;
  });
}

/** Sanitises and de-duplicates every filename in a batch in one pass, in order. */
export function resolveBatchFilenames(rawNames: (string | undefined | null)[]): string[] {
  const sanitized = rawNames.map((name, index) => sanitizeFilename(name, `result-${index + 1}.txt`));
  return dedupeFilenames(sanitized);
}
