import { z } from "zod";

const cited = z.object({ text: z.string().min(5).max(320), page: z.number().int().positive() });

export const topicNotesSchema = z.object({
  topicId: z.string(),
  tldr: z.string().min(10).max(320),
  keyPoints: z.array(cited).min(2).max(8),
  terms: z
    .array(
      z.object({
        term: z.string().min(1).max(60),
        meaning: z.string().min(5).max(240),
        page: z.number().int().positive(),
      }),
    )
    .max(8)
    .default([]),
  mistakes: z.array(z.string().min(5).max(240)).max(4).default([]),
  example: z
    .object({ title: z.string().min(2).max(80), body: z.string().min(5).max(500) })
    .optional(),
  selfCheck: z
    .array(
      z.object({
        question: z.string().min(5).max(240),
        answer: z.string().min(2).max(320),
      }),
    )
    .min(1)
    .max(3),
});
export type TopicNotes = z.infer<typeof topicNotesSchema>;

export const notesEnvelopeSchema = z.object({ topics: z.array(z.unknown()).min(1).max(12) });

export const storedNotesSchema = z.object({
  topics: z.array(topicNotesSchema),
  directedBy: z.enum(["claude", "groq"]).optional(),
});
export type StoredNotes = z.infer<typeof storedNotesSchema>;

export const MIND_KINDS = ["root", "topic", "concept", "example", "pitfall"] as const;
export const mindNodeSchema = z.object({
  id: z.string().min(1).max(24),
  label: z.string().min(1).max(44),
  parent: z.string().nullable(),
  kind: z.enum(MIND_KINDS),
  topicId: z.string().optional(),
  page: z.number().int().positive().optional(),
});
export type MindNode = z.infer<typeof mindNodeSchema>;

export const mindEnvelopeSchema = z.object({ nodes: z.array(z.unknown()).min(5).max(120) });

export const storedMindMapSchema = z.object({
  nodes: z.array(mindNodeSchema).min(3).max(100),
  directedBy: z.enum(["claude", "groq"]).optional(),
});
export type StoredMindMap = z.infer<typeof storedMindMapSchema>;
