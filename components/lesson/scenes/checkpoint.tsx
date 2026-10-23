import { interpolate, useCurrentFrame } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, lerp, PALETTE, useEnter } from "./kit";

type Props = { scene: Extract<Scene, { type: "Checkpoint" }> };

/** The player pauses on this scene and the IDE slides in with the exercise. */
export function Checkpoint({ scene }: Props) {
  const frame = useCurrentFrame();
  const pop = useEnter(4, { damping: 11, stiffness: 120 });
  const card = useEnter(14);
  const pulse = 1 + Math.sin(frame / 9) * 0.035;
  const ring = interpolate(frame % 60, [0, 60], [0, 1]);
  return (
    <SceneFrame label="Checkpoint" page={scene.page} narration={scene.narration} ambient>
      <div style={{ display: "flex", gap: 56, alignItems: "center", height: "100%" }}>
        <div style={{ position: "relative", width: 240, height: 240, flexShrink: 0 }}>
          {[0, 0.5].map((offset) => {
            const r = (ring + offset) % 1;
            return (
              <div
                key={offset}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 66,
                  border: `3px solid ${PALETTE.orange}`,
                  opacity: 1 - r,
                  transform: `scale(${1 + r * 0.7})`,
                }}
              />
            );
          })}
          <div
            style={{
              position: "absolute",
              inset: 14,
              borderRadius: 60,
              background: PALETTE.orange,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 76,
              fontWeight: 800,
              color: "#fff",
              boxShadow: "0 24px 50px rgba(255,138,0,0.4)",
              transform: `scale(${pop * pulse}) rotate(${lerp(-25, 0, pop)}deg)`,
            }}
          >
            Go!
          </div>
        </div>
        <div style={{ opacity: card, transform: `translateY(${lerp(30, 0, card)}px)` }}>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>Your turn</div>
          <Card
            style={{
              marginTop: 18,
              padding: "20px 28px",
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.35,
              maxWidth: 780,
            }}
          >
            {scene.prompt}
          </Card>
          <div style={{ marginTop: 18, fontSize: 26, fontWeight: 700, color: PALETTE.orange }}>
            The editor is opening on the right →
          </div>
        </div>
      </div>
    </SceneFrame>
  );
}
