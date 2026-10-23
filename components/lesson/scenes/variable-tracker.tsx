import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { CodePanel, HighlightedLine } from "./highlight";
import { Card, FONT, lerp, MONO, PALETTE, SectionLabel, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "VariableTracker" }> };

const LINE_H = 40;
const CODE_TOP = 68; // panel header plus padding, to the first line
const PANEL_RIGHT = 619;
const VARS_LEFT = 656;

/**
 * Plays back a real execution trace. The line marker glides from line to line; when a line changes a
 * variable, a spark flows from that line to the variable's card and the value rolls over like a counter.
 */
export function VariableTracker({ scene }: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const enter = useTween(2, 28, Easing.expoOut);
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

  const start = 22;
  const span = Math.max(1, durationInFrames - 40 - start);
  const position = interpolate(frame, [start, start + span], [0, steps.length - 0.001], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const idx = Math.floor(position);
  const step = steps[idx];
  const prev = steps[idx - 1];
  const stepStart = start + (idx / steps.length) * span;
  const since = frame - stepStart;
  const pop = spring({ frame: since, fps, config: { damping: 9, stiffness: 190 } });
  const glide = Easing.inOutQuart(Math.min(1, Math.max(0, since / 9)));

  const names = [...new Set(steps.flatMap((s) => Object.keys(s.vars)))];
  const changedNames = names.filter(
    (n) => step.vars[n] !== undefined && prev?.vars[n] !== step.vars[n],
  );
  const consoleLines = step.output
    .split("\n")
    .filter((l) => l.length > 0)
    .slice(-4);
  const prevLine = (prev ?? step).line;
  const barY = lerp((prevLine - 1) * LINE_H, (step.line - 1) * LINE_H, glide);

  // the spark: from the active line to the first changed variable's card
  const sparkT = Math.min(1, Math.max(0, since / 16));
  const targetIdx = changedNames.length ? names.indexOf(changedNames[0]) : -1;
  const sx0 = PANEL_RIGHT - 10;
  const sy0 = CODE_TOP + (step.line - 1) * LINE_H + LINE_H / 2;
  const sx1 = VARS_LEFT + 70 + (targetIdx % 2) * 170;
  const sy1 = 74 + Math.floor(Math.max(0, targetIdx) / 2) * 96;
  const e = Easing.inOutQuart(sparkT);
  const dot = { x: lerp(sx0, sx1, e), y: lerp(sy0, sy1, e) - Math.sin(e * Math.PI) * 34 };

  return (
    <SceneFrame label="Watch the variables" page={scene.page} narration={scene.narration}>
      <div
        style={{
          position: "relative",
          display: "flex",
          gap: 36,
          height: "100%",
          opacity: Math.min(1, enter * 3),
          transform: `translateY(${lerp(50, 0, enter)}px)`,
        }}
      >
        <div style={{ flex: 1.15 }}>
          <CodePanel title="main.py">
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: barY,
                  height: LINE_H,
                  background: "rgba(255,138,0,0.26)",
                  borderLeft: `5px solid ${PALETTE.orange}`,
                  boxShadow: "0 0 26px rgba(255,138,0,0.28)",
                }}
              />
              {lines.map((text, i) => {
                const active = step.line === i + 1;
                return (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      display: "flex",
                      fontFamily: MONO,
                      fontSize: 26,
                      lineHeight: `${LINE_H}px`,
                      padding: "0 22px",
                      opacity: active ? 1 : 0.62,
                    }}
                  >
                    <span style={{ width: 44, color: active ? PALETTE.orange : "#6c717b" }}>
                      {active ? "▶" : i + 1}
                    </span>
                    <HighlightedLine line={text} style={{ whiteSpace: "pre" }} />
                  </div>
                );
              })}
            </div>
          </CodePanel>
        </div>
        <div style={{ flex: 0.85, display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionLabel>Variables</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {names.map((name) => {
              const value = step.vars[name];
              const old = prev?.vars[name];
              const changed = value !== undefined && old !== value;
              const roll = changed ? Easing.expoOut(Math.min(1, Math.max(0, (since - 8) / 14))) : 1;
              return (
                <Card
                  key={name}
                  style={{
                    minWidth: 154,
                    padding: "14px 22px",
                    borderColor: changed ? PALETTE.orange : PALETTE.border,
                    boxShadow: changed
                      ? `0 0 ${36 * (1 - Math.min(1, pop)) + 6}px rgba(255,138,0,0.75)`
                      : undefined,
                    opacity: value === undefined ? 0.35 : 1,
                    transform: `scale(${changed ? lerp(0.88, 1, Math.min(1.15, pop)) : 1})`,
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
                  <div
                    style={{
                      position: "relative",
                      height: 56,
                      overflow: "hidden",
                      fontFamily: MONO,
                      fontSize: 44,
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {changed && old !== undefined && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          transform: `translateY(${-roll * 110}%)`,
                          opacity: 1 - roll,
                        }}
                      >
                        {old}
                      </div>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        transform: `translateY(${changed ? (1 - roll) * 110 : 0}%)`,
                      }}
                    >
                      {value ?? "—"}
                    </div>
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
              consoleLines.map((l, i) => {
                const fresh = i === consoleLines.length - 1 && step.output !== (prev?.output ?? "");
                const p = fresh ? Easing.expoOut(Math.min(1, Math.max(0, since / 12))) : 1;
                return (
                  <div
                    key={i}
                    style={{ transform: `translateX(${(1 - p) * -30}px)`, opacity: p }}
                  >{`> ${l}`}</div>
                );
              })
            ) : (
              <span style={{ fontFamily: FONT, color: "#8b8f97" }}>nothing printed yet</span>
            )}
          </Card>
        </div>

        {changedNames.length > 0 && sparkT < 1 && (
          <svg
            width={1112}
            height={422}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
          >
            {[1, 2, 3, 4].map((k) => {
              const te = Easing.inOutQuart(Math.max(0, sparkT - k * 0.05));
              return (
                <circle
                  key={k}
                  cx={lerp(sx0, sx1, te)}
                  cy={lerp(sy0, sy1, te) - Math.sin(te * Math.PI) * 34}
                  r={9 - k * 1.5}
                  fill={PALETTE.orange}
                  opacity={0.5 - k * 0.1}
                />
              );
            })}
            <circle cx={dot.x} cy={dot.y} r={10} fill={PALETTE.orange} />
            <circle cx={dot.x} cy={dot.y} r={20} fill={PALETTE.orange} opacity={0.3} />
          </svg>
        )}
      </div>
    </SceneFrame>
  );
}
