import { describe, expect, it } from "vitest";
import { isGrounded, isRepeat, shuffleOptions } from "@/lib/quiz/generate";
import { scoreQuiz } from "@/lib/quiz/score";
import { isMeaningfulTest, sanitizeExercises, sanitizeTopics } from "@/lib/ingest/pipeline";
import type { GeneratedExerciseWithSolution, QuizQuestion, TopicMap } from "@/lib/schemas/content";

const q = (over: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id: "q1",
  topicId: "loops",
  question: "Where does range(5) stop?",
  options: ["At 4", "At 5", "At 6", "At 0"],
  correctIndex: 0,
  page: 5,
  quote: "range(5) stops before 5, so the last number is 4",
  explanation: "The stop value is excluded.",
  ...over,
});
const pages = new Map([
  [5, "The stop value is never included. range(5) stops before 5, so the last number is 4."],
]);
const topics = [{ id: "loops", name: "Loops", pages: [4, 5] }];

describe("quiz grounding", () => {
  it("keeps a question whose quote is on its page", () => {
    expect(isGrounded(q(), topics, pages)).toBe(true);
  });

  it("rejects a question with a fabricated quote, a missing page, or an unknown topic", () => {
    expect(
      isGrounded(q({ quote: "Lists are always sorted alphabetically by default" }), topics, pages),
    ).toBe(false);
    expect(isGrounded(q({ page: 12 }), topics, pages)).toBe(false);
    expect(isGrounded(q({ topicId: "ghost" }), topics, pages)).toBe(false);
  });
});

describe("quiz helpers", () => {
  it("detects repeated and lightly rephrased questions", () => {
    expect(isRepeat("Where does range(5) stop?", "Where does range(5) stop")).toBe(true);
    expect(isRepeat("Where does range(5) stop?", "What does append do to a list?")).toBe(false);
  });

  it("shuffles options without losing the correct answer", () => {
    for (let i = 0; i < 20; i++) {
      const s = shuffleOptions(q());
      expect(s.options[s.correctIndex]).toBe("At 4");
      expect([...s.options].sort()).toEqual(["At 0", "At 4", "At 5", "At 6"]);
    }
  });
});

describe("scoring happens in code", () => {
  const questions = [
    q({ id: "q1", topicId: "loops" }),
    q({ id: "q2", topicId: "loops" }),
    q({ id: "q3", topicId: "lists", correctIndex: 2 }),
  ];

  it("scores per topic and treats skipped answers as wrong", () => {
    const r = scoreQuiz(questions, [0, -1, 2]);
    expect(r.correct).toBe(2);
    expect(r.perTopic).toEqual({
      loops: { correct: 1, total: 2 },
      lists: { correct: 1, total: 1 },
    });
    expect(r.results[1]).toMatchObject({ correct: false, selectedIndex: -1 });
  });

  it("handles a short answers array", () => {
    expect(scoreQuiz(questions, [0]).correct).toBe(1);
  });
});

describe("ingest sanitising", () => {
  const map: TopicMap = {
    title: "T",
    subject: "S",
    kind: "programming",
    language: "python",
    topics: [
      { name: "A", summary: "aaaaaaaaaaaa", pages: [1, 99] },
      { name: "B", summary: "bbbbbbbbbbbb", pages: [2] },
      { name: "C", summary: "cccccccccccc", pages: [3] },
      { name: "Ghost", summary: "gggggggggggg", pages: [88] },
    ],
  };

  it("removes pages that do not exist and topics left with none", () => {
    const out = sanitizeTopics(map, new Set([1, 2, 3]));
    expect(out.map((t) => t.name)).toEqual(["A", "B", "C"]);
    expect(out[0].pages).toEqual([1]);
  });

  it("fails when too few topics survive", () => {
    expect(() => sanitizeTopics(map, new Set([1]))).toThrow();
  });

  it("drops tests of the wrong kind and fixes a bad page", () => {
    const ex = (over: Partial<GeneratedExerciseWithSolution>): GeneratedExerciseWithSolution => ({
      topicIndex: 0,
      language: "python",
      prompt: "Write f(n) that returns n",
      starterFiles: { "main.py": "def f(n):\n    pass\n" },
      referenceSolution: { "main.py": "def f(n):\n    return n\n" },
      tests: [
        { kind: "assert", name: "a", code: "assert f(1) == 1" },
        { kind: "io", name: "wrong kind", stdin: "", expected: "" },
      ],
      hints: ["a", "b", "c"],
      page: 77,
      ...over,
    });
    const topicsOut = sanitizeTopics(map, new Set([1, 2, 3]));
    const out = sanitizeExercises(
      [
        ex({}),
        ex({ topicIndex: 9 }),
        ex({ tests: [{ kind: "io", name: "x", stdin: "", expected: "" }] }),
      ],
      topicsOut,
      new Set([1, 2, 3]),
    );
    expect(out).toHaveLength(1);
    expect(out[0].tests).toHaveLength(1);
    expect(out[0].page).toBe(1);
  });
});

describe("meaningful exercise tests", () => {
  it("rejects tests a do-nothing starter would pass", () => {
    expect(isMeaningfulTest({ kind: "assert", code: "assert repeat_hello(3) is None" })).toBe(
      false,
    );
    expect(isMeaningfulTest({ kind: "assert", code: "assert f(1) == None" })).toBe(false);
    expect(isMeaningfulTest({ kind: "assert", code: "repeat_hello(3)" })).toBe(false);
  });

  it("keeps real assertions, including 'is not None' and JS throw checks, and io tests", () => {
    expect(isMeaningfulTest({ kind: "assert", code: "assert sum_to(5) == 15" })).toBe(true);
    expect(isMeaningfulTest({ kind: "assert", code: "assert f(1) is not None" })).toBe(true);
    expect(
      isMeaningfulTest({ kind: "assert", code: "if (f(1) !== 2) throw new Error('bad')" }),
    ).toBe(true);
    expect(isMeaningfulTest({ kind: "io", code: undefined })).toBe(true);
  });
});
