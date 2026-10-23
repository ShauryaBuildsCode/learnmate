import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { PALETTE, SceneFrame } from "./common";

export function TitleCard({ scene }: { scene: Extract<Scene, { type: "TitleCard" }> }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 90 } });
  const hook = interpolate(frame, [26, 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <SceneFrame label="Topic" page={scene.page} narration={scene.narration}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            right: 80 + i * 90,
            top: 120 + i * 60,
            width: 220 - i * 50,
            height: 220 - i * 50,
            borderRadius: "50%",
            border: `2px solid ${PALETTE.accent}`,
            opacity: 0.18 + i * 0.05,
            transform: `scale(${1 + Math.sin((frame + i * 20) / 18) * 0.06})`,
          }}
        />
      ))}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            transform: `scale(${0.88 + pop * 0.12}) translateY(${(1 - pop) * 30}px)`,
            opacity: pop,
            maxWidth: 900,
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 36,
            color: PALETTE.accent2,
            opacity: hook,
            transform: `translateY(${(1 - hook) * 16}px)`,
            maxWidth: 860,
          }}
        >
          {scene.hook}
        </div>
      </div>
    </SceneFrame>
  );
}
