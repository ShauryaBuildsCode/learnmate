import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { FONT, MONO, PALETTE, SceneFrame } from "./common";
import { CodePanel, HighlightedLine } from "./highlight";

type Props = { scene: Extract<Scene, { type: "VariableTracker" }> };

/** Plays back a real execution trace: current line, variable boxes and console output per step. */
export function VariableTracker({ scene }: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const steps = scene.steps ?? [];
  const lines = scene.code.split("\n");

  if (steps.length === 0) {
    return (
      <SceneFrame label="Trace" page={scene.page} narration={scene.narration}>
        <div style={{ fontSize: 34, color: PALETTE.muted }}>
          Running the code to record its steps…
        </div>
      </SceneFrame>
    );
  }

  const start = 14;
  const span = Math.max(1, durationInFrames - 34 - start);
  const position = interpolate(frame, [start, start + span], [0, steps.length - 0.001], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const idx = Math.floor(position);
  const step = steps[idx];
  const prev = steps[idx - 1];
  const stepStart = start + (idx / steps.length) * span;
  const pop = spring({ frame: frame - stepStart, fps, config: { damping: 11, stiffness: 160 } });

  const names = [...new Set(steps.flatMap((s) => Object.keys(s.vars)))];
  const consoleLines = step.output
    .split("\n")
    .filter((l) => l.length > 0)
    .slice(-4);

  return (
    <SceneFrame label="Watch the variables" page={scene.page} narration={scene.narration}>
      <div style={{ display: "flex", gap: 36, height: "100%" }}>
        <div style={{ flex: 1.15 }}>
          <CodePanel title="main.py">
            {lines.map((text, i) => {
              const active = step.line === i + 1;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    fontFamily: MONO,
                    fontSize: 26,
                    lineHeight: "40px",
                    padding: "0 20px",
                    background: active ? "rgba(129,140,248,0.22)" : "transparent",
                    borderLeft: `4px solid ${active ? PALETTE.accent : "transparent"}`,
                  }}
                >
                  <span style={{ width: 44, color: active ? PALETTE.accent : PALETTE.muted }}>
                    {active ? "▶" : i + 1}
                  </span>
                  <HighlightedLine line={text} style={{ whiteSpace: "pre" }} />
                </div>
              );
            })}
          </CodePanel>
        </div>
        <div style={{ flex: 0.85, display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 20,
              color: PALETTE.muted,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Variables
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {names.map((name) => {
              const value = step.vars[name];
              const changed = value !== undefined && prev?.vars[name] !== value;
              return (
                <div
                  key={name}
                  style={{
                    minWidth: 150,
                    padding: "14px 20px",
                    borderRadius: 16,
                    background: PALETTE.card,
                    border: `2px solid ${changed ? PALETTE.accent2 : PALETTE.cardBorder}`,
                    boxShadow: changed ? `0 0 ${24 * (1 - pop) + 8}px ${PALETTE.accent2}` : "none",
                    opacity: value === undefined ? 0.3 : 1,
                    transform: `scale(${changed ? 0.9 + pop * 0.1 : 1})`,
                  }}
                >
                  <div style={{ fontFamily: MONO, color: PALETTE.accent, fontSize: 22 }}>
                    {name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700 }}>
                    {value ?? "—"}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: 20,
              color: PALETTE.muted,
              textTransform: "uppercase",
              letterSpacing: 2,
              marginTop: 8,
            }}
          >
            Output
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 14,
              padding: "14px 18px",
              background: "rgba(2,6,23,0.85)",
              border: `1px solid ${PALETTE.cardBorder}`,
              fontFamily: MONO,
              fontSize: 24,
              color: PALETTE.accent2,
              overflow: "hidden",
            }}
          >
            {consoleLines.length ? (
              consoleLines.map((l, i) => <div key={i}>{`> ${l}`}</div>)
            ) : (
              <span style={{ fontFamily: FONT, color: PALETTE.muted }}>nothing printed yet</span>
            )}
          </div>
        </div>
      </div>
    </SceneFrame>
  );
}
