import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { serverEnv } from "@/lib/env";
import { toJsonSchema } from "@/lib/schemas/json-schema";
import type { TutorTurn } from "./types";
import { logUsage } from "./usage";

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
  /** Tools Claude may call. Their calls are handed to `onToolUses`; nothing is executed here. */
  tools?: Anthropic.Beta.BetaTool[];
  onToolUses?: (uses: { name: string; input: unknown }[]) => void;
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
    // Top-level cache control also caches the conversation so far, so later turns reuse earlier ones.
    cache_control: { type: "ephemeral" },
    thinking: { type: "adaptive" },
    output_config: { effort: input.effort },
    ...(input.tools?.length ? { tools: input.tools } : {}),
    system: systemBlocks(input),
    messages: input.turns,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
  const final = await stream.finalMessage();
  logUsage("claude", "tutor", {
    input: final.usage.input_tokens + (final.usage.cache_creation_input_tokens ?? 0),
    cached: final.usage.cache_read_input_tokens ?? 0,
    output: final.usage.output_tokens,
  });
  const hadText = final.content.some((b) => b.type === "text" && b.text.trim());
  if (!hadText) {
    // A turn with no words is surprising: record how it ended so it can be diagnosed.
    console.warn(
      `[claude] reply had no text: stop_reason=${final.stop_reason}, blocks=${final.content.map((b) => b.type).join(",")}, output_tokens=${final.usage.output_tokens}`,
    );
  }
  if (final.stop_reason === "refusal")
    throw new ClaudeRefusalError(final.stop_details?.category ?? null);
  // Tool calls are proposals for the browser to preview, so the turn simply ends here (stop_reason may be tool_use).
  const uses = final.content.flatMap((b) =>
    b.type === "tool_use" ? [{ name: b.name, input: b.input }] : [],
  );
  if (uses.length) input.onToolUses?.(uses);
}

/** Structured-output call (used for inline diagnostics). Returns null when Claude stops for any reason but end_turn. */
export async function claudeStructured<T extends z.ZodType>(
  input: Omit<ClaudeTutorInput, "effort" | "maxTokens"> & {
    schema: T;
    /** Schema sent to Claude to shape its output, when the validating schema is deliberately looser. */
    apiSchema?: z.ZodType;
    maxTokens?: number;
    effort?: ClaudeTutorInput["effort"] | "high";
    /** Properties the server owns, hidden from the model's schema. */
    omit?: string[];
    /** Label for the usage log line. */
    task?: string;
  },
): Promise<z.infer<T> | null> {
  const jsonSchema = toJsonSchema(input.apiSchema ?? input.schema, {
    relaxed: true,
    anyOf: true,
    omit: input.omit,
  });
  const response = await anthropic().beta.messages.create({
    model: serverEnv().ANTHROPIC_MODEL,
    max_tokens: input.maxTokens ?? 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    thinking: { type: "adaptive" },
    output_config: {
      effort: input.effort ?? "low",
      format: { type: "json_schema", schema: jsonSchema },
    },
    system: systemBlocks(input),
    messages: input.turns,
  });
  logUsage("claude", input.task ?? "diagnose", {
    input: response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0),
    cached: response.usage.cache_read_input_tokens ?? 0,
    output: response.usage.output_tokens,
  });
  if (response.stop_reason !== "end_turn") return null;
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  const parsed = input.schema.safeParse(JSON.parse(text.text));
  return parsed.success ? parsed.data : null;
}

/** Pulls the JSON object out of a reply that may be wrapped in a code fence or have a stray sentence around it. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The reply contained no JSON object.");
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Claude returns JSON described in the prompt, without constrained decoding. For large unions (the lesson
 * script) the constrained grammar is too big, and the caller validates the result itself anyway.
 */
export async function claudeJson(input: {
  /** Model override, e.g. the second-choice model for a retry. */
  model?: string;
  persona: string;
  courseBlock: string;
  prompt: string;
  effort: "low" | "medium" | "high";
  maxTokens: number;
  task: string;
}): Promise<unknown | null> {
  const response = await anthropic().beta.messages.create({
    model: input.model ?? serverEnv().ANTHROPIC_MODEL,
    max_tokens: input.maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    cache_control: { type: "ephemeral" },
    thinking: { type: "adaptive" },
    output_config: { effort: input.effort },
    system: systemBlocks(input),
    messages: [{ role: "user", content: input.prompt }],
  });
  logUsage("claude", input.task, {
    input: response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0),
    cached: response.usage.cache_read_input_tokens ?? 0,
    output: response.usage.output_tokens,
  });
  if (response.stop_reason !== "end_turn") return null;
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  return extractJson(text);
}
