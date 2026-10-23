import type { SupabaseClient } from "@supabase/supabase-js";
import { claudeJson } from "@/lib/ai/anthropic";
import { geminiJson } from "@/lib/ai/gemini";
import { MOTION_DIRECTOR_SYSTEM, motionDirectorPrompt } from "@/lib/ai/prompts/motion-director";
import { courseBlock } from "@/lib/ai/prompts/tutor";
import { CONTENT_SYSTEM, lessonPrompt, pagesBlock } from "@/lib/ai/prompts/content";
import { lessonEnvelopeSchema, lessonScriptSchema, type LessonScript } from "@/lib/schemas/lesson";
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

  /** Claude directs the motion. */
  const withClaude = async () => {
    const raw = await claudeJson({
      persona: MOTION_DIRECTOR_SYSTEM,
      courseBlock: courseBlock(course?.title ?? "Course", pages),
      prompt: motionDirectorPrompt({ topic, validPages, exercises, allowTrace, uiLang }),
      effort: "medium",
      maxTokens: 9000,
      task: "motion director",
    });
    return raw ? validateScript(raw, validation, "claude") : null;
  };

  /** Gemini writes the script if Claude is unavailable or its script doesn't validate. */
  const withGemini = async () => {
    const raw = await geminiJson({
      task: "lesson script",
      system: CONTENT_SYSTEM,
      // Always the whole course, in the same order, so the cached prefix is shared by every task.
      context: pagesBlock(pages),
      prompt: lessonPrompt({ topic, validPages, exercises, allowTrace, uiLang }),
      schema: lessonEnvelopeSchema,
      apiSchema: lessonScriptSchema,
    });
    return validateScript(raw, validation, "gemini");
  };

  let result: ReturnType<typeof validateScript> | null = null;
  try {
    result = await withClaude();
  } catch (error) {
    console.error(
      "[lesson] Claude motion director failed, falling back to Gemini:",
      error instanceof Error ? error.message : error,
    );
  }
  result ??= await withGemini();
  const { script, dropped } = result;

  await supabase
    .from("lessons")
    .upsert(
      { topic_id: topicId, ui_lang: uiLang, script: script as unknown as Json },
      { onConflict: "topic_id,ui_lang" },
    );
  return { script, cached: false, dropped };
}
