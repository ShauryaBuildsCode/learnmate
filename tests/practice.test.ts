import { describe, expect, it } from "vitest";
import { sceneLibrarySpec } from "@/lib/ai/prompts/scenes";
import { validateScript } from "@/lib/lesson/validate";
import { checkCloze, normalizeAnswer } from "@/lib/practice/grade";
import { sanitizePractice } from "@/lib/practice/generate";
import { describeLearner } from "@/lib/tutor/learner";

describe("fill-in-the-blank checking", () => {
  it("ignores case, articles, punctuation and accents", () => {
    expect(normalizeAnswer("  The Mitochondria! ")).toBe("mitochondria");
    expect(checkCloze("the mitochondria", "Mitochondria")).toBe(true);
    expect(checkCloze("Café", "cafe")).toBe(true);
  });
  it("rejects wrong and empty answers, accepts a multi-word answer that contains the key words", () => {
    expect(checkCloze("nucleus", "mitochondria")).toBe(false);
    expect(checkCloze("   ", "mitochondria")).toBe(false);
    expect(checkCloze("light energy", "energy from light")).toBe(false);
    expect(checkCloze("carbon dioxide gas", "carbon dioxide")).toBe(true);
  });
});

describe("sanitizePractice", () => {
  const pages = new Map([
    [2, "Evaporation is the change of liquid water into water vapour, a gas."],
  ]);
  const topics = [{ name: "Evaporation", summary: "s", pages: [2] }];
  const mcq = (quote: string) => ({
    topicIndex: 0,
    page: 2,
    item: {
      kind: "mcq",
      question: "What is evaporation?",
      options: ["a", "b", "c", "d"],
      correctIndex: 0,
      explanation: "Because it is.",
      quote,
    },
  });
  it("keeps items whose quote is on the page and drops invented quotes and unknown topics", () => {
    const out = sanitizePractice(
      {
        items: [
          mcq("Evaporation is the change of liquid water into water vapour"),
          mcq("Evaporation only happens at night in deserts"),
          { ...mcq("x"), topicIndex: 5 },
          {
            topicIndex: 0,
            page: 99,
            item: {
              kind: "cloze",
              text: "Evaporation turns water into ____.",
              answer: "vapour",
              explanation: "A gas.",
            },
          },
        ],
      },
      topics,
      pages,
    );
    expect(out).toHaveLength(2);
    expect(out[1].page).toBe(2); // a page that doesn't exist falls back to the topic's own page
  });
  it("rejects a cloze with no blank", () => {
    expect(
      sanitizePractice(
        {
          items: [
            {
              topicIndex: 0,
              page: 2,
              item: {
                kind: "cloze",
                text: "No blank here at all.",
                answer: "x",
                explanation: "none",
              },
            },
          ],
        },
        topics,
        pages,
      ),
    ).toHaveLength(0);
  });
});

describe("course kind in the lesson prompt", () => {
  const base = { allowTrace: false, exercises: [] };
  it("tells the director to write code in the course language", () => {
    const spec = sceneLibrarySpec({ ...base, kind: "programming", language: "javascript" });
    expect(spec).toContain("CodeReveal");
    expect(spec).toContain('"language" to "javascript"');
    expect(spec).toContain("Steps");
  });
  it("removes every code scene for a concepts course", () => {
    const spec = sceneLibrarySpec({ ...base, kind: "concepts", language: null });
    expect(spec).toContain("NOT about programming");
    expect(spec).not.toContain("- CodeReveal:");
    expect(spec).not.toContain("- ArrayViz:");
  });
});

describe("Steps and Compare scenes", () => {
  const opts = { validPages: new Set([1]), exerciseIds: [], exercisePrompts: {} };
  const common = { seconds: 8, page: 1 };
  const scene = (extra: object, n: number) => ({
    narration: `Narration number ${n} for this scene.`,
    ...common,
    ...extra,
  });
  const script = (extra: object[]) => ({
    title: "T",
    scenes: [
      scene({ type: "TitleCard", title: "Hi", hook: "Hook" }, 0),
      ...extra,
      scene(
        {
          type: "KeyTerms",
          terms: [
            { label: "A", icon: "book" },
            { label: "B", icon: "book" },
            { label: "C", icon: "book" },
          ],
        },
        9,
      ),
    ],
  });
  it("accepts valid Steps and Compare", () => {
    const out = validateScript(
      script([
        scene(
          {
            type: "Steps",
            steps: [
              { label: "Rise" },
              { label: "Cool", detail: "air gets colder" },
              { label: "Condense" },
            ],
          },
          1,
        ),
        scene(
          {
            type: "Compare",
            left: { title: "Warm", points: ["holds more", "stays gas"] },
            right: { title: "Cold", points: ["holds less", "makes drops"] },
          },
          2,
        ),
      ]),
      opts,
    );
    expect(out.dropped).toHaveLength(0);
    expect(out.script.scenes.map((s) => s.type)).toContain("Compare");
  });
  it("drops Steps with too few steps", () => {
    const out = validateScript(
      script([
        scene({ type: "Steps", steps: [{ label: "Only one" }] }, 1),
        scene(
          { type: "Analogy", icon: "book", concept: "A", realLife: "B", bullets: ["one", "two"] },
          2,
        ),
      ]),
      opts,
    );
    expect(out.dropped).toHaveLength(1);
  });
});

describe("describeLearner", () => {
  it("describes level, goal, interests and time, and pitches the help to the level", () => {
    const text = describeLearner({
      name: "A",
      goal: "exam",
      level: "beginner",
      interests: "JavaScript",
      dailyMinutes: 30,
    });
    expect(text).toContain("beginner");
    expect(text).toContain("preparing for an exam");
    expect(text).toContain("JavaScript");
    expect(text).toContain("define every term");
  });
  it("is empty when nothing is known", () => {
    expect(
      describeLearner({ name: null, goal: null, level: null, interests: null, dailyMinutes: null }),
    ).toBe("");
  });
});
