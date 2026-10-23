import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";

const createSchema = z.object({
  courseId: z.string().uuid(),
  label: z.string().trim().min(1).max(200),
});
const patchSchema = z.object({ id: z.string().uuid(), done: z.boolean() });
const deleteSchema = z.object({ id: z.string().uuid() });

/** The student's own to-dos. Study steps are derived from progress, so only custom items live here. RLS scopes every query to the owner. */
export async function POST(request: Request) {
  const auth = await authorize("light");
  if (isResponse(auth)) return auth;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Write a short task first.");
  const { count } = await auth.supabase
    .from("checklist_items")
    .select("id", { count: "exact", head: true })
    .eq("course_id", parsed.data.courseId);
  if ((count ?? 0) >= 100)
    return jsonError(400, "That's a lot of tasks. Finish or remove some first.");
  const { data, error } = await auth.supabase
    .from("checklist_items")
    .insert({ user_id: auth.user.id, course_id: parsed.data.courseId, label: parsed.data.label })
    .select("id,label,done")
    .single();
  if (error || !data) return jsonError(500, "Couldn't add that task.");
  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request) {
  const auth = await authorize("light");
  if (isResponse(auth)) return auth;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That update wasn't valid.");
  const { error } = await auth.supabase
    .from("checklist_items")
    .update({ done: parsed.data.done })
    .eq("id", parsed.data.id);
  if (error) return jsonError(500, "Couldn't update that task.");
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await authorize("light");
  if (isResponse(auth)) return auth;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That request wasn't valid.");
  const { error } = await auth.supabase.from("checklist_items").delete().eq("id", parsed.data.id);
  if (error) return jsonError(500, "Couldn't remove that task.");
  return NextResponse.json({ ok: true });
}
