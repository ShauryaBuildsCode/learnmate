import Groq from "groq-sdk";
import { serverEnv } from "@/lib/env";
import type { TutorTurn } from "./types";

let client: Groq | undefined;
function groq() {
  client ??= new Groq({ apiKey: serverEnv().GROQ_API_KEY });
  return client;
}

/** Sub-second micro-task completion (quick tips, error explanations, quiz feedback). */
export const QUICK_TIMEOUT_MS = 2500;

export async function groqQuick(system: string, prompt: string, maxTokens = 120): Promise<string> {
  const response = await groq().chat.completions.create(
    {
      model: serverEnv().GROQ_MODEL,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    },
    { timeout: QUICK_TIMEOUT_MS, maxRetries: 0 },
  );
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
    stream: true,
    messages: [{ role: "system", content: system }, ...turns],
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
