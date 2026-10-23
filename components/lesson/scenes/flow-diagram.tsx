import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import type { Scene } from "@/lib/schemas/lesson";
import { SceneFrame } from "./common";
import { DrawPath, FONT, fitText, lerp, PALETTE, useSquash, useTween } from "./kit";

type Props = { scene: Extract<Scene, { type: "FlowDiagram" }> };
interface Point {
  x: number;
  y: number;
}
interface NodeSpec {
  id: string;
  label: string;
  at: Point;
  shape: "pill" | "box" | "diamond";
}
interface EdgeSpec {
  d: string;
  label?: string;
  labelAt?: Point;
}

const LAPS = 3;
const DWELL = 70; // path-length-equivalent pause at each node

/** Token position (and which node it is at) for progress p in 0..1: eases between nodes and dwells on each. */
function tokenAt(
  path: Point[],
  nodes: string[],
  p: number,
): { point: Point; node: string; arrivals: number[] } {
  const segs = path.slice(1).map((b, i) => ({
    a: path[i],
    b,
    len: Math.hypot(b.x - path[i].x, b.y - path[i].y),
    node: nodes[i + 1],
  }));
  const total = segs.reduce((n, s) => n + s.len + (s.node ? DWELL : 0), 0);
  const arrivals: number[] = [];
  let acc = 0;
  for (const s of segs) {
    acc += s.len;
    arrivals.push(acc / total);
    acc += s.node ? DWELL : 0;
  }
  let target = Math.min(1, Math.max(0, p)) * total;
  let current = nodes[0] ?? "";
  for (const s of segs) {
    if (target <= s.len) {
      const u = Easing.inOutQuart(s.len === 0 ? 1 : target / s.len);
      return {
        point: { x: lerp(s.a.x, s.b.x, u), y: lerp(s.a.y, s.b.y, u) },
        node: current,
        arrivals,
      };
    }
    target -= s.len;
    current = s.node || current;
    if (target <= (s.node ? DWELL : 0)) return { point: s.b, node: current, arrivals };
    target -= s.node ? DWELL : 0;
  }
  return { point: path[path.length - 1], node: current, arrivals };
}

