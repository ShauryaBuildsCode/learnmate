import { NextResponse } from "next/server";
import { authorize, isResponse } from "@/lib/api";

/** Everything the student owns, as one JSON file. Every query runs under their own RLS, so it can only return their rows. */
export async function GET() {
  const auth = await authorize("account");
  if (isResponse(auth)) return auth;
  const db = auth.supabase;
  const [
    profile,
    courses,
    topics,
    exercises,
    practice,
    lessons,
    attempts,
    plans,
    notes,
    maps,
    checklist,
    messages,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
    db.from("courses").select("*"),
    db.from("topics").select("*"),
    db.from("exercises").select("id,course_id,topic_id,language,prompt,page"),
    db.from("practice_items").select("*"),
    db.from("lessons").select("topic_id,ui_lang,script,created_at"),
    db.from("quiz_attempts").select("*"),
    db.from("plans").select("*"),
    db.from("study_notes").select("*"),
    db.from("mind_maps").select("*"),
    db.from("checklist_items").select("*"),
    db.from("tutor_messages").select("course_id,role,content,created_at"),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    email: auth.user.email,
    profile: profile.data,
    courses: courses.data,
    topics: topics.data,
    exercises: exercises.data,
    practiceItems: practice.data,
    lessons: lessons.data,
    quizAttempts: attempts.data,
    plans: plans.data,
    revisionNotes: notes.data,
    mindMaps: maps.data,
    checklist: checklist.data,
    guruConversations: messages.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="learnmate-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
