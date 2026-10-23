import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { serverEnv } from "@/lib/env";
import { toJsonSchema } from "@/lib/schemas/json-schema";
import type { TutorTurn } from "./types";

let client: Anthropic | undefined;
function anthropic() {
  client ??= new Anthropic({ apiKey: serverEnv().ANTHROPIC_API_KEY });
  return client;
}

export class ClaudeRefusalError extends Error {
  constructor(category: string | null) {
    super(`Claude declined this request${category ? ` (${category})` : ""}.`);
    this.name = "ClaudeRefusalError";
  }
}

export interface ClaudeTutorInput {
  /** Persona and rules. Identical on every call, so it leads the cached prefix. */
  persona: string;
  /** The course pages. Identical per course; carries the cache breakpoint. */
  courseBlock: string;
  turns: TutorTurn[];
  effort: "low" | "medium";
  maxTokens: number;
}

function systemBlocks(input: Pick<ClaudeTutorInput, "persona" | "courseBlock">) {
  return [
    { type: "text" as const, text: input.persona },
    {
      type: "text" as const,
      text: input.courseBlock,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

/**
 * Streams Guru's answer. Uses adaptive thinking, an explicit effort, a cache breakpoint after the
 * course text, and the server-side refusal fallback. stop_reason is always checked before finishing.
 */
export async function* claudeTutorStream(input: ClaudeTutorInput): AsyncGenerator<string> {
  const stream = anthropic().beta.messages.stream({
    model: serverEnv().ANTHROPIC_MODEL,
    max_tokens: input.maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: input.effort },
    system: systemBlocks(input),
    messages: input.turns,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal")
    throw new ClaudeRefusalError(final.stop_details?.category ?? null);
}

/** Structured-output call (used for inline diagnostics). Returns null when Claude stops for any reason but end_turn. */
export async function claudeStructured<T extends z.ZodType>(
  input: Omit<ClaudeTutorInput, "effort" | "maxTokens"> & { schema: T; maxTokens?: number },
): Promise<z.infer<T> | null> {
  const jsonSchema = toJsonSchema(input.schema);
  const response = await anthropic().beta.messages.create({
    model: serverEnv().ANTHROPIC_MODEL,
    max_tokens: input.maxTokens ?? 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: { type: "json_schema", schema: jsonSchema } },
    system: systemBlocks(input),
    messages: input.turns,
  });
  if (response.stop_reason !== "end_turn") return null;
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  const parsed = input.schema.safeParse(JSON.parse(text.text));
  return parsed.success ? parsed.data : null;
}
