import { z } from "zod";

export const ANALOGY_ICONS = [
  "repeat",
  "package",
  "list",
  "key",
  "map",
  "clock",
  "ticket",
  "building",
  "music",
  "shopping-cart",
] as const;

const base = {
  narration: z.string().min(10).max(600),
  seconds: z.number().min(4).max(40),
  page: z.number().int().positive(),
};

export const traceStepSchema = z.object({
  line: z.number().int().positive(),
  vars: z.record(z.string(), z.string()),
  output: z.string(),
});
export type TraceStepData = z.infer<typeof traceStepSchema>;

export const sceneSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TitleCard"),
    ...base,
    title: z.string().max(80),
    hook: z.string().max(160),
  }),
  z.object({
    type: z.literal("CodeReveal"),
    ...base,
    code: z.string().min(1).max(1200),
    language: z.string().default("python"),
    highlightLines: z.array(z.number().int().positive()).max(6).default([]),
    caption: z.string().max(140).optional(),
  }),
  z.object({
    type: z.literal("VariableTracker"),
    ...base,
    /** Python only. The steps are filled in by really executing this code, never written by the model. */
    code: z.string().min(1).max(800),
    steps: z.array(traceStepSchema).optional(),
  }),
  z.object({
    type: z.literal("FlowDiagram"),
    ...base,
    variant: z.enum(["loop", "branch"]),
    labels: z.object({
      start: z.string().max(30).default("Start"),
      init: z.string().max(40),
      condition: z.string().max(40),
      body: z.string().max(40),
      update: z.string().max(40),
      alternative: z.string().max(40).default("Do something else"),
      exit: z.string().max(30).default("Done"),
    }),
  }),
  z.object({
    type: z.literal("Analogy"),
    ...base,
    icon: z.enum(ANALOGY_ICONS),
    concept: z.string().max(60),
    realLife: z.string().max(80),
    bullets: z.array(z.string().max(100)).min(2).max(4),
  }),
  z.object({
    type: z.literal("Checkpoint"),
    ...base,
    exerciseId: z.string(),
    prompt: z.string().max(300),
  }),
]);
export type Scene = z.infer<typeof sceneSchema>;
export type SceneType = Scene["type"];

export const lessonScriptSchema = z.object({
  title: z.string().max(100),
  scenes: z.array(sceneSchema).min(3).max(12),
});
export type LessonScript = z.infer<typeof lessonScriptSchema>;
