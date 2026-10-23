import { z } from "zod";
import { filesSchema, languageSchema, testCaseSchema } from "./exercise";

export const topicMapSchema = z.object({
  title: z.string().min(2).max(100),
  subject: z.string().min(2).max(60),
  topics: z
    .array(
      z.object({
        name: z.string().min(2).max(60),
        summary: z.string().min(10).max(300),
        pages: z.array(z.number().int().positive()).min(1).max(8),
      }),
    )
    .min(5)
    .max(8),
});
export type TopicMap = z.infer<typeof topicMapSchema>;

/** Gemini refers to topics by their position because database ids do not exist yet. */
export const generatedExerciseSchema = z.object({
  topicIndex: z.number().int().min(0),
  language: languageSchema,
  prompt: z.string().min(10).max(600),
  starterFiles: filesSchema,
  tests: z.array(testCaseSchema).min(2).max(6),
  hints: z.array(z.string().min(5).max(300)).length(3),
  page: z.number().int().positive(),
  /** Used only by validation and the eval harness: the starter must fail the tests and this must pass. */
  referenceSolution: filesSchema,
});
export type GeneratedExerciseWithSolution = z.infer<typeof generatedExerciseSchema>;

export const exerciseListSchema = z.object({
  exercises: z.array(generatedExerciseSchema).min(1).max(10),
});

export const quizQuestionSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  question: z.string().min(8).max(300),
  options: z.array(z.string().min(1).max(200)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  page: z.number().int().positive(),
  quote: z.string().min(10).max(400),
  explanation: z.string().min(5).max(400),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export const quizSchema = z.object({ questions: z.array(quizQuestionSchema).min(1).max(10) });
