import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { toJsonSchema } from "@/lib/schemas/json-schema";
import { AiOutputError } from "./types";

let client: GoogleGenAI | undefined;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: serverEnv().GEMINI_API_KEY });
  return client;
}

export interface JsonRequest<T extends z.ZodType> {
  task: string;
  system: string;
  prompt: string;
  schema: T;
}

/** Gemini JSON generation. The output is parsed with zod; one retry with the error fed back, then it throws. */
export async function geminiJson<T extends z.ZodType>(req: JsonRequest<T>): Promise<z.infer<T>> {
  const env = serverEnv();
  let feedback = "";
  let lastError = "unknown";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await gemini().models.generateContent({
      model: env.GEMINI_MODEL,
      contents: req.prompt + feedback,
      config: {
        systemInstruction: req.system,
        responseMimeType: "application/json",
        responseJsonSchema: toJsonSchema(req.schema),
        temperature: 0.4,
      },
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
  const response = await gemini().models.generateContent({
    model: serverEnv().GEMINI_MODEL,
    contents: prompt,
    config: { systemInstruction: system, temperature: 0.4 },
  });
  return (response.text ?? "").trim();
}
