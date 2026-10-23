import { Easing, useCue } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, lerp, PALETTE, Reveal, useSquash, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "Compare" }> };

/** Two ideas side by side. Each side slides in as its title is spoken; points tick in as they are said, left then right. */
export function Compare({ scene }: Props) {
  const cue = useCue();
  const leftAt = cue(scene.left.title, 10, 6, 24);
  const rightAt = cue(scene.right.title, 30, 6, 48);
  const vs = useSquash(Math.max(leftAt, rightAt - 6) + 4, { damping: 8, stiffness: 160 });
  const leftPoints = scene.left.points.map((p, i) => cue(p, 54 + i * 18, 6, 72 + i * 20));
  const rightPoints = scene.right.points.map((p, i) => cue(p, 60 + i * 18, 6, 80 + i * 20));
  return (
    <SceneFrame label="Side by side" page={scene.page} narration={scene.narration} ambient>
      <div style={{ display: "flex", alignItems: "center", gap: 28, height: "100%" }}>
        <Side side={scene.left} at={leftAt} points={leftPoints} dir={-1} tone="white" />
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            background: PALETTE.orange,
            color: "#fff",
            fontSize: 26,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transform: `scale(${vs.sx * vs.p}, ${vs.sy * vs.p})`,
          }}
        >
          VS
        </div>
        <Side side={scene.right} at={rightAt} points={rightPoints} dir={1} tone="black" />
      </div>
    </SceneFrame>
  );
}

function Side({
  side,
  at,
  points,
  dir,
  tone,
}: {
  side: { title: string; points: string[] };
  at: number;
  points: number[];
  dir: 1 | -1;
  tone: "white" | "black";
}) {
  const p = useTween(at, 26, Easing.expoOut);
  return (
    <div
      style={{
        flex: 1,
        opacity: Math.min(1, p * 3),
        transform: `translateX(${lerp(dir * 90, 0, p)}px)`,
      }}
    >
      <Card tone={tone} style={{ padding: "28px 30px", minHeight: 300 }}>
        <div style={{ fontSize: 38, fontWeight: 800, marginBottom: 20, lineHeight: 1.1 }}>
          {side.title}
        </div>
        {side.points.map((pt, i) => (
          <Point key={i} text={pt} at={points[i]} dark={tone === "black"} />
        ))}
      </Card>
    </div>
  );
}

function Point({ text, at, dark }: { text: string; at: number; dark: boolean }) {
  const slide = useTween(at, 22, Easing.expoOut);
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        marginBottom: 14,
        opacity: Math.min(1, slide * 3),
        transform: `translateX(${lerp(40, 0, slide)}px)`,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: PALETTE.orange,
          marginTop: 13,
          flexShrink: 0,
        }}
      />
      <Reveal delay={at + 3} duration={20}>
        <div
          style={{
            fontSize: 27,
            fontWeight: 600,
            lineHeight: 1.3,
            color: dark ? "#fff" : PALETTE.ink,
          }}
        >
          {text}
        </div>
      </Reveal>
    </div>
  );
}
