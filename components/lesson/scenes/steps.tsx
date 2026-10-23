import { Easing, useCue } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, DrawPath, fitText, lerp, PALETTE, Reveal, useSquash, useTween } from "./kit";

const CONNECTOR = 46;
const AREA_W = 1112;

type Props = { scene: Extract<Scene, { type: "Steps" }> };

/**
 * A process, one step at a time. Each numbered step drops in when its label is spoken, and the connector from the
 * previous step draws itself just before, so the eye is pulled along the sequence at the speed of the voice.
 */
export function Steps({ scene }: Props) {
  const cue = useCue();
  const n = scene.steps.length;
  const at = scene.steps.map((s, i) => cue(s.label, 10 + i * 24, 6, 20 + i * 28));
  return (
    <SceneFrame label="How it works" page={scene.page} narration={scene.narration} ambient>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          minHeight: 230,
          margin: "auto 0",
        }}
      >
        {scene.steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
            <StepCard index={i} label={step.label} detail={step.detail} at={at[i]} total={n} />
            {i < n - 1 && <Connector from={at[i]} to={at[i + 1]} gap={CONNECTOR} />}
          </div>
        ))}
      </div>
    </SceneFrame>
  );
}

function StepCard({
  index,
  label,
  detail,
  at,
  total,
}: {
  index: number;
  label: string;
  detail?: string;
  at: number;
  total: number;
}) {
  const pop = useSquash(at, { damping: 9, stiffness: 140 });
  // Cards share the row equally, so any number of steps fits; text shrinks and wraps to the card.
  const width = Math.floor((AREA_W - (total - 1) * CONNECTOR) / total);
  const inner = width - 40;
  const title = fitText(label, inner, {
    max: total > 4 ? 28 : 34,
    min: 18,
    maxLines: 3,
    charW: 0.58,
  });
  const sub = detail
    ? fitText(detail, inner, { max: total > 4 ? 18 : 22, min: 14, maxLines: 4, charW: 0.5 })
    : null;
  const dark = index % 2 === 0;
  return (
    <div
      style={{
        width,
        transform: `translateY(${lerp(60, 0, Math.min(1, pop.p))}px) scale(${pop.sx}, ${pop.sy})`,
        opacity: Math.min(1, pop.p * 3),
      }}
    >
      <Card
        tone={dark ? "black" : "white"}
        style={{
          height: "100%",
          padding: "22px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: PALETTE.orange,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <Reveal delay={at + 4} duration={20}>
          <div style={{ fontSize: title.size, fontWeight: 800, lineHeight: 1.12 }}>
            {title.lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </Reveal>
        {sub && (
          <Reveal delay={at + 10} duration={22}>
            <div style={{ fontSize: sub.size, fontWeight: 500, opacity: 0.72, lineHeight: 1.25 }}>
              {sub.lines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </Reveal>
        )}
      </Card>
    </div>
  );
}

function Connector({ from, to, gap }: { from: number; to: number; gap: number }) {
  const p = useTween(Math.max(from + 10, to - 12), 14, Easing.inOutQuart);
  return (
    <svg
      width={gap}
      height={30}
      viewBox="0 0 44 30"
      style={{ overflow: "visible", flexShrink: 0, alignSelf: "center" }}
    >
      <DrawPath d="M2 15 H34" progress={p} stroke={PALETTE.orange} width={5} />
      <DrawPath
        d="M26 5 L38 15 L26 25"
        progress={p > 0.7 ? (p - 0.7) / 0.3 : 0}
        stroke={PALETTE.orange}
        width={5}
      />
    </svg>
  );
}
