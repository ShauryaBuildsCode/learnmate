import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { ReactNode } from "react";
import { FONT, ICON_NAMES, IconTile, PALETTE, seeded, TONE_CYCLE } from "./kit";

export { FONT, MONO, PALETTE } from "./kit";

const CAPTION_WORDS = 18;

/** Karaoke-style captions: the words of the narration light up in step with the scene's progress. */
function Captions({ narration }: { narration: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const words = narration.split(/\s+/).filter(Boolean);
  const progress = interpolate(frame, [10, durationInFrames - 16], [0, words.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const current = Math.min(words.length - 1, Math.floor(progress));
  const start = Math.floor(current / CAPTION_WORDS) * CAPTION_WORDS;
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        bottom: 92,
        minHeight: 84,
        padding: "14px 26px",
        borderRadius: 24,
        background: "rgba(255,255,255,0.92)",
        border: `1.5px solid ${PALETTE.border}`,
        boxShadow: "0 12px 34px rgba(17,17,17,0.08)",
        fontFamily: FONT,
        fontSize: 27,
        fontWeight: 600,
        lineHeight: 1.4,
        textAlign: "center",
      }}
    >
      {words.slice(start, start + CAPTION_WORDS).map((w, i) => (
        <span
          key={start + i}
          style={{ color: start + i <= current ? PALETTE.ink : "rgba(17,17,17,0.28)" }}
        >
          {w}{" "}
        </span>
      ))}
    </div>
  );
}

/** Quiet icon tiles drifting behind the content, so even text-heavy scenes keep moving. */
function AmbientTiles() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 8 }, (_, i) => {
        const x = 40 + seeded(i, 2) * 1160;
        const y = 70 + seeded(i, 5) * 440;
        const drift = Math.sin(frame / 34 + i * 1.7) * 16;
        const sway = Math.cos(frame / 41 + i) * 10;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + sway,
              top: y + drift,
              opacity: 0.16,
              transform: `rotate(${Math.sin(frame / 50 + i) * 8}deg)`,
            }}
          >
            <IconTile
              icon={ICON_NAMES[(i * 3) % ICON_NAMES.length]}
              tone={TONE_CYCLE[i % TONE_CYCLE.length]}
              size={48 + (i % 3) * 14}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/**
 * Shared chrome for every scene: warm canvas, drifting tiles, an orange wipe that carries one scene
 * into the next, the scene label, a source-page tag and karaoke captions.
 */
export function SceneFrame({
  label,
  page,
  narration,
  ambient = false,
  children,
}: {
  label: string;
  page: number;
  narration: string;
  ambient?: boolean;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const wipeIn = interpolate(frame, [0, 14], [0, 100], { extrapolateRight: "clamp" });
  const wipeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [0, 100], {
    extrapolateLeft: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: PALETTE.bg, fontFamily: FONT, color: PALETTE.ink }}>
      {ambient && <AmbientTiles />}
      <div style={{ position: "absolute", top: 30, left: 44 }}>
        <div
          style={{
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: 2.5,
            textTransform: "uppercase",
            color: PALETTE.muted,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 44,
          padding: "5px 16px",
          borderRadius: 999,
          background: PALETTE.card,
          border: `1.5px solid ${PALETTE.border}`,
          fontSize: 18,
          fontWeight: 600,
          color: PALETTE.ink,
        }}
      >
        Source: page {page}
      </div>
      <AbsoluteFill style={{ padding: "84px 84px 214px" }}>{children}</AbsoluteFill>
      <Captions narration={narration} />
      {/* transition wipes */}
      <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: PALETTE.orange,
            transform: `translateX(${wipeIn}%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: PALETTE.orange,
            transform: `translateX(${-100 + wipeOut}%)`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
