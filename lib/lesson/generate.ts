import type { SupabaseClient } from "@supabase/supabase-js";
import { claudeJson } from "@/lib/ai/anthropic";
import { MOTION_DIRECTOR_SYSTEM, motionDirectorPrompt } from "@/lib/ai/prompts/motion-director";
import { courseBlock } from "@/lib/ai/prompts/tutor";
import { AiOutputError } from "@/lib/ai/types";
import { serverEnv } from "@/lib/env";
import { lessonScriptSchema, type LessonScript } from "@/lib/schemas/lesson";
import type { Database, Json } from "@/lib/supabase/types";
import { validateScript } from "./validate";

type Supabase = SupabaseClient<Database>;

export interface LessonResult {
  script: LessonScript;
  cached: boolean;
  dropped: { index: number; reason: string }[];
}

export class LessonNotFoundError extends Error {}

/** Returns the cached lesson for this topic and language, or has Gemini write, validate and cache one. */
export async function getOrCreateLesson(
  supabase: Supabase,
  topicId: string,
  uiLang: "en" | "hi",
): Promise<LessonResult> {
  const { data: cached } = await supabase
    .from("lessons")
    .select("script")
    .eq("topic_id", topicId)
    .eq("ui_lang", uiLang)
    .maybeSingle();
  const cachedScript = cached ? lessonScriptSchema.safeParse(cached.script) : null;
  if (cachedScript?.success) return { script: cachedScript.data, cached: true, dropped: [] };

  const { data: topic } = await supabase
    .from("topics")
    .select("id,course_id,name,summary,pages")
    .eq("id", topicId)
    .maybeSingle();
  if (!topic) throw new LessonNotFoundError();

  const [{ data: allPages }, { data: courseExercises }] = await Promise.all([
    supabase
      .from("course_pages")
      .select("page_no,text")
      .eq("course_id", topic.course_id)
      .order("page_no"),
    supabase
      .from("exercises")
      .select("id,topic_id,language,prompt,page")
      .eq("course_id", topic.course_id),
  ]);
  const pages = allPages ?? [];
  const exercises = (courseExercises ?? []).filter((e) => e.topic_id === topicId);
  const relevant = new Set([...topic.pages, ...exercises.map((e) => e.page)]);

  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("id", topic.course_id)
    .maybeSingle();
  const validPages = [...relevant].sort((a, b) => a - b);
  const allowTrace = (courseExercises ?? []).some((e) => e.language === "python");
  const validation = {
    validPages: new Set(pages.map((p) => p.page_no)),
    exerciseIds: exercises.map((e) => e.id),
    exercisePrompts: Object.fromEntries(exercises.map((e) => [e.id, e.prompt])),
  };

  /**
   * Claude directs the lesson: the main model first, then the second-choice Claude model if the first
   * fails or its script doesn't validate. Lessons never go to another provider.
   */
  const env = serverEnv();
  let result: ReturnType<typeof validateScript> | null = null;
  let lastError: unknown;
  for (const model of [env.ANTHROPIC_MODEL, env.ANTHROPIC_FALLBACK_MODEL]) {
    try {
      const raw = await claudeJson({
        model,
        persona: MOTION_DIRECTOR_SYSTEM,
        courseBlock: courseBlock(course?.title ?? "Course", pages),
        prompt: motionDirectorPrompt({ topic, validPages, exercises, allowTrace, uiLang }),
        effort: "medium",
        maxTokens: 9000,
        task: "motion director",
      });
      if (raw) {
        result = validateScript(raw, validation, "claude");
        break;
      }
    } catch (error) {
      lastError = error;
      console.error(
        `[lesson] ${model} could not direct the lesson:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (!result)
    throw new AiOutputError(
      "lesson script",
      lastError instanceof Error ? lastError.message : "no valid script",
    );
  const { script, dropped } = result;

  await supabase
    .from("lessons")
    .upsert(
      { topic_id: topicId, ui_lang: uiLang, script: script as unknown as Json },
      { onConflict: "topic_id,ui_lang" },
    );
  return { script, cached: false, dropped };
}
