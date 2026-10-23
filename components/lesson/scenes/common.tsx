import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReactNode } from "react";

export const PALETTE = {
  bg1: "#0b1020",
  bg2: "#1b1646",
  text: "#f8fafc",
  muted: "#94a3b8",
  accent: "#818cf8",
  accent2: "#34d399",
  warn: "#fbbf24",
  danger: "#f87171",
  card: "rgba(255,255,255,0.07)",
  cardBorder: "rgba(255,255,255,0.14)",
} as const;

export const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const CAPTION_WORDS = 20;

/** Karaoke-style captions: the words of the narration light up in step with the scene's progress. */
function Captions({ narration }: { narration: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const words = narration.split(/\s+/).filter(Boolean);
  const progress = interpolate(frame, [6, durationInFrames - 14], [0, words.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const current = Math.min(words.length - 1, Math.floor(progress));
  const start = Math.floor(current / CAPTION_WORDS) * CAPTION_WORDS;
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        bottom: 92,
        minHeight: 84,
        padding: "14px 22px",
        borderRadius: 16,
        background: "rgba(2,6,23,0.72)",
        border: `1px solid ${PALETTE.cardBorder}`,
        fontFamily: FONT,
        fontSize: 27,
        lineHeight: 1.4,
        textAlign: "center",
      }}
    >
      {words.slice(start, start + CAPTION_WORDS).map((w, i) => (
        <span
          key={start + i}
          style={{ color: start + i <= current ? PALETTE.text : "rgba(248,250,252,0.35)" }}
        >
          {w}{" "}
        </span>
      ))}
    </div>
  );
}

/** Shared chrome for every scene: gradient background, fades, scene label, source-page tag and captions. */
export function SceneFrame({
  label,
  page,
  narration,
  children,
}: {
  label: string;
  page: number;
  narration: string;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const drift = interpolate(frame, [0, durationInFrames], [0, -40]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 700px at 20% ${20 + drift / 4}%, ${PALETTE.bg2}, ${PALETTE.bg1})`,
        fontFamily: FONT,
        color: PALETTE.text,
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 40,
          fontSize: 18,
          letterSpacing: 2,
          color: PALETTE.muted,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 40,
          padding: "4px 14px",
          borderRadius: 999,
          background: PALETTE.card,
          border: `1px solid ${PALETTE.cardBorder}`,
          fontSize: 18,
          color: PALETTE.accent,
        }}
      >
        Source: page {page}
      </div>
      <AbsoluteFill style={{ padding: "80px 80px 210px" }}>{children}</AbsoluteFill>
      <Captions narration={narration} />
    </AbsoluteFill>
  );
}
