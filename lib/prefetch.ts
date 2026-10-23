import { createClient } from "@/lib/supabase/browser";

/**
 * Asks the server to write the first topic's lesson in the background. Generation takes ~20 seconds, so starting it
 * when the course is created means the lesson is usually ready by the time the student opens it.
 */
export async function prefetchFirstLesson(courseId: string): Promise<void> {
  try {
    const supabase = createClient();
    const [{ data: topic }, { data: profile }] = await Promise.all([
      supabase
        .from("topics")
        .select("id")
        .eq("course_id", courseId)
        .order("position")
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("ui_lang").maybeSingle(),
    ]);
    if (!topic) return;
    await fetch("/api/lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topicId: topic.id, uiLang: profile?.ui_lang ?? "en" }),
      keepalive: true,
    });
  } catch {
    // Prefetching is only an optimisation; the lesson page generates it on demand anyway.
  }
}
