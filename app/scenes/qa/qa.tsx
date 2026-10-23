"use client";

import { SceneRenderer } from "@/components/lesson/scene-renderer";
import { FrameProvider } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";

const FPS = 30;
const base = { seconds: 12, page: 3 };
const long =
  "Here is a long narration that runs across several lines so that the caption box is as full as it will ever be in a real lesson, with plenty of words in it to wrap.";

export const QA_SCENES: { name: string; scene: Scene }[] = [
  {
    name: "TitleCard long",
    scene: {
      type: "TitleCard",
      ...base,
      narration: long,
      title: "Arithmetic Progressions Explained Deeply",
      hook: "Can you guess the next number? Look at 25, 18, 11, 4. What is coming next, and why does the pattern work the way it does?",
    },
  },
  {
    name: "TitleCard short",
    scene: {
      type: "TitleCard",
      ...base,
      narration: long,
      title: "Loops",
      hook: "Write it once, run it a thousand times.",
    },
  },
  {
    name: "KeyTerms 8 long",
    scene: {
      type: "KeyTerms",
      ...base,
      narration: long,
      terms: [
        "Common Difference",
        "First Term",
        "nth Term",
        "Sequence",
        "Arithmetic Mean",
        "Sum of Terms",
        "Recurrence",
        "Progression",
      ].map((label, i) => ({
        label,
        icon: (["book", "key", "map", "list", "zap", "target", "layers", "code"] as const)[i],
      })),
    },
  },
  {
    name: "KeyTerms 3",
    scene: {
      type: "KeyTerms",
      ...base,
      narration: long,
      terms: [
        { label: "Term", icon: "list" },
        { label: "Difference", icon: "zap" },
        { label: "Common Difference", icon: "target" },
      ],
    },
  },
  {
    name: "KeyTerms 5",
    scene: {
      type: "KeyTerms",
      ...base,
      narration: long,
      terms: ["Variable", "Function", "Argument", "Return value", "Scope"].map((label) => ({
        label,
        icon: "code" as const,
      })),
    },
  },
  {
    name: "Bento 5",
    scene: {
      type: "Bento",
      ...base,
      narration: long,
      cards: [
        {
          title: "Common difference",
          body: "The fixed number you add each time to get the next term",
          tone: "dark",
          icon: "key",
        },
        { title: "First term", body: "Where the sequence starts", tone: "light", icon: "rocket" },
        { title: "Terms so far", stat: { value: 25, suffix: "+" }, tone: "accent", icon: "list" },
        { title: "Formula", body: "a plus n minus one times d", tone: "light", icon: "code" },
        {
          title: "Used in",
          body: "Savings plans, stairs, seating rows",
          tone: "dark",
          icon: "building",
        },
      ],
    },
  },
  {
    name: "Bento 3",
    scene: {
      type: "Bento",
      ...base,
      narration: long,
      cards: [
        {
          title: "One",
          body: "First thing to remember about this topic in plain words",
          tone: "dark",
          icon: "key",
        },
        { title: "Two", body: "Second", tone: "light", icon: "map" },
        { title: "Three", stat: { value: 3, prefix: "x" }, tone: "accent", icon: "zap" },
      ],
    },
  },
  {
    name: "Analogy long",
    scene: {
      type: "Analogy",
      ...base,
      narration: long,
      icon: "clock",
      concept: "A constant step",
      realLife: "A staircase where every step is the same height",
      bullets: [
        "Each number adds the same amount to the one before it",
        "Skipping ahead is easy because the step never changes",
        "The step can also be negative, so the stairs go down",
        "Counting the steps tells you how far you have climbed",
      ],
    },
  },
  {
    name: "Analogy short",
    scene: {
      type: "Analogy",
      ...base,
      narration: long,
      icon: "package",
      concept: "Variable",
      realLife: "Labelled box",
      bullets: ["Holds a value", "Label stays, value changes"],
    },
  },
  {
    name: "Steps 6",
    scene: {
      type: "Steps",
      ...base,
      narration: long,
      steps: [
        { label: "Vapour rises", detail: "Warm air lifts it upward" },
        { label: "Air cools", detail: "Colder air holds less vapour" },
        { label: "Droplets form", detail: "Around tiny bits of dust" },
        { label: "Clouds gather" },
        { label: "Rain falls", detail: "When droplets grow heavy" },
        { label: "Water collects", detail: "In rivers, lakes and soil" },
      ],
    },
  },
  {
    name: "Steps 3",
    scene: {
      type: "Steps",
      ...base,
      narration: long,
      steps: [
        { label: "Read", detail: "the question" },
        { label: "Plan" },
        { label: "Solve", detail: "step by step" },
      ],
    },
  },
  {
    name: "Compare 4",
    scene: {
      type: "Compare",
      ...base,
      narration: long,
      left: {
        title: "Arithmetic progression",
        points: [
          "Add the same number each time",
          "Straight-line growth",
          "Difference stays constant",
          "Example: 2, 5, 8, 11",
        ],
      },
      right: {
        title: "Geometric progression",
        points: [
          "Multiply by the same number",
          "Curved growth",
          "Ratio stays constant",
          "Example: 2, 6, 18, 54",
        ],
      },
    },
  },
  {
    name: "Compare 2",
    scene: {
      type: "Compare",
      ...base,
      narration: long,
      left: { title: "Before", points: ["Slow", "Manual"] },
      right: { title: "After", points: ["Fast", "Automatic"] },
    },
  },
  {
    name: "RepeatBurst",
    scene: {
      type: "RepeatBurst",
      ...base,
      narration: long,
      label: "print Hello",
      count: 1000,
      icon: "repeat",
    },
  },
  {
    name: "CodeReveal 8",
    scene: {
      type: "CodeReveal",
      ...base,
      narration: long,
      language: "javascript",
      code: "function sumArray(numbers) {\n  let total = 0;\n  for (const n of numbers) {\n    total += n;\n  }\n  return total;\n}\nconsole.log(sumArray([1, 2, 3]));",
      highlightLines: [2, 4],
      caption: "total starts at zero and grows by each number in the array",
    },
  },
  {
    name: "ArrayViz",
    scene: {
      type: "ArrayViz",
      ...base,
      narration: long,
      name: "scores",
      items: ["90", "72", "85", "60", "100", "45", "77", "88"],
      mode: "iterate",
    },
  },
  {
    name: "VariableTracker",
    scene: {
      type: "VariableTracker",
      ...base,
      narration: long,
      code: "total = 0\nfor i in range(1, 4):\n    total += i\nprint(total)",
      steps: [
        { line: 1, vars: { total: "0" }, output: "" },
        { line: 2, vars: { total: "0", i: "1" }, output: "" },
        { line: 3, vars: { total: "1", i: "1" }, output: "" },
        { line: 3, vars: { total: "3", i: "2" }, output: "" },
        { line: 3, vars: { total: "6", i: "3" }, output: "" },
        { line: 4, vars: { total: "6", i: "3" }, output: "6" },
      ],
    },
  },
  {
    name: "FlowDiagram loop long",
    scene: {
      type: "FlowDiagram",
      ...base,
      narration: long,
      variant: "loop",
      labels: {
        start: "Start",
        init: "Set total to zero before anything",
        condition: "Are there more numbers left in the list?",
        body: "Add the current number to the total",
        update: "Move on to the next number",
        alternative: "Do something else",
        exit: "Show the final total",
      },
    },
  },
  {
    name: "FlowDiagram branch",
    scene: {
      type: "FlowDiagram",
      ...base,
      narration: long,
      variant: "branch",
      labels: {
        start: "Start",
        init: "Read the score",
        condition: "Is the score at least 40?",
        body: "Print pass",
        update: "",
        alternative: "Print try again",
        exit: "Done",
      },
    },
  },
  {
    name: "Checkpoint long",
    scene: {
      type: "Checkpoint",
      ...base,
      narration: long,
      exerciseId: "x",
      prompt:
        "Write a function named sumArray(nums) that returns the sum of all the numbers in an array, and make sure it works for an empty array as well as for negative numbers.",
    },
  },
];

