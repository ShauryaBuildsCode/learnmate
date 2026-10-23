import { Fragment, type ReactNode } from "react";
import { PageChip } from "@/components/source/source-context";

const CITATION = /\(\s*pp?\.\s*(\d+)(?:\s*[-–]\s*(\d+))?\s*\)/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  text.split(/(`[^`]+`)/g).forEach((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      out.push(
        <code key={`c${i}`} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>,
      );
      return;
    }
    let last = 0;
    for (const m of part.matchAll(CITATION)) {
      const idx = m.index ?? 0;
      if (idx > last)
        out.push(<Fragment key={`t${i}-${last}`}>{boldify(part.slice(last, idx))}</Fragment>);
      out.push(<PageChip key={`p${i}-${idx}`} page={Number(m[1])} />);
      last = idx + m[0].length;
    }
    if (last < part.length)
      out.push(<Fragment key={`t${i}-end`}>{boldify(part.slice(last))}</Fragment>);
  });
  return out;
}

function boldify(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((s, i) =>
      s.startsWith("**") && s.endsWith("**") ? (
        <strong key={i}>{s.slice(2, -2)}</strong>
      ) : (
        <Fragment key={i}>{s}</Fragment>
      ),
    );
}

/** Minimal renderer: fenced code, inline code, bold, and clickable (p. N) citations. */
export function MessageText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split(/```[a-z]*\n?/gi).map((chunk, i) =>
        i % 2 === 1 ? (
          <pre key={i} className="overflow-x-auto rounded-lg bg-muted p-2 font-mono text-xs">
            {chunk.trimEnd()}
          </pre>
        ) : (
          chunk
            .split(/\n{2,}/)
            .filter((p) => p.trim())
            .map((p, j) => (
              <p key={`${i}-${j}`} className="whitespace-pre-wrap">
                {inline(p)}
              </p>
            ))
        ),
      )}
    </div>
  );
}
