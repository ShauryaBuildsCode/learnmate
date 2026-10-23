import { Bot, CheckCircle2, Play } from "lucide-react";

const CODE = [
  { n: 1, text: "scores = [72, 88, 95]" },
  { n: 2, text: "total = 0" },
  { n: 3, text: "for s in scores:" },
  { n: 4, text: "    total += s", active: true },
  { n: 5, text: "print(total / len(scores))" },
];

/** Static mock of the lesson, code workspace and Guru side by side. Presentational only. */
export function ProductPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of a LearnMate lesson with a code editor and the Guru tutor"
      className="overflow-hidden rounded-2xl border bg-card shadow-lg"
    >
      <div className="flex items-center gap-2 border-b bg-muted px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 text-xs text-muted-foreground">Python loops · Lesson 2 of 6</span>
      </div>
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4 border-b p-5 md:border-r md:border-b-0">
          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted bg-dots">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <Play className="h-4 w-4 translate-x-px" aria-hidden="true" />
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/5 rounded-full bg-foreground" />
          </div>
          <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <p>
              <span className="font-medium">Checkpoint.</span>{" "}
              <span className="text-muted-foreground">
                What does <code className="font-mono text-foreground">total</code> hold after the
                loop?
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col">
          <pre className="flex-1 overflow-x-auto bg-background p-4 font-mono text-xs leading-6">
            {CODE.map((l) => (
              <div key={l.n} className={l.active ? "-mx-4 bg-warning/15 px-4" : undefined}>
                <span className="mr-4 inline-block w-3 select-none text-right text-muted-foreground">
                  {l.n}
                </span>
                {l.text}
              </div>
            ))}
          </pre>
          <div className="flex items-start gap-3 border-t p-4 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Guru:</span> Line 4 adds each score to
              the running total. Try printing <code className="font-mono">total</code> inside the
              loop to watch it grow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
