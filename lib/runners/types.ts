import type { Files, Language, RunResult, TestCase, TestResult } from "@/lib/schemas/exercise";

export type { Files, Language, RunResult, TestCase, TestResult };

/** The one interface every execution backend satisfies. */
export interface Runner {
  run(files: Files, language: Language, stdin: string): Promise<RunResult>;
  test(files: Files, language: Language, tests: TestCase[]): Promise<TestResult[]>;
}
