import { describe, expect, it } from "vitest";
import { Easing, interpolate, spring } from "@/lib/motion";

describe("interpolate", () => {
  it("maps linearly and clamps when asked", () => {
    expect(interpolate(5, [0, 10], [0, 100])).toBe(50);
    expect(interpolate(-5, [0, 10], [0, 100], { extrapolateLeft: "clamp" })).toBe(0);
    expect(interpolate(15, [0, 10], [0, 100], { extrapolateRight: "clamp" })).toBe(100);
    expect(interpolate(15, [0, 10], [0, 100])).toBe(150);
  });

  it("supports multi-point ranges (fade in, hold, fade out)", () => {
    const fade = (f: number) =>
      interpolate(f, [0, 10, 90, 100], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    expect([fade(0), fade(5), fade(50), fade(95), fade(100)]).toEqual([0, 0.5, 1, 0.5, 0]);
  });

  it("applies easing", () => {
    const eased = interpolate(0.5, [0, 1], [0, 1], { easing: Easing.out(Easing.quad) });
    expect(eased).toBeCloseTo(0.75);
  });
});

describe("spring", () => {
  it("starts at 0 and settles at 1", () => {
    expect(spring({ frame: 0, fps: 30 })).toBe(0);
    expect(spring({ frame: 300, fps: 30 })).toBeCloseTo(1, 3);
  });

  it("overshoots when underdamped and never does when clamped", () => {
    const frames = Array.from({ length: 60 }, (_, i) => i);
    const bouncy = frames.map((frame) =>
      spring({ frame, fps: 30, config: { damping: 6, stiffness: 160 } }),
    );
    expect(Math.max(...bouncy)).toBeGreaterThan(1);
    const clamped = frames.map((frame) =>
      spring({ frame, fps: 30, config: { damping: 6, stiffness: 160, overshootClamping: true } }),
    );
    expect(Math.max(...clamped)).toBeLessThanOrEqual(1);
  });

  it("is monotonic and smooth when overdamped", () => {
    const values = Array.from({ length: 90 }, (_, frame) =>
      spring({ frame, fps: 30, config: { damping: 40, stiffness: 100 } }),
    );
    values.slice(1).forEach((v, i) => expect(v).toBeGreaterThanOrEqual(values[i] - 1e-9));
    expect(values.at(-1)).toBeCloseTo(1, 2);
  });

  it("handles critical damping without NaN", () => {
    const v = spring({ frame: 20, fps: 30, config: { damping: 20, stiffness: 100, mass: 1 } });
    expect(Number.isFinite(v)).toBe(true);
  });
});
