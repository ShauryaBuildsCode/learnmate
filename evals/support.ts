import { createServerClient } from "@supabase/ssr";
import dotenv from "dotenv";
import { createUserClient } from "../lib/supabase/service";
import type { TutorFrame } from "../lib/schemas/tutor";
import { tutorFrameSchema, type TutorContext } from "../lib/schemas/tutor";
import { readNdjson } from "../lib/ndjson";

dotenv.config({ path: ".env.local" });

export const EMAIL = process.env.E2E_USER_EMAIL!;
export const PASSWORD = process.env.E2E_USER_PASSWORD!;
export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";

export async function userClient() {
  return createUserClient(EMAIL, PASSWORD);
}

/** Signs in through @supabase/ssr and returns the cookie header the Next.js routes expect. */
export async function sessionCookie(): Promise<string> {
  const jar = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`Eval sign-in failed: ${error.message}`);
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

export interface TutorReply {
  text: string;
  beyond: boolean;
  citedPages: number[];
  provider: "claude" | "groq" | null;
  error: string | null;
  /** Code changes Guru proposed for the editor. */
  edits: { startLine: number; endLine: number; newText: string }[];
}

export const EMPTY_CONTEXT: TutorContext = {
  topic: null,
  scene: null,
  exercise: null,
  language: null,
  files: null,
  stdout: null,
  stderr: null,
  testResults: null,
};

/** Drives the real /api/tutor route and collects the verified final frame. */
export async function askTutor(
  cookie: string,
  body: {
    courseId: string;
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
    context?: TutorContext;
    uiLang?: "en" | "hi";
  },
): Promise<TutorReply> {
  const res = await fetch(`${BASE_URL}/api/tutor`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ history: [], context: EMPTY_CONTEXT, uiLang: "en", ...body }),
  });
  const reply: TutorReply = {
    text: "",
    beyond: false,
    citedPages: [],
    provider: null,
    error: null,
    edits: [],
  };
  if (!res.ok) {
    reply.error = `HTTP ${res.status}: ${await res.text()}`;
    return reply;
  }
  await readNdjson(res, (line) => {
    const f = tutorFrameSchema.safeParse(line);
    if (!f.success) return;
    const frame: TutorFrame = f.data;
    if (frame.t === "meta") reply.provider = frame.provider;
    else if (frame.t === "edit")
      reply.edits.push(
        ...frame.edits.map((e) => ({
          startLine: e.startLine,
          endLine: e.endLine,
          newText: e.newText,
        })),
      );
    else if (frame.t === "final") {
      reply.text = frame.text;
      reply.beyond = frame.beyond;
      reply.citedPages = frame.citedPages;
    } else if (frame.t === "error") reply.error = frame.message;
  });
  return reply;
}

export class Report {
  rows: { section: string; name: string; ok: boolean; detail?: string }[] = [];
  check(section: string, name: string, ok: boolean, detail?: string) {
    this.rows.push({ section, name, ok, detail });
    console.log(
      `${ok ? "PASS" : "FAIL"}  [${section}] ${name}${!ok && detail ? ` -> ${detail}` : ""}`,
    );
  }
  get failed() {
    return this.rows.filter((r) => !r.ok);
  }
}
