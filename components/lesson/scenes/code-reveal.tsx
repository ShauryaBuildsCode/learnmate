import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { CodePanel, HighlightedLine } from "./highlight";
import { lerp, MONO, PALETTE, seeded, useTween } from "./kit";

const LINE_H = 46;

/** Cumulative frame at which each character has been typed: quicker mid-word, a beat at line breaks. */
function typingTimes(code: string): number[] {
  const times: number[] = [];
  let t = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    t += c === "\n" ? 7 : c === " " ? 0.7 : 1.1 + seeded(i, 7) * 1.3;
    times.push(t);
  }
  return times;
}

/**
 * Code typed at a human pace (pauses at line ends), then a spotlight sweeps down the lines being discussed
 * while the card leans in toward them, so attention goes where the narration is.
 */
export function CodeReveal({ scene }: { scene: Extract<Scene, { type: "CodeReveal" }> }) {
  const frame = useCurrentFrame();
  const { speechInFrames } = useVideoConfig();
  const lines = scene.code.split("\n");
  const card = useTween(2, 28, Easing.expoOut);

  const times = typingTimes(scene.code);
  const total = times[times.length - 1] ?? 1;
  const budget = Math.max(24, Math.min(speechInFrames * 0.5, 14 + total));
  const speed = total > budget ? total / budget : 1;
  const typed = times.filter((t) => t / speed <= frame - 14).length;
  const typingEnd = 14 + total / speed;
  const done = typed >= scene.code.length;

  const visible = scene.code.slice(0, typed).split("\n");
  const cursorOn = Math.floor(frame / 14) % 2 === 0;
  const marks = [...scene.highlightLines].sort((a, b) => a - b);
  const spotStart = typingEnd + 8;
  const spotEnd = Math.max(spotStart + 24, speechInFrames - 10);
  const sweep =
    marks.length > 1
      ? interpolate(frame, [spotStart, spotEnd], [0, marks.length - 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOutQuart,
        })
      : 0;
  const lo = Math.floor(sweep);
  const spotLine = marks.length
    ? lerp(marks[lo], marks[Math.min(lo + 1, marks.length - 1)], sweep - lo)
    : 0;
  const spot = useTween(spotStart, 18, Easing.expoOut);
  const focus = done && marks.length > 0 ? spot : 0;
  const chip = useTween(spotStart + 12, 20, Easing.backOut);
  const focusY = (spotLine - 0.5) * LINE_H + 70;

  return (
    <SceneFrame label="Code" page={scene.page} narration={scene.narration}>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1020,
            margin: "0 auto",
            opacity: Math.min(1, card * 3),
            transform: `translateY(${lerp(70, 0, card)}px) scale(${lerp(0.93, 1, card) * (1 + focus * 0.045)})`,
            transformOrigin: `50% ${focusY}px`,
          }}
        >
          <CodePanel title={`example.${scene.language === "python" ? "py" : scene.language}`}>
            <div style={{ position: "relative" }}>
              {marks.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: (spotLine - 1) * LINE_H,
                    height: LINE_H,
                    background: "rgba(255,138,0,0.24)",
                    borderLeft: `5px solid ${PALETTE.orange}`,
                    opacity: focus,
                    transform: `scaleX(${lerp(0.4, 1, focus)})`,
                    transformOrigin: "left center",
                    boxShadow: `0 0 ${24 * focus}px rgba(255,138,0,0.35)`,
                  }}
                />
              )}
              {lines.map((_, i) => {
                const near = marks.length ? Math.min(...marks.map((m) => Math.abs(m - 1 - i))) : 0;
                const dim = marks.length ? lerp(1, near < 0.7 ? 1 : 0.42, focus) : 1;
                return (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      display: "flex",
                      fontFamily: MONO,
                      fontSize: 30,
                      lineHeight: `${LINE_H}px`,
                      padding: "0 26px",
                      opacity: dim,
                    }}
                  >
                    <span style={{ width: 50, color: "#6c717b", userSelect: "none" }}>{i + 1}</span>
                    <span style={{ whiteSpace: "pre" }}>
                      {visible[i] !== undefined && <HighlightedLine line={visible[i]} />}
                      {i === visible.length - 1 && cursorOn && !done && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 14,
                            height: 30,
                            background: PALETTE.orange,
                            verticalAlign: "middle",
                            marginLeft: 1,
                          }}
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </CodePanel>
          {scene.caption && (
            <div
              style={{
                marginTop: 26,
                display: "flex",
                justifyContent: "center",
                opacity: Math.min(1, chip * 2),
                transform: `translateY(${lerp(24, 0, chip)}px) scale(${lerp(0.8, 1, chip)})`,
              }}
            >
              <div
                style={{
                  padding: "10px 26px",
                  borderRadius: 999,
                  background: PALETTE.orange,
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: 700,
                  boxShadow: "0 14px 30px rgba(255,138,0,0.35)",
                }}
              >
                {scene.caption}
              </div>
            </div>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}
