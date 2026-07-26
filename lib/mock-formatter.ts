/**
 * The local development path, not a stub to be replaced later. Serves a
 * realistic delay and occasionally fails or returns several files, so every
 * UI state is reachable before the n8n workflow exists.
 */
export class MockFormatterError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MockFormatterError";
    this.status = status;
  }
}

function randomDelayMs(): number {
  return 800 + Math.random() * 2200;
}

function formatMockLyrics(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function baseNameFor(sourceName: string): string {
  const withoutExtension = sourceName.replace(/\.[^./\\]+$/, "");
  return withoutExtension.trim() || "song";
}

export interface MockFormatFile {
  filename: string;
  content: string;
}

export async function mockFormat(
  text: string,
  sourceName: string
): Promise<{ files: MockFormatFile[] }> {
  await new Promise((resolve) => setTimeout(resolve, randomDelayMs()));

  if (Math.random() < 0.12) {
    if (Math.random() < 0.3) {
      throw new MockFormatterError(
        "Mock formatter rejected the input (simulated bad-input failure).",
        400
      );
    }
    throw new MockFormatterError(
      "Mock formatter hit a simulated transient failure.",
      500
    );
  }

  const base = baseNameFor(sourceName);
  const formatted = formatMockLyrics(text);

  if (Math.random() < 0.25) {
    return {
      files: [
        { filename: `${base} - Part 1.txt`, content: formatted },
        { filename: `${base} - Part 2.txt`, content: formatted },
      ],
    };
  }

  return { files: [{ filename: `${base}.txt`, content: formatted }] };
}