function NodeShape({
  node,
  index,
  pulse,
  active,
}: {
  node: NodeSpec;
  index: number;
  pulse: number;
  active: boolean;
}) {
  const { sx, sy, p } = useSquash(4 + index * 7, { damping: 9, stiffness: 160 });
  const stroke = active ? PALETTE.orange : PALETTE.ink;
  const fill = active ? "#fff1dd" : PALETTE.card;
  const { x, y } = node.at;
  const bump = 1 + pulse * 0.09;
  const w = node.shape === "pill" ? 130 : 190;
  // Labels wrap and shrink inside their shape instead of spilling over their neighbours.
  const textW = node.shape === "diamond" ? 150 : node.shape === "pill" ? 112 : 168;
  const fit = fitText(node.label, textW, {
    max: 22,
    min: 12,
    maxLines: node.shape === "pill" ? 2 : 3,
    charW: 0.56,
  });
  const lineH = fit.size * 1.18;
  const text = (
    <text
      x={x}
      y={y - ((fit.lines.length - 1) * lineH) / 2 + fit.size * 0.34}
      textAnchor="middle"
      fill={PALETTE.ink}
      fontSize={fit.size}
      fontWeight={700}
      fontFamily={FONT}
    >
      {fit.lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lineH}>
          {l}
        </tspan>
      ))}
    </text>
  );
  const boxH = Math.max(68, fit.lines.length * lineH + 26);
  return (
    <g
      transform={`translate(${x} ${y}) scale(${sx * p * bump} ${sy * p * bump}) translate(${-x} ${-y})`}
      opacity={Math.min(1, p * 3)}
    >
      {node.shape === "diamond" ? (
        <polygon
          points={`${x},${y - 62} ${x + 116},${y} ${x},${y + 62} ${x - 116},${y}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={3.5}
        />
      ) : (
        <rect
          x={x - w / 2}
          y={y - boxH / 2}
          width={w}
          height={boxH}
          rx={node.shape === "pill" ? 34 : 14}
          fill={fill}
          stroke={stroke}
          strokeWidth={3.5}
        />
      )}
      {text}
    </g>
  );
}

/**
 * A flowchart that builds itself, then runs. Edges draw on, nodes pop in with squash, and the token eases
 * between nodes with a pause at each one, leaving a comet trail and making each node pulse as it arrives.
 */
export function FlowDiagram({ scene }: Props) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const l = scene.labels;
  const runStart = 58;
  const progress = interpolate(frame, [runStart, durationInFrames - 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let nodes: NodeSpec[];
  let edges: EdgeSpec[];
  let path: Point[];
  let pathNodes: string[];
  let backEdge: string | null = null;

  if (scene.variant === "loop") {
    const y = 270;
    const P = {
      start: { x: 110, y },
      init: { x: 330, y },
      cond: { x: 590, y },
      body: { x: 860, y },
      update: { x: 1090, y },
      c1: { x: 1090, y: 110 },
      c2: { x: 590, y: 110 },
      exit: { x: 590, y: 440 },
    };
    nodes = [
      { id: "start", label: l.start, at: P.start, shape: "pill" },
      { id: "init", label: l.init, at: P.init, shape: "box" },
      { id: "cond", label: l.condition, at: P.cond, shape: "diamond" },
      { id: "body", label: l.body, at: P.body, shape: "box" },
      { id: "update", label: l.update, at: P.update, shape: "box" },
      { id: "exit", label: l.exit, at: P.exit, shape: "pill" },
    ];
    edges = [
      { d: `M175 ${y} H235` },
      { d: `M425 ${y} H474` },
      { d: `M706 ${y} H765`, label: "yes", labelAt: { x: 736, y: y - 14 } },
      { d: `M955 ${y} H995` },
      { d: `M590 332 V406`, label: "no", labelAt: { x: 612, y: 372 } },
    ];
    backEdge = "M1090 236 V110 H590 V208";
    path = [P.start, P.init, P.cond];
    pathNodes = ["start", "init", "cond"];
    for (let i = 0; i < LAPS; i++) {
      path.push(P.body, P.update, P.c1, P.c2, P.cond);
      pathNodes.push("body", "update", "", "", "cond");
    }
    path.push(P.exit);
    pathNodes.push("exit");
  } else {
    const P = {
      start: { x: 110, y: 250 },
      cond: { x: 330, y: 250 },
      yes: { x: 760, y: 130 },
      no: { x: 760, y: 370 },
      join: { x: 1080, y: 250 },
    };
    nodes = [
      { id: "start", label: l.start, at: P.start, shape: "pill" },
      { id: "cond", label: l.condition, at: P.cond, shape: "diamond" },
      { id: "yes", label: l.body, at: P.yes, shape: "box" },
      { id: "no", label: l.alternative, at: P.no, shape: "box" },
      { id: "exit", label: l.exit, at: P.join, shape: "pill" },
    ];
    edges = [
      { d: "M175 250 H214" },
      { d: "M420 205 L665 140", label: "true", labelAt: { x: 530, y: 150 } },
      { d: "M420 300 L665 360", label: "false", labelAt: { x: 530, y: 350 } },
      { d: "M855 135 L1030 225" },
      { d: "M855 365 L1030 275" },
    ];
    path = [P.start, P.cond, P.yes, P.join, P.cond, P.no, P.join];
    pathNodes = ["start", "cond", "yes", "exit", "cond", "no", "exit"];
  }

  const { point, node: activeId, arrivals } = tokenAt(path, pathNodes, progress);
  const trail = [1, 2, 3, 4, 5].map((k) => tokenAt(path, pathNodes, progress - k * 0.011).point);
  // each arrival at a node makes it pulse, decaying over ~16 frames
  const pulseFor = (id: string) =>
    path.reduce((best, _p, i) => {
      if (i === 0 || pathNodes[i] !== id) return best;
      const at = runStart + arrivals[i - 1] * (durationInFrames - 26 - runStart);
      return frame >= at ? Math.max(best, Math.max(0, 1 - (frame - at) / 16)) : best;
    }, 0);
  const laps = path.reduce((n, _p, i) => {
    if (i === 0 || pathNodes[i] !== "body") return n;
    const at = runStart + arrivals[i - 1] * (durationInFrames - 26 - runStart);
    return frame >= at ? n + 1 : n;
  }, 0);
  const flip = useTween(runStart, 10, Easing.backOut);

  return (
    <SceneFrame
      label={scene.variant === "loop" ? "How the loop flows" : "How the decision flows"}
      page={scene.page}
      narration={scene.narration}
    >
      <svg viewBox="0 0 1200 520" width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={PALETTE.ink} />
          </marker>
        </defs>
        {edges.map((e, i) => (
          <DrawPathWithLabel key={i} edge={e} index={i} />
        ))}
        {backEdge && <BackEdge d={backEdge} />}
        {nodes.map((n, i) => (
          <NodeShape
            key={n.id}
            node={n}
            index={i}
            pulse={pulseFor(n.id)}
            active={n.id === activeId && progress > 0}
          />
        ))}
        {frame >= runStart - 6 &&
          trail.map((t, i) => (
            <circle
              key={i}
              cx={t.x}
              cy={t.y}
              r={10 - i * 1.5}
              fill={PALETTE.orange}
              opacity={0.42 - i * 0.07}
            />
          ))}
        {frame >= runStart - 6 && (
          <>
            <circle cx={point.x} cy={point.y} r={22} fill={PALETTE.orange} opacity={0.28} />
            <circle cx={point.x} cy={point.y} r={12} fill={PALETTE.orange} />
          </>
        )}
        {scene.variant === "loop" && laps > 0 && (
          <g
            transform={`translate(1090 66) scale(1 ${Math.max(0.01, Math.abs(Math.cos((1 - flip) * Math.PI * 0.5)))})`}
          >
            <rect x={-54} y={-26} width={108} height={46} rx={23} fill={PALETTE.orange} />
            <text
              x={0}
              y={7}
              textAnchor="middle"
              fill="#fff"
              fontSize={26}
              fontWeight={800}
              fontFamily={FONT}
            >{`Lap ${laps}`}</text>
          </g>
        )}
      </svg>
    </SceneFrame>
  );
}

function DrawPathWithLabel({ edge, index }: { edge: EdgeSpec; index: number }) {
  const p = useTween(14 + index * 8, 22, Easing.inOutQuart);
  return (
    <g>
      <DrawPath d={edge.d} progress={p} stroke={PALETTE.ink} width={2.8} marker="url(#arrow)" />
      {edge.label && edge.labelAt && (
        <text
          x={edge.labelAt.x}
          y={edge.labelAt.y}
          fill={PALETTE.muted}
          fontSize={19}
          fontWeight={700}
          textAnchor="middle"
          fontFamily={FONT}
          opacity={p}
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}

function BackEdge({ d }: { d: string }) {
  const p = useTween(48, 34, Easing.inOutQuart);
  return (
    <DrawPath d={d} progress={p} stroke={PALETTE.ink} width={2.8} dashed marker="url(#arrow)" />
  );
}
