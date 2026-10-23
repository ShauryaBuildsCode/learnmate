import { claudeJson } from "@/lib/ai/anthropic";
import { groqJson } from "@/lib/ai/groq";
import { fence } from "@/lib/ai/prompts/fence";
import { GRADER_SYSTEM } from "@/lib/ai/prompts/practice";
import { serverEnv } from "@/lib/env";
import { gradeSchema, type Grade, type PracticeItem } from "@/lib/schemas/practice";

/** Lower-case, strip accents, punctuation and filler words so "The  Mitochondria." matches "mitochondria". */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !["a", "an", "the"].includes(w))
    .join(" ");
}

/** A fill-in-the-blank is right when the normalised answers match (or one contains the other for multi-word answers). */
export function checkCloze(answer: string, expected: string): boolean {
  const a = normalizeAnswer(answer);
  const e = normalizeAnswer(expected);
  if (!a) return false;
  return (
    a === e ||
    (e.split(" ").length > 1 && (a.includes(e) || e.includes(a)) && a.length >= e.length * 0.6)
  );
}

function prompt(item: Extract<PracticeItem, { kind: "short" }>, answer: string): string {
  return `Question: ${item.question}
Reference answer: ${item.modelAnswer}
The answer should mention: ${item.keyPoints.map((k) => `- ${k}`).join(" ")}

${fence("student_answer", answer.slice(0, 1200))}`;
}

/**
 * Grades a short written answer. Groq (small model, low effort) answers in about a second; if it is unavailable
 * or returns something unusable, Claude grades instead.
 */
export async function gradeShortAnswer(
  item: Extract<PracticeItem, { kind: "short" }>,
  answer: string,
): Promise<{ grade: Grade; provider: "groq" | "claude" }> {
  const env = serverEnv();
  try {
    const raw = await groqJson({
      model: env.GROQ_MODEL,
      system: GRADER_SYSTEM,
      prompt: prompt(item, answer),
      maxTokens: 400,
      task: "grade short answer",
      effort: "low",
      timeoutMs: 8000,
    });
    const grade = gradeSchema.safeParse(raw);
    if (grade.success) return { grade: grade.data, provider: "groq" };
  } catch (error) {
    console.error("[grade] groq failed:", error instanceof Error ? error.message : error);
  }
  const raw = await claudeJson({
    model: env.ANTHROPIC_FALLBACK_MODEL,
    persona: GRADER_SYSTEM,
    courseBlock: "Grading task: no course material is needed.",
    prompt: prompt(item, answer),
    effort: "low",
    maxTokens: 600,
    task: "grade short answer",
  });
  const grade = gradeSchema.parse(raw);
  return { grade, provider: "claude" };
}
