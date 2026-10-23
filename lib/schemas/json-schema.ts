import { z } from "zod";

const SIZE_KEYWORDS = new Set([
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
]);

/** Claude's structured output accepts `anyOf` but not `oneOf`; for our unions they mean the same. */
function oneOfToAnyOf(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(oneOfToAnyOf);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [
        key === "oneOf" ? "anyOf" : key,
        oneOfToAnyOf(value),
      ]),
    );
  }
  return node;
}

/** Removes the named properties (and their `required` entries) everywhere, so a model never sees fields the server owns. */
function omitProperties(node: unknown, names: ReadonlySet<string>): unknown {
  if (Array.isArray(node)) return node.map((n) => omitProperties(n, names));
  if (node && typeof node === "object") {
    const entries = Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => {
      if (key === "properties" && value && typeof value === "object") {
        const kept = Object.fromEntries(Object.entries(value).filter(([name]) => !names.has(name)));
        return [[key, omitProperties(kept, names)]];
      }
      if (key === "required" && Array.isArray(value))
        return [[key, value.filter((name) => !names.has(String(name)))]];
      return [[key, omitProperties(value, names)]];
    });
    return Object.fromEntries(entries);
  }
  return node;
}

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
  options: { relaxed?: boolean; anyOf?: boolean; omit?: string[] } = {},
): Record<string, unknown> {
  const out = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete out.$schema;
  let result: unknown = options.relaxed ? stripSizeKeywords(out) : out;
  if (options.anyOf) result = oneOfToAnyOf(result);
  if (options.omit?.length) result = omitProperties(result, new Set(options.omit));
  return result as Record<string, unknown>;
}
