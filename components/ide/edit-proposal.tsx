import { Check, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiffHunk } from "@/lib/ide/edits";

/**
 * Shown after Guru has edited the code. The edit is already applied, so this tells the student exactly what
 * changed and gives them Undo. A failed edit (their code moved on) is reported here too.
 */
export function GuruEditNotice({
  hunks,
  failure,
  onUndo,
  onClose,
}: {
  hunks: DiffHunk[];
  failure: string | null;
  onUndo: (() => void) | null;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-label="Guru's edit"
      className="space-y-2 border-b bg-accent px-3 py-2 text-xs"
    >
      <div className="flex items-center gap-2 font-medium">
        <Check className="h-3.5 w-3.5 text-success" />
        {failure ? "Guru couldn't apply an edit" : "Guru edited your code."}
        <div className="ml-auto flex gap-1">
          {onUndo && (
            <Button size="sm" variant="ghost" onClick={onUndo}>
              <Undo2 className="h-3.5 w-3.5" /> Undo
            </Button>
          )}
          <Button size="sm" variant="ghost" aria-label="Dismiss" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {failure && <p className="text-danger">{failure}</p>}
      {!failure &&
        hunks.slice(0, 3).map((h, i) => (
          <div key={i} className="space-y-1">
            <p className="text-muted-foreground">
              {h.explanation}{" "}
              <span className="font-mono">
                ({h.file}, line {h.startLine})
              </span>
            </p>
            <pre className="overflow-x-auto rounded-lg border bg-card p-2 font-mono leading-5">
              {h.removed.slice(0, 6).map((line, k) => (
                <div key={`r${k}`} className="bg-danger/10 text-danger">
                  - {line}
                </div>
              ))}
              {h.added.slice(0, 6).map((line, k) => (
                <div key={`a${k}`} className="bg-success/10 text-success">
                  + {line}
                </div>
              ))}
            </pre>
          </div>
        ))}
    </div>
  );
}
