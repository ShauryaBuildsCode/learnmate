"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

/**
 * A tiny animation toolkit for the lesson scenes: a frame clock in React context plus `interpolate`,
 * `spring` and `Easing` with the same semantics as the helpers the scenes were written against.
 * Frames are floats (the clock runs at display rate), so motion is smooth, not stepped.
 */
export interface MotionConfig {
  fps: number;
  /** Frames from the start of the scene until it ends (narration plus a short pause). */
  durationInFrames: number;
  /** Frames the voice actually speaks for; captions track this, not the trailing pause. */
  speechInFrames: number;
  /** The text being spoken, so animation beats can be timed to specific words. */
  narration: string;
}

const FrameContext = createContext<{ frame: number } & MotionConfig>({
  frame: 0,
  fps: 30,
  durationInFrames: 30,
  speechInFrames: 30,
  narration: "",
});

export function FrameProvider({
  frame,
  children,
  ...config
}: { frame: number; children: ReactNode } & MotionConfig) {
  return <FrameContext.Provider value={{ frame, ...config }}>{children}</FrameContext.Provider>;
}

export function useCurrentFrame(): number {
  return useContext(FrameContext).frame;
}

export function useVideoConfig(): MotionConfig {
  const { frame: _frame, ...config } = useContext(FrameContext);
  void _frame;
  return config;
}

export function AbsoluteFill({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return (
    <div
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", ...style }}
    >
      {children}
    </div>
  );
}

// ---- Easing ---------------------------------------------------------------------------------
type EasingFn = (t: number) => number;
/** Cubic-bezier easing like CSS `cubic-bezier(x1, y1, x2, y2)`: the curve language motion designers think in. */
function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const sample = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (sample(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return sample(y1, y2, (lo + hi) / 2);
  };
}

export const Easing = {
  bezier,
  /** Explosive start, long soft landing: the workhorse for entrances. */
  expoOut: bezier(0.16, 1, 0.3, 1),
  /** Slow-fast-slow, for camera moves and anything that travels. */
  inOutQuart: bezier(0.77, 0, 0.175, 1),
  /** Overshoots then settles: pops and landings. */
  backOut: bezier(0.34, 1.56, 0.64, 1),
  /** Gentle anticipation: dips back before launching forward. */
  backIn: bezier(0.36, 0, 0.66, -0.56),
  smooth: bezier(0.45, 0, 0.55, 1),
  linear: ((t) => t) as EasingFn,
  quad: ((t) => t * t) as EasingFn,
  cubic: ((t) => t * t * t) as EasingFn,
  /** Mirrors an ease-in curve into an ease-out one. */
  out:
    (easing: EasingFn): EasingFn =>
    (t) =>
      1 - easing(1 - t),
  inOut:
    (easing: EasingFn): EasingFn =>
    (t) =>
      t < 0.5 ? easing(t * 2) / 2 : 1 - easing((1 - t) * 2) / 2,
};

// ---- interpolate ----------------------------------------------------------------------------
interface InterpolateOptions {
  extrapolateLeft?: "clamp" | "extend";
  extrapolateRight?: "clamp" | "extend";
  easing?: EasingFn;
}

/** Maps `input` from `inputRange` to `outputRange` (two or more increasing points). */
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options: InterpolateOptions = {},
): number {
  const {
    extrapolateLeft = "extend",
    extrapolateRight = "extend",
    easing = Easing.linear,
  } = options;
  const last = inputRange.length - 1;
  if (input < inputRange[0] && extrapolateLeft === "clamp") return outputRange[0];
  if (input > inputRange[last] && extrapolateRight === "clamp") return outputRange[last];
  let i = 0;
  while (i < last - 1 && input > inputRange[i + 1]) i++;
  const [a, b] = [inputRange[i], inputRange[i + 1]];
  const t = b === a ? 0 : (input - a) / (b - a);
  const eased = t >= 0 && t <= 1 ? easing(t) : t;
  return outputRange[i] + (outputRange[i + 1] - outputRange[i]) * eased;
}

// ---- spring ---------------------------------------------------------------------------------
interface SpringConfig {
  damping?: number;
  mass?: number;
  stiffness?: number;
  overshootClamping?: boolean;
}

/**
 * Damped-spring position from 0 toward 1 after `frame` frames at `fps` (closed-form solution of the
 * mass-spring-damper equation, zero initial velocity). Overshoots when underdamped, like the real thing.
 */
export function spring({
  frame,
  fps,
  config = {},
}: {
  frame: number;
  fps: number;
  config?: SpringConfig;
}): number {
  const { damping = 10, mass = 1, stiffness = 100, overshootClamping = false } = config;
  if (frame <= 0) return 0;
  const t = frame / fps;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  let x: number;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    x = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  } else {
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s);
    const r2 = -w0 * (zeta + s);
    x = 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }
  return overshootClamping ? Math.min(1, x) : x;
}

// ---- narration cues -------------------------------------------------------------------------
const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Frame at which `phrase` is spoken, estimated from the narration's character timing (the same model the
 * captions use). Lets a card, number or highlight land on the exact word instead of at a guessed delay.
 * `lead` starts the motion a few frames early so it arrives as the word does. Falls back when the phrase
 * isn't in the narration.
 */
export function cueFrame(
  narration: string,
  speechInFrames: number,
  phrase: string,
  fallback: number,
  lead = 4,
  /** Latest frame this beat may start at, so a phrase said late in the narration can't leave the stage waiting. */
  max = Infinity,
): number {
  return Math.min(max, rawCue(narration, speechInFrames, phrase, fallback, lead));
}

function rawCue(
  narration: string,
  speechInFrames: number,
  phrase: string,
  fallback: number,
  lead: number,
): number {
  const words = narration.split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const starts: number[] = [];
  let acc = 0;
  for (const w of weights) {
    starts.push(acc);
    acc += w;
  }
  const spokenAt = (i: number) => 4 + (starts[i] / total) * Math.max(8, speechInFrames - 6);
  const tokens = words.map(norm);
  const wanted = phrase.split(/\s+/).map(norm).filter(Boolean);
  if (wanted.length === 0) return fallback;

  // 1) the whole phrase, in order; 2) its longest word that is spoken; otherwise the fallback.
  for (let i = 0; i + wanted.length <= tokens.length; i++) {
    if (wanted.every((w, k) => tokens[i + k] === w)) return Math.max(2, spokenAt(i) - lead);
  }
  for (const word of [...wanted].sort((x, y) => y.length - x.length)) {
    if (word.length < 4) continue;
    const i = tokens.findIndex(
      (t) =>
        t === word ||
        (word.length >= 5 && t.startsWith(word.slice(0, 5))) ||
        // plurals and variants: "laps" finds "lap"
        (t.length >= 3 && word.length > t.length && word.startsWith(t)),
    );
    if (i >= 0) return Math.max(2, spokenAt(i) - lead);
  }
  return fallback;
}

/** Hook form of `cueFrame` for the narration of the scene being rendered. */
export function useCue(): (
  phrase: string,
  fallback: number,
  lead?: number,
  max?: number,
) => number {
  const { narration, speechInFrames } = useContext(FrameContext);
  return (phrase, fallback, lead, max) =>
    cueFrame(narration, speechInFrames, phrase, fallback, lead, max);
}

/**
 * How much of a moving thing's travel is "in flight" right now: 0 when still, rising with speed. Used for
 * squash-and-stretch: stretch along the motion while it moves, squash when it lands.
 */
export function velocity(frame: number, fps: number, config: SpringConfig): number {
  return Math.abs(spring({ frame, fps, config }) - spring({ frame: frame - 1, fps, config }));
}
