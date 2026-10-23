import { interpolate, spring, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { CodePanel, HighlightedLine } from "./highlight";
import { Card, FONT, lerp, MONO, PALETTE, SectionLabel, useEnter } from "./kit";

type Props = { scene: Extract<Scene, { type: "VariableTracker" }> };

/** Plays back a real execution trace: current line, variable cards and console output per step. */
export function VariableTracker({ scene }: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = useEnter(2, { damping: 14 });
  const steps = scene.steps ?? [];
  const lines = scene.code.split("\n");

  if (steps.length === 0) {
    return (
      <SceneFrame label="Trace" page={scene.page} narration={scene.narration}>
        <div style={{ fontSize: 34, color: PALETTE.muted, fontWeight: 600 }}>
          Running the code to record its steps…
        </div>
      </SceneFrame>
    );
  }

  const start = 18;
  const span = Math.max(1, durationInFrames - 36 - start);
  const position = interpolate(frame, [start, start + span], [0, steps.length - 0.001], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const idx = Math.floor(position);
  const step = steps[idx];
  const prev = steps[idx - 1];
  const stepStart = start + (idx / steps.length) * span;
  const pop = spring({ frame: frame - stepStart, fps, config: { damping: 9, stiffness: 190 } });

  const names = [...new Set(steps.flatMap((s) => Object.keys(s.vars)))];
  const consoleLines = step.output
    .split("\n")
    .filter((l) => l.length > 0)
    .slice(-4);

  return (
    <SceneFrame label="Watch the variables" page={scene.page} narration={scene.narration}>
      <div
        style={{
          display: "flex",
          gap: 36,
          height: "100%",
          opacity: enter,
          transform: `translateY(${lerp(40, 0, enter)}px)`,
        }}
      >
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
                    padding: "0 22px",
                    background: active ? "rgba(255,138,0,0.24)" : "transparent",
                    borderLeft: `5px solid ${active ? PALETTE.orange : "transparent"}`,
                  }}
                >
                  <span style={{ width: 44, color: active ? PALETTE.orange : "#6c717b" }}>
                    {active ? "▶" : i + 1}
                  </span>
                  <HighlightedLine line={text} style={{ whiteSpace: "pre" }} />
                </div>
              );
            })}
          </CodePanel>
        </div>
        <div style={{ flex: 0.85, display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Variables</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {names.map((name) => {
              const value = step.vars[name];
              const changed = value !== undefined && prev?.vars[name] !== value;
              return (
                <Card
                  key={name}
                  style={{
                    minWidth: 150,
                    padding: "14px 22px",
                    borderColor: changed ? PALETTE.orange : PALETTE.border,
                    boxShadow: changed
                      ? `0 0 ${34 * (1 - pop) + 6}px rgba(255,138,0,0.7)`
                      : undefined,
                    opacity: value === undefined ? 0.35 : 1,
                    transform: `scale(${changed ? lerp(0.82, 1, pop) : 1}) translateY(${changed ? lerp(-14, 0, pop) : 0}px)`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: MONO,
                      color: PALETTE.purple,
                      fontSize: 22,
                      fontWeight: 700,
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 800 }}>
                    {value ?? "—"}
                  </div>
                </Card>
              );
            })}
          </div>
          <SectionLabel>Output</SectionLabel>
          <Card
            tone="black"
            style={{
              flex: 1,
              padding: "14px 20px",
              fontFamily: MONO,
              fontSize: 25,
              color: "#86efac",
              overflow: "hidden",
            }}
          >
            {consoleLines.length ? (
              consoleLines.map((l, i) => <div key={i}>{`> ${l}`}</div>)
            ) : (
              <span style={{ fontFamily: FONT, color: "#8b8f97" }}>nothing printed yet</span>
            )}
          </Card>
        </div>
      </div>
    </SceneFrame>
  );
}
