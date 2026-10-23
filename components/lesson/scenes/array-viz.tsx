import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { Card, lerp, MONO, PALETTE, Reveal, tabular, useSquash, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "ArrayViz" }> };

const ROW_Y = 128;

/**
 * A list as blocks. They drop in with squash and stretch and a contact shadow; then, depending on the mode,
 * a pointer hops from item to item, one slot is lifted out by its index, or a new block lands on the end.
 */
export function ArrayViz({ scene }: Props) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { items, mode } = scene;
  const slots = mode === "append" ? items.length + 1 : items.length;
  const block = Math.min(124, Math.floor(980 / slots) - 14);
  const gap = 14;
  const left = (1112 - (slots * block + (slots - 1) * gap)) / 2;
  const settled = 12 + items.length * 5 + 16;
  const slotX = (i: number) => left + i * (block + gap);
  const center = (i: number) => slotX(i) + block / 2;

  const header = useTween(2, 22);
  const focus =
    scene.focusIndex === undefined
      ? 0
      : scene.focusIndex < 0
        ? items.length + scene.focusIndex
        : scene.focusIndex;

  // iterate: which item, and how far through the hop to it
  const walkEnd = durationInFrames - 36;
  const raw =
    mode === "iterate"
      ? interpolate(frame, [settled, walkEnd], [0, items.length - 0.001], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;
  const iter = Math.min(items.length - 1, Math.floor(raw));
  const hopU =
    mode === "iterate" ? Easing.inOutQuart(Math.min(1, Math.max(0, (raw - iter) * 5))) : 1;
  const pointerFrom = mode === "iterate" ? center(Math.max(0, iter - 1)) : center(focus);
  const pointerTo = mode === "iterate" ? center(iter) : center(focus);
  const pointerX =
    iter === 0 && mode === "iterate" ? pointerTo : lerp(pointerFrom, pointerTo, hopU);
  const hopY = mode === "iterate" && iter > 0 ? -Math.sin(hopU * Math.PI) * 30 : 0;
  const pointerIn = useTween(settled, 20, Easing.backOut);
  const active =
    mode === "iterate"
      ? frame >= settled
        ? iter
        : -1
      : mode === "index" && frame >= settled
        ? focus
        : -1;

  const appendAt = settled + 14;
  const appended = mode === "append" && frame >= appendAt + 16;
  const lenPop = useTween(appendAt + 16, 18, Easing.backOut);

  return (
    <SceneFrame label="Lists, block by block" page={scene.page} narration={scene.narration}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 800, opacity: header }}>
          <Reveal delay={2} duration={22}>
            <span>
              <span style={{ color: PALETTE.purple }}>{scene.name}</span> = [ … ]
            </span>
          </Reveal>
        </div>

        {items.map((value, i) => (
          <Block
            key={i}
            value={value}
            index={i}
            x={slotX(i)}
            size={block}
            on={active === i}
            showIndex={mode !== "iterate"}
            negative={mode === "index" ? i - items.length : null}
            lift={mode === "index" && active === i ? 1 : 0}
          />
        ))}

        {mode === "append" && (
          <>
            <div
              style={{
                position: "absolute",
                left: slotX(items.length),
                top: ROW_Y,
                width: block,
                height: block,
                borderRadius: block * 0.24,
                border: `3px dashed ${PALETTE.border}`,
              }}
            />
            <NewBlock
              value={scene.appendValue ?? "new"}
              x={slotX(items.length)}
              size={block}
              at={appendAt}
            />
          </>
        )}

        {active >= 0 && mode !== "append" && (
          <div
            style={{
              position: "absolute",
              left: pointerX - 22,
              top: ROW_Y - 62 + hopY,
              width: 44,
              textAlign: "center",
              opacity: Math.min(1, pointerIn * 2),
              fontSize: 44,
              color: PALETTE.orange,
              lineHeight: 1,
              transform: `scale(${pointerIn})`,
              filter: "drop-shadow(0 6px 8px rgba(255,138,0,0.35))",
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
            top: ROW_Y + block + (mode === "index" ? 104 : 72),
            display: "flex",
            justifyContent: "center",
          }}
        >
          {mode === "iterate" && iter >= 0 && frame >= settled && (
            <Card
              tone="black"
              style={{
                padding: "12px 26px",
                fontFamily: MONO,
                fontSize: 34,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              item =
              <Roller value={items[iter]} key={iter} />
              <span style={{ color: "#8b8f97", marginLeft: 10, fontSize: 26 }}>
                (lap {iter + 1} of {items.length})
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
                transform: `scale(${appended ? lerp(1.3, 1, lenPop) : 1})`,
              }}
            >
              len({scene.name}) ={" "}
              <span style={{ color: PALETTE.orange, ...tabular }}>
                {appended ? items.length + 1 : items.length}
              </span>
            </Card>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}

/** A value that slides up into place each time it changes (mount it with a new key). */
function Roller({ value }: { value: string }) {
  const p = useTween(0, 14, Easing.expoOut);
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        height: 44,
        verticalAlign: "bottom",
        color: "#ffb347",
      }}
    >
      <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 100}%)` }}>
        {value}
      </span>
    </span>
  );
}

function Block({
  value,
  index,
  x,
  size,
  on,
  showIndex,
  negative,
  lift,
}: {
  value: string;
  index: number;
  x: number;
  size: number;
  on: boolean;
  showIndex: boolean;
  negative: number | null;
  lift: number;
}) {
  const { p, sx, sy } = useSquash(10 + index * 5, { damping: 9, stiffness: 150 });
  const fall = (1 - Math.min(1, p)) * 320;
  const liftY = lift * -18;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: ROW_Y,
        width: size,
        opacity: Math.min(1, p * 3),
      }}
    >
      {/* contact shadow grows as the block lands */}
      <div
        style={{
          position: "absolute",
          left: size * 0.1,
          top: size + 6,
          width: size * 0.8,
          height: 12,
          borderRadius: "50%",
          background: "rgba(17,17,17,0.16)",
          transform: `scale(${Math.min(1, p) * (1 - lift * 0.2)})`,
          filter: "blur(4px)",
        }}
      />
      <div
        style={{
          transform: `translateY(${-fall + liftY}px) scale(${sx * (on ? 1.1 : 1)}, ${sy * (on ? 1.1 : 1)})`,
          transformOrigin: "50% 100%",
        }}
      >
        <div
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.24,
            background: on ? PALETTE.orange : PALETTE.card,
            color: on ? "#fff" : PALETTE.ink,
            border: `2.5px solid ${on ? PALETTE.orange : PALETTE.ink}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: MONO,
            fontSize: Math.min(46, size * 0.4),
            fontWeight: 800,
            boxShadow: on ? "0 18px 38px rgba(255,138,0,0.45)" : "0 8px 22px rgba(17,17,17,0.08)",
          }}
        >
          {value}
        </div>
      </div>
      {showIndex && (
        <div
          style={{
            marginTop: 22,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 24,
            fontWeight: 700,
            color: PALETTE.muted,
            opacity: Math.min(1, p),
          }}
        >
          {index}
          {negative !== null && (
            <div style={{ color: PALETTE.purple, fontSize: 22 }}>{negative}</div>
          )}
        </div>
      )}
    </div>
  );
}

function NewBlock({ value, x, size, at }: { value: string; x: number; size: number; at: number }) {
  const frame = useCurrentFrame();
  const { p, sx, sy } = useSquash(at, { damping: 7, stiffness: 130 });
  const ripple = useTween(at + 14, 22, Easing.expoOut);
  if (frame < at) return null;
  const rot = (1 - Math.min(1, p)) * -34;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x - 14,
          top: ROW_Y - 14,
          width: size + 28,
          height: size + 28,
          borderRadius: size * 0.34,
          border: `3px solid ${PALETTE.orange}`,
          opacity: (1 - ripple) * 0.8,
          transform: `scale(${1 + ripple * 0.5})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x,
          top: ROW_Y - (1 - Math.min(1, p)) * 360,
          width: size,
          height: size,
          borderRadius: size * 0.24,
          background: PALETTE.ink,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontSize: Math.min(46, size * 0.4),
          fontWeight: 800,
          transform: `rotate(${rot}deg) scale(${sx}, ${sy})`,
          transformOrigin: "50% 100%",
          boxShadow: "0 22px 44px rgba(17,17,17,0.3)",
        }}
      >
        {value}
      </div>
    </>
  );
}
