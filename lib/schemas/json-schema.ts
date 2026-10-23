import { z } from "zod";

const SIZE_KEYWORDS = new Set([
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
]);

function stripSizeKeywords(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripSizeKeywords);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !SIZE_KEYWORDS.has(key))
        .map(([key, value]) => [key, stripSizeKeywords(value)]),
    );
  }
  return node;
}

/** zod schema -> plain JSON Schema (without the `$schema` marker) for provider structured-output APIs. */
export function toJsonSchema(
  schema: z.ZodType,
  options: { relaxed?: boolean } = {},
): Record<string, unknown> {
  const out = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete out.$schema;
  return options.relaxed ? (stripSizeKeywords(out) as Record<string, unknown>) : out;
}
