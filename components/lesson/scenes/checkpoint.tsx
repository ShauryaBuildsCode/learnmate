import { Easing, interpolate, useCurrentFrame } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, lerp, PALETTE, Reveal, useSquash, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "Checkpoint" }> };

/** The player pauses on this scene and the IDE slides in. The scene hands over: the arrow leans toward the editor. */
export function Checkpoint({ scene }: Props) {
  const frame = useCurrentFrame();
  const go = useSquash(4, { damping: 8, stiffness: 130 });
  const card = useTween(14, 28, Easing.expoOut);
  const pulse = 1 + Math.sin(frame / 8) * 0.03;
  const ring = interpolate(frame % 64, [0, 64], [0, 1]);
  const arrow = Math.sin(frame / 7) * 10;
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
                  opacity: (1 - r) * Math.min(1, go.p),
                  transform: `scale(${1 + r * 0.75})`,
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
              transform: `scale(${go.sx * go.p * pulse}, ${go.sy * go.p * pulse}) rotate(${lerp(-40, 0, Math.min(1, go.p))}deg)`,
            }}
          >
            Go!
          </div>
        </div>
        <div
          style={{
            opacity: Math.min(1, card * 3),
            transform: `translateY(${lerp(40, 0, card)}px)`,
          }}
        >
          <Reveal delay={12} duration={26}>
            <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -3 }}>Your turn</div>
          </Reveal>
          <Card
            style={{
              marginTop: 18,
              padding: "20px 28px",
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.35,
              maxWidth: 780,
              transform: `rotate(${lerp(-2, 0, card)}deg)`,
            }}
          >
            {scene.prompt}
          </Card>
          <div
            style={{
              marginTop: 20,
              fontSize: 26,
              fontWeight: 700,
              color: PALETTE.orange,
              transform: `translateX(${arrow}px)`,
              opacity: card,
            }}
          >
            The editor is opening on the right →
          </div>
        </div>
      </div>
    </SceneFrame>
  );
}
