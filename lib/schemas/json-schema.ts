import { z } from "zod";

/** zod schema -> plain JSON Schema (without the `$schema` marker) for provider structured-output APIs. */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const out = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete out.$schema;
  return out;
}
