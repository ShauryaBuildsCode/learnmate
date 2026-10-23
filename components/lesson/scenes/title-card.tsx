import { Easing, interpolate, useCurrentFrame } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import {
  fitText,
  ICON_NAMES,
  IconTile,
  lerp,
  PALETTE,
  Reveal,
  seeded,
  TONE_CYCLE,
  useSquash,
  wrapWords,
  useTween,
} from "./kit";

const CX = 556;
const CY = 205;
/** Resting spots sit in the left and right margins (the title is at most 820px wide, centred), so tiles never touch the words. */
const REST: Point[] = [
  { x: 44, y: 60 },
  { x: 1068, y: 110 },
  { x: 40, y: 215 },
  { x: 1072, y: 250 },
  { x: 48, y: 360 },
  { x: 1064, y: 380 },
];
interface Point {
  x: number;
  y: number;
}

/**
 * The opener: a warm sun blooms behind the title, tiles arc in from the edges and land with squash,
 * then drift in slow orbit while the title rises word by word from behind a mask.
 */
export function TitleCard({ scene }: { scene: Extract<Scene, { type: "TitleCard" }> }) {
  const frame = useCurrentFrame();
  const title = fitTitle(scene.title);
  const words = scene.title.split(/\s+/);
  const hook = fitText(scene.hook, 760, { max: 34, min: 22, maxLines: 2, charW: 0.5 });
  const sun = useTween(0, 46, Easing.expoOut);
  const ring = useTween(6, 60, Easing.inOutQuart);
  const underline = useTween(10 + words.length * 5 + 8, 22, Easing.expoOut);
  const hookDelay = 14 + words.length * 5;

  return (
    <SceneFrame label="Topic" page={scene.page} narration={scene.narration}>
      {/* a 100%-sized box in the content area, so every coordinate below is relative to it (not to the whole stage) */}
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* sun */}
        <div
          style={{
            position: "absolute",
            left: CX - 380,
            top: CY - 380,
            width: 760,
            height: 760,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,138,0,0.30), rgba(255,138,0,0.10) 45%, transparent 68%)",
            transform: `scale(${lerp(0.2, 1, sun) * (1 + Math.sin(frame / 38) * 0.025)})`,
            opacity: sun,
          }}
        />
        {/* ink ring that draws itself and turns slowly */}
        <svg
          width={760}
          height={760}
          style={{
            position: "absolute",
            left: CX - 380,
            top: CY - 380,
            transform: `rotate(${frame * 0.12}deg)`,
          }}
        >
          <circle
            cx={380}
            cy={380}
            r={300}
            fill="none"
            stroke={PALETTE.ink}
            strokeOpacity={0.14}
            strokeWidth={2}
            strokeDasharray="6 14"
            pathLength={1}
            style={{ strokeDashoffset: 0, clipPath: `inset(0 ${(1 - ring) * 100}% 0 0)` }}
          />
        </svg>

        {Array.from({ length: REST.length }, (_, i) => (
          <FlyingTile key={i} index={i} />
        ))}

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {(() => {
              let n = 0;
              return title.lines.map((line, li) => (
                <div
                  key={li}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    columnGap: title.size * 0.26,
                  }}
                >
                  {line.split(" ").map((w) => {
                    const i = n++;
                    return (
                      <Reveal key={i} delay={10 + i * 5} duration={26}>
                        <div
                          style={{
                            fontSize: title.size,
                            fontWeight: 800,
                            letterSpacing: lerp(
                              -title.size * 0.075,
                              -title.size * 0.034,
                              Math.min(1, Math.max(0, (frame - 10 - i * 5) / 30)),
                            ),
                            lineHeight: 1.05,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {w}
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
          <div
            style={{
              height: 11,
              width: Math.min(300, title.width),
              borderRadius: 6,
              background: PALETTE.orange,
              marginTop: 10,
              transformOrigin: "left center",
              transform: `scaleX(${underline})`,
            }}
          />
          <Reveal delay={hookDelay} duration={24} style={{ marginTop: 26 }}>
            <div
              style={{
                fontSize: hook.size,
                fontWeight: 600,
                color: PALETTE.muted,
                lineHeight: 1.25,
              }}
            >
              {hook.lines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </SceneFrame>
  );
}

/** Arcs in from off-screen (x and y on different curves bend the path), lands with squash, then orbits idly. */
function FlyingTile({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const delay = 3 + index * 4;
  const rest = REST[index];
  const start = { x: seeded(index, 3) > 0.5 ? -200 : 1320, y: -120 + seeded(index, 8) * 520 };
  const px = useTween(delay, 34, Easing.expoOut);
  const py = useTween(delay, 38, Easing.backOut);
  const { sx, sy } = useSquash(delay + 18);
  const settled = Math.max(0, frame - delay - 34);
  const orbit = {
    x: Math.cos(settled / 52 + index) * 9,
    y: Math.sin(settled / 44 + index * 1.3) * 11,
  };
  const size = 88 - (index % 3) * 14;
  const rot = interpolate(px, [0, 1], [seeded(index, 1) * 260 - 130, seeded(index, 4) * 20 - 10]);
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(start.x, rest.x, px) + orbit.x - size / 2,
        top: lerp(start.y, rest.y, py) + orbit.y - size / 2,
        transform: `rotate(${rot}deg) scale(${sx}, ${sy})`,
        opacity: Math.min(1, px * 4),
      }}
    >
      <IconTile
        icon={ICON_NAMES[(index * 2) % ICON_NAMES.length]}
        tone={TONE_CYCLE[index]}
        size={size}
      />
    </div>
  );
}

/**
 * The largest title size (116px down to 52px) whose lines fit 820px wide and a 210px-tall block, so a long title
 * shrinks and wraps instead of running over the hook or the captions.
 */
function fitTitle(text: string): { size: number; lines: string[]; width: number } {
  const maxWidth = 820;
  for (let size = 116; size >= 52; size -= 4) {
    const lines = wrapWords(text, Math.floor(maxWidth / (size * 0.6)));
    const widest = Math.max(...lines.map((l) => l.length)) * size * 0.6;
    if (lines.length * size * 1.05 <= 210 && widest <= maxWidth)
      return { size, lines, width: widest };
  }
  const lines = wrapWords(text, Math.floor(maxWidth / (52 * 0.6)));
  return { size: 52, lines, width: maxWidth };
}
