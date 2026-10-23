import { describe, expect, it } from "vitest";
import {
  computeMastery,
  diffMastery,
  fallbackChangeSummary,
  levelOf,
  orderWeakestFirst,
  type QuizSummary,
  type TopicRef,
} from "@/lib/mastery";

const topics: TopicRef[] = [
  { id: "loops", name: "Loops", position: 0, exerciseIds: ["e1", "e2"] },
  { id: "lists", name: "Lists", position: 1, exerciseIds: ["e3"] },
  { id: "intro", name: "Intro", position: 2, exerciseIds: [] },
];
const quiz = (perTopic: QuizSummary["perTopic"]): QuizSummary => ({ perTopic });

describe("levels", () => {
  it("uses the 0.6 / 0.8 boundaries", () => {
    expect(levelOf(0)).toBe("weak");
    expect(levelOf(0.599)).toBe("weak");
    expect(levelOf(0.6)).toBe("okay");
    expect(levelOf(0.799)).toBe("okay");
    expect(levelOf(0.8)).toBe("strong");
    expect(levelOf(1)).toBe("strong");
  });
});

describe("computeMastery", () => {
  it("weights quiz accuracy and exercises 50/50", () => {
    const [loops] = computeMastery(
      topics,
      [quiz({ loops: { correct: 1, total: 2 } })],
      new Set(["e1", "e2"]),
    );
    expect(loops.quizAccuracy).toBe(0.5);
    expect(loops.exerciseShare).toBe(1);
    expect(loops.score).toBe(0.75);
    expect(loops.level).toBe("okay");
  });

  it("flags a topic weak when the quiz was missed and no exercise passed", () => {
    const [loops] = computeMastery(topics, [quiz({ loops: { correct: 0, total: 2 } })], new Set());
    expect(loops.score).toBe(0);
    expect(loops.level).toBe("weak");
  });

  it("lets the quiz carry the whole score for topics without exercises", () => {
    const m = computeMastery(topics, [quiz({ intro: { correct: 1, total: 1 } })], new Set());
    expect(m[2].score).toBe(1);
    expect(m[2].exerciseShare).toBeNull();
  });

  it("uses the latest quiz that covered the topic", () => {
    const m = computeMastery(
      topics,
      [
        quiz({ lists: { correct: 1, total: 1 } }),
        quiz({ loops: { correct: 0, total: 1 }, lists: { correct: 0, total: 1 } }),
      ],
      new Set(),
    );
    expect(m[1].quizAccuracy).toBe(1);
    expect(m[0].quizAccuracy).toBe(0);
  });
});

describe("plan ordering", () => {
  it("puts the weakest topic first and breaks ties by course order", () => {
    const m = computeMastery(
      topics,
      [
        quiz({
          loops: { correct: 0, total: 2 },
          lists: { correct: 2, total: 2 },
          intro: { correct: 0, total: 1 },
        }),
      ],
      new Set(),
    );
    const order = orderWeakestFirst(m, topics).map((x) => x.topicId);
    expect(order[0]).toBe("loops");
    expect(order[1]).toBe("intro");
    expect(order[2]).toBe("lists");
  });
});

describe("plan diff", () => {
  const v1 = computeMastery(
    topics,
    [
      quiz({
        loops: { correct: 0, total: 2 },
        lists: { correct: 1, total: 1 },
        intro: { correct: 1, total: 1 },
      }),
    ],
    new Set(),
  );
  const v2 = computeMastery(
    topics,
    [
      quiz({
        loops: { correct: 0, total: 2 },
        lists: { correct: 1, total: 1 },
        intro: { correct: 1, total: 1 },
      }),
    ],
    new Set(["e1", "e2", "e3"]),
  );
  const names = { loops: "Loops", lists: "Lists", intro: "Intro" };

  it("treats the first plan as meaningful", () => {
    expect(diffMastery(null, v1, topics).meaningful).toBe(true);
  });

  it("reports no meaningful change when nothing moved", () => {
    expect(diffMastery(v1, v1, topics).meaningful).toBe(false);
  });

  it("detects level changes and the new focus topic", () => {
    const d = diffMastery(v1, v2, topics);
    expect(d.meaningful).toBe(true);
    const loops = d.changes.find((c) => c.topicId === "loops");
    expect(loops?.direction).toBe("up");
    const lists = d.changes.find((c) => c.topicId === "lists");
    expect(lists).toMatchObject({ from: "weak", to: "strong", direction: "up" });
    expect(d.nextFocus).toBe("loops");
  });

  it("writes a fallback sentence naming the topics that moved", () => {
    const strongLoops = computeMastery(
      topics,
      [
        quiz({
          loops: { correct: 2, total: 2 },
          lists: { correct: 1, total: 1 },
          intro: { correct: 1, total: 1 },
        }),
      ],
      new Set(["e1", "e2", "e3"]),
    );
    const d = diffMastery(v1, strongLoops, topics);
    const sentence = fallbackChangeSummary(d, names);
    expect(sentence).toContain("Loops moved from weak to strong");
    expect(sentence).toContain("every topic is now strong");
  });
});
