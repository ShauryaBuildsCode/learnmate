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
  /** Optional slots, added when the frame was adopted by the real IDE. All are backward compatible. */
  /** Replaces the single filename chip (for several files). */
  fileTabs?: ReactNode;
  /** Controls to the left of the file tab, e.g. a language picker. */
  toolbar?: ReactNode;
  /** Extra buttons after Run, e.g. Check, Reset, Ask Guru. */
  actions?: ReactNode;
  /** A banner under the header, e.g. the exercise prompt. */
  notice?: ReactNode;
  /** Replaces the default output block (console, tests, preview and input tabs). */
  panel?: ReactNode;
  /** Label for the Run button's hint, e.g. the keyboard shortcut. */
  runTitle?: string;
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
  fileTabs,
  toolbar,
  actions,
  notice,
  panel,
  runTitle,
}: CodeWorkspaceFrameProps) {
  return (
    <section
      aria-label="Code workspace"
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {toolbar}
          {fileTabs ?? (
            <span className="rounded-md border bg-card px-2.5 py-1 font-mono text-xs">
              {filename}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            title={runTitle}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>
      {notice}
      <div className="min-h-48 flex-1">{editor}</div>
      {panel ?? (
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
      )}
    </section>
  );
}
