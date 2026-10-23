import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Supabase = SupabaseClient<Database>;

const GOALS: Record<string, string> = {
  exam: "preparing for an exam",
  school: "keeping up with school or college work",
  job: "learning for a job or career move",
  curiosity: "learning out of curiosity",
  project: "learning to build a project",
};

export interface Learner {
  name: string | null;
  goal: string | null;
  level: "beginner" | "intermediate" | "advanced" | null;
  interests: string | null;
  dailyMinutes: number | null;
}

/** A short plain-text description of the student, so every AI can pitch its help at the right level. */
export function describeLearner(l: Learner): string {
  const parts: string[] = [];
  if (l.level) parts.push(`a ${l.level} learner`);
  if (l.goal) parts.push(GOALS[l.goal] ?? l.goal);
  if (l.interests) parts.push(`interested in ${l.interests.slice(0, 120)}`);
  if (l.dailyMinutes) parts.push(`studying about ${l.dailyMinutes} minutes a day`);
  if (parts.length === 0) return "";
  const level =
    l.level === "beginner"
      ? "Assume no prior knowledge and define every term."
      : l.level === "advanced"
        ? "Skip the basics and go deeper on the why."
        : "Assume the basics and explain the rest clearly.";
  return `About the student: ${parts.join(", ")}. ${level}`;
}

/** Reads the signed-in student's profile (RLS limits it to their own row). */
export async function loadLearner(supabase: Supabase): Promise<Learner | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("display_name,goal,level,interests,daily_minutes")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    name: data.display_name,
    goal: data.goal,
    level: data.level,
    interests: data.interests,
    dailyMinutes: data.daily_minutes,
  };
}
