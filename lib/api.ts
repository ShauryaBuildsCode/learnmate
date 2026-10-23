import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { allow, LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Resolves the signed-in user and applies the route's rate limit, or returns the error response. */
export async function authorize(
  route: keyof typeof LIMITS | null,
): Promise<{ supabase: Supabase; user: User } | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError(401, "Please sign in again.");
  if (route && !allow(`${route}:${user.id}`, LIMITS[route])) {
    return jsonError(429, "You're going a little fast. Wait a few seconds and try again.");
  }
  return { supabase, user };
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
