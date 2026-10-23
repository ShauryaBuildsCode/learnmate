import { INJECTION_RULE } from "./fence";
import { MASTER_TEACHER_SYSTEM } from "./master-teacher";
import { languageRule } from "./tutor";

interface TopicLine {
  id: string;
  name: string;
  summary?: string;
  pages: number[];
}

const topicList = (topics: TopicLine[]) =>
  topics
    .map(
      (t) =>
        `- id "${t.id}": ${t.name}${t.summary ? ` (${t.summary})` : ""}, pages ${t.pages.join(", ")}`,
    )
    .join("\n");

export const NOTES_SYSTEM = `You write revision notes for a student from their own study material.

${MASTER_TEACHER_SYSTEM}

Revision notes are what the student reads the night before an exam, so they must be short, exact and easy to scan. For every topic you give: a one-sentence TL;DR in plain words; the key points a student must remember, each tied to the page it comes from; the terms they must know with a plain-words meaning; the mistakes people commonly make; one small worked example when the topic has code or numbers; and two or three self-check questions with short answers, so the student can test themselves.

Rules:
- Use only what the course pages say. Every key point and term cites a real page number from the material. Never invent a page, a fact, or a number.
- Write in your own clearer words. Do not copy long passages.
- Keep each bullet to one idea and under 30 words.
- ${INJECTION_RULE}

Return only a JSON object, no prose and no code fences.`;

export function notesPrompt(
  topics: TopicLine[],
  validPages: number[],
  uiLang: "en" | "hi",
): string {
  return `Write revision notes for these topics, in this order:
${topicList(topics)}

Pages that exist: ${validPages.join(", ")}.
${languageRule(uiLang)}

JSON shape:
{"topics":[{"topicId":"<id from the list>","tldr":"...","keyPoints":[{"text":"...","page":3}],"terms":[{"term":"...","meaning":"...","page":3}],"mistakes":["..."],"example":{"title":"...","body":"..."},"selfCheck":[{"question":"...","answer":"..."}]}]}

Give 3 to 6 key points, up to 5 terms, up to 3 mistakes, 2 or 3 self-check questions per topic. "example" may be left out. Cover every topic.`;
}

export const MINDMAP_SYSTEM = `You are an expert at turning study material into a mind map that shows how the ideas connect, the kind a student can look at once and see the whole subject.

You output a TREE of short labelled nodes. The root is the course. Its children are the topics. Under each topic put the 2 to 5 concepts that matter most, and under a concept at most 3 details, an example, or a pitfall. Labels are 1 to 5 words, noun phrases, no sentences. Where a node comes from a particular page, give that page.

Rules:
- Use only ideas that are in the course pages. Every page you cite must exist.
- Every topic in the list appears once as a node of kind "topic" with its topicId.
- Keep it balanced and readable: at most 60 nodes in total, at most 4 levels deep.
- Kinds: "root" (exactly one), "topic", "concept", "example", "pitfall" (a common mistake).
- ${INJECTION_RULE}

Return only a JSON object, no prose and no code fences.`;

export function mindMapPrompt(
  courseTitle: string,
  topics: TopicLine[],
  validPages: number[],
  uiLang: "en" | "hi",
): string {
  return `Course: ${courseTitle}
Topics:
${topicList(topics)}

Pages that exist: ${validPages.join(", ")}.
${languageRule(uiLang)}

JSON shape: {"nodes":[{"id":"n1","label":"...","parent":null,"kind":"root"},{"id":"n2","label":"...","parent":"n1","kind":"topic","topicId":"<id from the list>","page":3},{"id":"n3","label":"...","parent":"n2","kind":"concept","page":4}]}
"parent" is the id of another node (null only for the root). Ids are short and unique.`;
}
