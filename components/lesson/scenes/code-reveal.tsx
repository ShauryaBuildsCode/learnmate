import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { MONO, PALETTE, SceneFrame } from "./common";
import { CodePanel, HighlightedLine } from "./highlight";

export function CodeReveal({ scene }: { scene: Extract<Scene, { type: "CodeReveal" }> }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const lines = scene.code.split("\n");
  const typingEnd = Math.min(durationInFrames * 0.55, 10 + scene.code.length * 1.4);
  const typed = Math.floor(
    interpolate(frame, [10, typingEnd], [0, scene.code.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const done = typed >= scene.code.length;
  const glow = interpolate(frame, [typingEnd, typingEnd + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const visible = scene.code.slice(0, typed).split("\n");
  const cursorOn = Math.floor(frame / 15) % 2 === 0;
  const hasHighlight = scene.highlightLines.length > 0;

  return (
    <SceneFrame label="Code" page={scene.page} narration={scene.narration}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <CodePanel title={`example.${scene.language === "python" ? "py" : scene.language}`}>
          {lines.map((_, i) => {
            const lineText = visible[i];
            const highlighted = done && scene.highlightLines.includes(i + 1);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  fontFamily: MONO,
                  fontSize: 30,
                  lineHeight: "46px",
                  padding: "0 24px",
                  background: highlighted ? `rgba(251,191,36,${0.16 * glow})` : "transparent",
                  borderLeft: `4px solid ${highlighted ? PALETTE.warn : "transparent"}`,
                  opacity: done && hasHighlight && !highlighted ? 1 - 0.55 * glow : 1,
                }}
              >
                <span style={{ width: 48, color: PALETTE.muted, userSelect: "none" }}>{i + 1}</span>
                <span style={{ whiteSpace: "pre" }}>
                  {lineText !== undefined && <HighlightedLine line={lineText} />}
                  {i === visible.length - 1 && cursorOn && !done && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 14,
                        height: 30,
                        background: PALETTE.accent,
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                </span>
              </div>
            );
          })}
        </CodePanel>
        {scene.caption && (
          <div
            style={{
              marginTop: 22,
              textAlign: "center",
              fontSize: 28,
              color: PALETTE.accent2,
              opacity: glow,
            }}
          >
            {scene.caption}
          </div>
        )}
      </div>
    </SceneFrame>
  );
}
