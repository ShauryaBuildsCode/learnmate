import { z } from "zod";
import { NextResponse } from "next/server";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { claudeStructured } from "@/lib/ai/anthropic";
import { courseBlock, GURU_PERSONA } from "@/lib/ai/prompts/tutor";
import { buildDiagnosePrompt } from "@/lib/ai/prompts/diagnose";
import { diagnosticSchema } from "@/lib/schemas/diagnostic";
import { diagnoseRequestSchema } from "@/lib/schemas/tutor";
import { loadCourse } from "@/lib/tutor/guru";

const outputSchema = z.object({ diagnostics: z.array(diagnosticSchema).max(5) });

/** Claude structured output: line-level diagnostics that the editor renders as Monaco markers. */
export async function POST(request: Request) {
  const auth = await authorize("tutor");
  if (isResponse(auth)) return auth;

  const parsed = diagnoseRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That request wasn't valid.");
  const { courseId, context, uiLang } = parsed.data;
  if (!context.files) return NextResponse.json({ diagnostics: [], provider: "claude" });

  const course = await loadCourse(auth.supabase, courseId);
  if (!course) return jsonError(404, "Course not found.");

  try {
    const result = await claudeStructured({
      persona: GURU_PERSONA,
      courseBlock: courseBlock(course.title, course.pages, {
        kind: course.kind,
        language: course.language,
        learner: course.learner,
      }),
      turns: [{ role: "user", content: buildDiagnosePrompt(context, uiLang) }],
      schema: outputSchema,
    });
    return NextResponse.json({ diagnostics: result?.diagnostics ?? [], provider: "claude" });
  } catch {
    return jsonError(502, "Guru couldn't review your code right now. Try again in a moment.");
  }
}
