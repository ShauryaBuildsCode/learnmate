import { z } from "zod";
import { NextResponse } from "next/server";
import { authorize, isResponse, jsonError } from "@/lib/api";
import { Judge0UnavailableError, runOnJudge0, type ServerLanguage } from "@/lib/runners/judge0";
import {
  filesSchema,
  MAIN_FILE,
  SERVER_LANGUAGES,
  testCaseSchema,
  type TestResult,
} from "@/lib/schemas/exercise";

const bodySchema = z.object({
  language: z.enum(["c", "cpp", "java", "go", "rust"]),
  files: filesSchema,
  stdin: z.string().max(10_000).default(""),
  tests: z.array(testCaseSchema).max(12).optional(),
});

const normalize = (text: string) => text.replace(/\r\n/g, "\n").trim();

/** Forwards compiled-language runs to Judge0. User code never executes on this server. */
export async function POST(request: Request) {
  const auth = await authorize("run");
  if (isResponse(auth)) return auth;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "That run request wasn't valid.");
  const { language, files, stdin, tests } = parsed.data;
  if (!SERVER_LANGUAGES.includes(language)) return jsonError(400, "Unsupported language.");

  const source = files[MAIN_FILE[language]] ?? Object.values(files)[0] ?? "";
  if (source.length > 50_000) return jsonError(413, "That file is too large to run.");
  const lang = language as ServerLanguage;

  try {
    if (!tests) return NextResponse.json({ result: await runOnJudge0(lang, source, stdin) });

    const results: TestResult[] = await Promise.all(
      tests.map(async (t) => {
        if (t.kind !== "io")
          return { name: t.name, passed: false, message: "Unsupported test type." };
        const out = await runOnJudge0(lang, source, t.stdin);
        if (out.exitCode !== 0) {
          return { name: t.name, passed: false, message: out.stderr || "The program crashed." };
        }
        const passed = normalize(out.stdout) === normalize(t.expected);
        return {
          name: t.name,
          passed,
          message: passed
            ? undefined
            : `Expected "${normalize(t.expected)}" but got "${normalize(out.stdout)}"`,
        };
      }),
    );
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof Judge0UnavailableError) return jsonError(503, error.message);
    return jsonError(500, "Something went wrong running your code. Please try again.");
  }
}
