import { notFound } from "next/navigation";
import { loadCourseSnapshot } from "@/lib/course-data";
import { createClient } from "@/lib/supabase/server";
import { QuizzesView } from "./quizzes-view";

export default async function QuizzesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const [snapshot, { data: profile }] = await Promise.all([
    loadCourseSnapshot(supabase, id),
    supabase.from("profiles").select("ui_lang").eq("id", user.id).maybeSingle(),
  ]);
  if (snapshot.topics.length === 0) notFound();

  return (
    <QuizzesView
      courseId={id}
      uiLang={profile?.ui_lang ?? "en"}
      topics={snapshot.topics.map((t) => ({ id: t.id, name: t.name }))}
      mastery={snapshot.mastery.map((m) => ({
        topicId: m.topicId,
        score: m.score,
        level: m.level,
      }))}
      attempts={snapshot.attempts.map((a) => ({
        id: a.id,
        kind: a.kind,
        createdAt: a.createdAt,
        perTopic: a.perTopic,
        review: a.questions.map((q, i) => ({
          id: q.id,
          topicId: q.topicId,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          chosen: a.answers[i] ?? -1,
          explanation: q.explanation,
          page: q.page,
        })),
      }))}
    />
  );
}
