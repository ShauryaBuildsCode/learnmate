import { useCurrentFrame } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { IconTile, lerp, seeded, TONE_CYCLE, useEnter } from "./kit";

type Props = { scene: Extract<Scene, { type: "KeyTerms" }> };

const COLS = [10, 590];
const ROW_H = 104;

/** Icon tiles scatter in from all over the frame, then shrink into big bold words: kinetic typography. */
export function KeyTerms({ scene }: Props) {
  return (
    <SceneFrame label="Key ideas" page={scene.page} narration={scene.narration}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {scene.terms.map((term, i) => (
          <Term key={i} index={i} label={term.label} icon={term.icon} />
        ))}
      </div>
    </SceneFrame>
  );
}

function Term({
  index,
  label,
  icon,
}: {
  index: number;
  label: string;
  icon: Props["scene"]["terms"][number]["icon"];
}) {
  const frame = useCurrentFrame();
  const p = useEnter(10 + index * 7, { damping: 13, stiffness: 85 });
  const text = useEnter(24 + index * 7);
  const col = index % 2;
  const row = Math.floor(index / 2);
  const end = { x: COLS[col] + (row % 2) * 36, y: row * ROW_H + 8 };
  const start = { x: 80 + seeded(index, 3) * 900, y: seeded(index, 9) * 380 };
  const bob = (1 - p) * Math.sin(frame / 14 + index) * 14;
  const size = lerp(104, 62, p);
  return (
    <div
      style={{
        position: "absolute",
        left: lerp(start.x, end.x, p),
        top: lerp(start.y, end.y, p) + bob,
        display: "flex",
        alignItems: "center",
        gap: 22,
        transform: `rotate(${lerp(seeded(index, 6) * 80 - 40, 0, p)}deg)`,
      }}
    >
      <IconTile icon={icon} tone={TONE_CYCLE[index % TONE_CYCLE.length]} size={size} />
      <div
        style={{
          fontSize: 66,
          fontWeight: 800,
          letterSpacing: -2,
          whiteSpace: "nowrap",
          opacity: text,
          clipPath: `inset(0 ${lerp(100, 0, text)}% 0 0)`,
          transform: `translateX(${lerp(-24, 0, text)}px)`,
        }}
      >
        {label}
      </div>
    </div>
  );
}
