import type { TutorContext } from "@/lib/schemas/tutor";
import { buildTurn, languageRule } from "./tutor";

/** Asks Claude for line-level diagnostics. Messages are hints, not fixes. */
export function buildDiagnosePrompt(ctx: TutorContext, uiLang: "en" | "hi"): string {
  const task =
    "Review the student's code against the current exercise and any failing tests. Return up to 5 diagnostics. Each needs the 1-based line number in the numbered listing, a severity (error = wrong behaviour, warning = likely mistake, info = style or idea) and a message under 25 words that names the problem without giving the corrected code. Return an empty list if the code is correct. " +
    languageRule(uiLang);
  return buildTurn(ctx, "Review my code and mark the problem lines.", {
    revealAllowed: false,
    solutionRequests: 0,
    task,
    uiLang,
  });
}
