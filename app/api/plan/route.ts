import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { buildPlan, NoQuizYetError } from "@/lib/plan/build";

export const maxDuration = 90;

const bodySchema = z.object({
  courseId: z.string().uuid(),
  basedOn: z.string().min(3).max(80),
  uiLang: z.enum(["en", "hi"]).default("en"),
});

/** Builds revision plan v1 after the diagnostic, and a new version whenever mastery meaningfully changes. */
export async function POST(request: Request) {
  const auth = await authorize(null);
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That plan request wasn't valid.");

  try {
    const result = await buildPlan({ supabase: auth.supabase, userId: auth.user.id, ...parsed.data });
    return NextResponse.json({ ...result, provider: "gemini" });
  } catch (error) {
    if (error instanceof NoQuizYetError) return jsonError(400, "Take the diagnostic quiz first.");
    return jsonError(502, "Couldn't build your plan right now. Please try again.");
  }
}
