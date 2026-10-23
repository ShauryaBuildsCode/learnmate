import { MAX_PAGES, MAX_PDF_BYTES } from "./split-text";

export { MAX_PAGES, MAX_PDF_BYTES };

/** Pages with fewer characters than this are treated as empty (typical of scanned images). */
export const MIN_PAGE_CHARS = 40;

export class IngestError extends Error {
  constructor(
    public readonly code:
      "too_large" | "too_many_pages" | "scanned" | "empty" | "bad_pdf" | "password" | "unreadable",
    message: string,
  ) {
    super(message);
    this.name = "IngestError";
  }
}

export function assertUploadSize(bytes: number): void {
  if (bytes > MAX_PDF_BYTES) {
    throw new IngestError(
      "too_large",
      `That PDF is ${(bytes / 1024 / 1024).toFixed(1)} MB. LearnMate accepts files up to ${MAX_PDF_BYTES / 1024 / 1024} MB.`,
    );
  }
}

export function assertPageCount(pages: number): void {
  if (pages > MAX_PAGES) {
    throw new IngestError(
      "too_many_pages",
      `That PDF has ${pages} pages. LearnMate accepts up to ${MAX_PAGES} pages. Try uploading a single chapter.`,
    );
  }
}
