import { notFound } from "next/navigation";
import { loadCourseSnapshot } from "@/lib/course-data";
import { toPageMap } from "@/lib/grounding";
import { parsePlanRow } from "@/lib/plan/build";
import { createClient } from "@/lib/supabase/server";
import { CourseView } from "./course-view";

export default async function CoursePage({ params }: PageProps<"/course/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: course } = await supabase
    .from("courses")
    .select("id,title,subject,page_count")
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();

  const [snapshot, { data: pages }, { data: planRow }, { data: profile }] = await Promise.all([
    loadCourseSnapshot(supabase, id),
    supabase.from("course_pages").select("page_no,text").eq("course_id", id).order("page_no"),
    supabase
      .from("plans")
      .select("*")
      .eq("course_id", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("ui_lang").eq("id", user.id).maybeSingle(),
  ]);

  const mastery = Object.fromEntries(snapshot.mastery.map((m) => [m.topicId, m]));
  return (
    <CourseView
      course={course}
      pages={Object.fromEntries(toPageMap(pages ?? []))}
      topics={snapshot.topics.map((t) => ({
        id: t.id,
        name: t.name,
        summary: t.summary,
        pages: t.pages,
        exercises: snapshot.exercises
          .filter((e) => e.topicId === t.id)
          .map((e) => ({
            id: e.id,
            prompt: e.prompt,
            page: e.page,
            passed: snapshot.passedExerciseIds.has(e.id),
          })),
        mastery: snapshot.attempts.length ? (mastery[t.id] ?? null) : null,
      }))}
      plan={planRow ? parsePlanRow(planRow) : null}
      hasDiagnostic={snapshot.attempts.length > 0}
      uiLang={profile?.ui_lang ?? "en"}
    />
  );
}
