import { isServerLanguage } from "@/lib/schemas/exercise";
import { runInIframe, testInIframe } from "./iframe";
import { runPython, testPython } from "./python";
import type { Files, Language, RunResult, Runner, TestCase, TestResult } from "./types";

async function post<T>(body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the code runner. Check your connection and try again.");
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "The code runner returned an error.");
  return data;
}

/** Routes each language to its backend: iframe (web), Pyodide worker (Python) or Judge0 (compiled). */
export const runner: Runner = {
  async run(files: Files, language: Language, stdin: string): Promise<RunResult> {
    if (language === "python") return runPython(files, stdin);
    if (isServerLanguage(language))
      return (await post<{ result: RunResult }>({ language, files, stdin })).result;
    return runInIframe(files, language);
  },
  async test(files: Files, language: Language, tests: TestCase[]): Promise<TestResult[]> {
    if (language === "python") return testPython(files, tests);
    if (isServerLanguage(language))
      return (await post<{ results: TestResult[] }>({ language, files, tests })).results;
    return testInIframe(files, language, tests);
  },
};
