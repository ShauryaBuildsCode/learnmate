import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, lerp, MONO, PALETTE, useEnter } from "./kit";

type Props = { scene: Extract<Scene, { type: "ArrayViz" }> };

/** A list as stacking blocks: they drop in one by one, then a pointer walks them, one is picked, or a new block lands. */
export function ArrayViz({ scene }: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { items, mode } = scene;
  const slots = mode === "append" ? items.length + 1 : items.length;
  const block = Math.min(124, Math.floor(980 / slots) - 14);
  const gap = 14;
  const rowWidth = slots * block + (slots - 1) * gap;
  const left = (1112 - rowWidth) / 2;
  const settled = 8 + items.length * 5 + 14;
  const rowY = 112;

  const slotX = (i: number) => left + i * (block + gap);
  const iterIndex =
    mode === "iterate"
      ? Math.min(
          items.length - 1,
          Math.floor(
            interpolate(frame, [settled, durationInFrames - 34], [0, items.length - 0.001], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          ),
        )
      : -1;
  const focus =
    scene.focusIndex === undefined
      ? 0
      : scene.focusIndex < 0
        ? items.length + scene.focusIndex
        : scene.focusIndex;
  const appendAt = settled + 16;
  const lengthShown = mode === "append" && frame >= appendAt + 14 ? items.length + 1 : items.length;
  const lengthPop = spring({
    frame: frame - (appendAt + 14),
    fps,
    config: { damping: 8, stiffness: 200 },
  });

  const active = mode === "iterate" ? iterIndex : mode === "index" && frame >= settled ? focus : -1;
  const pointerTarget = active >= 0 ? slotX(active) + block / 2 : slotX(0) + block / 2;
  const pointerLanded = spring({
    frame: frame - settled,
    fps,
    config: { damping: 16, stiffness: 90 },
  });
  const stepStart =
    mode === "iterate"
      ? settled + (iterIndex / items.length) * (durationInFrames - 34 - settled)
      : settled;
  const stepSpring = spring({
    frame: frame - stepStart,
    fps,
    config: { damping: 11, stiffness: 160 },
  });
  const prevCenter = slotX(Math.max(0, iterIndex - 1)) + block / 2;
  const pointerX =
    mode === "iterate"
      ? lerp(iterIndex === 0 ? pointerTarget : prevCenter, pointerTarget, stepSpring)
      : pointerTarget;

  const header = useEnter(2);
  return (
    <SceneFrame label="Lists, block by block" page={scene.page} narration={scene.narration}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 34,
            fontWeight: 800,
            opacity: header,
            transform: `translateY(${lerp(-20, 0, header)}px)`,
          }}
        >
          <span style={{ color: PALETTE.purple }}>{scene.name}</span> = [ … ]
        </div>

        {items.map((value, i) => (
          <Block
            key={i}
            value={value}
            index={i}
            total={items.length}
            x={slotX(i)}
            y={rowY}
            size={block}
            on={active === i}
            mode={mode}
            showIndex={mode !== "iterate"}
          />
        ))}

        {mode === "append" && (
          <>
            <div
              style={{
                position: "absolute",
                left: slotX(items.length),
                top: rowY,
                width: block,
                height: block,
                borderRadius: block * 0.24,
                border: `3px dashed ${PALETTE.border}`,
              }}
            />
            <NewBlock
              value={scene.appendValue ?? "new"}
              x={slotX(items.length)}
              y={rowY}
              size={block}
              start={appendAt}
            />
          </>
        )}

        {active >= 0 && (
          <div
            style={{
              position: "absolute",
              left: pointerX - 22,
              top: rowY - 62,
              width: 44,
              textAlign: "center",
              opacity: Math.min(1, pointerLanded * 1.5),
              fontSize: 44,
              color: PALETTE.orange,
              lineHeight: 1,
            }}
          >
            ▼
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: rowY + block + 70,
            display: "flex",
            justifyContent: "center",
            gap: 18,
          }}
        >
          {mode === "iterate" && iterIndex >= 0 && (
            <Card
              tone="black"
              style={{ padding: "12px 26px", fontFamily: MONO, fontSize: 34, fontWeight: 700 }}
            >
              item = <span style={{ color: "#ffb347" }}>{items[iterIndex]}</span>
              <span style={{ color: "#8b8f97", marginLeft: 18, fontSize: 26 }}>
                (lap {iterIndex + 1} of {items.length})
              </span>
            </Card>
          )}
          {mode === "index" && frame >= settled && (
            <Card
              tone="black"
              style={{ padding: "12px 26px", fontFamily: MONO, fontSize: 34, fontWeight: 700 }}
            >
              {scene.name}[{scene.focusIndex ?? 0}] ={" "}
              <span style={{ color: "#ffb347" }}>{items[focus]}</span>
            </Card>
          )}
          {mode === "append" && (
            <Card
              style={{
                padding: "12px 26px",
                fontFamily: MONO,
                fontSize: 34,
                fontWeight: 700,
                transform: `scale(${lengthShown > items.length ? lerp(1.25, 1, lengthPop) : 1})`,
              }}
            >
              len({scene.name}) = <span style={{ color: PALETTE.orange }}>{lengthShown}</span>
            </Card>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}

function Block({
  value,
  index,
  total,
  x,
  y,
  size,
  on,
  mode,
  showIndex,
}: {
  value: string;
  index: number;
  total: number;
  x: number;
  y: number;
  size: number;
  on: boolean;
  mode: string;
  showIndex: boolean;
}) {
  const p = useEnter(8 + index * 5, { damping: 9, stiffness: 150 });
  const lit = on;
  return (
    <div
      style={{ position: "absolute", left: x, top: y - (1 - p) * 300, opacity: Math.min(1, p * 2) }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.24,
          background: lit ? PALETTE.orange : PALETTE.card,
          color: lit ? "#fff" : PALETTE.ink,
          border: `2px solid ${lit ? PALETTE.orange : PALETTE.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontSize: Math.min(46, size * 0.4),
          fontWeight: 800,
          transform: `scale(${lit ? 1.1 : 1})`,
          boxShadow: lit ? "0 16px 36px rgba(255,138,0,0.45)" : "0 8px 22px rgba(17,17,17,0.08)",
        }}
      >
        {value}
      </div>
      {showIndex && (
        <div
          style={{
            marginTop: 10,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 24,
            fontWeight: 700,
            color: PALETTE.muted,
          }}
        >
          {index}
          {mode === "index" && (
            <div style={{ color: PALETTE.purple, fontSize: 22 }}>{index - total}</div>
          )}
        </div>
      )}
    </div>
  );
}

function NewBlock({
  value,
  x,
  y,
  size,
  start,
}: {
  value: string;
  x: number;
  y: number;
  size: number;
  start: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - start, fps, config: { damping: 8, stiffness: 140 } });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - (1 - p) * 340,
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: PALETTE.ink,
        color: "#fff",
        display: frame < start ? "none" : "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: Math.min(46, size * 0.4),
        fontWeight: 800,
        boxShadow: "0 18px 40px rgba(17,17,17,0.28)",
      }}
    >
      {value}
    </div>
  );
}
