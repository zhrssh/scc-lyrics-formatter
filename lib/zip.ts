export interface ZipEntry {
  filename: string;
  content: string;
}

/** Zips every result file in the browser. Lazy-loaded so it's downloaded only on first use. */
export async function createResultsZip(entries: ZipEntry[]): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const entry of entries) {
    zip.file(entry.filename, entry.content);
  }
  return zip.generateAsync({ type: "blob" });
}
