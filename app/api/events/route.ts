import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";

const bodySchema = z.object({
  courseId: z.string().uuid(),
  topicId: z.string().uuid().optional(),
  kind: z.enum(["lesson", "notes", "mindmap"]),
});

/** Records that the student did something (opened a lesson, read a topic's notes). Repeats within the hour are ignored. */
export async function POST(request: Request) {
  const auth = await authorize("light");
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That event wasn't valid.");
  const { courseId, topicId, kind } = parsed.data;
  const since = new Date(Date.now() - 3_600_000).toISOString();
  let recent = auth.supabase
    .from("study_events")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId)
    .eq("kind", kind)
    .gte("created_at", since);
  recent = topicId ? recent.eq("topic_id", topicId) : recent.is("topic_id", null);
  const { count } = await recent;
  if ((count ?? 0) > 0) return NextResponse.json({ ok: true, recorded: false });
  const { error } = await auth.supabase
    .from("study_events")
    .insert({ user_id: auth.user.id, course_id: courseId, topic_id: topicId ?? null, kind });
  if (error) return jsonError(500, "Couldn't record that.");
  return NextResponse.json({ ok: true, recorded: true });
}
