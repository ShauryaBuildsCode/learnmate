import { interpolate, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { CodePanel, HighlightedLine } from "./highlight";
import { lerp, MONO, PALETTE, useEnter } from "./kit";

export function CodeReveal({ scene }: { scene: Extract<Scene, { type: "CodeReveal" }> }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const lines = scene.code.split("\n");
  const card = useEnter(2, { damping: 14 });
  const typingEnd = Math.min(durationInFrames * 0.55, 14 + scene.code.length * 1.4);
  const typed = Math.floor(
    interpolate(frame, [14, typingEnd], [0, scene.code.length], {
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
  const caption = useEnter(Math.round(typingEnd) + 4);

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
            transform: `translateY(${lerp(50, 0, card)}px) scale(${lerp(0.94, 1, card)})`,
            opacity: card,
          }}
        >
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
                    padding: "0 26px",
                    background: highlighted ? `rgba(255,138,0,${0.22 * glow})` : "transparent",
                    borderLeft: `5px solid ${highlighted ? PALETTE.orange : "transparent"}`,
                    opacity: done && hasHighlight && !highlighted ? 1 - 0.55 * glow : 1,
                  }}
                >
                  <span style={{ width: 50, color: "#6c717b", userSelect: "none" }}>{i + 1}</span>
                  <span style={{ whiteSpace: "pre" }}>
                    {lineText !== undefined && <HighlightedLine line={lineText} />}
                    {i === visible.length - 1 && cursorOn && !done && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 14,
                          height: 30,
                          background: PALETTE.orange,
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
                marginTop: 24,
                display: "flex",
                justifyContent: "center",
                opacity: caption,
                transform: `translateY(${lerp(16, 0, caption)}px)`,
              }}
            >
              <div
                style={{
                  padding: "10px 24px",
                  borderRadius: 999,
                  background: PALETTE.orange,
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: 700,
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
