import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { gradeShortAnswer } from "@/lib/practice/grade";
import { practiceItemSchema } from "@/lib/schemas/practice";

export const maxDuration = 30;

const bodySchema = z.object({
  itemId: z.string().uuid(),
  answer: z.string().trim().min(1).max(1200),
});

/** Grades a short written answer and records the attempt. RLS limits the item lookup to the student's own courses. */
export async function POST(request: Request) {
  const auth = await authorize("grade");
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Write an answer first.");

  const { data: row } = await auth.supabase
    .from("practice_items")
    .select("id,data")
    .eq("id", parsed.data.itemId)
    .maybeSingle();
  const item = practiceItemSchema.safeParse(row?.data);
  if (!row || !item.success || item.data.kind !== "short")
    return jsonError(404, "Question not found.");

  try {
    const { grade, provider } = await gradeShortAnswer(item.data, parsed.data.answer);
    await auth.supabase.from("practice_answers").insert({
      user_id: auth.user.id,
      item_id: row.id,
      answer: parsed.data.answer,
      correct: grade.correct,
      feedback: grade.feedback,
    });
    return NextResponse.json({ ...grade, provider });
  } catch {
    return jsonError(502, "Couldn't check that answer right now. Try again in a moment.");
  }
}
