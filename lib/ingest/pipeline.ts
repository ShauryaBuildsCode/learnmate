import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CONTENT_SYSTEM,
  exercisesPrompt,
  pagesBlock,
  topicMapPrompt,
} from "@/lib/ai/prompts/content";
import { geminiJson } from "@/lib/ai/gemini";
import { generatePractice } from "@/lib/practice/generate";
import { AiOutputError } from "@/lib/ai/types";
import {
  exerciseListSchema,
  topicMapSchema,
  type GeneratedExerciseWithSolution,
  type TopicMap,
} from "@/lib/schemas/content";
import { isServerLanguage, type Language } from "@/lib/schemas/exercise";
import type { Database, Json } from "@/lib/supabase/types";
import { extractPdf } from "./extract-pdf";
import { IngestError } from "./limits";
import { splitPastedText } from "./split-text";

type Supabase = SupabaseClient<Database>;

export type IngestSource =
  | { kind: "pdf"; data: Uint8Array; storagePath: string; fileName: string }
  | { kind: "text"; text: string; title?: string };

export type IngestStage = "reading" | "topics" | "exercises" | "saving";

export interface IngestResult {
  courseId: string;
  kind: "programming" | "concepts";
  language: string | null;
  practiceCount: number;
  topicCount: number;
  exerciseCount: number;
  warnings: string[];
  /** The generated exercises including reference solutions (not stored; used by validation and evals). */
  generated: GeneratedExerciseWithSolution[];
}

interface Options {
  supabase: Supabase;
  userId: string;
  source: IngestSource;
  onProgress?: (stage: IngestStage, message: string) => void;
}

/** Keeps only topics whose cited pages exist, so every later page reference can be trusted. */
/** Postgres rejects the NUL character (\u0000) in text and jsonb, and PDFs sometimes contain it. Removes it, deeply. */
export function stripNul<T>(value: T): T {
  if (typeof value === "string") return value.replace(/\u0000/g, "") as T;
  if (Array.isArray(value)) return value.map(stripNul) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripNul(v)])) as T;
  return value;
}

export function sanitizeTopics(map: TopicMap, validPages: ReadonlySet<number>): TopicMap["topics"] {
  const topics = map.topics
    .map((t) => ({
      ...t,
      pages: [...new Set(t.pages.filter((p) => validPages.has(p)))].sort((a, b) => a - b),
    }))
    .filter((t) => t.pages.length > 0);
  if (topics.length < 3)
    throw new AiOutputError("topic map", "too few topics cite pages that exist");
  return topics;
}

/**
 * A test that a do-nothing starter would pass teaches nothing. For Python and JavaScript, drop tests that only
 * check for no result, or that contain no assertion at all.
 */
export function isMeaningfulTest(test: { kind: string; code?: string }): boolean {
  if (test.kind !== "assert" || test.code === undefined) return true;
  const code = test.code;
  if (/\bis None\b|==\s*None\b|={2,3}\s*undefined\b/.test(code)) return false;
  return /\bassert\b|\bthrow\b/.test(code);
}

/** Drops tests that do not suit the language and exercises left with none; fixes bad topic/page references. */
export function sanitizeExercises(
  list: GeneratedExerciseWithSolution[],
  topics: TopicMap["topics"],
  validPages: ReadonlySet<number>,
): GeneratedExerciseWithSolution[] {
  const out: GeneratedExerciseWithSolution[] = [];
  for (const ex of list) {
    const topic = topics[ex.topicIndex];
    if (!topic) continue;
    const wantsIo = isServerLanguage(ex.language as Language);
    const tests = ex.tests
      .filter((t) => (wantsIo ? t.kind === "io" : t.kind === "assert"))
      .filter(isMeaningfulTest);
    if (tests.length === 0 || Object.keys(ex.starterFiles).length === 0) continue;
    out.push({ ...ex, tests, page: validPages.has(ex.page) ? ex.page : topic.pages[0] });
  }
  return out;
}

