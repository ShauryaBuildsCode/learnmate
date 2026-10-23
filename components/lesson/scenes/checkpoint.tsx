import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { PALETTE, SceneFrame } from "./common";

type Props = { scene: Extract<Scene, { type: "Checkpoint" }> };

/** The player pauses on this scene and the IDE slides in with the exercise. */
export function Checkpoint({ scene }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 3, fps, config: { damping: 13 } });
  const pulse = 1 + Math.sin(frame / 9) * 0.04;
  const ring = interpolate(frame % 60, [0, 60], [0, 1]);
  return (
    <SceneFrame label="Checkpoint" page={scene.page} narration={scene.narration}>
      <div style={{ display: "flex", gap: 56, alignItems: "center", height: "100%" }}>
        <div style={{ position: "relative", width: 230, height: 230, flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `3px solid ${PALETTE.warn}`,
              opacity: 1 - ring,
              transform: `scale(${1 + ring * 0.6})`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 20,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${PALETTE.warn}, #f97316)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 800,
              color: "#1c1917",
              transform: `scale(${pop * pulse})`,
            }}
          >
            Go!
          </div>
        </div>
        <div style={{ opacity: pop, transform: `translateY(${(1 - pop) * 24}px)` }}>
          <div style={{ fontSize: 72, fontWeight: 800 }}>Your turn</div>
          <div
            style={{
              marginTop: 18,
              padding: "18px 24px",
              borderRadius: 16,
              background: PALETTE.card,
              border: `1px solid ${PALETTE.cardBorder}`,
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 760,
            }}
          >
            {scene.prompt}
          </div>
          <div style={{ marginTop: 18, fontSize: 24, color: PALETTE.accent2 }}>
            The editor is opening on the right →
          </div>
        </div>
      </div>
    </SceneFrame>
  );
}
