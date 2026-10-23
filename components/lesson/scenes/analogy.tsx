import { ArrowRight, Check } from "lucide-react";
import { interpolate, useCurrentFrame } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, IconTile, lerp, PALETTE, useEnter } from "./kit";

type Props = { scene: Extract<Scene, { type: "Analogy" }> };

/** A real-life comparison: the icon tile spins in, the two sides meet, then the points drop in. */
export function Analogy({ scene }: Props) {
  const frame = useCurrentFrame();
  const icon = useEnter(2, { damping: 10, stiffness: 110 });
  const left = useEnter(14);
  const right = useEnter(26);
  const arrow = interpolate(frame, [22, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <SceneFrame label="Think of it like this" page={scene.page} narration={scene.narration} ambient>
      <div style={{ display: "flex", gap: 56, alignItems: "center", height: "100%" }}>
        <div style={{ transform: `scale(${icon}) rotate(${lerp(-40, 0, icon)}deg)` }}>
          <IconTile icon={scene.icon} tone="orange" size={230} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 30 }}>
            <Card
              style={{
                padding: "16px 28px",
                fontSize: 36,
                fontWeight: 800,
                opacity: left,
                transform: `translateX(${lerp(-60, 0, left)}px)`,
              }}
            >
              {scene.concept}
            </Card>
            <ArrowRight
              size={44}
              color={PALETTE.orange}
              strokeWidth={3}
              style={{ opacity: arrow, transform: `translateX(${lerp(-16, 0, arrow)}px)` }}
            />
            <Card
              tone="black"
              style={{
                padding: "16px 28px",
                fontSize: 36,
                fontWeight: 800,
                opacity: right,
                transform: `translateX(${lerp(60, 0, right)}px)`,
              }}
            >
              {scene.realLife}
            </Card>
          </div>
          {scene.bullets.map((b, i) => (
            <Bullet key={i} text={b} delay={46 + i * 14} />
          ))}
        </div>
      </div>
    </SceneFrame>
  );
}

function Bullet({ text, delay }: { text: string; delay: number }) {
  const p = useEnter(delay);
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        fontSize: 31,
        fontWeight: 600,
        marginBottom: 16,
        opacity: p,
        transform: `translateX(${lerp(50, 0, p)}px)`,
      }}
    >
      <span
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: PALETTE.orange,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Check size={22} color="#fff" strokeWidth={3.5} />
      </span>
      {text}
    </div>
  );
}
