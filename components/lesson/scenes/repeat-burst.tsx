import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, IconTile, PALETTE, TONE_CYCLE, useEnter } from "./kit";

type Props = { scene: Extract<Scene, { type: "RepeatBurst" }> };

const COLS = 14;
const ROWS = 5;
const TILE = 62;
const GAP = 14;

/** "Write it once, run it N times": a mosaic fills in while the camera zooms out and a counter climbs. */
export function RepeatBurst({ scene }: Props) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [12, durationInFrames * 0.6], [3.6, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const progress = interpolate(frame, [12, durationInFrames * 0.7], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = Math.max(1, Math.round(scene.count * progress));
  const card = useEnter(26);
  return (
    <SceneFrame
      label="Why loops exist"
      page={scene.page}
      narration={scene.narration}
      ambient={false}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, ${TILE}px)`,
            gap: GAP,
            transformOrigin: "0% 0%",
            transform: `scale(${zoom})`,
          }}
        >
          {Array.from({ length: COLS * ROWS }, (_, i) => (
            <MosaicTile key={i} index={i} icon={scene.icon} />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Card
            tone="black"
            style={{
              padding: "22px 44px",
              textAlign: "center",
              opacity: card,
              transform: `scale(${0.86 + card * 0.14})`,
            }}
          >
            <div
              style={{
                fontSize: 118,
                fontWeight: 800,
                letterSpacing: -4,
                lineHeight: 1,
                color: PALETTE.orange,
              }}
            >
              ×{shown}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 6 }}>{scene.label}</div>
          </Card>
        </div>
      </div>
    </SceneFrame>
  );
}

function MosaicTile({ index, icon }: { index: number; icon: Props["scene"]["icon"] }) {
  const p = useEnter(Math.round(index * 0.8), { damping: 12, stiffness: 160 });
  return (
    <div style={{ transform: `scale(${p})`, opacity: Math.min(1, p * 2) }}>
      <IconTile
        icon={icon}
        tone={TONE_CYCLE[(index * 5 + Math.floor(index / COLS)) % TONE_CYCLE.length]}
        size={TILE}
      />
    </div>
  );
}
