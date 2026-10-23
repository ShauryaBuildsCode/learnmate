import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, IconTile, PALETTE, TONE_CYCLE, tabular, useSquash, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "RepeatBurst" }> };

const COLS = 14;
const ROWS = 5;
const TILE = 62;
const GAP = 14;
const CENTER = { c: (COLS - 1) / 2, r: (ROWS - 1) / 2 };

/**
 * "Write it once, run it N times": one tile becomes a thousand. The mosaic ripples outward from the centre
 * while the camera pulls back with a long ease and the counter accelerates, then settles.
 */
export function RepeatBurst({ scene }: Props) {
  const frame = useCurrentFrame();
  const { speechInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [10, speechInFrames * 0.72], [3.4, 1], {
    easing: Easing.inOutQuart,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const progress = interpolate(frame, [14, speechInFrames * 0.78], [0, 1], {
    easing: Easing.bezier(0.5, 0, 0.1, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shown = Math.max(1, Math.round(scene.count * progress));
  const card = useSquash(20, { damping: 10, stiffness: 140 });
  const centerX = (CENTER.c * (TILE + GAP) + TILE / 2) * zoom;
  const centerY = (CENTER.r * (TILE + GAP) + TILE / 2) * zoom;
  return (
    <SceneFrame label="Why loops exist" page={scene.page} narration={scene.narration}>
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: 556 - centerX,
            top: 190 - centerY,
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
              padding: "22px 46px",
              textAlign: "center",
              transform: `scale(${card.sx * card.p}, ${card.sy * card.p})`,
              boxShadow: "0 30px 70px rgba(17,17,17,0.35)",
            }}
          >
            <div
              style={{
                fontSize: 124,
                fontWeight: 800,
                letterSpacing: -4,
                lineHeight: 1,
                color: PALETTE.orange,
                ...tabular,
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
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const dist = Math.hypot(col - CENTER.c, (row - CENTER.r) * 1.6);
  const p = useTween(6 + dist * 2.6, 22, Easing.backOut);
  return (
    <div style={{ transform: `scale(${p})`, opacity: Math.min(1, p * 2.5) }}>
      <IconTile icon={icon} tone={TONE_CYCLE[(index * 5 + row) % TONE_CYCLE.length]} size={TILE} />
    </div>
  );
}
