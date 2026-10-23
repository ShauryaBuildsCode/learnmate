import { Easing, interpolate, useCue, useCurrentFrame } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { fitText, IconTile, lerp, PALETTE, seeded, TONE_CYCLE, useSquash, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "KeyTerms" }> };

const AREA_W = 1112;
const AREA_H = 422;

/**
 * A grid that always fits the content area: one column for up to three terms, two columns otherwise, with the row
 * height and word size derived from how many terms there are and how long they are. Nothing can overlap or run off.
 */
function gridFor(count: number) {
  const cols = count <= 3 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const rowH = Math.min(120, Math.floor((AREA_H - 20) / rows));
  const colW = cols === 1 ? 760 : 520;
  const x0 = cols === 1 ? (AREA_W - colW) / 2 : (AREA_W - colW * 2 - 40) / 2;
  const y0 = (AREA_H - rows * rowH) / 2;
  return { cols, rows, rowH, colW, x0, y0, tile: Math.min(64, rowH - 30) };
}

/**
 * Each term lands the moment it is spoken: its tile arcs in from across the frame, pops on arrival, and a
 * word unrolls from behind it. The term currently being said carries an orange marker, so the eye follows the voice.
 */
export function KeyTerms({ scene }: Props) {
  const cue = useCue();
  const grid = gridFor(scene.terms.length);
  // One word size for the whole grid (the longest label sets it), so the rows read as a set.
  const wordSize = Math.min(
    ...scene.terms.map(
      (t) =>
        fitText(t.label, grid.colW - grid.tile - 30, { max: Math.round(grid.rowH * 0.6), min: 26 })
          .size,
    ),
  );
  const frames = scene.terms.map((t, i) =>
    Math.max(24 + i * 4, cue(t.label, 40 + i * 16, 10, 40 + i * 24)),
  );
  return (
    <SceneFrame label="Key ideas" page={scene.page} narration={scene.narration}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {scene.terms.map((term, i) => (
          <Term
            key={i}
            index={i}
            grid={grid}
            wordSize={wordSize}
            label={term.label}
            icon={term.icon}
            at={frames[i]}
            until={frames[i + 1] ?? Infinity}
          />
        ))}
      </div>
    </SceneFrame>
  );
}

function Term({
  index,
  grid,
  wordSize,
  label,
  icon,
  at,
  until,
}: {
  index: number;
  grid: ReturnType<typeof gridFor>;
  wordSize: number;
  label: string;
  icon: Props["scene"]["terms"][number]["icon"];
  at: number;
  until: number;
}) {
  const frame = useCurrentFrame();
  const appear = useSquash(4 + index * 4, { damping: 8, stiffness: 140 });
  const flyX = useTween(at, 30, Easing.expoOut);
  const flyY = useTween(at, 34, Easing.backOut);
  const word = useTween(at + 18, 22, Easing.expoOut);
  const marker = useTween(at + 26, 18, Easing.expoOut);
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  const end = { x: grid.x0 + col * (grid.colW + 40), y: grid.y0 + row * grid.rowH };
  const start = { x: 60 + seeded(index, 3) * 900, y: seeded(index, 9) * 340 };
  const word_ = fitText(label, grid.colW - grid.tile - 30, { max: wordSize, min: 26 });
  const settled = Math.max(0, frame - at - 34);
  const bob =
    (1 - flyX) * (Math.sin(frame / 14 + index * 1.7) * 14 + Math.cos(frame / 19 + index) * 6) +
    Math.sin(settled / 40 + index) * 3;
  const size = lerp(110, grid.tile, flyX);
  // landing pop
  const landT = Math.min(1, Math.max(0, (frame - at - 24) / 14));
  const pop = 1 + Math.sin(landT * Math.PI) * 0.22;
  const active = frame >= at && frame < until;
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(start.x, end.x, flyX),
        top: lerp(start.y, end.y, flyY) + bob,
        display: "flex",
        alignItems: "center",
        gap: 22,
        opacity: Math.min(1, appear.p * 3),
      }}
    >
      <div
        style={{
          transform: `rotate(${lerp(seeded(index, 6) * 120 - 60, 0, flyX)}deg) scale(${pop})`,
        }}
      >
        <IconTile icon={icon} tone={TONE_CYCLE[index % TONE_CYCLE.length]} size={size} />
      </div>
      <div style={{ position: "relative" }}>
        <div
          style={{
            fontSize: word_.size,
            fontWeight: 800,
            letterSpacing: -word_.size * 0.03,
            whiteSpace: "nowrap",
            clipPath: `inset(-10% ${interpolate(word, [0, 1], [100, 0])}% -10% 0)`,
            transform: `translateX(${lerp(-40, 0, word)}px)`,
          }}
        >
          {word_.lines[0]}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 2,
            height: 9,
            width: "100%",
            borderRadius: 5,
            background: PALETTE.orange,
            opacity: active ? 1 : 0.28,
            transformOrigin: "left center",
            transform: `scaleX(${marker})`,
            transition: "opacity 200ms",
          }}
        />
      </div>
    </div>
  );
}
