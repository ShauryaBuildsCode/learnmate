import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { groqQuick } from "@/lib/ai/groq";
import { ASSIST_SYSTEM, errorPrompt, quizFeedbackPrompt, tipPrompt, withInvitation } from "@/lib/ai/prompts/assist";
import { quizQuestionSchema } from "@/lib/schemas/content";
import { languageSchema } from "@/lib/schemas/exercise";

const bodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tip"),
    language: languageSchema,
    code: z.string().min(1).max(4000),
    exercise: z.string().max(1000).nullable(),
  }),
  z.object({ kind: z.literal("error"), language: languageSchema, stderr: z.string().min(1).max(3000) }),
  z.object({
    kind: z.literal("quiz_feedback"),
    attemptId: z.string().uuid(),
    questionId: z.string().max(20),
    selectedIndex: z.number().int().min(0).max(3),
  }),
]);

/** Groq micro-tasks: typing tips, plain-English error explanations, instant quiz feedback. */
export async function POST(request: Request) {
  const auth = await authorize("assist");
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That request wasn't valid.");
  const body = parsed.data;

  try {
    if (body.kind === "tip") {
      const text = await groqQuick(ASSIST_SYSTEM, tipPrompt(body.language, body.code, body.exercise));
      return NextResponse.json({ text: withInvitation(text), provider: "groq" });
    }
    if (body.kind === "error") {
      const text = await groqQuick(ASSIST_SYSTEM, errorPrompt(body.language, body.stderr));
      return NextResponse.json({ text: withInvitation(text), provider: "groq" });
    }

    const { data: attempt } = await auth.supabase
      .from("quiz_attempts")
      .select("questions")
      .eq("id", body.attemptId)
      .maybeSingle();
    const questions = attempt ? quizQuestionSchema.array().safeParse(attempt.questions) : null;
    const q = questions?.success ? questions.data.find((x) => x.id === body.questionId) : undefined;
    if (!q) return jsonError(404, "Question not found.");
    const correct = body.selectedIndex === q.correctIndex;
    const text = await groqQuick(
      ASSIST_SYSTEM,
      quizFeedbackPrompt({
        question: q.question,
        chosen: q.options[body.selectedIndex],
        correct: q.options[q.correctIndex],
        isCorrect: correct,
        explanation: q.explanation,
      }),
    );
    return NextResponse.json({ text: withInvitation(text), correct, provider: "groq" });
  } catch {
    return jsonError(503, "Quick tips are taking a break. Guru can still help.");
  }
}
