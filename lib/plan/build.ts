import type { SupabaseClient } from "@supabase/supabase-js";
import { geminiJson, geminiText } from "@/lib/ai/gemini";
import { changeSummaryPrompt, CONTENT_SYSTEM, planPrompt } from "@/lib/ai/prompts/content";
import { loadCourseSnapshot, type CourseSnapshot } from "@/lib/course-data";
import { diffMastery, fallbackChangeSummary, orderWeakestFirst, type TopicMastery } from "@/lib/mastery";
import { masteryRecordSchema, planItemSchema, planItemsSchema, type PlanItem } from "@/lib/schemas/content";
import type { Database, Json } from "@/lib/supabase/types";

type Supabase = SupabaseClient<Database>;

export interface StoredPlan {
  id: string;
  version: number;
  mastery: Record<string, TopicMastery>;
  items: PlanItem[];
  changeSummary: string | null;
  basedOn: string;
  createdAt: string;
}

export class NoQuizYetError extends Error {}

export function parsePlanRow(row: Database["public"]["Tables"]["plans"]["Row"]): StoredPlan | null {
  const mastery = masteryRecordSchema.safeParse(row.mastery);
  const items = planItemSchema.array().safeParse(row.items);
  if (!mastery.success || !items.success) return null;
  return {
    id: row.id,
    version: row.version,
    mastery: mastery.data,
    items: items.data,
    changeSummary: row.change_summary,
    basedOn: row.based_on,
    createdAt: row.created_at,
  };
}

/** Code decides the order and every number; Gemini only writes the sentences, which code then validates. */
async function writeItems(snapshot: CourseSnapshot, ordered: TopicMastery[], uiLang: "en" | "hi"): Promise<PlanItem[]> {
  const byId = new Map(snapshot.topics.map((t) => [t.id, t]));
  const base = ordered.map((m) => {
    const t = byId.get(m.topicId)!;
    return {
      m,
      t,
      exercises: snapshot.exercises
        .filter((e) => e.topicId === t.id)
        .map((e) => ({ id: e.id, prompt: e.prompt, passed: snapshot.passedExerciseIds.has(e.id) })),
    };
  });

  let written = new Map<string, { why: string; pagesToReread: number[]; nextStep: string }>();
  try {
    const result = await geminiJson({
      task: "revision plan",
      system: CONTENT_SYSTEM,
      prompt: planPrompt({
        uiLang,
        topics: base.map(({ m, t, exercises }) => ({
          topicId: t.id,
          name: t.name,
          summary: t.summary,
          level: m.level,
          score: m.score,
          pages: t.pages,
          exercises,
        })),
      }),
      schema: planItemsSchema,
    });
    written = new Map(result.items.map((i) => [i.topicId, i]));
  } catch {
    // Mastery and ordering are already settled in code; a plain-text plan is better than no plan.
  }

  return base.map(({ m, t, exercises }) => {
    const w = written.get(t.id);
    const pages = (w?.pagesToReread ?? []).filter((p) => t.pages.includes(p));
    const todo = exercises.find((e) => !e.passed);
    return {
      topicId: t.id,
      topicName: t.name,
      level: m.level,
      score: m.score,
      why: w?.why ?? `${t.name} is ${m.level} right now (${Math.round(m.score * 100)}%).`,
      pagesToReread: pages.length ? pages : t.pages.slice(0, 2),
      nextStep:
        w?.nextStep ?? (todo ? `Watch the ${t.name} lesson, then do: ${todo.prompt}` : `Watch the ${t.name} lesson and re-read the pages.`),
      exercises: exercises.map((e) => ({ id: e.id, passed: e.passed })),
    };
  });
}

async function writeChangeSummary(
  diff: ReturnType<typeof diffMastery>,
  names: Record<string, string>,
  uiLang: "en" | "hi",
): Promise<string> {
  try {
    const text = await geminiText(
      CONTENT_SYSTEM,
      changeSummaryPrompt({
        uiLang,
        nextFocus: diff.nextFocus ? names[diff.nextFocus] : null,
        changes: diff.changes
          .filter((c) => c.direction !== "same")
          .map((c) => ({ topic: names[c.topicId], from: c.from, to: c.to, direction: c.direction })),
      }),
    );
    if (text) return text.replace(/\s+/g, " ");
  } catch {
    // fall through to the deterministic sentence
  }
  return fallbackChangeSummary(diff, names);
}

export interface BuildPlanArgs {
  supabase: Supabase;
  userId: string;
  courseId: string;
  /** What triggered this plan, e.g. "quiz:<attemptId>" or "exercise:<exerciseId>". */
  basedOn: string;
  uiLang: "en" | "hi";
}

/** Creates the next plan version when mastery meaningfully changed; otherwise returns the current one. */
export async function buildPlan(args: BuildPlanArgs): Promise<{ plan: StoredPlan; created: boolean }> {
  const snapshot = await loadCourseSnapshot(args.supabase, args.courseId);
  if (snapshot.attempts.length === 0) throw new NoQuizYetError();

  const { data: latestRow } = await args.supabase
    .from("plans")
    .select("*")
    .eq("course_id", args.courseId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latest = latestRow ? parsePlanRow(latestRow) : null;

  const diff = diffMastery(latest ? Object.values(latest.mastery) : null, snapshot.mastery, snapshot.topics);
  if (latest && !diff.meaningful) return { plan: latest, created: false };

  const ordered = orderWeakestFirst(snapshot.mastery, snapshot.topics);
  const names = Object.fromEntries(snapshot.topics.map((t) => [t.id, t.name]));
  const [items, changeSummary] = await Promise.all([
    writeItems(snapshot, ordered, args.uiLang),
    latest ? writeChangeSummary(diff, names, args.uiLang) : Promise.resolve(null),
  ]);

  const version = (latest?.version ?? 0) + 1;
  const mastery = Object.fromEntries(snapshot.mastery.map((m) => [m.topicId, m]));
  const { data: row, error } = await args.supabase
    .from("plans")
    .insert({
      user_id: args.userId,
      course_id: args.courseId,
      version,
      mastery: mastery as unknown as Json,
      items: items as unknown as Json,
      change_summary: changeSummary,
      based_on: args.basedOn,
    })
    .select("*")
    .single();
  const plan = row ? parsePlanRow(row) : null;
  if (error || !plan) throw new Error("Couldn't save the revision plan.");
  return { plan, created: true };
}
