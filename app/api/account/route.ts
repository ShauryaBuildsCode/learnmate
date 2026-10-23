import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { publicEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

const bodySchema = z.object({ password: z.string().min(1), confirm: z.literal("DELETE") });

/**
 * Permanently deletes the signed-in student's account and everything they own. The one place a user request uses
 * the service role, so it is guarded three ways: a valid session, the current password, and a typed confirmation.
 * Rows go with the auth user (every table cascades from it); uploaded files are removed explicitly.
 */
export async function DELETE(request: Request) {
  const auth = await authorize("account");
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !auth.user.email)
    return jsonError(400, "Type DELETE and enter your password to confirm.");

  // Re-check the password with a throwaway client so this session is untouched.
  const env = publicEnv();
  const check = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { error: passwordError } = await check.auth.signInWithPassword({
    email: auth.user.email,
    password: parsed.data.password,
  });
  if (passwordError) return jsonError(403, "That password isn't right.");

  const admin = createServiceClient();
  for (const bucket of ["materials", "narration"]) {
    try {
      const { data: files } = await admin.storage.from(bucket).list(auth.user.id, { limit: 1000 });
      if (files?.length)
        await admin.storage.from(bucket).remove(files.map((f) => `${auth.user.id}/${f.name}`));
    } catch {
      // Orphaned files are harmless; the account deletion below is what matters.
    }
  }
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) return jsonError(500, "Couldn't delete the account. Please try again.");
  return NextResponse.json({ ok: true });
}
