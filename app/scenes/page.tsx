import { readFile } from "node:fs/promises";
import path from "node:path";
import { sampleLoopsLesson } from "@/fixtures/sample-lesson";
import { splitPastedText } from "@/lib/ingest/split-text";
import { ScenesShowcase } from "./showcase";

/** Public, data-free showcase of the hand-built scene library, played from a hand-written script. */
export default async function ScenesPage() {
  const md = await readFile(path.join(process.cwd(), "fixtures/python-loops-lists.md"), "utf8");
  const pages = Object.fromEntries(splitPastedText(md).map((text, i) => [i + 1, text]));
  return <ScenesShowcase script={sampleLoopsLesson} pages={pages} />;
}
