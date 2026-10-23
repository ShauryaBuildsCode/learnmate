import type { Files } from "@/lib/schemas/exercise";

export const WITHHELD_NOTE =
  "(I'm holding the finished code back for now. Try the next step yourself, and ask me again if you still want the full solution.)";

/** Names of functions the student's own code defines (Python and JavaScript). */
export function definedNames(files: Files): string[] {
  const names = new Set<string>();
  for (const code of Object.values(files)) {
    for (const m of code.matchAll(/\bdef\s+([A-Za-z_]\w*)\s*\(/g)) names.add(m[1]);
    for (const m of code.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1]);
    for (const m of code.matchAll(
      /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=;]*\)?\s*=>/g,
    ))
      names.add(m[1]);
  }
  return [...names];
}

const squash = (s: string) => s.replace(/\s+/g, "");

/**
 * While an exercise is locked, withhold any code block in a reply that rewrites the student's function: it defines
 * a function the student already has, runs to several lines with a return, and is NOT simply their own code quoted
 * back. This is a backstop for the prompt rule, so a clever request can't talk the model into pasting the answer.
 */
export function withholdSolution(text: string, files: Files): { text: string; withheld: number } {
  const names = definedNames(files);
  if (names.length === 0) return { text, withheld: 0 };
  const own = squash(Object.values(files).join("\n"));
  let withheld = 0;
  const out = text.replace(/```[a-zA-Z0-9]*\n([\s\S]*?)```/g, (block, body: string) => {
    const lines = body.split("\n").filter((l) => l.trim());
    const defines = names.some((n) =>
      new RegExp(`\\b(?:def|function)\\s+${n}\\s*\\(|\\b(?:const|let|var)\\s+${n}\\s*=`).test(body),
    );
    const looksComplete = lines.length >= 4 && /\breturn\b/.test(body);
    const quotesStudent = own.includes(squash(body));
    if (defines && looksComplete && !quotesStudent) {
      withheld++;
      return WITHHELD_NOTE;
    }
    return block;
  });
  return { text: out, withheld };
}
