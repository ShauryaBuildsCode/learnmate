import { createHash } from "node:crypto";
import type { GoogleGenAI } from "@google/genai";

const TTL_SECONDS = 1800;
const entries = new Map<string, { name: string | null; expiresAt: number }>();
let disabled = false;

/**
 * Explicit Gemini context caching for the big shared prefix (system rules + the whole course).
 * Creates (or reuses) a cache per model and content hash and returns its name. Returns null when
 * caching isn't available (for example the free tier has no cached-storage quota, or the content is
 * below the model's minimum), in which case callers just send the full prompt as usual.
 */
export async function cachedContentFor(
  ai: GoogleGenAI,
  model: string,
  system: string,
  context: string,
): Promise<string | null> {
  if (disabled) return null;
  const key = `${model}:${createHash("sha1").update(system).update(context).digest("hex")}`;
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.name;
  try {
    const cache = await ai.caches.create({
      model,
      config: {
        systemInstruction: system,
        contents: [{ role: "user", parts: [{ text: context }] }],
        ttl: `${TTL_SECONDS}s`,
      },
    });
    entries.set(key, {
      name: cache.name ?? null,
      expiresAt: Date.now() + (TTL_SECONDS - 60) * 1000,
    });
    return cache.name ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // No quota or permission for explicit caching at all: stop trying for this process.
    if (/"code":\s*(429|403)|limit=0|quota/i.test(message)) disabled = true;
    entries.set(key, { name: null, expiresAt: Date.now() + 10 * 60 * 1000 });
    return null;
  }
}

/** Forget a cache that the API says no longer exists (expired or deleted). */
export function forgetCache(name: string): void {
  for (const [key, value] of entries) if (value.name === name) entries.delete(key);
}

export function resetGeminiCacheState(): void {
  entries.clear();
  disabled = false;
}
