import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { HINT_RUNGS, NUDGE_TASK, REVEAL_TASK, UNDERSTANDING_TASK } from "@/lib/ai/prompts/tutor";
import { hintRequestSchema } from "@/lib/schemas/tutor";
import { guruResponse, loadCourse } from "@/lib/tutor/guru";

const bodySchema = hintRequestSchema.extend({
  kind: z.enum(["hint", "nudge", "understanding"]).default("hint"),
});

const MAX_RUNG = 3;

/** IDE-initiated Guru calls: the 3-rung hint ladder, the "stuck?" nudge, and the post-pass understanding check. */
export async function POST(request: Request) {
  const auth = await authorize("tutor");
  if (isResponse(auth)) return auth;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That hint request wasn't valid.");
  const { courseId, exerciseId, context, uiLang, reveal, kind } = parsed.data;

  const course = await loadCourse(auth.supabase, courseId);
  if (!course) return jsonError(404, "Course not found.");
  const { data: exercise } = await auth.supabase
    .from("exercises")
    .select("id")
    .eq("id", exerciseId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!exercise) return jsonError(404, "Exercise not found.");

  const base = {
    supabase: auth.supabase,
    userId: auth.user.id,
    course,
    history: [],
    context,
    effort: "low" as const,
  };

  if (kind === "nudge") {
    return guruResponse({
      ...base,
      question: "[Guru nudge]",
      policy: { revealAllowed: false, solutionRequests: 0, uiLang, task: NUDGE_TASK },
    });
  }
  if (kind === "understanding") {
    return guruResponse({
      ...base,
      question: "[Understanding check]",
      policy: { revealAllowed: false, solutionRequests: 0, uiLang, task: UNDERSTANDING_TASK },
    });
  }

  const { data: state } = await auth.supabase
    .from("hint_state")
    .select("rung")
    .eq("user_id", auth.user.id)
    .eq("exercise_id", exerciseId)
    .maybeSingle();
  const current = state?.rung ?? 0;

  // The full solution is only available after the ladder is exhausted AND the student asks again.
  const revealing = reveal && current >= MAX_RUNG;
  const rung = revealing ? MAX_RUNG : Math.min(current + 1, MAX_RUNG);
  if (!revealing) {
    await auth.supabase
      .from("hint_state")
      .upsert(
        { user_id: auth.user.id, exercise_id: exerciseId, rung },
        { onConflict: "user_id,exercise_id" },
      );
  }

  return guruResponse({
    ...base,
    question: revealing ? "[Full solution request]" : `[Hint rung ${rung}]`,
    policy: {
      revealAllowed: revealing,
      solutionRequests: revealing ? 2 : 0,
      uiLang,
      task: revealing ? REVEAL_TASK : HINT_RUNGS[rung as 1 | 2 | 3],
    },
    rung,
  });
}
