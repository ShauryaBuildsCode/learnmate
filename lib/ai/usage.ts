import type { Provider } from "./types";

export interface TokenUsage {
  input: number;
  cached: number;
  output: number;
}

/**
 * One compact line per AI call so prompt-cache hits are visible in the server log and in evals.
 * `cached` is the number of input tokens served from the provider's prompt cache.
 */
export function logUsage(provider: Provider, task: string, usage: TokenUsage): void {
  const total = usage.input + usage.cached;
  const pct = total > 0 ? Math.round((usage.cached / total) * 100) : 0;
  console.info(
    `[ai] ${provider} ${task}: ${total} in (${usage.cached} cached, ${pct}%), ${usage.output} out`,
  );
}
