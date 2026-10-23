import { INJECTION_RULE, fence } from "./fence";

export const CONTENT_SYSTEM = `You are the content engine of LearnMate, an app that turns study material into lessons, exercises and quizzes for students.
Rules that apply to everything you write:
- Use ONLY the facts in the course material. Do not add outside facts, examples that contradict it, or page numbers that are not in it.
- ${INJECTION_RULE}
- Write for a beginner: short sentences, everyday words.
- Output only the JSON requested, matching the schema exactly.`;

export function pagesBlock(pages: { page_no: number; text: string }[]): string {
  return fence(
    "course_material",
    pages.map((p) => `<page n="${p.page_no}">\n${p.text}\n</page>`).join("\n"),
  );
}

export function topicMapPrompt(
  pages: { page_no: number; text: string }[],
  fallbackTitle: string,
): string {
  return `${pagesBlock(pages)}

Task: structure this material into a topic map.
- "title": a short course title (use "${fallbackTitle}" if the material has none).
- "subject": the single subject area (for example "Python programming").
- "topics": between 5 and 8 topics, in the order a student should learn them. Each has a short "name", a one-sentence "summary" a beginner can understand, and "pages": the page numbers (from the <page n=...> tags) where the topic is taught. Cover every important part of the material. Worksheets or exercise pages belong to the topic they practise.`;
}

export function exercisesPrompt(
  pages: { page_no: number; text: string }[],
  topics: { name: string; summary: string; pages: number[] }[],
): string {
  const list = topics.map((t, i) => `${i}: ${t.name} (pages ${t.pages.join(", ")})`).join("\n");
  return `${pagesBlock(pages)}

Topics (use the number before the colon as "topicIndex"):
${list}

Task: extract the worksheet exercises from the material and turn each into a runnable coding exercise. If the material has no exercises, write 3 to 5 small practice exercises based only on what it teaches.
For each exercise:
- "language": the programming language the material uses (python, javascript, html, react, c, cpp, java, go or rust).
- "prompt": the task in plain English, including the exact function name and what it must return.
- "starterFiles": a map of file name to starter code. Python uses "main.py", JavaScript "main.js", HTML "index.html"/"style.css"/"script.js", React "App.js", C "main.c", C++ "main.cpp", Java "Main.java" (class Main), Go "main.go", Rust "main.rs". The starter must define the function with a TODO and must FAIL the tests as written.
- "referenceSolution": the same file names with a correct, complete solution that passes every test.
- "tests": 3 to 5 tests. For python, javascript, html and react use {"kind":"assert","name":"short description","code":"..."} where code is statements that throw when the behaviour is wrong (Python: assert statements calling the student's function; JavaScript/HTML/React: if (...) throw new Error("..."); checks, using the DOM for HTML/React). For c, cpp, java, go and rust use {"kind":"io","name":"...","stdin":"...","expected":"..."} where the program reads stdin and prints stdout.
- Never use interactive input(): rewrite the task as a function with arguments (Python/JS) or a program that reads stdin (compiled languages).
- "hints": exactly 3, escalating: 1) a guiding question, 2) the concept and which page covers it, 3) a partial fix that does not give the full solution.
- "page": the page where the exercise or its concept appears.`;
}

export function lessonPrompt(args: {
  topic: { name: string; summary: string; pages: number[] };
  pages: { page_no: number; text: string }[];
  validPages: number[];
  exercises: { id: string; prompt: string; language: string }[];
  allowTrace: boolean;
  uiLang: "en" | "hi";
}): string {
  const ex = args.exercises.length
    ? args.exercises.map((e) => `- id "${e.id}" (${e.language}): ${e.prompt}`).join("\n")
    : "(no exercises)";
  return `${pagesBlock(args.pages)}

Topic: ${args.topic.name}. ${args.topic.summary}
Valid source pages: ${args.validPages.join(", ")}

Write an animated lesson script for this topic as JSON: {"title": string, "scenes": [...]}. 6 to 9 scenes, a few minutes in total, using ONLY these scene types (each scene needs "type", "narration" (1 to 3 spoken sentences), "seconds" (6 to 14) and "page" (one of the valid source pages where the scene's content comes from)):
- TitleCard: {title, hook}. Always first.
- Analogy: {icon one of repeat|package|list|key|map|clock|ticket|building|music|shopping-cart, concept, realLife, bullets[2-4]} an everyday comparison.
- CodeReveal: {code, language, highlightLines[], caption} code adapted from the material, at most 8 lines.
- ${args.allowTrace ? "VariableTracker: {code} short Python (at most 6 lines, no input(), no imports) whose variables change step by step. Do NOT write the steps; they are computed by running the code." : "Do NOT use VariableTracker (the course is not in Python)."}
- FlowDiagram: {variant loop|branch, labels{start, init, condition, body, update, alternative, exit}} labels are very short phrases.
- Checkpoint: {exerciseId, prompt} exactly one, last, using one of these exercise ids:
${ex}
Teach the idea with an analogy first, then code, then the trace or flowchart, then the checkpoint. Explain in simple ${args.uiLang === "hi" ? "Hindi (Devanagari script; keep code and identifiers in English)" : "English"}.`;
}
