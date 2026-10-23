import { z } from "zod";

export const LANGUAGES = [
  "python",
  "javascript",
  "html",
  "react",
  "c",
  "cpp",
  "java",
  "go",
  "rust",
] as const;
export const languageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof languageSchema>;

export const filesSchema = z.record(z.string(), z.string());
export type Files = z.infer<typeof filesSchema>;

/** `assert` tests are statements that throw on failure (Python / JS / HTML / React).
 *  `io` tests feed stdin and compare stdout (compiled languages). */
export const testCaseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("assert"), name: z.string(), code: z.string() }),
  z.object({ kind: z.literal("io"), name: z.string(), stdin: z.string(), expected: z.string() }),
]);
export type TestCase = z.infer<typeof testCaseSchema>;

export const exerciseSchema = z.object({
  topicId: z.string(),
  language: languageSchema,
  prompt: z.string().min(10),
  starterFiles: filesSchema,
  tests: z.array(testCaseSchema).min(1),
  hints: z.array(z.string()).length(3),
  page: z.number().int().positive(),
});
export type GeneratedExercise = z.infer<typeof exerciseSchema>;

export const testResultSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  message: z.string().optional(),
});
export type TestResult = z.infer<typeof testResultSchema>;

export const runResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
  durationMs: z.number(),
});
export type RunResult = z.infer<typeof runResultSchema>;

/** Languages that execute on Judge0 through /api/run. */
export const SERVER_LANGUAGES: readonly Language[] = ["c", "cpp", "java", "go", "rust"];
export function isServerLanguage(language: Language): boolean {
  return SERVER_LANGUAGES.includes(language);
}

export const MAIN_FILE: Record<Language, string> = {
  python: "main.py",
  javascript: "main.js",
  html: "index.html",
  react: "App.js",
  c: "main.c",
  cpp: "main.cpp",
  java: "Main.java",
  go: "main.go",
  rust: "main.rs",
};

export const MONACO_LANGUAGE: Record<string, string> = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  html: "html",
  css: "css",
  c: "c",
  cpp: "cpp",
  java: "java",
  go: "go",
  rs: "rust",
};
