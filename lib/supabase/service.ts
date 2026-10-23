import { createClient } from "@supabase/supabase-js";
import { publicEnv, serviceRoleKey } from "@/lib/env";
import type { Database } from "./types";

/** Service-role client. Bypasses RLS, so it is only for scripts, evals and tests: never for user requests. */
export function createServiceClient() {
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false },
  });
}

/** A client signed in as the given user, so queries run under that user's RLS. */
export async function createUserClient(email: string, password: string) {
  const env = publicEnv();
  const client = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false },
    },
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
}

/** Creates a confirmed user (or reuses the existing one). Scripts and tests only. */
export async function ensureUser(email: string, password: string): Promise<void> {
  const { error } = await createServiceClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error && !/already|registered|exists/i.test(error.message)) throw error;
}
