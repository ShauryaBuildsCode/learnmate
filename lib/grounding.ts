/** Verifies that quotes and page citations produced by a model really exist in the stored pages. */

export const BEYOND_PREFIX = "Beyond your uploaded material:";

export type PageMap = ReadonlyMap<number, string>;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[`*_#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): string[] {
  return normalize(text)
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function lcsLength(a: string[], b: string[]): number {
  const row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(row[j], row[j - 1]);
      prev = tmp;
    }
  }
  return row[b.length];
}

/** True when `quote` appears on the page: normalised substring, or at least 90% of its words in order. */
export function verifyQuote(pageText: string, quote: string): boolean {
  const q = normalize(quote);
  if (q.length < 8) return false;
  if (normalize(pageText).includes(q)) return true;

  const quoteWords = words(quote);
  const pageWords = words(pageText);
  if (quoteWords.length < 3) return false;
  const window = quoteWords.length + 2;
  for (let start = 0; start + 1 <= pageWords.length; start++) {
    const slice = pageWords.slice(start, start + window);
    if (lcsLength(quoteWords, slice) / quoteWords.length >= 0.9) return true;
  }
  return false;
}

function pagesInCitation(body: string): number[] {
  const out: number[] = [];
  for (const part of body.split(",")) {
    const range = part.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) {
      for (let n = Number(range[1]); n <= Math.min(Number(range[2]), Number(range[1]) + 20); n++)
        out.push(n);
    } else if (/^\d+$/.test(part.trim())) out.push(Number(part.trim()));
  }
  return out;
}

export interface GroundedAnswer {
  text: string;
  /** True when the answer should wear the amber "Beyond your uploaded material" banner. */
  beyond: boolean;
  /** Pages that were cited and exist. */
  citedPages: number[];
  /** How many citations or quotes were removed for failing verification. */
  stripped: number;
}

const CITATION = /\(\s*pp?\.\s*([\d,\s\-–]+)\)/gi;
const QUOTED_WITH_CITATION = /["“]([^"”]{20,}?)["”]\s*\(\s*pp?\.\s*(\d+)\s*\)/gi;

/** Strips bad quotes and citations, then decides whether the answer must be flagged as beyond the material. */
export function groundAnswer(answer: string, pages: PageMap): GroundedAnswer {
  let stripped = 0;
  let text = answer.replace(QUOTED_WITH_CITATION, (match, quote: string, page: string) => {
    const pageText = pages.get(Number(page));
    if (pageText && verifyQuote(pageText, quote)) return match;
    stripped++;
    return "";
  });

  const citedPages = new Set<number>();
  text = text.replace(CITATION, (match, body: string) => {
    const nums = pagesInCitation(body);
    if (nums.length > 0 && nums.every((n) => pages.has(n))) {
      nums.forEach((n) => citedPages.add(n));
      return match;
    }
    stripped++;
    return "";
  });
  text = text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;!?])/g, "$1")
    .trim();

  const declared = text.startsWith(BEYOND_PREFIX);
  const beyond = declared || stripped > 0;
  if (beyond && !declared) text = `${BEYOND_PREFIX} ${text}`;
  return { text, beyond, citedPages: [...citedPages].sort((a, b) => a - b), stripped };
}

export function toPageMap(rows: { page_no: number; text: string }[]): Map<number, string> {
  return new Map(rows.map((r) => [r.page_no, r.text]));
}
