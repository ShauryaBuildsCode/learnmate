import type { SupabaseClient } from "@supabase/supabase-js";
import { streamTutor } from "@/lib/ai/router";
import { buildTurn, courseBlock, GURU_PERSONA, type TutorPolicy } from "@/lib/ai/prompts/tutor";
import { fence } from "@/lib/ai/prompts/fence";
import type { TutorTurn } from "@/lib/ai/types";
import { groundAnswer, toPageMap } from "@/lib/grounding";
import { EDIT_CODE_TOOL, fromToolInput, validateEdits } from "@/lib/ide/edits";
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
  /** Let Guru propose edits to the student's code (needs code in the context). */
  allowEdits?: boolean;
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
      let proposed: unknown[] = [];
      let editCount = 0;
      const files = call.context.files;
      const canEdit = !!call.allowEdits && !!files && Object.keys(files).length > 0;
      try {
        for await (const event of streamTutor({
          persona: GURU_PERSONA,
          courseBlock: courseBlock(call.course.title, call.course.pages),
          turns,
          effort: call.effort,
          maxTokens: 2000,
          ...(canEdit
            ? {
                tools: [EDIT_CODE_TOOL],
                onToolUses: (uses: { name: string; input: unknown }[]) => {
                  proposed = uses
                    .filter((u) => u.name === EDIT_CODE_TOOL.name)
                    .map((u) => fromToolInput(u.input));
                },
              }
            : {}),
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
        // Guru's proposed edits are checked against the real code and the teaching policy before the browser sees them.
        if (canEdit && files && proposed.length) {
          const { edits, rejected } = validateEdits(proposed, files, call.policy.revealAllowed);
          if (rejected.length) console.info("[guru] edits refused:", rejected.join("; "));
          if (edits.length) {
            send({ t: "edit", edits });
            editCount = edits.length;
          }
        }
        // A reply that is only a tool call still needs words, so the student isn't left with an empty bubble.
        if (!text.trim() && editCount > 0) {
          text =
            editCount > 1
              ? "I've made a few changes to your code. You can undo them in the editor."
              : "I've made a change to your code. You can undo it in the editor.";
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
