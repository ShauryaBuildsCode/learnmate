import type { SupabaseClient } from "@supabase/supabase-js";
import { geminiJson } from "@/lib/ai/gemini";
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

  const raw = await geminiJson({
    task: "lesson script",
    system: CONTENT_SYSTEM,
    // Always the whole course, in the same order, so the cached prefix is shared by every task.
    context: pagesBlock(pages),
    prompt: lessonPrompt({
      topic,
      validPages: [...relevant].sort((a, b) => a - b),
      exercises,
      allowTrace: (courseExercises ?? []).some((e) => e.language === "python"),
      uiLang,
    }),
    schema: lessonEnvelopeSchema,
    apiSchema: lessonScriptSchema,
  });

  const { script, dropped } = validateScript(raw, {
    validPages: new Set(pages.map((p) => p.page_no)),
    exerciseIds: exercises.map((e) => e.id),
    exercisePrompts: Object.fromEntries(exercises.map((e) => [e.id, e.prompt])),
  });

  await supabase
    .from("lessons")
    .upsert(
      { topic_id: topicId, ui_lang: uiLang, script: script as unknown as Json },
      { onConflict: "topic_id,ui_lang" },
    );
  return { script, cached: false, dropped };
}
