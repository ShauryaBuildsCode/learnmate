import { z } from "zod";

export const mcqItemSchema = z.object({
  kind: z.literal("mcq"),
  question: z.string().min(8).max(320),
  options: z.array(z.string().min(1).max(200)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(5).max(400),
  quote: z.string().min(10).max(400),
});

export const shortItemSchema = z.object({
  kind: z.literal("short"),
  question: z.string().min(8).max(320),
  modelAnswer: z.string().min(5).max(500),
  /** What a good answer must mention; used by the grader. */
  keyPoints: z.array(z.string().min(2).max(160)).min(2).max(4),
});

export const clozeItemSchema = z.object({
  kind: z.literal("cloze"),
  /** A sentence from the material with the answer replaced by "____". */
  text: z
    .string()
    .min(10)
    .max(400)
    .refine((t) => t.includes("____"), "needs a ____ blank"),
  answer: z.string().min(1).max(60),
  explanation: z.string().min(5).max(300),
});

export const practiceItemSchema = z.discriminatedUnion("kind", [
  mcqItemSchema,
  shortItemSchema,
  clozeItemSchema,
]);
export type PracticeItem = z.infer<typeof practiceItemSchema>;

/** What the model returns for one item: which topic (by position), which page, and the item itself. */
export const generatedPracticeSchema = z.object({
  topicIndex: z.number().int().min(0),
  page: z.number().int().positive(),
  item: practiceItemSchema,
});
export type GeneratedPractice = z.infer<typeof generatedPracticeSchema>;

export const gradeSchema = z.object({
  score: z.number().min(0).max(1),
  correct: z.boolean(),
  feedback: z.string().min(2).max(400),
});
export type Grade = z.infer<typeof gradeSchema>;
