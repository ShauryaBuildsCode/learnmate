import Groq from "groq-sdk";
import { serverEnv } from "@/lib/env";
import { extractJson } from "./json";
import type { TutorTurn } from "./types";
import { logUsage } from "./usage";

let client: Groq | undefined;
function groq() {
  client ??= new Groq({ apiKey: serverEnv().GROQ_API_KEY });
  return client;
}

/** Sub-second micro-task completion (quick tips, error explanations, quiz feedback). */
export const QUICK_TIMEOUT_MS = 2500;

export async function groqQuick(system: string, prompt: string, maxTokens = 400): Promise<string> {
  const response = await groq().chat.completions.create(
    {
      model: serverEnv().GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.3,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
    { timeout: QUICK_TIMEOUT_MS, maxRetries: 0 },
  );
  const cached = response.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  logUsage("groq", "quick", {
    input: (response.usage?.prompt_tokens ?? 0) - cached,
    cached,
    output: response.usage?.completion_tokens ?? 0,
  });
  return (response.choices[0]?.message?.content ?? "").trim();
}

/** Streaming Groq chat, used as the labelled fallback tutor when Claude fails. */
export async function* groqStream(
  system: string,
  turns: TutorTurn[],
  maxTokens: number,
): AsyncGenerator<string> {
  const stream = await groq().chat.completions.create({
    model: serverEnv().GROQ_MODEL,
    max_tokens: maxTokens,
    temperature: 0.4,
    reasoning_effort: "low",
    stream: true,
    messages: [{ role: "system", content: system }, ...turns],
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}

const LONG_TIMEOUT_MS = 90_000;

/**
 * Longer Groq generation that returns a JSON object described in the prompt (used for lesson scripts).
 * Unlike the quick assists this allows time to think and a large output. The caller validates the result.
 */
export async function groqJson(input: {
  model?: string;
  system: string;
  prompt: string;
  maxTokens: number;
  task: string;
  /** Lower is faster; short grading tasks use "low". */
  effort?: "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<unknown> {
  const response = await groq().chat.completions.create(
    {
      model: input.model ?? serverEnv().GROQ_LESSON_MODEL,
      max_tokens: input.maxTokens,
      temperature: 0.5,
      reasoning_effort: input.effort ?? "medium",
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
    },
    { timeout: input.timeoutMs ?? LONG_TIMEOUT_MS, maxRetries: 0 },
  );
  const cached = response.usage?.prompt_tokens_details?.cached_tokens ?? 0;
  logUsage("groq", input.task, {
    input: (response.usage?.prompt_tokens ?? 0) - cached,
    cached,
    output: response.usage?.completion_tokens ?? 0,
  });
  const choice = response.choices[0];
  if (choice?.finish_reason === "length")
    throw new Error("The reply was cut off before the JSON finished.");
  return extractJson(choice?.message?.content ?? "");
}
