import { describe, expect, it } from "vitest";
import { activityByDay, scoreSeries, streaks, weakestTopics } from "@/lib/study/analytics";
import { deriveSteps, progressOf } from "@/lib/study/checklist";
import { layoutMindMap, validateMindMap, validateNotes } from "@/lib/study/validate";

const topics = [
  { id: "t1", name: "Loops", pages: [3, 4] },
  { id: "t2", name: "Lists", pages: [5] },
];
const pages = new Set([3, 4, 5]);

describe("validateMindMap", () => {
  it("repairs missing parents, cycles, a second root and unknown pages, and adds missing topics", () => {
    const map = validateMindMap(
      {
        nodes: [
          { id: "r", label: "Python", parent: null, kind: "root" },
          { id: "a", label: "Loops", parent: "r", kind: "topic", topicId: "t1", page: 99 },
          { id: "b", label: "for", parent: "c", kind: "concept" },
          { id: "c", label: "while", parent: "b", kind: "concept" },
          { id: "d", label: "orphan", parent: "ghost", kind: "concept" },
          { id: "e", label: "second root", parent: null, kind: "root" },
        ],
      },
      topics,
      pages,
      "Python",
    );
    const byId = new Map(map.nodes.map((n) => [n.id, n]));
    expect(map.nodes.filter((n) => n.parent === null)).toHaveLength(1);
    expect(byId.get("a")!.page).toBeUndefined();
    expect(byId.get("d")!.parent).toBe("r");
    expect(byId.get("e")!.parent).toBe("r");
    expect(byId.get("b")!.parent).toBe("r"); // cycle b <-> c broken
    expect(map.nodes.some((n) => n.topicId === "t2")).toBe(true);
  });
  it("lays every node out with a finite position", () => {
    const map = validateMindMap(
      {
        nodes: [
          { id: "r", label: "R", parent: null, kind: "root" },
          ...Array.from({ length: 5 }, (_, i) => ({
            id: `n${i}`,
            label: `N${i}`,
            parent: "r",
            kind: "topic",
          })),
        ],
      },
      topics,
      pages,
      "R",
    );
    const { placed } = layoutMindMap(map.nodes);
    expect(placed).toHaveLength(map.nodes.length);
    expect(placed.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    const leafYs = placed.filter((p) => p.depth === 1).map((p) => p.y);
    expect(new Set(leafYs).size).toBe(leafYs.length); // no two siblings share a row
  });
});

describe("validateNotes", () => {
  const good = {
    topicId: "t1",
    tldr: "Loops repeat work.",
    keyPoints: [
      { text: "A for loop repeats.", page: 3 },
      { text: "range stops early.", page: 4 },
    ],
    selfCheck: [{ question: "What does range(3) give?", answer: "0, 1, 2" }],
  };
  it("keeps real topics with real pages and drops the rest", () => {
    const { notes, dropped } = validateNotes(
      {
        topics: [
          good,
          { ...good, topicId: "nope" },
          {
            ...good,
            topicId: "t2",
            keyPoints: [
              { text: "Made up page.", page: 77 },
              { text: "Also made up.", page: 78 },
            ],
          },
        ],
      },
      topics,
      pages,
    );
    expect(notes.topics.map((t) => t.topicId)).toEqual(["t1"]);
    expect(dropped).toHaveLength(2);
  });
  it("fails when most topics are unusable", () => {
    expect(() => validateNotes({ topics: [{ ...good, topicId: "zzz" }] }, topics, pages)).toThrow();
  });
});

describe("checklist", () => {
  it("derives steps from real progress, weakest topic first", () => {
    const steps = deriveSteps({
      courseId: "c",
      topics,
      exercises: [{ id: "e1", topicId: "t2", prompt: "Sum a list" }],
      passedExerciseIds: new Set(["e1"]),
      quizzedTopicIds: new Set(["t1"]),
      lessonTopicIds: new Set(["t2"]),
      notesTopicIds: new Set(),
      planOrder: ["t2", "t1"],
    });
    expect(steps[0].topicId).toBe("t2");
    expect(steps.find((s) => s.key === "exercise:e1")!.done).toBe(true);
    expect(steps.find((s) => s.key === "quiz:t1")!.done).toBe(true);
    expect(steps.find((s) => s.key === "notes:t1")!.done).toBe(false);
    expect(progressOf(steps).total).toBe(steps.length);
  });
});

describe("analytics", () => {
  const now = new Date(2026, 9, 23, 12);
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  it("counts activity per day, including empty days", () => {
    const days = activityByDay([at(0), at(0), at(2)], 3, now);
    expect(days.map((d) => d.count)).toEqual([1, 0, 2]);
  });
  it("computes current and longest streaks", () => {
    expect(streaks([at(0), at(1), at(2), at(5), at(6)], now)).toEqual({ current: 3, longest: 3 });
    expect(streaks([at(1), at(2)], now).current).toBe(2); // yesterday still counts
    expect(streaks([at(4)], now).current).toBe(0);
  });
  it("orders quiz scores by time and topics weakest first", () => {
    const attempts = [
      {
        createdAt: at(1),
        kind: "practice" as const,
        perTopic: { a: { correct: 2, total: 2 }, b: { correct: 0, total: 2 } },
      },
      {
        createdAt: at(3),
        kind: "diagnostic" as const,
        perTopic: { a: { correct: 1, total: 2 }, b: { correct: 1, total: 2 } },
      },
    ];
    expect(scoreSeries(attempts).map((s) => s.kind)).toEqual(["diagnostic", "practice"]);
    expect(weakestTopics(attempts)[0]).toMatchObject({ topicId: "b", pct: 25 });
  });
});
