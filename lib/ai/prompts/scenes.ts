/**
 * The scene library as the director sees it. Shared by the Claude motion-director prompt and the Gemini
 * fallback, so both write against exactly the same set of hand-built components.
 */
export interface SceneSpecArgs {
  allowTrace: boolean;
  /** "programming" lessons may use code scenes in `language`; "concepts" lessons never show code. */
  kind: "programming" | "concepts";
  language: string | null;
  exercises: { id: string; prompt: string; language: string }[];
}

export const ICON_LIST =
  "repeat|package|list|key|map|clock|ticket|building|music|shopping-cart|code|bug|rocket|lightbulb|puzzle|layers|target|zap|book";

export function sceneLibrarySpec({ allowTrace, kind, language, exercises }: SceneSpecArgs): string {
  const code = kind === "programming";
  const ex = exercises.length
    ? exercises
        .map((e) => `- id "${e.id}" ${e.language ? `(${e.language}) ` : ""}${e.prompt}`)
        .join("\n")
    : "(no exercises)";
  return `Every scene needs "type", "narration" (1 to 3 spoken sentences), "seconds" (6 to 14), "page" (one of the valid source pages where the scene's content comes from) and optionally "emphasis" (1-3 spoken words to punch) and "energy" (calm, balanced or punchy). Scene types, and what each is for:
- TitleCard: {title, hook}. Always first. Title at most 4 words.
- KeyTerms: {terms[3-8]: {label (one or two words, at most 18 characters), icon}}. The topic's vocabulary: icon tiles fly in and become big words, one per spoken word. Great as the second scene.
- Bento: {cards[3-5]: {title, body (short), stat {value: number, prefix?, suffix?} (optional), tone light|dark|accent, icon}}. An at-a-glance overview. Cards land as their titles are spoken. Use one stat card where a real number from the material fits.
- Analogy: {icon, concept, realLife, bullets[2-4]}. An everyday comparison. Concept, real-life side and each bullet land as they are spoken.
- Steps: {steps[3-6]: {label (at most 4 words), detail (one short phrase, optional)}}. A process or sequence: numbered steps connect one after another as each label is spoken. Use for any "how it works" or ordered process.
- Compare: {left{title, points[2-4]}, right{title, points[2-4]}}. Two ideas side by side (before and after, A versus B, myth versus fact). Points are short phrases.
${
  code
    ? `- RepeatBurst: {label, count 10-1000, icon}. "Write it once, run it N times". Use ONLY for repetition and loops.
- CodeReveal: {code, language, highlightLines[], caption}. Code is typed out, then a spotlight moves over highlightLines (1-based). At most 8 lines, adapted from the material. This course teaches ${language}: write the code in ${language} and set "language" to "${language}".
- ArrayViz: {name, items[2-8] short strings of at most 8 characters, mode iterate|index|append, focusIndex (index mode; negative counts from the end), appendValue (append mode)}. Lists and arrays only: iterate shows a loop walking the list, index shows positions, append shows a list growing.
- ${allowTrace ? "VariableTracker: {code}. Short Python (at most 6 lines, no input(), no imports) whose variables change step by step. Do NOT write the steps: they are computed by running the code." : "Do NOT use VariableTracker (it only runs Python)."}
- FlowDiagram: {variant loop|branch, labels{start, init, condition, body, update, alternative, exit}}. Labels are very short phrases. Use for loops and decisions in code.`
    : `This course is NOT about programming: never use CodeReveal, ArrayViz, VariableTracker, RepeatBurst or FlowDiagram, and never show code. Teach with TitleCard, KeyTerms, Bento, Analogy, Steps and Compare.`
}
- Checkpoint: {exerciseId, prompt}. Exactly one, last, using one of these ${code ? "exercise" : "practice question"} ids:
${ex}
icon is one of ${ICON_LIST}.`;
}
