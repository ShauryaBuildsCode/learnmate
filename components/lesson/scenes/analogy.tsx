import { Easing, useCue, useCurrentFrame } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, DrawPath, IconTile, lerp, PALETTE, Reveal, useSquash, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "Analogy" }> };

/**
 * A real-life comparison. The icon tile spins in with squash and sends out ripples; the two sides arrive
 * when each is spoken, joined by a connector that draws itself; every point ticks itself off as it is said.
 */
export function Analogy({ scene }: Props) {
  const frame = useCurrentFrame();
  const cue = useCue();
  const iconIn = useSquash(2, { damping: 8, stiffness: 120 });
  const conceptAt = cue(scene.concept, 14, 8, 34);
  const realAt = cue(scene.realLife, 32, 8, 54);
  const concept = useTween(conceptAt, 26, Easing.expoOut);
  const real = useTween(realAt, 26, Easing.expoOut);
  const link = useTween(Math.max(conceptAt + 8, realAt - 8), 22, Easing.inOutQuart);
  const bulletAt = scene.bullets.map((b, i) => cue(b, 56 + i * 20, 6, 74 + i * 22));

  return (
    <SceneFrame label="Think of it like this" page={scene.page} narration={scene.narration} ambient>
      <div style={{ display: "flex", gap: 56, alignItems: "center", height: "100%" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {[0, 0.5].map((o) => {
            const r = ((Math.max(0, frame - 20) / 70 + o) % 1) * (frame > 20 ? 1 : 0);
            return (
              <div
                key={o}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 64,
                  border: `3px solid ${PALETTE.orange}`,
                  opacity: (1 - r) * 0.5,
                  transform: `scale(${1 + r * 0.55})`,
                }}
              />
            );
          })}
          <div
            style={{
              transform: `scale(${iconIn.sx * iconIn.p}, ${iconIn.sy * iconIn.p}) rotate(${lerp(-110, 0, Math.min(1, iconIn.p))}deg)`,
            }}
          >
            <IconTile icon={scene.icon} tone="orange" size={230} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 30 }}>
            <div
              style={{
                opacity: Math.min(1, concept * 3),
                transform: `translateX(${lerp(-90, 0, concept)}px) scale(${lerp(0.9, 1, concept)})`,
              }}
            >
              <Card
                style={{
                  padding: "16px 28px",
                  fontSize: 36,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {scene.concept}
              </Card>
            </div>
            <svg width={96} height={36} viewBox="0 0 96 36" style={{ overflow: "visible" }}>
              <DrawPath d="M4 18 H84" progress={link} stroke={PALETTE.orange} width={5} />
              <DrawPath
                d="M70 5 L86 18 L70 31"
                progress={link > 0.7 ? (link - 0.7) / 0.3 : 0}
                stroke={PALETTE.orange}
                width={5}
              />
            </svg>
            <div
              style={{
                opacity: Math.min(1, real * 3),
                transform: `translateX(${lerp(90, 0, real)}px) scale(${lerp(0.9, 1, real)})`,
              }}
            >
              <Card
                tone="black"
                style={{
                  padding: "16px 28px",
                  fontSize: 36,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {scene.realLife}
              </Card>
            </div>
          </div>
          {scene.bullets.map((b, i) => (
            <Bullet key={i} text={b} at={bulletAt[i]} />
          ))}
        </div>
      </div>
    </SceneFrame>
  );
}

function Bullet({ text, at }: { text: string; at: number }) {
  const slide = useTween(at, 24, Easing.expoOut);
  const box = useTween(at + 4, 16, Easing.backOut);
  const tick = useTween(at + 10, 14, Easing.inOutQuart);
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        marginBottom: 16,
        transform: `translateX(${lerp(60, 0, slide)}px)`,
        opacity: Math.min(1, slide * 3),
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          background: PALETTE.orange,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transform: `scale(${box})`,
        }}
      >
        <svg width={24} height={24} viewBox="0 0 24 24">
          <DrawPath d="M5 12.5 L10 17.5 L19 7" progress={tick} stroke="#fff" width={3.6} />
        </svg>
      </span>
      <Reveal delay={at + 4} duration={22}>
        <div style={{ fontSize: 31, fontWeight: 600 }}>{text}</div>
      </Reveal>
    </div>
  );
}
