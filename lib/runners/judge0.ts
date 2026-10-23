import { serverEnv } from "@/lib/env";
import type { Language, RunResult } from "@/lib/schemas/exercise";

export type ServerLanguage = Extract<Language, "c" | "cpp" | "java" | "go" | "rust">;

const LANGUAGE_IDS: Record<ServerLanguage, number> = { c: 50, cpp: 54, java: 62, go: 60, rust: 73 };

export const JUDGE0_LIMITS = { cpuSeconds: 5, wallSeconds: 10, memoryKb: 256_000 };

export class Judge0UnavailableError extends Error {
  constructor(detail: string) {
    super(`The code runner is unreachable right now (${detail}). Try again in a moment.`);
    this.name = "Judge0UnavailableError";
  }
}

interface Judge0Response {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
  status: { id: number; description: string };
}

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const unb64 = (text: string | null) => (text ? Buffer.from(text, "base64").toString("utf8") : "");

/** Status ids from Judge0: 3 accepted, 5 time limit exceeded, 6 compile error, 7-12 runtime errors. */
export function toRunResult(r: Judge0Response): RunResult {
  const stderr = unb64(r.stderr) || unb64(r.compile_output) || unb64(r.message);
  const timedOut = r.status.id === 5;
  return {
    stdout: unb64(r.stdout),
    stderr: timedOut ? "Time limit exceeded. Check for an infinite loop." : stderr,
    exitCode: r.status.id === 3 ? 0 : timedOut ? 124 : 1,
    durationMs: Math.round(Number(r.time ?? 0) * 1000),
  };
}

export async function runOnJudge0(
  language: ServerLanguage,
  source: string,
  stdin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RunResult> {
  const env = serverEnv();
  const base = env.JUDGE0_URL.replace(/\/$/, "");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (env.JUDGE0_API_KEY) {
    headers["x-rapidapi-key"] = env.JUDGE0_API_KEY;
    headers["x-rapidapi-host"] = new URL(base).host;
  }
  let response: Response;
  try {
    response = await fetchImpl(`${base}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        source_code: b64(source),
        language_id: LANGUAGE_IDS[language],
        stdin: b64(stdin),
        cpu_time_limit: JUDGE0_LIMITS.cpuSeconds,
        wall_time_limit: JUDGE0_LIMITS.wallSeconds,
        memory_limit: JUDGE0_LIMITS.memoryKb,
      }),
    });
  } catch (error) {
    throw new Judge0UnavailableError(error instanceof Error ? error.message : "network error");
  }
  if (!response.ok) throw new Judge0UnavailableError(`HTTP ${response.status}`);
  return toRunResult((await response.json()) as Judge0Response);
}
