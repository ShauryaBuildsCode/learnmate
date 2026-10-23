"use client";

import { ExternalLink, Loader2, Minus, Network, Plus, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { PageChip } from "@/components/source/source-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProviderBadge } from "@/components/ui/provider-badge";
import type { MindNode, StoredMindMap } from "@/lib/schemas/study";
import { layoutMindMap, type PlacedNode } from "@/lib/study/validate";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<MindNode["kind"], { fill: string; text: string; label: string }> = {
  root: { fill: "var(--primary)", text: "var(--primary-foreground)", label: "Course" },
  topic: { fill: "var(--accent)", text: "var(--foreground)", label: "Topic" },
  concept: { fill: "var(--card)", text: "var(--foreground)", label: "Concept" },
  example: {
    fill: "color-mix(in srgb, var(--success) 14%, var(--card))",
    text: "var(--foreground)",
    label: "Example",
  },
  pitfall: {
    fill: "color-mix(in srgb, var(--warning) 16%, var(--card))",
    text: "var(--foreground)",
    label: "Common mistake",
  },
};

interface Props {
  courseId: string;
  uiLang: "en" | "hi";
  initial: StoredMindMap | null;
}

export function MindMapView({ courseId, uiLang, initial }: Props) {
  const [map, setMap] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(regenerate: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/mindmap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, uiLang, regenerate }),
      });
      const data = (await res.json().catch(() => ({}))) as { map?: StoredMindMap; error?: string };
      if (!res.ok || !data.map) throw new Error(data.error ?? "Couldn't draw the mind map.");
      setMap(data.map);
      fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, kind: "mindmap" }),
      }).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't draw the mind map.");
    } finally {
      setBusy(false);
    }
  }

  if (!map)
    return (
      <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
          <Network className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="font-medium">See how the whole course connects</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            A map of the topics, their key concepts, examples and common mistakes. Click any node to
            jump to its page or lesson.
          </p>
        </div>
        <Button onClick={() => generate(false)} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Drawing your map…" : "Draw my mind map"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </Card>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Mind map</h2>
        <ProviderBadge provider={map.directedBy === "groq" ? "groq" : "claude"} />
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => generate(true)}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Redraw
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <MindMapCanvas nodes={map.nodes} />
      <Outline nodes={map.nodes} />
    </div>
  );
}

function MindMapCanvas({ nodes }: { nodes: MindNode[] }) {
  const { placed, minX, minY, width, height } = useMemo(() => layoutMindMap(nodes), [nodes]);
  const byId = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<PlacedNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(
    null,
  );
  // Screen pixels to map units, so dragging follows the pointer at any size.
  const unit = width / (svgRef.current?.clientWidth || width);
  const zoom = (f: number) => setScale((s) => Math.min(2.2, Math.max(0.35, s * f)));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div
        className="relative h-[560px] touch-none overflow-hidden rounded-xl border bg-card"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
          setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y });
        }}
        onPointerUp={() => (drag.current = null)}
        onWheel={(e) => zoom(e.deltaY < 0 ? 1.08 : 0.92)}
      >
        <svg
          ref={svgRef}
          role="img"
          aria-label="Mind map of the course. A text outline follows below."
          className="h-full w-full cursor-grab active:cursor-grabbing"
          viewBox={`${minX} ${minY} ${width} ${height}`}
          preserveAspectRatio="xMidYMin meet"
        >
          <g transform={`translate(${pan.x * unit} ${pan.y * unit}) scale(${scale})`}>
            {placed.map((n) => {
              const parent = n.parent ? byId.get(n.parent) : null;
              return parent ? (
                <path
                  key={`e-${n.id}`}
                  d={`M${parent.x},${parent.y} C${parent.x + 90},${parent.y} ${n.x - 90},${n.y} ${n.x},${n.y}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={2}
                />
              ) : null;
            })}
            {placed.map((n) => {
              const style = KIND_STYLE[n.kind];
              const text = n.label.length > 30 ? `${n.label.slice(0, 29)}…` : n.label;
              const w = Math.max(70, text.length * 8.2 + 28);
              const isSel = selected?.id === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x} ${n.y})`}
                  className="cursor-pointer"
                  onClick={() => !drag.current?.moved && setSelected(n)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(n)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${style.label}: ${n.label}`}
                >
                  <rect
                    x={-w / 2}
                    y={n.kind === "root" ? -24 : -17}
                    width={w}
                    height={n.kind === "root" ? 48 : 34}
                    rx={n.kind === "root" ? 24 : 17}
                    fill={style.fill}
                    stroke={isSel ? "var(--foreground)" : "var(--border)"}
                    strokeWidth={isSel ? 2.5 : 1.5}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={style.text}
                    fontSize={n.kind === "root" ? 17 : 14}
                    fontWeight={n.kind === "root" || n.kind === "topic" ? 700 : 500}
                  >
                    {text}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        <div className="absolute bottom-3 right-3 flex gap-1">
          <Button size="sm" variant="outline" aria-label="Zoom in" onClick={() => zoom(1.2)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" aria-label="Zoom out" onClick={() => zoom(1 / 1.2)}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setScale(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <Card className="h-fit space-y-3 text-sm" aria-live="polite">
        {selected ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {KIND_STYLE[selected.kind].label}
              </p>
              <p className="text-base font-semibold">{selected.label}</p>
            </div>
            {selected.page && (
              <p className="flex items-center gap-1 text-muted-foreground">
                From <PageChip page={selected.page} />
              </p>
            )}
            {selected.topicId && (
              <Link
                href={`/learn/${selected.topicId}`}
                className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
              >
                Open the lesson <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">
            Drag to move, scroll to zoom, and click a node to see where it comes from.
          </p>
        )}
        <ul className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
          {(["topic", "concept", "example", "pitfall"] as const).map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span
                className={cn("h-3 w-5 rounded-full border")}
                style={{ background: KIND_STYLE[k].fill }}
                aria-hidden="true"
              />
              {KIND_STYLE[k].label}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** The same map as nested text, for screen readers and for reading in order. */
function Outline({ nodes }: { nodes: MindNode[] }) {
  const children = (id: string) => nodes.filter((n) => n.parent === id);
  const root = nodes.find((n) => n.parent === null);
  if (!root) return null;
  const render = (n: MindNode): React.ReactNode => (
    <li key={n.id}>
      {n.label} {n.page && <PageChip page={n.page} />}
      {children(n.id).length > 0 && (
        <ul className="ml-4 list-disc space-y-0.5">{children(n.id).map(render)}</ul>
      )}
    </li>
  );
  return (
    <details className="rounded-xl border bg-card p-4 text-sm">
      <summary className="cursor-pointer font-medium">Text outline</summary>
      <ul className="mt-3 space-y-0.5">{render(root)}</ul>
    </details>
  );
}
