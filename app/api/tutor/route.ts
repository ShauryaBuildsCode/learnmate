import { authorize, isResponse, jsonError } from "@/lib/api";
import { countSolutionRequests, SECOND_ASK_TASK } from "@/lib/ai/prompts/tutor";
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
    policy: {
      // With no exercise open there is nothing to protect, so coding help is never gated.
      revealAllowed: solutionRequests >= 1 || !context.exercise,
      solutionRequests,
      uiLang,
      task: solutionRequests >= 1 ? SECOND_ASK_TASK : undefined,
    },
    allowEdits: true,
    effort: "medium",
  });
}
