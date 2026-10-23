import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { AiOutputError } from "@/lib/ai/types";
import { loadCourseSnapshot } from "@/lib/course-data";
import { generateVerifiedQuestions } from "@/lib/quiz/generate";
import type { Json } from "@/lib/supabase/types";

export const maxDuration = 90;

const bodySchema = z.object({
  courseId: z.string().uuid(),
  kind: z.enum(["diagnostic", "practice"]),
  uiLang: z.enum(["en", "hi"]).default("en"),
});

/** Generates a quiz (diagnostic over every topic, or practice on weak topics) and stores it unanswered. */
export async function POST(request: Request) {
  const auth = await authorize(null);
  if (isResponse(auth)) return auth;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That quiz request wasn't valid.");
  const { courseId, kind, uiLang } = parsed.data;

  const snapshot = await loadCourseSnapshot(auth.supabase, courseId);
  if (snapshot.topics.length === 0) return jsonError(404, "Course not found.");
  const { data: pages } = await auth.supabase
    .from("course_pages")
    .select("page_no,text")
    .eq("course_id", courseId)
    .order("page_no");

  let topics = snapshot.topics;
  let count = Math.min(8, Math.max(6, topics.length));
  if (kind === "practice") {
    if (snapshot.attempts.length === 0) return jsonError(400, "Take the diagnostic quiz first.");
    const weak = snapshot.mastery.filter((m) => m.level !== "strong").sort((a, b) => a.score - b.score).slice(0, 3);
    if (weak.length === 0) return jsonError(400, "Every topic is strong. Nothing to practise right now.");
    topics = snapshot.topics.filter((t) => weak.some((w) => w.topicId === t.id));
    count = Math.min(6, topics.length * 2);
  }

  try {
    const questions = await generateVerifiedQuestions({
      topics: topics.map((t) => ({ id: t.id, name: t.name, pages: t.pages })),
      pages: pages ?? [],
      count,
      avoid: snapshot.askedQuestions,
      uiLang,
    });
    const { data: attempt, error } = await auth.supabase
      .from("quiz_attempts")
      .insert({
        user_id: auth.user.id,
        course_id: courseId,
        kind,
        questions: questions as unknown as Json,
        answers: [],
        per_topic: {},
      })
      .select("id")
      .single();
    if (error || !attempt) return jsonError(500, "Couldn't save the quiz. Please try again.");
    // The browser never sees the answer key until it submits.
    const publicQuestions = questions.map((q) => ({
      id: q.id,
      topicId: q.topicId,
      question: q.question,
      options: q.options,
      page: q.page,
    }));
    return NextResponse.json({ attemptId: attempt.id, questions: publicQuestions, provider: "gemini" });
  } catch (error) {
    if (error instanceof AiOutputError) return jsonError(502, "The AI's quiz wasn't usable. Please try again.");
    return jsonError(502, "Couldn't build the quiz right now. Please try again.");
  }
}
