import { describe, expect, it } from "vitest";
import { sampleLoopsLesson } from "@/fixtures/sample-lesson";
import { layout, sceneIndexAt, sceneSeconds } from "@/lib/lesson/timing";
import { validateScript } from "@/lib/lesson/validate";
import { lessonScriptSchema } from "@/lib/schemas/lesson";

const opts = {
  validPages: new Set(Array.from({ length: 16 }, (_, i) => i + 1)),
  exerciseIds: ["sample-sum-to-n"],
  exercisePrompts: { "sample-sum-to-n": "Write sum_to" },
};

describe("lesson script validation", () => {
  it("accepts a valid script and keeps every scene", () => {
    const { script, dropped } = validateScript(sampleLoopsLesson, opts);
    expect(script.scenes).toHaveLength(sampleLoopsLesson.scenes.length);
    expect(dropped).toEqual([]);
  });

  it("drops a scene whose page does not exist in the course", () => {
    const bad = structuredClone(sampleLoopsLesson);
    bad.scenes[1] = { ...bad.scenes[1], page: 99 };
    const { script, dropped } = validateScript(bad, opts);
    expect(script.scenes).toHaveLength(sampleLoopsLesson.scenes.length - 1);
    expect(dropped[0]).toMatchObject({ index: 1, reason: expect.stringContaining("page 99") });
  });

  it("rejects an unknown scene type", () => {
    const bad = structuredClone(sampleLoopsLesson) as unknown as { scenes: { type: string }[] };
    bad.scenes[0].type = "Fireworks";
    expect(lessonScriptSchema.safeParse(bad).success).toBe(false);
    expect(() => validateScript(bad, opts)).toThrow();
  });

  it("rejects a scene missing its required page", () => {
    const bad = structuredClone(sampleLoopsLesson) as unknown as {
      scenes: Record<string, unknown>[];
    };
    delete bad.scenes[0].page;
    expect(lessonScriptSchema.safeParse(bad).success).toBe(false);
  });

  it("drops a Checkpoint pointing at an exercise that does not exist, then restores one that does", () => {
    const bad = structuredClone(sampleLoopsLesson);
    bad.scenes[bad.scenes.length - 1] = {
      ...bad.scenes[bad.scenes.length - 1],
      exerciseId: "ghost",
    } as never;
    const { script, dropped } = validateScript(bad, opts);
    expect(dropped.some((d) => d.reason.includes("ghost"))).toBe(true);
    const last = script.scenes[script.scenes.length - 1];
    expect(last.type).toBe("Checkpoint");
    expect(last.type === "Checkpoint" && last.exerciseId).toBe("sample-sum-to-n");
  });
});

describe("scene timing", () => {
  it("scales with narration length and never goes below the script's own seconds", () => {
    const short = sceneSeconds({ narration: "Short narration for a scene.", seconds: 8 });
    const long = sceneSeconds({ narration: Array(80).fill("word").join(" "), seconds: 6 });
    expect(short).toBe(8);
    expect(long).toBeGreaterThan(30);
  });

  it("lays scenes end to end and finds the scene at a frame", () => {
    const { timed, totalFrames } = layout(sampleLoopsLesson.scenes);
    expect(timed[0].from).toBe(0);
    expect(timed[1].from).toBe(timed[0].frames);
    expect(totalFrames).toBe(timed.reduce((n, t) => n + t.frames, 0));
    expect(sceneIndexAt(timed, timed[2].from + 1)).toBe(2);
  });
});
