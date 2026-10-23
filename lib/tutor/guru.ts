import type { SupabaseClient } from "@supabase/supabase-js";
import { streamTutor } from "@/lib/ai/router";
import { buildTurn, courseBlock, GURU_PERSONA, type TutorPolicy } from "@/lib/ai/prompts/tutor";
import { fence } from "@/lib/ai/prompts/fence";
import type { TutorTurn } from "@/lib/ai/types";
import { groundAnswer, toPageMap } from "@/lib/grounding";
import type { Database, Json } from "@/lib/supabase/types";
import type { TutorContext, TutorFrame } from "@/lib/schemas/tutor";

type Supabase = SupabaseClient<Database>;

export interface CourseData {
  id: string;
  title: string;
  pages: { page_no: number; text: string }[];
}

export async function loadCourse(supabase: Supabase, courseId: string): Promise<CourseData | null> {
  const { data: course } = await supabase
    .from("courses")
    .select("id,title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return null;
  const { data: pages } = await supabase
    .from("course_pages")
    .select("page_no,text")
    .eq("course_id", courseId)
    .order("page_no");
  return { id: course.id, title: course.title, pages: pages ?? [] };
}

const MAX_HISTORY_TURNS = 8;

export interface GuruCall {
  supabase: Supabase;
  userId: string;
  course: CourseData;
  history: TutorTurn[];
  /** What the student typed (or a short label for IDE-initiated calls). */
  question: string;
  context: TutorContext;
  policy: TutorPolicy;
  effort: "low" | "medium";
  /** Hint rung to report back and persist, if this call was a hint. */
  rung?: number;
}

function summarize(
  ctx: TutorContext,
  cited: number[],
): Extract<TutorFrame, { t: "final" }>["looked"] {
  const pages = new Set(cited);
  if (ctx.scene) pages.add(ctx.scene.page);
  return {
    pages: [...pages].sort((a, b) => a - b),
    hadCode: !!ctx.files,
    hadRunOutput: !!(ctx.stdout || ctx.stderr),
    tests: ctx.testResults
      ? { passed: ctx.testResults.filter((t) => t.passed).length, total: ctx.testResults.length }
      : null,
    scene: ctx.scene ? `${ctx.scene.index + 1}. ${ctx.scene.title}` : null,
  };
}

/** Streams Guru's reply as NDJSON frames, then a verified `final` frame, and saves the exchange. */
export function guruResponse(call: GuruCall): Response {
  const encoder = new TextEncoder();
  const pageMap = toPageMap(call.course.pages);

  const history: TutorTurn[] = call.history.slice(-MAX_HISTORY_TURNS).map((t) => ({
    role: t.role,
    content: t.role === "user" ? fence("student_question", t.content) : t.content,
  }));
  const turns: TutorTurn[] = [
    ...history,
    { role: "user", content: buildTurn(call.context, call.question, call.policy) },
  ];

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (frame: TutorFrame) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));
      let text = "";
      let provider: "claude" | "groq" = "claude";
      try {
        for await (const event of streamTutor({
          persona: GURU_PERSONA,
          courseBlock: courseBlock(call.course.title, call.course.pages),
          turns,
          effort: call.effort,
          maxTokens: 2000,
        })) {
          if (event.type === "meta") {
            provider = event.provider === "groq" ? "groq" : "claude";
            if (event.reset) text = "";
            send({ t: "meta", provider, note: event.fallbackNote, reset: event.reset });
          } else {
            text += event.text;
            send({ t: "delta", text: event.text });
          }
        }
        const grounded = groundAnswer(text, pageMap);
        send({
          t: "final",
          text: grounded.text,
          beyond: grounded.beyond,
          citedPages: grounded.citedPages,
          stripped: grounded.stripped,
          looked: summarize(call.context, grounded.citedPages),
          rung: call.rung,
        });
        await call.supabase.from("tutor_messages").insert([
          { user_id: call.userId, course_id: call.course.id, role: "user", content: call.question },
          {
            user_id: call.userId,
            course_id: call.course.id,
            role: "assistant",
            content: grounded.text,
            provider,
            context: summarize(call.context, grounded.citedPages) as unknown as Json,
          },
        ]);
      } catch {
        send({
          t: "error",
          message: "Guru couldn't answer just now. Please try again in a moment.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
  });
}
