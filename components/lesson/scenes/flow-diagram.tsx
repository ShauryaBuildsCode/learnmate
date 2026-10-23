import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { FONT, PALETTE, SceneFrame } from "./common";

type Props = { scene: Extract<Scene, { type: "FlowDiagram" }> };
interface Point {
  x: number;
  y: number;
}

const LAPS = 3;

function pointAlong(path: Point[], t: number): { point: Point; segment: number } {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
  const total = lengths.reduce((a, b) => a + b, 0);
  let remaining = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 0 : Math.min(remaining / lengths[i], 1);
      return {
        point: {
          x: path[i].x + (path[i + 1].x - path[i].x) * f,
          y: path[i].y + (path[i + 1].y - path[i].y) * f,
        },
        segment: i,
      };
    }
    remaining -= lengths[i];
  }
  return { point: path[path.length - 1], segment: path.length - 2 };
}

interface NodeSpec {
  id: string;
  label: string;
  at: Point;
  shape: "pill" | "box" | "diamond";
}

function NodeShape({ node, active }: { node: NodeSpec; active: boolean }) {
  const stroke = active ? PALETTE.warn : PALETTE.cardBorder;
  const fill = active ? "rgba(251,191,36,0.2)" : PALETTE.card;
  const { x, y } = node.at;
  const text = (
    <text x={x} y={y + 7} textAnchor="middle" fill={PALETTE.text} fontSize={22} fontFamily={FONT}>
      {node.label}
    </text>
  );
  if (node.shape === "diamond") {
    return (
      <g>
        <polygon
          points={`${x},${y - 62} ${x + 116},${y} ${x},${y + 62} ${x - 116},${y}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={3}
        />
        {text}
      </g>
    );
  }
  const w = node.shape === "pill" ? 130 : 190;
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - 34}
        width={w}
        height={68}
        rx={node.shape === "pill" ? 34 : 14}
        fill={fill}
        stroke={stroke}
        strokeWidth={3}
      />
      {text}
    </g>
  );
}

function Edge({ from, to, label }: { from: Point; to: Point; label?: string }) {
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={PALETTE.muted}
        strokeWidth={2.5}
        markerEnd="url(#arrow)"
      />
      {label && (
        <text
          x={(from.x + to.x) / 2}
          y={(from.y + to.y) / 2 - 10}
          fill={PALETTE.muted}
          fontSize={18}
          textAnchor="middle"
          fontFamily={FONT}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function FlowDiagram({ scene }: Props) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const l = scene.labels;
  const progress = interpolate(frame, [18, durationInFrames - 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let nodes: NodeSpec[];
  let edges: { from: Point; to: Point; label?: string }[];
  let path: Point[];
  let pathNodes: string[];
  let lap: number | null = null;

  if (scene.variant === "loop") {
    const y = 270;
    const start = { x: 110, y };
    const init = { x: 330, y };
    const cond = { x: 590, y };
    const body = { x: 860, y };
    const update = { x: 1090, y };
    const c1 = { x: 1090, y: 110 };
    const c2 = { x: 590, y: 110 };
    const exit = { x: 590, y: 440 };
    nodes = [
      { id: "start", label: l.start, at: start, shape: "pill" },
      { id: "init", label: l.init, at: init, shape: "box" },
      { id: "cond", label: l.condition, at: cond, shape: "diamond" },
      { id: "body", label: l.body, at: body, shape: "box" },
      { id: "update", label: l.update, at: update, shape: "box" },
      { id: "exit", label: l.exit, at: exit, shape: "pill" },
    ];
    edges = [
      { from: { x: 175, y }, to: { x: 235, y } },
      { from: { x: 425, y }, to: { x: 474, y } },
      { from: { x: 706, y }, to: { x: 765, y }, label: "yes" },
      { from: { x: 955, y }, to: { x: 995, y } },
      { from: { x: 590, y: 332 }, to: { x: 590, y: 406 }, label: "no" },
    ];
    path = [start, init, cond];
    pathNodes = ["start", "init", "cond"];
    for (let i = 0; i < LAPS; i++) {
      path.push(body, update, c1, c2, cond);
      pathNodes.push("body", "update", "", "", "cond");
    }
    path.push(exit);
    pathNodes.push("exit");
  } else {
    const cond = { x: 330, y: 250 };
    const yes = { x: 760, y: 130 };
    const no = { x: 760, y: 370 };
    const join = { x: 1080, y: 250 };
    const start = { x: 110, y: 250 };
    nodes = [
      { id: "start", label: l.start, at: start, shape: "pill" },
      { id: "cond", label: l.condition, at: cond, shape: "diamond" },
      { id: "yes", label: l.body, at: yes, shape: "box" },
      { id: "no", label: l.alternative, at: no, shape: "box" },
      { id: "exit", label: l.exit, at: join, shape: "pill" },
    ];
    edges = [
      { from: { x: 175, y: 250 }, to: { x: 214, y: 250 } },
      { from: { x: 420, y: 205 }, to: { x: 665, y: 140 }, label: "true" },
      { from: { x: 420, y: 300 }, to: { x: 665, y: 360 }, label: "false" },
      { from: { x: 855, y: 135 }, to: { x: 1030, y: 225 } },
      { from: { x: 855, y: 365 }, to: { x: 1030, y: 275 } },
    ];
    path = [start, cond, yes, join, cond, no, join];
    pathNodes = ["start", "cond", "yes", "exit", "cond", "no", "exit"];
  }

  const { point, segment } = pointAlong(path, progress);
  const activeId =
    pathNodes[Math.min(segment + (progress > 0 ? 1 : 0), pathNodes.length - 1)] ||
    pathNodes[segment];
  if (scene.variant === "loop") {
    lap = Math.min(
      LAPS,
      Math.max(0, pathNodes.slice(0, segment + 1).filter((n) => n === "body").length),
    );
  }

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
            <path d="M 0 0 L 10 5 L 0 10 z" fill={PALETTE.muted} />
          </marker>
        </defs>
        {scene.variant === "loop" && (
          <polyline
            points="1090,236 1090,110 590,110 590,208"
            fill="none"
            stroke={PALETTE.muted}
            strokeWidth={2.5}
            strokeDasharray="8 6"
            markerEnd="url(#arrow)"
          />
        )}
        {edges.map((e, i) => (
          <Edge key={i} {...e} />
        ))}
        {nodes.map((n) => (
          <NodeShape key={n.id} node={n} active={n.id === activeId} />
        ))}
        <circle cx={point.x} cy={point.y} r={16} fill={PALETTE.accent2} opacity={0.35} />
        <circle cx={point.x} cy={point.y} r={9} fill={PALETTE.accent2} />
        {lap !== null && (
          <text
            x={1090}
            y={70}
            fill={PALETTE.warn}
            fontSize={26}
            textAnchor="middle"
            fontFamily={FONT}
          >
            {lap > 0 ? `Lap ${lap}` : ""}
          </text>
        )}
      </svg>
    </SceneFrame>
  );
}
