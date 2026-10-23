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
}

const FrameContext = createContext<{ frame: number } & MotionConfig>({
  frame: 0,
  fps: 30,
  durationInFrames: 30,
  speechInFrames: 30,
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
export const Easing = {
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
