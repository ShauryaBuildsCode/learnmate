import { describe, expect, it } from "vitest";
import { cueFrame, Easing, interpolate, spring } from "@/lib/motion";

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

describe("bezier easing", () => {
  it("hits its endpoints and matches a known curve", () => {
    for (const e of [Easing.expoOut, Easing.inOutQuart, Easing.backOut, Easing.smooth]) {
      expect(e(0)).toBe(0);
      expect(e(1)).toBe(1);
    }
    expect(Easing.smooth(0.5)).toBeCloseTo(0.5, 2);
  });

  it("expoOut front-loads the motion; backOut overshoots; backIn dips below zero first", () => {
    expect(Easing.expoOut(0.2)).toBeGreaterThan(0.5);
    expect(
      Math.max(...Array.from({ length: 50 }, (_, i) => Easing.backOut(i / 49))),
    ).toBeGreaterThan(1);
    expect(Math.min(...Array.from({ length: 50 }, (_, i) => Easing.backIn(i / 49)))).toBeLessThan(
      0,
    );
  });
});

describe("narration cues", () => {
  const text =
    "A loop has a variable that changes every lap, a body that repeats, and a stop value that is never included.";

  it("finds later words later in the scene", () => {
    const variable = cueFrame(text, 300, "variable", 0);
    const body = cueFrame(text, 300, "body", 0);
    const stop = cueFrame(text, 300, "stop value", 0);
    expect(variable).toBeLessThan(body);
    expect(body).toBeLessThan(stop);
  });

  it("starts a few frames before the word is spoken", () => {
    expect(cueFrame(text, 300, "body", 0, 0) - cueFrame(text, 300, "body", 0, 6)).toBeCloseTo(6, 5);
  });

  it("never starts a beat later than the max, even if the word is said at the end", () => {
    const late =
      "Think of handing out exam papers. You do the same action for every student. That is what a for loop does.";
    expect(cueFrame(late, 300, "for loop", 14, 8)).toBeGreaterThan(200);
    expect(cueFrame(late, 300, "for loop", 14, 8, 34)).toBe(34);
  });

  it("matches word stems so plurals and titles still land on the spoken word", () => {
    expect(cueFrame("Count the lap each time round", 200, "Laps for range", 5)).toBeGreaterThan(5);
  });

  it("matches multi-word phrases, falls back to the longest word, then to the fallback", () => {
    expect(cueFrame(text, 300, "stop value", -1)).toBeGreaterThan(100);
    expect(cueFrame(text, 300, "the stop signal", -1)).toBeGreaterThan(0); // "signal" is never spoken, "stop" is
    expect(cueFrame(text, 300, "photosynthesis", 77)).toBe(77);
    expect(cueFrame("", 300, "anything", 12)).toBe(12);
  });
});
