import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { RunResult, TestResult } from "@/lib/schemas/exercise";

export function ConsolePanel({
  result,
  error,
}: {
  result: RunResult | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div role="alert" className="flex gap-2 p-3 text-sm text-danger">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        {error}
      </div>
    );
  }
  if (!result)
    return (
      <p className="p-3 text-sm text-muted-foreground">
        Run your code to see output here. (Ctrl/Cmd + Enter)
      </p>
    );
  return (
    <div className="space-y-2 p-3 font-mono text-xs">
      {result.stdout && <pre className="whitespace-pre-wrap">{result.stdout}</pre>}
      {result.stderr && <pre className="whitespace-pre-wrap text-danger">{result.stderr}</pre>}
      {!result.stdout && !result.stderr && <p className="text-muted-foreground">(no output)</p>}
      <p className="text-muted-foreground">
        exit {result.exitCode} · {result.durationMs} ms
      </p>
    </div>
  );
}

export function TestResultList({ results }: { results: TestResult[] }) {
  const passed = results.filter((r) => r.passed).length;
  return (
    <div className="space-y-1.5 p-3 text-sm">
      <p className="font-medium">
        {passed} of {results.length} tests passed
      </p>
      {results.map((r) => (
        <div key={r.name} className="flex items-start gap-2">
          {r.passed ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          )}
          <div>
            <span>{r.name}</span>
            {r.message && <p className="text-xs text-muted-foreground">{r.message}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
