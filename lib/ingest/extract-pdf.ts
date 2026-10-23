import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { assertPageCount, assertUploadSize, IngestError, MIN_PAGE_CHARS } from "./limits";

export interface ExtractedPdf {
  pages: string[];
  /** 1-based numbers of pages with almost no extractable text. */
  emptyPages: number[];
  warnings: string[];
}

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjs: PdfJs | undefined;

async function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const workerPath = createRequire(import.meta.url).resolve(
      "pdfjs-dist/legacy/build/pdf.worker.mjs",
    );
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  }
  return pdfjs;
}

/**
 * Extracts text page by page. Enforces the 10 MB / 20 page limits and detects scanned PDFs:
 * if at least half the pages have no text layer the upload is rejected with an explanation.
 */
export async function extractPdf(data: Uint8Array): Promise<ExtractedPdf> {
  assertUploadSize(data.byteLength);
  const lib = await loadPdfJs();
  const task = lib.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: true,
    verbosity: 0,
  });
  const pages: string[] = [];
  try {
    let doc;
    try {
      doc = await task.promise;
    } catch {
      throw new IngestError(
        "bad_pdf",
        "That file couldn't be read as a PDF. Is it corrupted or password protected?",
      );
    }
    assertPageCount(doc.numPages);
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
      }
      pages.push(
        text
          .replace(/[ \t]+\n/g, "\n")
          .replace(/[ \t]{2,}/g, " ")
          .trim(),
      );
    }
  } finally {
    await task.destroy();
  }

  const emptyPages = pages.flatMap((t, i) => (t.length < MIN_PAGE_CHARS ? [i + 1] : []));
  if (emptyPages.length === pages.length || emptyPages.length / pages.length >= 0.5) {
    throw new IngestError(
      "scanned",
      "This PDF looks like scanned images: most pages have no selectable text. Please upload a text-based PDF, or paste the text instead.",
    );
  }
  const warnings = emptyPages.length
    ? [
        `Page${emptyPages.length > 1 ? "s" : ""} ${emptyPages.join(", ")} had almost no readable text and may be images.`,
      ]
    : [];
  return { pages, emptyPages, warnings };
}
