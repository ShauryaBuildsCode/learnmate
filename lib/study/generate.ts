import type { SupabaseClient } from "@supabase/supabase-js";
import { claudeJson } from "@/lib/ai/anthropic";
import { groqJson } from "@/lib/ai/groq";
import { MINDMAP_SYSTEM, mindMapPrompt, NOTES_SYSTEM, notesPrompt } from "@/lib/ai/prompts/study";
import { courseBlock } from "@/lib/ai/prompts/tutor";
import { AiOutputError } from "@/lib/ai/types";
import { serverEnv } from "@/lib/env";
import {
  storedMindMapSchema,
  storedNotesSchema,
  type StoredMindMap,
  type StoredNotes,
} from "@/lib/schemas/study";
import type { Database, Json } from "@/lib/supabase/types";
import { validateMindMap, validateNotes, type StudyTopic } from "./validate";

type Supabase = SupabaseClient<Database>;
type Writer = "claude" | "groq";

export class CourseNotFoundError extends Error {}

interface CourseInputs {
  title: string;
  topics: StudyTopic[];
  pages: { page_no: number; text: string }[];
  validPages: Set<number>;
  block: string;
}

async function loadInputs(supabase: Supabase, courseId: string): Promise<CourseInputs> {
  const [{ data: course }, { data: topics }, { data: pages }] = await Promise.all([
    supabase.from("courses").select("title").eq("id", courseId).maybeSingle(),
    supabase
      .from("topics")
      .select("id,name,summary,pages")
      .eq("course_id", courseId)
      .order("position"),
    supabase.from("course_pages").select("page_no,text").eq("course_id", courseId).order("page_no"),
  ]);
  if (!course || !topics?.length || !pages?.length) throw new CourseNotFoundError();
  return {
    title: course.title,
    topics,
    pages,
    validPages: new Set(pages.map((p) => p.page_no)),
    block: courseBlock(course.title, pages),
  };
}

/** Claude (main model, then its second-choice model) writes first; Groq is the fallback. The first valid result wins. */
async function writeWithFallback<T>(
  task: string,
  run: (writer: Writer, model?: string) => Promise<unknown>,
  validate: (raw: unknown, writer: Writer) => T,
): Promise<T> {
  const env = serverEnv();
  const order: { writer: Writer; model?: string }[] = [
    { writer: "claude", model: env.ANTHROPIC_MODEL },
    { writer: "claude", model: env.ANTHROPIC_FALLBACK_MODEL },
    { writer: "groq" },
  ];
  let lastError: unknown;
  for (const { writer, model } of order) {
    try {
      const raw = await run(writer, model);
      if (raw) return validate(raw, writer);
    } catch (error) {
      lastError = error;
      console.error(
        `[${task}] ${writer} ${model ?? ""} failed:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  throw new AiOutputError(task, lastError instanceof Error ? lastError.message : "no valid output");
}

export async function getOrCreateNotes(
  supabase: Supabase,
  userId: string,
  courseId: string,
  uiLang: "en" | "hi",
  force = false,
): Promise<{ notes: StoredNotes; cached: boolean }> {
  if (!force) {
    const { data } = await supabase
      .from("study_notes")
      .select("notes")
      .eq("course_id", courseId)
      .eq("ui_lang", uiLang)
      .maybeSingle();
    const stored = storedNotesSchema.safeParse(data?.notes);
    if (stored.success) return { notes: stored.data, cached: true };
  }
  const c = await loadInputs(supabase, courseId);
  const prompt = notesPrompt(c.topics, [...c.validPages], uiLang);
  const notes = await writeWithFallback(
    "revision notes",
    (writer, model) =>
      writer === "claude"
        ? claudeJson({
            model,
            persona: NOTES_SYSTEM,
            courseBlock: c.block,
            prompt,
            effort: "medium",
            maxTokens: 9000,
            task: "revision notes",
          })
        : groqJson({
            system: `${NOTES_SYSTEM}\n\n${c.block}`,
            prompt,
            maxTokens: 8000,
            task: "revision notes",
          }),
    (raw, writer) => validateNotes(raw, c.topics, c.validPages, writer).notes,
  );
  await supabase
    .from("study_notes")
    .upsert(
      { user_id: userId, course_id: courseId, ui_lang: uiLang, notes: notes as unknown as Json },
      { onConflict: "user_id,course_id,ui_lang" },
    );
  return { notes, cached: false };
}

export async function getOrCreateMindMap(
  supabase: Supabase,
  userId: string,
  courseId: string,
  uiLang: "en" | "hi",
  force = false,
): Promise<{ map: StoredMindMap; cached: boolean }> {
  if (!force) {
    const { data } = await supabase
      .from("mind_maps")
      .select("graph")
      .eq("course_id", courseId)
      .eq("ui_lang", uiLang)
      .maybeSingle();
    const stored = storedMindMapSchema.safeParse(data?.graph);
    if (stored.success) return { map: stored.data, cached: true };
  }
  const c = await loadInputs(supabase, courseId);
  const prompt = mindMapPrompt(c.title, c.topics, [...c.validPages], uiLang);
  const map = await writeWithFallback(
    "mind map",
    (writer, model) =>
      writer === "claude"
        ? claudeJson({
            model,
            persona: MINDMAP_SYSTEM,
            courseBlock: c.block,
            prompt,
            effort: "medium",
            maxTokens: 6000,
            task: "mind map",
          })
        : groqJson({
            system: `${MINDMAP_SYSTEM}\n\n${c.block}`,
            prompt,
            maxTokens: 6000,
            task: "mind map",
          }),
    (raw, writer) => validateMindMap(raw, c.topics, c.validPages, c.title, writer),
  );
  await supabase
    .from("mind_maps")
    .upsert(
      { user_id: userId, course_id: courseId, ui_lang: uiLang, graph: map as unknown as Json },
      { onConflict: "user_id,course_id,ui_lang" },
    );
  return { map, cached: false };
}
