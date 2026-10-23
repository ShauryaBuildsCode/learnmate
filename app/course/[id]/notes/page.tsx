import { notFound } from "next/navigation";
import { storedNotesSchema } from "@/lib/schemas/study";
import { createClient } from "@/lib/supabase/server";
import { NotesView } from "./notes-view";

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase
    .from("profiles")
    .select("ui_lang")
    .eq("id", user.id)
    .maybeSingle();
  const uiLang = profile?.ui_lang ?? "en";
  const [{ data: topics }, { data: row }, { data: events }] = await Promise.all([
    supabase.from("topics").select("id,name").eq("course_id", id).order("position"),
    supabase
      .from("study_notes")
      .select("notes")
      .eq("course_id", id)
      .eq("ui_lang", uiLang)
      .maybeSingle(),
    supabase.from("study_events").select("topic_id").eq("course_id", id).eq("kind", "notes"),
  ]);
  const stored = storedNotesSchema.safeParse(row?.notes);
  return (
    <NotesView
      courseId={id}
      uiLang={uiLang}
      topicNames={Object.fromEntries((topics ?? []).map((t) => [t.id, t.name]))}
      initial={stored.success ? stored.data : null}
      readTopicIds={(events ?? []).flatMap((e) => (e.topic_id ? [e.topic_id] : []))}
    />
  );
}
