import { authorize, isResponse, jsonError } from "@/lib/api";
import { countSolutionRequests } from "@/lib/ai/prompts/tutor";
import { tutorRequestSchema } from "@/lib/schemas/tutor";
import { guruResponse, loadCourse } from "@/lib/tutor/guru";

/** Streaming chat with Guru. */
export async function POST(request: Request) {
  const auth = await authorize("tutor");
  if (isResponse(auth)) return auth;

  const parsed = tutorRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That question wasn't valid.");
  const { courseId, message, history, context, uiLang } = parsed.data;

  const course = await loadCourse(auth.supabase, courseId);
  if (!course) return jsonError(404, "Course not found.");

  const solutionRequests = countSolutionRequests([
    ...history.filter((h) => h.role === "user").map((h) => h.content),
    message,
  ]);
  return guruResponse({
    supabase: auth.supabase,
    userId: auth.user.id,
    course,
    history,
    question: message,
    context,
    policy: { revealAllowed: solutionRequests >= 2, solutionRequests, uiLang },
    effort: "medium",
  });
}
