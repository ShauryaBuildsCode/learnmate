import { geminiJson } from "@/lib/ai/gemini";
import { CONTENT_SYSTEM, pagesBlock, quizPrompt } from "@/lib/ai/prompts/content";
import { AiOutputError } from "@/lib/ai/types";
import { verifyQuote } from "@/lib/grounding";
import { quizSchema, type QuizQuestion } from "@/lib/schemas/content";

export interface QuizTopic {
  id: string;
  name: string;
  pages: number[];
}

const MAX_ROUNDS = 3;

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

/** True when two questions share at least 70% of their words (a repeat or a light rephrase). */
export function isRepeat(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let shared = 0;
  wa.forEach((w) => wb.has(w) && shared++);
  return shared / Math.min(wa.size, wb.size) >= 0.7;
}

/** Fisher-Yates shuffle of the options, keeping correctIndex pointing at the right answer. */
export function shuffleOptions(q: QuizQuestion, random: () => number = Math.random): QuizQuestion {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correctIndex: order.indexOf(q.correctIndex),
  };
}

/** A question is kept only if its topic and page exist and its supporting quote is really on that page. */
export function isGrounded(
  q: QuizQuestion,
  topics: QuizTopic[],
  pages: ReadonlyMap<number, string>,
): boolean {
  const topic = topics.find((t) => t.id === q.topicId);
  const pageText = pages.get(q.page);
  return !!topic && !!pageText && verifyQuote(pageText, q.quote);
}

interface Args {
  topics: QuizTopic[];
  pages: { page_no: number; text: string }[];
  count: number;
  /** Earlier question texts that must not come back. */
  avoid: string[];
  uiLang: "en" | "hi";
}

/**
 * Asks Gemini for questions, verifies every quote against its page in code, and regenerates the ones
 * that fail (up to 3 rounds). Questions that repeat earlier ones are dropped.
 */
export async function generateVerifiedQuestions(args: Args): Promise<QuizQuestion[]> {
  const pageMap = new Map(args.pages.map((p) => [p.page_no, p.text]));
  const accepted: QuizQuestion[] = [];
  const avoid = [...args.avoid];

  for (let round = 0; round < MAX_ROUNDS && accepted.length < args.count; round++) {
    const missingTopics = args.topics.filter((t) => !accepted.some((q) => q.topicId === t.id));
    const needed = args.count - accepted.length;
    const focus =
      missingTopics.length > 0 && missingTopics.length < args.topics.length
        ? missingTopics
        : args.topics;
    const result = await geminiJson({
      task: "quiz",
      system: CONTENT_SYSTEM,
      context: pagesBlock(args.pages),
      prompt: quizPrompt({
        topics: focus,
        count: needed,
        avoid,
        uiLang: args.uiLang,
      }),
      schema: quizSchema,
    });
    for (const q of result.questions) {
      if (accepted.length >= args.count) break;
      if (!isGrounded(q, args.topics, pageMap)) continue;
      if (avoid.some((prev) => isRepeat(prev, q.question))) continue;
      accepted.push(shuffleOptions({ ...q, id: `q${accepted.length + 1}` }));
      avoid.push(q.question);
    }
  }
  if (accepted.length < Math.min(3, args.count)) {
    throw new AiOutputError("quiz", "too few questions had a quote that could be verified");
  }
  return accepted;
}
