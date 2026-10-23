import type { SupabaseClient } from "@supabase/supabase-js";
import { claudeJson } from "@/lib/ai/anthropic";
import { MASTER_TEACHER_SYSTEM } from "@/lib/ai/prompts/master-teacher";
import { groqJson } from "@/lib/ai/groq";
import { MOTION_DIRECTOR_SYSTEM, motionDirectorPrompt } from "@/lib/ai/prompts/motion-director";
import { describeLearner, loadLearner } from "@/lib/tutor/learner";
import { courseBlock } from "@/lib/ai/prompts/tutor";
import { AiOutputError } from "@/lib/ai/types";
import { serverEnv } from "@/lib/env";
import { practiceItemSchema } from "@/lib/schemas/practice";
import { lessonScriptSchema, type LessonScript } from "@/lib/schemas/lesson";
import type { Database, Json } from "@/lib/supabase/types";
import { isSolid, validateScript } from "./validate";

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

  const [{ data: allPages }, { data: courseExercises }, { data: practiceRows }] = await Promise.all(
    [
      supabase
        .from("course_pages")
        .select("page_no,text")
        .eq("course_id", topic.course_id)
        .order("page_no"),
      supabase
        .from("exercises")
        .select("id,topic_id,language,prompt,page")
        .eq("course_id", topic.course_id),
      supabase.from("practice_items").select("id,topic_id,data,page").eq("topic_id", topicId),
    ],
  );
  const pages = allPages ?? [];
  // Coding courses end on a coding exercise; concept courses end on an interactive practice question.
  const codeExercises = (courseExercises ?? []).filter((e) => e.topic_id === topicId);
  const practiceExercises = (practiceRows ?? []).flatMap((row) => {
    const item = practiceItemSchema.safeParse(row.data);
    if (!item.success) return [];
    const d = item.data;
    return [
      {
        id: row.id,
        topic_id: row.topic_id,
        language: "",
        prompt: d.kind === "cloze" ? d.text : d.question,
        page: row.page,
      },
    ];
  });
  const exercises = codeExercises.length ? codeExercises : practiceExercises;
  const relevant = new Set([...topic.pages, ...exercises.map((e) => e.page)]);

  const { data: course } = await supabase
    .from("courses")
    .select("title,kind,language")
    .eq("id", topic.course_id)
    .maybeSingle();
  const validPages = [...relevant].sort((a, b) => a - b);
  const learner = await loadLearner(supabase);
  const kind = course?.kind ?? "programming";
  const language = course?.language ?? codeExercises[0]?.language ?? null;
  const allowTrace = kind === "programming" && language === "python";
  const validation = {
    validPages: new Set(pages.map((p) => p.page_no)),
    exerciseIds: exercises.map((e) => e.id),
    exercisePrompts: Object.fromEntries(exercises.map((e) => [e.id, e.prompt])),
  };

  /**
   * Who writes the lesson, in order: Claude (main model, then its second-choice model) for the best teaching and
   * narration, then Groq if both fail or their scripts don't validate. Gemini is never used for lessons.
   */
  const env = serverEnv();
  const director = {
    persona: `${MOTION_DIRECTOR_SYSTEM}\n\n${MASTER_TEACHER_SYSTEM}`,
    courseBlock: courseBlock(course?.title ?? "Course", pages, {
      kind,
      language,
      learner: learner ? describeLearner(learner) : undefined,
    }),
    prompt: motionDirectorPrompt({
      topic,
      validPages,
      exercises,
      allowTrace,
      kind,
      language,
      uiLang,
    }),
  };
  const attempts: { provider: "groq" | "claude"; label: string; run: () => Promise<unknown> }[] = [
    ...[env.ANTHROPIC_MODEL, env.ANTHROPIC_FALLBACK_MODEL].map((model) => ({
      provider: "claude" as const,
      label: model,
      run: () =>
        claudeJson({
          model,
          ...director,
          effort: "low",
          maxTokens: 9000,
          task: "motion director",
        }),
    })),
    {
      provider: "groq",
      label: env.GROQ_LESSON_MODEL,
      run: () =>
        groqJson({
          system: `${director.persona}\n\n${director.courseBlock}`,
          prompt: director.prompt,
          maxTokens: 8000,
          task: "lesson script",
        }),
    },
  ];

  let result: ReturnType<typeof validateScript> | null = null;
  let best: ReturnType<typeof validateScript> | null = null;
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const raw = await attempt.run();
      if (raw) {
        const candidate = validateScript(raw, validation, attempt.provider);
        if (isSolid(candidate)) {
          result = candidate;
          break;
        }
        // Too thin to ship (many scenes rejected): try the next provider, but remember the best we saw.
        console.warn(
          `[lesson] ${attempt.provider} (${attempt.label}) kept only ${candidate.script.scenes.length} scenes; trying the next writer`,
        );
        if (!best || candidate.script.scenes.length > best.script.scenes.length) best = candidate;
      }
    } catch (error) {
      lastError = error;
      console.error(
        `[lesson] ${attempt.provider} (${attempt.label}) could not write the lesson:`,
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
