import {
  BookOpen,
  Bug,
  Building2,
  Clock,
  Code2,
  Key,
  Layers,
  Lightbulb,
  List,
  Map as MapIcon,
  Music,
  Package,
  Puzzle,
  Repeat,
  Rocket,
  ShoppingCart,
  Target,
  Ticket,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  velocity,
} from "@/lib/motion";
import { ANALOGY_ICONS } from "@/lib/schemas/lesson";

export const PALETTE = {
  bg: "#fff8f0",
  ink: "#111111",
  muted: "#6b6b6b",
  orange: "#ff8a00",
  purple: "#5b4fa8",
  green: "#16a34a",
  red: "#dc2626",
  card: "#ffffff",
  border: "rgba(17,17,17,0.10)",
} as const;

export const FONT =
  "var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
export const MONO =
  "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
export const RADIUS = 28;

export type IconName = (typeof ANALOGY_ICONS)[number];
export const ICONS: Record<IconName, LucideIcon> = {
  repeat: Repeat,
  package: Package,
  list: List,
  key: Key,
  map: MapIcon,
  clock: Clock,
  ticket: Ticket,
  building: Building2,
  music: Music,
  "shopping-cart": ShoppingCart,
  code: Code2,
  bug: Bug,
  rocket: Rocket,
  lightbulb: Lightbulb,
  puzzle: Puzzle,
  layers: Layers,
  target: Target,
  zap: Zap,
  book: BookOpen,
};
export const ICON_NAMES = ANALOGY_ICONS;

export type Tone = "black" | "orange" | "white" | "purple";
const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  black: { bg: PALETTE.ink, fg: "#ffffff", border: PALETTE.ink },
  orange: { bg: PALETTE.orange, fg: "#ffffff", border: PALETTE.orange },
  white: { bg: PALETTE.card, fg: PALETTE.ink, border: PALETTE.border },
  purple: { bg: PALETTE.purple, fg: "#ffffff", border: PALETTE.purple },
};
export const TONE_CYCLE: Tone[] = [
  "black",
  "orange",
  "white",
  "purple",
  "black",
  "white",
  "orange",
];

/** The rounded icon tile from the reference style: a flat coloured square with a single glyph. */
export function IconTile({
  icon,
  tone = "black",
  size = 72,
  style,
}: {
  icon: IconName;
  tone?: Tone;
  size?: number;
  style?: CSSProperties;
}) {
  const Icon = ICONS[icon];
  const t = TONES[tone];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: t.bg,
        border: `1.5px solid ${t.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow:
          tone === "white" ? "0 8px 24px rgba(17,17,17,0.06)" : "0 10px 28px rgba(17,17,17,0.12)",
        flexShrink: 0,
        ...style,
      }}
    >
      <Icon size={size * 0.46} color={t.fg} strokeWidth={2} />
    </div>
  );
}

export function Card({
  tone = "white",
  children,
  style,
}: {
  tone?: "white" | "black" | "orange";
  children: ReactNode;
  style?: CSSProperties;
}) {
  const t = TONES[tone];
  return (
    <div
      style={{
        background: t.bg,
        color: t.fg,
        border: `1.5px solid ${t.border}`,
        borderRadius: RADIUS,
        boxShadow:
          tone === "white" ? "0 10px 30px rgba(17,17,17,0.05)" : "0 14px 36px rgba(17,17,17,0.14)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Spring that starts `delay` frames into the scene and settles with a gentle overshoot. */
export function useEnter(delay = 0, config: { damping?: number; stiffness?: number } = {}): number {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 13, stiffness: 120, ...config } });
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Deterministic pseudo-random in [0,1) so scattered layouts are identical on every render. */
export function seeded(i: number, salt = 1): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 20,
        fontWeight: 600,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: PALETTE.muted,
      }}
    >
      {children}
    </div>
  );
}

/** A 0..1 tween starting at `delay` over `duration` frames with any easing (backOut overshoots past 1). */
export function useTween(
  delay: number,
  duration = 18,
  easing: (t: number) => number = Easing.expoOut,
): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/**
 * Masked reveal: the content rises from behind a clip edge. This is the kinetic-typography staple, and
 * reads far crisper than a fade because nothing is ever half-transparent.
 */
export function Reveal({
  delay = 0,
  duration = 20,
  children,
  style,
}: {
  delay?: number;
  duration?: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const p = useTween(delay, duration, Easing.expoOut);
  return (
    <div
      style={{
        overflow: "hidden",
        display: "inline-block",
        paddingBottom: "0.14em",
        marginBottom: "-0.14em",
        ...style,
      }}
    >
      <div style={{ transform: `translateY(${(1 - p) * 112}%)` }}>{children}</div>
    </div>
  );
}

/**
 * Squash and stretch for something that flies in: elongated along the fall while it's moving fast,
 * a little flat on the landing bounce. Returns the transform scale to apply.
 */
export function useSquash(
  delay: number,
  config = { damping: 9, stiffness: 150 },
): { p: number; sx: number; sy: number } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const p = spring({ frame: f, fps, config });
  const v = velocity(f, fps, config);
  const stretch = Math.min(0.26, v * 16);
  const landing = p > 1 ? Math.min(0.1, (p - 1) * 1.1) : 0;
  return { p, sx: 1 - stretch * 0.55 + landing, sy: 1 + stretch - landing };
}

/** A path that draws itself on: stroke-dash trick with a normalised length. */
export function DrawPath({
  d,
  progress,
  stroke = PALETTE.ink,
  width = 3,
  dashed,
  marker,
}: {
  d: string;
  progress: number;
  stroke?: string;
  width?: number;
  dashed?: boolean;
  marker?: string;
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={dashed ? "0.012 0.02" : 1}
      strokeDashoffset={dashed ? 0 : 1 - Math.min(1, Math.max(0, progress))}
      opacity={dashed ? Math.min(1, progress * 3) : 1}
      markerEnd={progress >= 0.98 ? marker : undefined}
    />
  );
}

export const tabular: CSSProperties = { fontVariantNumeric: "tabular-nums" };