const STAGE_W = 1280;

/** A scene frozen at a given moment: after everything has landed and before the exit begins. */
function Frozen({ scene, frame }: { scene: Scene; frame: number }) {
  const total = scene.seconds * FPS;
  return (
    <div
      style={{
        width: STAGE_W / 2,
        height: 360,
        position: "relative",
        overflow: "hidden",
        border: "1px solid #ccc",
      }}
    >
      <div
        style={{
          width: STAGE_W,
          height: 720,
          transform: "scale(0.5)",
          transformOrigin: "top left",
          position: "absolute",
          left: 0,
          top: 0,
        }}
      >
        <FrameProvider
          frame={frame}
          fps={FPS}
          durationInFrames={total}
          speechInFrames={total - 10}
          narration={scene.narration}
        >
          <SceneRenderer scene={scene} />
        </FrameProvider>
      </div>
    </div>
  );
}

export function SceneQa() {
  return (
    <main className="p-4">
      <h1 className="mb-2 text-lg font-semibold">Scene QA</h1>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(2, 640px)" }}>
        {QA_SCENES.map(({ name, scene }) => (
          <figure key={name} data-qa={name} className="space-y-1">
            <figcaption className="text-xs">{name}</figcaption>
            <Frozen scene={scene} frame={300} />
          </figure>
        ))}
      </div>
    </main>
  );
}
