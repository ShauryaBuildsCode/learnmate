import { interpolate, useCurrentFrame } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, ICONS, lerp, PALETTE, useEnter } from "./kit";

type Props = { scene: Extract<Scene, { type: "Bento" }> };
type BentoCard = Props["scene"]["cards"][number];

// grid-area: row-start / col-start / row-end / col-end, per card count
const AREAS: Record<number, string[]> = {
  3: ["1 / 1 / 3 / 2", "1 / 2 / 2 / 3", "2 / 2 / 3 / 3"],
  4: ["1 / 1 / 2 / 3", "1 / 3 / 3 / 4", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3"],
  5: ["1 / 1 / 2 / 3", "1 / 3 / 2 / 4", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3", "2 / 3 / 3 / 4"],
};
const COLUMNS: Record<number, string> = { 3: "1.5fr 1fr", 4: "1.2fr 1fr 1fr", 5: "1.2fr 1fr 1fr" };
// each card slides in from a different side
const FROM = [
  { x: -140, y: 0 },
  { x: 0, y: -120 },
  { x: 140, y: 0 },
  { x: 0, y: 120 },
  { x: 100, y: 100 },
];

/** An overview as a bento grid: cards slide into place, then their numbers count up and text fades in. */
export function Bento({ scene }: Props) {
  const n = scene.cards.length;
  return (
    <SceneFrame label="The big picture" page={scene.page} narration={scene.narration}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLUMNS[n],
          gridTemplateRows: "1fr 1fr",
          gap: 20,
          width: "100%",
          height: "100%",
        }}
      >
        {scene.cards.map((card, i) => (
          <BentoTile key={i} index={i} card={card} area={AREAS[n][i]} />
        ))}
      </div>
    </SceneFrame>
  );
}

function BentoTile({ index, card, area }: { index: number; card: BentoCard; area: string }) {
  const frame = useCurrentFrame();
  const p = useEnter(4 + index * 9, { damping: 15, stiffness: 100 });
  const content = useEnter(26 + index * 9);
  const from = FROM[index % FROM.length];
  const Icon = ICONS[card.icon];
  const tone = card.tone === "dark" ? "black" : card.tone === "accent" ? "orange" : "white";
  const ink = tone === "white" ? PALETTE.ink : "#fff";
  const count = card.stat
    ? interpolate(frame, [30 + index * 9, 70 + index * 9], [0, card.stat.value], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const shown = card.stat
    ? Number.isInteger(card.stat.value)
      ? Math.round(count)
      : count.toFixed(1)
    : null;
  return (
    <Card
      tone={tone}
      style={{
        gridArea: area,
        padding: "22px 26px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflow: "hidden",
        opacity: Math.min(1, p * 1.5),
        transform: `translate(${lerp(from.x, 0, p)}px, ${lerp(from.y, 0, p)}px) scale(${lerp(0.88, 1, p)})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 24,
          fontWeight: 700,
          color: ink,
          opacity: tone === "white" ? 0.75 : 0.95,
        }}
      >
        <Icon size={26} strokeWidth={2.2} color={tone === "white" ? PALETTE.purple : "#fff"} />
        {card.title}
      </div>
      {card.stat && (
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: -3,
            color: ink,
            opacity: content,
            lineHeight: 1.05,
          }}
        >
          {card.stat.prefix}
          {shown}
          {card.stat.suffix}
        </div>
      )}
      {card.body && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1.3,
            color: ink,
            opacity: content * (tone === "white" ? 0.7 : 0.92),
            transform: `translateY(${lerp(14, 0, content)}px)`,
          }}
        >
          {card.body}
        </div>
      )}
    </Card>
  );
}