export async function ingestMaterial({
  supabase,
  userId,
  source,
  onProgress,
}: Options): Promise<IngestResult> {
  const progress = onProgress ?? (() => undefined);

  progress("reading", "Reading pages…");
  let pages: string[];
  let warnings: string[] = [];
  let fallbackTitle: string;
  if (source.kind === "pdf") {
    const extracted = await extractPdf(source.data);
    pages = extracted.pages;
    warnings = extracted.warnings;
    fallbackTitle = source.fileName.replace(/\.pdf$/i, "");
  } else {
    pages = splitPastedText(source.text);
    fallbackTitle = source.title?.trim() || "Pasted study material";
    if (pages.join("").length < 200) {
      throw new IngestError(
        "empty",
        "That text is too short to learn from. Paste at least a few paragraphs.",
      );
    }
  }
  const pageRows = pages.map((text, i) => ({ page_no: i + 1, text: stripNul(text) }));
  const validPages = new Set(pageRows.map((p) => p.page_no));

  progress("topics", "Finding topics…");
  const map = await geminiJson({
    task: "topic map",
    system: CONTENT_SYSTEM,
    context: pagesBlock(pageRows),
    prompt: topicMapPrompt(fallbackTitle),
    schema: topicMapSchema,
  });
  const topics = sanitizeTopics(map, validPages);

  // Coding material gets runnable exercises in its own language; anything else gets interactive practice questions.
  const programming = map.kind === "programming" && map.language !== "none";
  const language = programming ? map.language : null;
  let exercises: GeneratedExerciseWithSolution[] = [];
  let practice: Awaited<ReturnType<typeof generatePractice>> = [];
  if (programming) {
    progress("exercises", "Building exercises…");
    const exerciseList = await geminiJson({
      task: "exercise extraction",
      system: CONTENT_SYSTEM,
      context: pagesBlock(pageRows),
      prompt: exercisesPrompt(topics, map.language),
      thinking: "MEDIUM",
      schema: exerciseListSchema,
    });
    exercises = sanitizeExercises(exerciseList.exercises, topics, validPages);
  } else {
    progress("exercises", "Writing practice questions…");
    practice = await generatePractice({ pages: pageRows, topics });
  }

  progress("saving", "Saving your course…");
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      user_id: userId,
      title: source.kind === "text" && source.title ? source.title : map.title,
      subject: map.subject,
      source_type: source.kind,
      storage_path: source.kind === "pdf" ? source.storagePath : null,
      page_count: pageRows.length,
      kind: programming ? "programming" : "concepts",
      language,
    })
    .select("id")
    .single();
  if (courseError || !course) throw new Error("Couldn't save the course. Please try again.");

  try {
    const { error: pagesError } = await supabase
      .from("course_pages")
      .insert(pageRows.map((p) => ({ course_id: course.id, ...p, text: stripNul(p.text) })));
    if (pagesError) throw pagesError;

    const { data: topicRows, error: topicsError } = await supabase
      .from("topics")
      .insert(
        topics.map((t, i) => ({
          course_id: course.id,
          position: i,
          name: t.name,
          summary: t.summary,
          pages: t.pages,
        })),
      )
      .select("id,position");
    if (topicsError || !topicRows) throw topicsError ?? new Error("topics were not saved");
    const topicId = new Map(topicRows.map((r) => [r.position, r.id]));

    if (practice.length) {
      const { error: practiceError } = await supabase.from("practice_items").insert(
        practice
          .filter((p) => topicId.has(p.topicIndex))
          .map((p) => ({
            course_id: course.id,
            topic_id: topicId.get(p.topicIndex)!,
            kind: p.item.kind,
            data: stripNul(p.item) as unknown as Json,
            page: p.page,
          })),
      );
      if (practiceError) throw practiceError;
    }

    if (exercises.length) {
      const { error: exerciseError } = await supabase.from("exercises").insert(
        exercises.map((e) => ({
          course_id: course.id,
          topic_id: topicId.get(e.topicIndex)!,
          language: e.language,
          prompt: e.prompt,
          starter_files: stripNul(e.starterFiles) as unknown as Json,
          tests: stripNul(e.tests) as unknown as Json,
          hints: stripNul(e.hints) as unknown as Json,
          page: e.page,
        })),
      );
      if (exerciseError) throw exerciseError;
    }
  } catch (error) {
    // The real cause (a constraint, a bad character...) goes to the server log; the student gets a plain message.
    console.error("[ingest] saving failed:", error);
    await supabase.from("courses").delete().eq("id", course.id);
    throw new Error("Couldn't save the course. Please try again.");
  }

  return {
    courseId: course.id,
    kind: programming ? "programming" : "concepts",
    language,
    practiceCount: practice.length,
    topicCount: topics.length,
    exerciseCount: exercises.length,
    warnings,
    generated: exercises,
  };
}
