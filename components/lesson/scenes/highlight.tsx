import type { CSSProperties } from "react";
import { PALETTE } from "./common";

const KEYWORDS = new Set(
  "def return if elif else for while in not and or is None True False break continue pass import from as class try except finally with lambda print range len int float string void const let var function new public static main include using namespace struct fn mut".split(
    " ",
  ),
);

const COLORS = {
  keyword: "#c084fc",
  string: "#86efac",
  number: "#fbbf24",
  comment: "#64748b",
  plain: "#e2e8f0",
};

/** Tiny tokenizer: enough colour to make code readable on a video frame, with no dependencies. */
export function HighlightedLine({ line, style }: { line: string; style?: CSSProperties }) {
  const parts =
    line.match(/(#.*$|\/\/.*$|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|\s+|.)/g) ?? [];
  return (
    <span style={style}>
      {parts.map((p, i) => {
        let color: string = COLORS.plain;
        if (p.startsWith("#") || p.startsWith("//")) color = COLORS.comment;
        else if (p.startsWith('"') || p.startsWith("'")) color = COLORS.string;
        else if (/^\d/.test(p)) color = COLORS.number;
        else if (KEYWORDS.has(p)) color = COLORS.keyword;
        return (
          <span key={i} style={{ color }}>
            {p}
          </span>
        );
      })}
    </span>
  );
}

export function CodePanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        background: "rgba(2,6,23,0.8)",
        border: `1px solid ${PALETTE.cardBorder}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "12px 18px",
          borderBottom: `1px solid ${PALETTE.cardBorder}`,
        }}
      >
        {["#f87171", "#fbbf24", "#34d399"].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <span style={{ marginLeft: 12, color: PALETTE.muted, fontSize: 16 }}>{title}</span>
      </div>
      <div style={{ padding: "18px 0" }}>{children}</div>
    </div>
  );
}
