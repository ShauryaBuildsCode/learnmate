import type { CSSProperties, ReactNode } from "react";
import { MONO } from "./kit";

const KEYWORDS = new Set(
  "def return if elif else for while in not and or is None True False break continue pass import from as class try except finally with lambda print range len int float string void const let var function new public static main include using namespace struct fn mut".split(
    " ",
  ),
);

// Tuned for a near-black code card: readable, calm, with the orange/purple accents of the theme.
const COLORS = {
  keyword: "#c4b5fd",
  string: "#86efac",
  number: "#ffb347",
  comment: "#7c828c",
  plain: "#f1f1ee",
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

/** The black "code card": the dark counterpart to the white cards, like the black card in the reference. */
export function CodePanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div
      style={{
        borderRadius: 28,
        overflow: "hidden",
        background: "#111111",
        boxShadow: "0 24px 60px rgba(17,17,17,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "14px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <span style={{ marginLeft: 12, color: "#8b8f97", fontSize: 16, fontFamily: MONO }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "16px 0" }}>{children}</div>
    </div>
  );
}
