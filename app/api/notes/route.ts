import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { AiOutputError } from "@/lib/ai/types";
import { CourseNotFoundError, getOrCreateNotes } from "@/lib/study/generate";

export const maxDuration = 120;

const bodySchema = z.object({
  courseId: z.string().uuid(),
  uiLang: z.enum(["en", "hi"]).default("en"),
  regenerate: z.boolean().default(false),
});

/** Claude-written revision notes for a whole course: validated against the real pages, then cached per language. */
export async function POST(request: Request) {
  const auth = await authorize("study");
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That notes request wasn't valid.");
  try {
    const { notes, cached } = await getOrCreateNotes(
      auth.supabase,
      auth.user.id,
      parsed.data.courseId,
      parsed.data.uiLang,
      parsed.data.regenerate,
    );
    return NextResponse.json({ notes, cached });
  } catch (error) {
    if (error instanceof CourseNotFoundError) return jsonError(404, "Course not found.");
    if (error instanceof AiOutputError)
      return jsonError(502, "The AI's notes weren't usable. Please try again.");
    return jsonError(502, "Couldn't write the notes right now. Please try again.");
  }
}
