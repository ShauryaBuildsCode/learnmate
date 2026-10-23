import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { ICON_NAMES, IconTile, lerp, PALETTE, seeded, TONE_CYCLE, useEnter } from "./kit";

/** Icon tiles fly in from all sides and settle around the title, which lands word by word. */
export function TitleCard({ scene }: { scene: Extract<Scene, { type: "TitleCard" }> }) {
  const frame = useCurrentFrame();
  const words = scene.title.split(/\s+/);
  const hook = useEnter(16 + words.length * 5);
  const underline = interpolate(frame, [14, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tiles = Array.from({ length: 7 }, (_, i) => {
    const angle = (i / 7) * Math.PI * 2 + 0.5;
    const rest = { x: 640 + Math.cos(angle) * 520, y: 300 + Math.sin(angle) * 250 };
    const start = { x: seeded(i, 3) > 0.5 ? -160 : 1440, y: seeded(i, 8) * 720 };
    return { rest, start, delay: i * 4 };
  });

  return (
    <SceneFrame label="Topic" page={scene.page} narration={scene.narration} ambient={false}>
      <div style={{ position: "absolute", inset: 0 }}>
        {tiles.map((t, i) => (
          <TileFlight key={i} index={i} {...t} />
        ))}
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0 26px",
            maxWidth: 940,
          }}
        >
          {words.map((w, i) => (
            <Word key={i} text={w} delay={8 + i * 5} />
          ))}
        </div>
        <div
          style={{
            height: 10,
            width: 280,
            borderRadius: 5,
            background: PALETTE.orange,
            marginTop: 14,
            transformOrigin: "left center",
            transform: `scaleX(${underline})`,
          }}
        />
        <div
          style={{
            marginTop: 26,
            fontSize: 36,
            fontWeight: 600,
            color: PALETTE.muted,
            maxWidth: 820,
            opacity: hook,
            transform: `translateY(${lerp(18, 0, hook)}px)`,
          }}
        >
          {scene.hook}
        </div>
      </div>
    </SceneFrame>
  );
}

function Word({ text, delay }: { text: string; delay: number }) {
  const p = useEnter(delay, { damping: 11, stiffness: 140 });
  return (
    <div
      style={{
        fontSize: 104,
        fontWeight: 800,
        letterSpacing: -3,
        lineHeight: 1.04,
        opacity: Math.min(1, p * 1.4),
        transform: `translateY(${lerp(60, 0, p)}px) scale(${lerp(0.9, 1, p)})`,
      }}
    >
      {text}
    </div>
  );
}

function TileFlight({
  index,
  start,
  rest,
  delay,
}: {
  index: number;
  start: { x: number; y: number };
  rest: { x: number; y: number };
  delay: number;
}) {
  const frame = useCurrentFrame();
  const p = useEnter(delay, { damping: 14, stiffness: 70 });
  const bob = Math.sin(frame / 26 + index) * 9;
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(start.x, rest.x, p),
        top: lerp(start.y, rest.y, p) + bob,
        transform: `rotate(${lerp(seeded(index, 1) * 200 - 100, seeded(index, 4) * 24 - 12, p)}deg) scale(${lerp(0.6, 1, p)})`,
      }}
    >
      <IconTile
        icon={ICON_NAMES[(index * 2) % ICON_NAMES.length]}
        tone={TONE_CYCLE[index]}
        size={86 - (index % 3) * 14}
      />
    </div>
  );
}
