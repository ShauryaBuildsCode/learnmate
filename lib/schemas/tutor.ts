import { z } from "zod";
import { filesSchema, languageSchema, testResultSchema } from "./exercise";

const MAX_CODE_CHARS = 20_000;

export const tutorContextSchema = z.object({
  topic: z.object({ id: z.string(), name: z.string() }).nullable(),
  scene: z
    .object({ index: z.number().int(), title: z.string(), page: z.number().int() })
    .nullable(),
  exercise: z.object({ id: z.string(), prompt: z.string().max(2000) }).nullable(),
  language: languageSchema.nullable(),
  files: filesSchema
    .nullable()
    .refine((f) => !f || Object.values(f).join("").length <= MAX_CODE_CHARS, "code too long"),
  stdout: z.string().max(4000).nullable(),
  stderr: z.string().max(4000).nullable(),
  testResults: z.array(testResultSchema).max(20).nullable(),
});
export type TutorContext = z.infer<typeof tutorContextSchema>;

export const tutorTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4000),
});

export const tutorRequestSchema = z.object({
  courseId: z.string().uuid(),
  message: z.string().min(1).max(1500),
  history: z.array(tutorTurnSchema).max(12),
  context: tutorContextSchema,
  uiLang: z.enum(["en", "hi"]).default("en"),
});
export type TutorRequest = z.infer<typeof tutorRequestSchema>;

export const hintRequestSchema = z.object({
  courseId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  context: tutorContextSchema,
  uiLang: z.enum(["en", "hi"]).default("en"),
  /** Student pressed "show full solution" after exhausting the ladder. */
  reveal: z.boolean().default(false),
});

export const diagnoseRequestSchema = z.object({
  courseId: z.string().uuid(),
  context: tutorContextSchema,
  uiLang: z.enum(["en", "hi"]).default("en"),
});

/** Frames streamed by /api/tutor, one JSON object per line. */
export const tutorFrameSchema = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("meta"),
    provider: z.enum(["claude", "groq"]),
    note: z.string().optional(),
    reset: z.boolean().optional(),
  }),
  z.object({ t: z.literal("delta"), text: z.string() }),
  z.object({
    t: z.literal("final"),
    text: z.string(),
    beyond: z.boolean(),
    citedPages: z.array(z.number()),
    stripped: z.number(),
    looked: z.object({
      pages: z.array(z.number()),
      hadCode: z.boolean(),
      hadRunOutput: z.boolean(),
      tests: z.object({ passed: z.number(), total: z.number() }).nullable(),
      scene: z.string().nullable(),
    }),
    rung: z.number().optional(),
  }),
  z.object({ t: z.literal("error"), message: z.string() }),
]);
export type TutorFrame = z.infer<typeof tutorFrameSchema>;
