export const ACCEPTED_EXTENSIONS = [".txt", ".pdf"] as const;

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function unsupportedFileTypeMessage(fileName: string): string {
  return `"${fileName}" isn't a supported file type. Only ${ACCEPTED_EXTENSIONS.join(" and ")} files are accepted.`;
}

async function extractPdfText(file: File): Promise<string> {
  // Lazy-loaded so an operator who only pastes never downloads the parser.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n").trim();
}

/** Extracts text from a .txt or .pdf File entirely in the browser. */
export async function extractText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    return extractPdfText(file);
  }
  return file.text();
}
