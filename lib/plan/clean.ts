/**
 * A model asked for one sentence sometimes answers with a JSON object or a code fence ({"banner_text": "..."}).
 * Returns just the sentence.
 */
export function cleanSentence(text: string): string {
  let t = text
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      const find = (v: unknown): string | null => {
        if (typeof v === "string") return v;
        if (Array.isArray(v)) return v.map(find).find((s) => s) ?? null;
        if (v && typeof v === "object")
          return (
            Object.values(v)
              .map(find)
              .find((s) => s) ?? null
          );
        return null;
      };
      t = find(JSON.parse(t)) ?? t;
    } catch {
      const m = t.match(/:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) t = m[1];
    }
  }
  return t
    .replace(/^["'“]+|["'”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
