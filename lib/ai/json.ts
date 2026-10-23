/** Pulls the JSON object out of a reply that may be wrapped in a code fence or have a stray sentence around it. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The reply contained no JSON object.");
  return JSON.parse(body.slice(start, end + 1));
}
