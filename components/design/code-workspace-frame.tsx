import { Play } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CodeWorkspaceFrameProps = {
  filename: string;
  /** The editor (e.g. Monaco) goes here. */
  editor: ReactNode;
  /** Program output text. */
  output?: string;
  /** Marks output as an error for status colouring. */
  outputIsError?: boolean;
  running?: boolean;
  onRun?: () => void;
  className?: string;
};

/** Visual frame for the Python workspace: file tab, run button, editor slot, output panel. */
export function CodeWorkspaceFrame({
  filename,
  editor,
  output,
  outputIsError,
  running,
  onRun,
  className,
}: CodeWorkspaceFrameProps) {
  return (
    <section
      aria-label="Code workspace"
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b bg-muted px-3 py-2">
        <span className="rounded-md border bg-card px-2.5 py-1 font-mono text-xs">{filename}</span>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {running ? "Running…" : "Run"}
        </button>
      </div>
      <div className="min-h-48 flex-1">{editor}</div>
      <div className="border-t">
        <p className="border-b bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Output
        </p>
        <pre
          aria-live="polite"
          className={cn(
            "max-h-40 min-h-16 overflow-auto p-3 font-mono text-xs leading-5",
            outputIsError ? "text-danger" : "text-foreground",
          )}
        >
          {output || <span className="text-muted-foreground">Run your code to see output.</span>}
        </pre>
      </div>
    </section>
  );
}
