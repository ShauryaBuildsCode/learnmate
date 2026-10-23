import { z } from "zod";
import type { Files } from "@/lib/schemas/exercise";

/**
 * A line-range replacement Guru proposes for the student's code. `startLine..endLine` (1-based, inclusive)
 * is replaced by `newText`; an insertion before line N uses endLine = N - 1. `before` is the text being
 * replaced, captured when the edit is validated, so a stale suggestion can be detected later.
 */
export const codeEditSchema = z.object({
  file: z.string().min(1).max(120),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(0),
  newText: z.string().max(4000),
  explanation: z.string().max(240),
  /** "exercise": help with the exercise being worked on (policy-gated). "other": any other coding the student asked for. */
  scope: z.enum(["exercise", "other"]).default("exercise"),
  before: z.array(z.string()),
});
export type CodeEdit = z.infer<typeof codeEditSchema>;

/** What the model sends through the `edit_code` tool (no `before`: the server fills that in). */
export const rawEditSchema = codeEditSchema.omit({ before: true });
export type RawEdit = z.infer<typeof rawEditSchema>;

/** While an exercise's solution is locked, edits to it are limited to small ones that don't solve it. */
export const LIMITED_MAX_CHANGED_LINES = 3;
export const LIMITED_MAX_EDITS = 2;
export const FULL_MAX_CHANGED_LINES = 120;

const splitLines = (text: string) => (text === "" ? [] : text.split("\n"));

export interface ValidatedEdits {
  edits: CodeEdit[];
  /** Plain-English reasons edits were refused, for logging. */
  rejected: string[];
}

/**
 * Checks Guru's proposed edits against the code the student actually has and against the teaching policy.
 * Anything that doesn't fit is dropped, never repaired.
 */
export function validateEdits(
  raw: unknown[],
  files: Files,
  revealAllowed: boolean,
): ValidatedEdits {
  const edits: CodeEdit[] = [];
  const rejected: string[] = [];
  let changedLocked = 0;
  let changedOpen = 0;
  let locked = 0;

  for (const candidate of raw) {
    if (edits.length >= 6) {
      rejected.push("too many edits at once");
      break;
    }
    const parsed = rawEditSchema.safeParse(candidate);
    if (!parsed.success) {
      rejected.push("edit was malformed");
      continue;
    }
    // Models often end replacement text with a newline; keeping it would insert a blank line.
    const e = { ...parsed.data, newText: parsed.data.newText.replace(/\r?\n$/, "") };
    const text = files[e.file];
    if (text === undefined) {
      rejected.push(`no such file: ${e.file}`);
      continue;
    }
    const lines = text.split("\n");
    if (e.endLine < e.startLine - 1 || e.startLine > lines.length + 1 || e.endLine > lines.length) {
      rejected.push(`lines ${e.startLine}-${e.endLine} are outside ${e.file}`);
      continue;
    }
    const removed = lines.slice(e.startLine - 1, e.endLine);
    const added = splitLines(e.newText);
    const size = Math.max(removed.length, added.length);
    // Coding that isn't the current exercise is never gated. The exercise is, until the solution is unlocked.
    const gated = e.scope === "exercise" && !revealAllowed;
    if (gated) {
      if (locked >= LIMITED_MAX_EDITS || changedLocked + size > LIMITED_MAX_CHANGED_LINES) {
        rejected.push(
          "only small, non-solution edits to the exercise are allowed until the student asks for the solution again",
        );
        continue;
      }
      locked++;
      changedLocked += size;
    } else {
      if (changedOpen + size > FULL_MAX_CHANGED_LINES) {
        rejected.push("edit is too large");
        continue;
      }
      changedOpen += size;
    }
    edits.push({ ...e, before: removed });
  }
  return { edits, rejected };
}

/** Applies edits to the files. Edits in the same file are applied bottom-up so earlier line numbers stay valid. */
export function applyEdits(files: Files, edits: CodeEdit[]): Files {
  const out: Files = { ...files };
  const byFile = new Map<string, CodeEdit[]>();
  for (const e of edits) byFile.set(e.file, [...(byFile.get(e.file) ?? []), e]);
  for (const [file, list] of byFile) {
    const lines = (out[file] ?? "").split("\n");
    for (const e of [...list].sort((a, b) => b.startLine - a.startLine)) {
      lines.splice(e.startLine - 1, e.endLine - e.startLine + 1, ...splitLines(e.newText));
    }
    out[file] = lines.join("\n");
  }
  return out;
}

/** True while the lines each edit was written against are still what the student has. */
export function editsStillApply(files: Files, edits: CodeEdit[]): boolean {
  return edits.every((e) => {
    const lines = (files[e.file] ?? "").split("\n").slice(e.startLine - 1, e.endLine);
    return lines.length === e.before.length && lines.every((line, i) => line === e.before[i]);
  });
}

export interface DiffHunk {
  file: string;
  startLine: number;
  removed: string[];
  added: string[];
  explanation: string;
}

/** What a proposal would change, for the diff preview. */
export function describeEdits(edits: CodeEdit[]): DiffHunk[] {
  return edits.map((e) => ({
    file: e.file,
    startLine: e.startLine,
    removed: e.before,
    added: splitLines(e.newText),
    explanation: e.explanation,
  }));
}

/** The `edit_code` tool definition given to Claude. */
export const EDIT_CODE_TOOL = {
  name: "edit_code",
  description:
    'Edit the student\'s code in the editor. The change is applied immediately (the student can undo it), so say in your reply what you changed. Lines are numbered as in <student_code>. Replaces lines start_line..end_line (inclusive) with new_text; to insert before line N use end_line = N - 1; to delete use an empty new_text. Use this whenever the student asks you to change, add, fix or write code, or to apply a hint. scope "exercise" is for code that is part of the exercise they are working on: while <tutor_policy> says reveal_allowed: false you may ONLY make small edits that do not solve it (a short comment pointing at the problem, a debug print, an indentation or syntax fix, a rename), and never the corrective change. scope "other" is for any other coding the student asks for (a helper function, a different script, a language feature they want to try); it has no such limit. Keep edits minimal and keep the student\'s style.',
  input_schema: {
    type: "object" as const,
    properties: {
      file: { type: "string", description: "File name exactly as shown in <student_code>." },
      start_line: { type: "integer", description: "First line to replace (1-based)." },
      end_line: {
        type: "integer",
        description: "Last line to replace (inclusive). Use start_line - 1 to insert.",
      },
      new_text: { type: "string", description: "Replacement text, without line numbers." },
      explanation: {
        type: "string",
        description: "One short sentence telling the student what this change does.",
      },
    },
    required: ["file", "start_line", "end_line", "new_text", "explanation", "scope"],
    additionalProperties: false,
  },
} as const;

/** Maps the tool's snake_case input to our edit shape. */
export function fromToolInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const i = input as Record<string, unknown>;
  return {
    file: i.file,
    startLine: i.start_line,
    endLine: i.end_line,
    newText: i.new_text,
    explanation: i.explanation,
  };
}
