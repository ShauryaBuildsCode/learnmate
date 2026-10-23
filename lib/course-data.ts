import type { SupabaseClient } from "@supabase/supabase-js";
import { computeMastery, type QuizSummary, type TopicMastery, type TopicRef } from "@/lib/mastery";
import { quizQuestionSchema, type QuizQuestion } from "@/lib/schemas/content";
import type { Database } from "@/lib/supabase/types";
import { z } from "zod";

type Supabase = SupabaseClient<Database>;

const perTopicSchema = z.record(z.string(), z.object({ correct: z.number(), total: z.number() }));

export interface CompletedAttempt {
  id: string;
  kind: "diagnostic" | "practice";
  questions: QuizQuestion[];
  answers: number[];
  perTopic: z.infer<typeof perTopicSchema>;
  createdAt: string;
}

export interface CourseSnapshot {
  topics: (TopicRef & { summary: string; pages: number[] })[];
  exercises: { id: string; topicId: string; prompt: string; page: number }[];
  passedExerciseIds: Set<string>;
  /** Completed attempts only (an attempt with no answers was generated but never submitted). */
  attempts: CompletedAttempt[];
  /** Every question text ever asked, so new practice never repeats. */
  askedQuestions: string[];
  mastery: TopicMastery[];
}

/** Gathers everything mastery depends on for one course, through the signed-in user's RLS-bound client. */
export async function loadCourseSnapshot(supabase: Supabase, courseId: string): Promise<CourseSnapshot> {
  const [{ data: topicRows }, { data: exerciseRows }, { data: attemptRows }] = await Promise.all([
    supabase.from("topics").select("id,name,summary,pages,position").eq("course_id", courseId).order("position"),
    supabase.from("exercises").select("id,topic_id,prompt,page").eq("course_id", courseId),
    supabase.from("quiz_attempts").select("*").eq("course_id", courseId).order("created_at", { ascending: false }),
  ]);
  const exercises = (exerciseRows ?? []).map((e) => ({ id: e.id, topicId: e.topic_id, prompt: e.prompt, page: e.page }));
  const { data: runs } = exercises.length
    ? await supabase.from("exercise_runs").select("exercise_id").in("exercise_id", exercises.map((e) => e.id)).eq("passed", true)
    : { data: [] };
  const passedExerciseIds = new Set((runs ?? []).map((r) => r.exercise_id));

  const topics = (topicRows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    summary: t.summary,
    pages: t.pages,
    position: t.position,
    exerciseIds: exercises.filter((e) => e.topicId === t.id).map((e) => e.id),
  }));

  const attempts: CompletedAttempt[] = [];
  const askedQuestions: string[] = [];
  for (const row of attemptRows ?? []) {
    const questions = quizQuestionSchema.array().safeParse(row.questions);
    if (!questions.success) continue;
    askedQuestions.push(...questions.data.map((q) => q.question));
    const answers = z.array(z.number()).safeParse(row.answers);
    const perTopic = perTopicSchema.safeParse(row.per_topic);
    if (!answers.success || answers.data.length === 0 || !perTopic.success) continue;
    attempts.push({
      id: row.id,
      kind: row.kind,
      questions: questions.data,
      answers: answers.data,
      perTopic: perTopic.data,
      createdAt: row.created_at,
    });
  }
  const summaries: QuizSummary[] = attempts.map((a) => ({ perTopic: a.perTopic }));
  return {
    topics,
    exercises,
    passedExerciseIds,
    attempts,
    askedQuestions,
    mastery: computeMastery(topics, summaries, passedExerciseIds),
  };
}
