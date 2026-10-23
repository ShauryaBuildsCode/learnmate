import type { LessonScript } from "@/lib/schemas/lesson";

/**
 * Hand-written lesson script for the "Loops" topic of fixtures/python-loops-lists.md.
 * Used by the public /scenes showcase and by the lesson-schema tests. Real lessons come from Gemini.
 */
export const sampleLoopsLesson: LessonScript = {
  title: "Loops: doing things again and again",
  scenes: [
    {
      type: "TitleCard",
      title: "Loops",
      hook: "Write it once. Run it a thousand times.",
      narration:
        "Welcome. Today we meet the loop, the trick that lets a computer repeat work without getting bored.",
      seconds: 6,
      page: 1,
    },
    {
      type: "Analogy",
      icon: "repeat",
      concept: "for loop",
      realLife: "Handing out exam papers",
      bullets: ["One paper per student", "Same action every time", "Stop when the pile is empty"],
      narration:
        "Think of handing out exam papers. You do the same action for every student, and you stop when the pile runs out. That is exactly what a for loop does.",
      seconds: 9,
      page: 2,
    },
    {
      type: "CodeReveal",
      code: 'for i in range(3):\n    print("Hello", i)',
      language: "python",
      highlightLines: [1],
      caption: "The loop variable i changes every lap",
      narration:
        "Here is a for loop. The first line says: repeat three times, calling the counter i. The indented line is the loop body, and it runs once per lap.",
      seconds: 9,
      page: 2,
    },
    {
      type: "VariableTracker",
      code: "total = 0\nfor i in range(1, 4):\n    total = total + i\nprint(total)",
      narration:
        "Watch the variables. total starts at zero. Each lap, i takes the next value and total grows by that amount. After three laps total is six.",
      seconds: 10,
      page: 7,
    },
    {
      type: "FlowDiagram",
      variant: "loop",
      labels: {
        start: "Start",
        init: "i = first value",
        condition: "More values?",
        body: "Run the body",
        update: "i = next value",
        alternative: "Do something else",
        exit: "Done",
      },
      narration:
        "Here is the same idea as a flowchart. Check if there are more values, run the body, move to the next value, and check again. When there are no more values, we leave the loop.",
      seconds: 11,
      page: 2,
    },
    {
      type: "Analogy",
      icon: "list",
      concept: "range(5)",
      realLife: "Five fence posts",
      bullets: ["Posts are numbered 0 to 4", "5 is the first spot past the fence"],
      narration:
        "range of five gives you zero to four. Picture five fence posts numbered from zero. The number five is the spot just past the last post.",
      seconds: 8,
      page: 5,
    },
    {
      type: "Checkpoint",
      exerciseId: "sample-sum-to-n",
      prompt: "Write sum_to(n) that returns 1 + 2 + ... + n. Watch where range() stops!",
      narration:
        "Your turn. Write a function that adds the numbers from one up to n. Remember where range stops.",
      seconds: 6,
      page: 15,
    },
  ],
};
