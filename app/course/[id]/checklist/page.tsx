import { notFound } from "next/navigation";
import { loadCourseSnapshot } from "@/lib/course-data";
import { parsePlanRow } from "@/lib/plan/build";
import { createClient } from "@/lib/supabase/server";
import { deriveSteps } from "@/lib/study/checklist";
import { ChecklistView } from "./checklist-view";

export default async function ChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const [snapshot, { data: events }, { data: custom }, { data: planRow }] = await Promise.all([
    loadCourseSnapshot(supabase, id),
    supabase.from("study_events").select("topic_id,kind").eq("course_id", id),
    supabase
      .from("checklist_items")
      .select("id,label,done")
      .eq("course_id", id)
      .order("created_at"),
    supabase
      .from("plans")
      .select("*")
      .eq("course_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (snapshot.topics.length === 0) notFound();
  const plan = planRow ? parsePlanRow(planRow) : null;
  const topicsFor = (kind: string) =>
    new Set((events ?? []).flatMap((e) => (e.kind === kind && e.topic_id ? [e.topic_id] : [])));

  const steps = deriveSteps({
    courseId: id,
    topics: snapshot.topics.map((t) => ({ id: t.id, name: t.name })),
    exercises: snapshot.exercises,
    passedExerciseIds: snapshot.passedExerciseIds,
    quizzedTopicIds: new Set(
      snapshot.attempts.flatMap((a) =>
        Object.entries(a.perTopic).flatMap(([topicId, v]) => (v.total > 0 ? [topicId] : [])),
      ),
    ),
    lessonTopicIds: topicsFor("lesson"),
    notesTopicIds: topicsFor("notes"),
    planOrder: plan?.items.map((i) => i.topicId),
  });
  const names = Object.fromEntries(snapshot.topics.map((t) => [t.id, t.name]));
  return (
    <ChecklistView courseId={id} steps={steps} topicNames={names} initialCustom={custom ?? []} />
  );
}
