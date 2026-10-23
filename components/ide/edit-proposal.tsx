import { Check, Pencil, Undo2, X } from "lucide-react";
import { describeEdits, type CodeEdit } from "@/lib/ide/edits";
import { Button } from "@/components/ui/button";

/** Guru's proposed change as a diff, with Apply and Dismiss. Nothing changes until the student agrees. */
export function EditProposal({
  edits,
  stillApplies,
  onApply,
  onDismiss,
}: {
  edits: CodeEdit[];
  stillApplies: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const hunks = describeEdits(edits);
  return (
    <div
      role="region"
      aria-label="Guru's suggested change"
      className="space-y-2 border-b bg-accent px-3 py-2 text-xs"
    >
      <div className="flex items-center gap-2 font-medium">
        <Pencil className="h-3.5 w-3.5" /> Guru suggests{" "}
        {edits.length > 1 ? `${edits.length} changes` : "a change"}
        <div className="ml-auto flex gap-2">
          <Button size="sm" onClick={onApply} disabled={!stillApplies}>
            <Check className="h-3.5 w-3.5" /> Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" /> Dismiss
          </Button>
        </div>
      </div>
      {!stillApplies && (
        <p role="alert" className="text-danger">
          Your code changed since this suggestion, so it can no longer be applied. Ask Guru again.
        </p>
      )}
      {hunks.map((h, i) => (
        <div key={i} className="space-y-1">
          <p className="text-muted-foreground">
            {h.explanation}{" "}
            <span className="font-mono">
              ({h.file}, line {h.startLine})
            </span>
          </p>
          <pre className="overflow-x-auto rounded-lg border bg-card p-2 font-mono leading-5">
            {h.removed.map((line, k) => (
              <div key={`r${k}`} className="bg-danger/10 text-danger">
                - {line}
              </div>
            ))}
            {h.added.map((line, k) => (
              <div key={`a${k}`} className="bg-success/10 text-success">
                + {line}
              </div>
            ))}
            {h.removed.length === 0 && h.added.length === 0 && (
              <div className="text-muted-foreground">(no change)</div>
            )}
          </pre>
        </div>
      ))}
    </div>
  );
}

/** Shown after an edit is applied, so the student can always take it back. */
export function EditApplied({ onUndo }: { onUndo: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b bg-success/10 px-3 py-1.5 text-xs"
    >
      <Check className="h-3.5 w-3.5 text-success" /> Guru edited your code.
      <Button size="sm" variant="ghost" className="ml-auto" onClick={onUndo}>
        <Undo2 className="h-3.5 w-3.5" /> Undo
      </Button>
    </div>
  );
}
