import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { quizQuestionSchema } from "@/lib/schemas/content";
import { scoreQuiz } from "@/lib/quiz/score";
import type { Json } from "@/lib/supabase/types";

const bodySchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(z.number().int().min(-1).max(3)).max(10),
});

/** Scores a quiz in code, saves the result, and returns the explanations. */
export async function POST(request: Request) {
  const auth = await authorize(null);
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Those answers weren't valid.");

  const { data: attempt } = await auth.supabase
    .from("quiz_attempts")
    .select("id,questions,answers")
    .eq("id", parsed.data.attemptId)
    .maybeSingle();
  if (!attempt) return jsonError(404, "Quiz not found.");
  if (Array.isArray(attempt.answers) && attempt.answers.length > 0)
    return jsonError(409, "That quiz was already submitted.");
  const questions = quizQuestionSchema.array().safeParse(attempt.questions);
  if (!questions.success) return jsonError(500, "That quiz is damaged. Please start a new one.");

  const { results, perTopic, correct } = scoreQuiz(questions.data, parsed.data.answers);
  const { error } = await auth.supabase
    .from("quiz_attempts")
    .update({
      answers: parsed.data.answers as unknown as Json,
      per_topic: perTopic as unknown as Json,
    })
    .eq("id", attempt.id);
  if (error) return jsonError(500, "Couldn't save your answers. Please try again.");
  return NextResponse.json({ results, perTopic, correct, total: results.length });
}
