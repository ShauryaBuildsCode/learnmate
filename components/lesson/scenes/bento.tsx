import { Easing, useCue, useCurrentFrame } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, ICONS, lerp, PALETTE, Reveal, seeded, tabular, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "Bento" }> };
type BentoCard = Props["scene"]["cards"][number];

// grid-area: row-start / col-start / row-end / col-end, per card count
const AREAS: Record<number, string[]> = {
  3: ["1 / 1 / 3 / 2", "1 / 2 / 2 / 3", "2 / 2 / 3 / 3"],
  4: ["1 / 1 / 2 / 3", "1 / 3 / 3 / 4", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3"],
  5: ["1 / 1 / 2 / 3", "1 / 3 / 2 / 4", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3", "2 / 3 / 3 / 4"],
};
const COLUMNS: Record<number, string> = { 3: "1.5fr 1fr", 4: "1.2fr 1fr 1fr", 5: "1.2fr 1fr 1fr" };
const FROM = [
  { x: -170, y: 20, r: -4 },
  { x: 20, y: -150, r: 3 },
  { x: 170, y: 10, r: 4 },
  { x: -10, y: 150, r: -3 },
  { x: 120, y: 120, r: 3 },
];

/**
 * An at-a-glance overview. Each card slides in when the narration names it, its number counts up on
 * arrival, and a ring follows whichever card is being talked about: focus tracks the voice.
 */
export function Bento({ scene }: Props) {
  const frame = useCurrentFrame();
  const cue = useCue();
  const n = scene.cards.length;
  const at = scene.cards.map((c, i) =>
    Math.max(10 + i * 3, cue(c.title, 18 + i * 14, 8, 24 + i * 26)),
  );
  const active = at.reduce((best, f, i) => (frame >= f && f >= at[best] ? i : best), 0);
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
        {scene.cards.map((_, i) => (
          <GhostCell key={`g${i}`} index={i} area={AREAS[n][i]} filledAt={at[i]} />
        ))}
        {scene.cards.map((card, i) => (
          <BentoTile
            key={i}
            index={i}
            card={card}
            area={AREAS[n][i]}
            at={at[i]}
            active={frame >= at[i] && active === i}
          />
        ))}
      </div>
    </SceneFrame>
  );
}

function BentoTile({
  index,
  card,
  area,
  at,
  active,
}: {
  index: number;
  card: BentoCard;
  area: string;
  at: number;
  active: boolean;
}) {
  const frame = useCurrentFrame();
  const fly = useTween(at, 26, Easing.expoOut);
  const ring = useTween(at + 10, 14, Easing.backOut);
  const count = useTween(at + 12, 46, Easing.expoOut);
  const from = FROM[index % FROM.length];
  const Icon = ICONS[card.icon];
  const tone = card.tone === "dark" ? "black" : card.tone === "accent" ? "orange" : "white";
  const ink = tone === "white" ? PALETTE.ink : "#fff";
  const float = Math.sin(frame / 44 + seeded(index, 2) * 6) * 3;
  const shown = card.stat
    ? Number.isInteger(card.stat.value)
      ? Math.round(card.stat.value * count)
      : (card.stat.value * count).toFixed(1)
    : null;
  const lift = active ? 1 : 0;
  return (
    <div
      style={{
        gridArea: area,
        opacity: Math.min(1, fly * 3),
        transform: `translate(${lerp(from.x, 0, fly)}px, ${lerp(from.y, 0, fly) + float}px) rotate(${lerp(from.r, 0, fly)}deg) scale(${lerp(0.86, 1, fly) * (1 + lift * 0.018)})`,
        position: "relative",
        display: "flex",
      }}
    >
      <Card
        tone={tone}
        style={{
          flex: 1,
          padding: "22px 26px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflow: "hidden",
          boxShadow: active
            ? `0 0 0 ${4 * ring}px ${PALETTE.orange}, 0 22px 50px rgba(17,17,17,0.18)`
            : undefined,
        }}
      >
        <Reveal delay={at + 6} duration={20}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 24,
              fontWeight: 700,
              color: ink,
              opacity: tone === "white" ? 0.78 : 0.96,
            }}
          >
            <Icon size={26} strokeWidth={2.2} color={tone === "white" ? PALETTE.purple : "#fff"} />
            {card.title}
          </div>
        </Reveal>
        {card.stat && (
          <Reveal delay={at + 10} duration={26}>
            <div
              style={{
                fontSize: 88,
                fontWeight: 800,
                letterSpacing: -3,
                color: ink,
                lineHeight: 1.04,
                ...tabular,
              }}
            >
              {card.stat.prefix}
              {shown}
              {card.stat.suffix}
            </div>
          </Reveal>
        )}
        {card.body && (
          <Reveal delay={at + 14} duration={26}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1.3,
                color: ink,
                opacity: tone === "white" ? 0.72 : 0.94,
              }}
            >
              {card.body}
            </div>
          </Reveal>
        )}
      </Card>
    </div>
  );
}

/** An empty outline where a card will land: the grid is visibly there from the first frames, then fills in. */
function GhostCell({ index, area, filledAt }: { index: number; area: string; filledAt: number }) {
  const frame = useCurrentFrame();
  const pop = useTween(3 + index * 5, 20, Easing.backOut);
  const fade = Math.max(0, 1 - Math.max(0, frame - filledAt) / 12);
  return (
    <div
      style={{
        gridArea: area,
        borderRadius: 28,
        border: `2.5px dashed ${PALETTE.border}`,
        background: "rgba(255,255,255,0.35)",
        opacity: Math.min(1, pop * 2) * fade,
        transform: `scale(${lerp(0.9, 1, Math.min(1, pop))})`,
      }}
    />
  );
}
