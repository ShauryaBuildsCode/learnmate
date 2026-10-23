import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { toJsonSchema } from "@/lib/schemas/json-schema";
import { cachedContentFor, forgetCache } from "./gemini-cache";
import { AiOutputError } from "./types";
import { logUsage } from "./usage";

let client: GoogleGenAI | undefined;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: serverEnv().GEMINI_API_KEY });
  return client;
}

const TRANSIENT =
  /"code":\s*(429|500|503|504)|UNAVAILABLE|RESOURCE_EXHAUSTED|timed? ?out|aborted|fetch failed/i;
const CALL_TIMEOUT_MS = 75_000;
const RETRY_DELAYS_MS = [0, 1500, 4000, 8000];

/**
 * Runs a Gemini call on the primary model and, when it is overloaded, rate limited or slow, on the
 * fallback model, alternating a few times before giving up. Non-transient errors fail immediately.
 */
async function withModelFallback<T>(call: (model: string) => Promise<T>): Promise<T> {
  const env = serverEnv();
  const order = [
    env.GEMINI_MODEL,
    env.GEMINI_FALLBACK_MODEL,
    env.GEMINI_MODEL,
    env.GEMINI_FALLBACK_MODEL,
  ];
  let lastError: unknown;
  for (let attempt = 0; attempt < order.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt])
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    try {
      return await call(order[attempt]);
    } catch (error) {
      lastError = error;
      if (!TRANSIENT.test(error instanceof Error ? error.message : String(error))) throw error;
    }
  }
  throw lastError;
}

export interface JsonRequest<T extends z.ZodType> {
  task: string;
  system: string;
  /** Large text shared by many tasks (the course pages). Always sent first so it can be cached. */
  context?: string;
  prompt: string;
  schema: T;
  /** Reasoning depth. LOW is enough for structured generation and costs far fewer tokens. */
  thinking?: "LOW" | "MEDIUM" | "HIGH";
}

/** Gemini JSON generation. The output is parsed with zod; one retry with the error fed back, then it throws. */
export async function geminiJson<T extends z.ZodType>(req: JsonRequest<T>): Promise<z.infer<T>> {
  let feedback = "";
  let lastError = "unknown";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await withModelFallback(async (model) => {
      const cached = req.context
        ? await cachedContentFor(gemini(), model, req.system, req.context)
        : null;
      const send = (useCache: string | null) =>
        gemini().models.generateContent({
          model,
          // Without an explicit cache the context still leads the prompt, so implicit caching can hit.
          contents: (useCache || !req.context ? "" : `${req.context}\n\n`) + req.prompt + feedback,
          config: {
            ...(useCache ? { cachedContent: useCache } : { systemInstruction: req.system }),
            responseMimeType: "application/json",
            responseJsonSchema: toJsonSchema(req.schema, { relaxed: true }),
            temperature: 0.4,
            thinkingConfig: { thinkingLevel: ThinkingLevel[req.thinking ?? "LOW"] },
            httpOptions: { timeout: CALL_TIMEOUT_MS },
          },
        });
      try {
        return await send(cached);
      } catch (error) {
        if (cached && /cached ?content|not ?found|expired|permission/i.test(String(error))) {
          forgetCache(cached);
          return send(null);
        }
        throw error;
      }
    });
    const u = response.usageMetadata;
    logUsage("gemini", req.task, {
      input: (u?.promptTokenCount ?? 0) - (u?.cachedContentTokenCount ?? 0),
      cached: u?.cachedContentTokenCount ?? 0,
      output: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
    });
    try {
      const parsed = req.schema.safeParse(JSON.parse(response.text ?? ""));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : "invalid JSON";
    }
    feedback = `\n\nYour previous reply was rejected: ${lastError}. Return corrected JSON only.`;
  }
  throw new AiOutputError(req.task, lastError);
}

/** Plain-text Gemini call for short prose (plan change banners, summaries). */
export async function geminiText(system: string, prompt: string): Promise<string> {
  const response = await withModelFallback((model) =>
    gemini().models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: system,
        temperature: 0.4,
        httpOptions: { timeout: CALL_TIMEOUT_MS },
      },
    }),
  );
  return (response.text ?? "").trim();
}
