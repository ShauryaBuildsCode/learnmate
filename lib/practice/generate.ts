import { claudeJson } from "@/lib/ai/anthropic";
import { groqJson } from "@/lib/ai/groq";
import { pagesBlock } from "@/lib/ai/prompts/content";
import { PRACTICE_SYSTEM, practicePrompt } from "@/lib/ai/prompts/practice";
import { AiOutputError } from "@/lib/ai/types";
import { serverEnv } from "@/lib/env";
import { verifyQuote } from "@/lib/grounding";
import { generatedPracticeSchema, type GeneratedPractice } from "@/lib/schemas/practice";

interface Topic {
  name: string;
  summary: string;
  pages: number[];
}

/** Keeps items whose topic and page exist, shuffles nothing, and checks an mcq's quote really is on its page. */
export function sanitizePractice(
  raw: unknown,
  topics: Topic[],
  pages: ReadonlyMap<number, string>,
): GeneratedPractice[] {
  const list = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(list)) return [];
  const out: GeneratedPractice[] = [];
  for (const candidate of list) {
    const parsed = generatedPracticeSchema.safeParse(candidate);
    if (!parsed.success) continue;
    const p = parsed.data;
    const topic = topics[p.topicIndex];
    if (!topic) continue;
    const page = pages.has(p.page) ? p.page : topic.pages.find((n) => pages.has(n));
    if (page === undefined) continue;
    if (p.item.kind === "mcq" && !verifyQuote(pages.get(page) ?? "", p.item.quote)) continue;
    out.push({ ...p, page });
  }
  return out;
}

const TOPICS_PER_CALL = 4;

/** Writes practice for all topics: a few parallel calls, each covering a handful of topics, then merged. */
export async function generatePractice(args: {
  pages: { page_no: number; text: string }[];
  topics: Topic[];
  uiLang?: "en" | "hi";
}): Promise<GeneratedPractice[]> {
  const groups = Array.from(
    { length: Math.ceil(args.topics.length / TOPICS_PER_CALL) },
    (_, g) => g * TOPICS_PER_CALL,
  );
  const parts = await Promise.all(
    groups.map(async (offset) => {
      const items = await generateForTopics({
        ...args,
        topics: args.topics.slice(offset, offset + TOPICS_PER_CALL),
      });
      return items.map((x) => ({ ...x, topicIndex: x.topicIndex + offset }));
    }),
  );
  return parts.flat();
}

/** Claude writes the practice (main model, then its second-choice model); Groq is the last resort. */
async function generateForTopics(args: {
  pages: { page_no: number; text: string }[];
  topics: Topic[];
  uiLang?: "en" | "hi";
}): Promise<GeneratedPractice[]> {
  const env = serverEnv();
  const pageMap = new Map(args.pages.map((p) => [p.page_no, p.text]));
  const block = pagesBlock(args.pages);
  const prompt = practicePrompt(args.topics, args.uiLang);
  const order = [
    { provider: "claude" as const, model: env.ANTHROPIC_MODEL },
    { provider: "claude" as const, model: env.ANTHROPIC_FALLBACK_MODEL },
    { provider: "groq" as const },
  ];
  let lastError: unknown;
  for (const { provider, ...rest } of order) {
    try {
      const raw =
        provider === "claude"
          ? await claudeJson({
              model: (rest as { model: string }).model,
              persona: PRACTICE_SYSTEM,
              courseBlock: block,
              prompt,
              effort: "low",
              maxTokens: 7000,
              task: "practice items",
            })
          : await groqJson({
              system: `${PRACTICE_SYSTEM}\n\n${block}`,
              prompt,
              maxTokens: 7000,
              task: "practice items",
            });
      const items = sanitizePractice(raw, args.topics, pageMap);
      // Every topic needs at least one item, or the course would have holes in its practice.
      if (args.topics.every((_, i) => items.some((x) => x.topicIndex === i))) return items;
      if (items.length >= args.topics.length) return items;
    } catch (error) {
      lastError = error;
      console.error(
        `[practice] ${provider} failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  throw new AiOutputError(
    "practice items",
    lastError instanceof Error ? lastError.message : "too few usable items",
  );
}
