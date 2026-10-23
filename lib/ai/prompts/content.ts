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

export function quizPrompt(args: {
  pages: { page_no: number; text: string }[];
  topics: { id: string; name: string; pages: number[] }[];
  count: number;
  avoid: string[];
  uiLang: "en" | "hi";
}): string {
  const list = args.topics.map((t) => `- topicId "${t.id}": ${t.name} (pages ${t.pages.join(", ")})`).join("\n");
  const avoid = args.avoid.length
    ? `\nDo NOT repeat or rephrase any of these earlier questions:\n${args.avoid.map((q) => `- ${q}`).join("\n")}`
    : "";
  return `${pagesBlock(args.pages)}

Topics:
${list}

Write exactly ${args.count} multiple-choice questions, covering the topics above (at least one per topic when there are enough questions). Each question has:
- "topicId": one of the ids above.
- "question": a clear question a beginner can answer from the material.
- "options": exactly 4 short options, one correct, three plausible but wrong.
- "correctIndex": 0 to 3.
- "page": the page number where the answer is taught.
- "quote": an EXACT sentence or phrase copied word for word from that page that supports the correct answer (10 to 40 words). Do not paraphrase the quote.
- "explanation": one or two sentences explaining why the answer is right.
- "id": a short unique id such as "q1".${avoid}
Write the questions in ${args.uiLang === "hi" ? "simple Hindi (Devanagari; keep the quote exactly as it appears in the material, and keep code in English)" : "simple English"}.`;
}

export function planPrompt(args: {
  topics: {
    topicId: string;
    name: string;
    summary: string;
    level: string;
    score: number;
    pages: number[];
    exercises: { prompt: string; passed: boolean }[];
  }[];
  uiLang: "en" | "hi";
}): string {
  const lines = args.topics
    .map(
      (t, i) =>
        `${i + 1}. topicId "${t.topicId}" - ${t.name} (${t.level}, mastery ${Math.round(t.score * 100)}%). Pages: ${t.pages.join(", ")}. Exercises: ${
          t.exercises.length ? t.exercises.map((e) => `${e.passed ? "[done]" : "[todo]"} ${e.prompt}`).join(" | ") : "none"
        }`,
    )
    .join("\n");
  return `A student's revision plan. The topics are already ordered weakest first by code; keep that order.
${lines}

For each topic write: "topicId" (copy exactly), "why" (one encouraging sentence saying why this topic is in this position, using its mastery), "pagesToReread" (1 to 3 page numbers chosen only from that topic's pages), and "nextStep" (one concrete action: which lesson to watch and which exercise to do, or what to practise next). Write for the student in ${args.uiLang === "hi" ? "simple Hindi (Devanagari)" : "simple English"}.`;
}

export function changeSummaryPrompt(args: {
  changes: { topic: string; from: string; to: string; direction: string }[];
  nextFocus: string | null;
  uiLang: "en" | "hi";
}): string {
  return `Mastery changes since the last revision plan:
${args.changes.map((c) => `- ${c.topic}: ${c.from} -> ${c.to} (${c.direction})`).join("\n")}
Next focus topic: ${args.nextFocus ?? "none, everything is strong"}.
Write ONE sentence (under 30 words) for a banner telling the student what changed and what to focus on next, for example "Loops moved from weak to strong; next focus is Lists." Use only the facts above. Write in ${args.uiLang === "hi" ? "simple Hindi (Devanagari)" : "English"}.`;
}
