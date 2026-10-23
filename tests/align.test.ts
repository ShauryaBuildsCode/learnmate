import { describe, expect, it } from "vitest";
import { alignWords, analyze } from "@/lib/audio/align";
import { pcmToWav } from "@/lib/audio/wav";

const RATE = 24000;

/** Builds a WAV of loud bursts separated by silence: [seconds, "tone" | "silence"] segments. */
function wavOf(segments: [number, "tone" | "silence"][]): Buffer {
  const parts = segments.map(([seconds, kind]) => {
    const samples = new Int16Array(Math.round(seconds * RATE));
    if (kind === "tone")
      for (let i = 0; i < samples.length; i++)
        samples[i] = Math.round(Math.sin((i / RATE) * 2 * Math.PI * 220) * 9000);
    return Buffer.from(samples.buffer);
  });
  return pcmToWav(Buffer.concat(parts), RATE, 1);
}

describe("audio analysis", () => {
  it("trims leading/trailing silence and finds the pauses inside", () => {
    const a = analyze(
      wavOf([
        [0.3, "silence"],
        [1.0, "tone"],
        [0.8, "silence"],
        [1.2, "tone"],
        [0.4, "silence"],
      ]),
    )!;
    expect(a.speechStart).toBeCloseTo(0.3, 1);
    expect(a.speechEnd).toBeCloseTo(3.3, 1);
    expect(a.pauses).toHaveLength(1);
    expect(a.pauses[0].start).toBeCloseTo(1.3, 1);
    expect(a.pauses[0].end).toBeCloseTo(2.1, 1);
  });

  it("returns null for silence or non-audio", () => {
    expect(analyze(wavOf([[2, "silence"]]))).toBeNull();
    expect(
      analyze(Buffer.from("not a wav file at all, just text........................")),
    ).toBeNull();
  });
});

describe("word alignment", () => {
  // "One two." (1.0s) pause 0.8s, "Three four five, six." (1.6s with a 0.3s pause after five,)
  const narration = "One two. Three four five, six.";
  const wav = wavOf([
    [0.2, "silence"],
    [1.0, "tone"],
    [0.8, "silence"],
    [0.9, "tone"],
    [0.3, "silence"],
    [0.5, "tone"],
    [0.2, "silence"],
  ]);

  it("starts the word after a sentence end exactly where speech resumes", () => {
    const starts = alignWords(narration, analyze(wav)!);
    expect(starts).toHaveLength(6);
    expect(starts[0]).toBeCloseTo(0.2, 1);
    expect(starts[2]).toBeCloseTo(2.0, 1); // "Three" resumes after the 0.8s pause
    expect(starts[5]).toBeCloseTo(3.2, 1); // "six." resumes after the comma pause
  });

  it("is much closer than a character-proportional guess", () => {
    const aligned = alignWords(narration, analyze(wav)!)[2];
    const words = narration.split(/\s+/);
    const weights = words.map((w) => w.length + 2);
    const proportional =
      0.2 +
      (weights.slice(0, 2).reduce((a, b) => a + b, 0) / weights.reduce((a, b) => a + b, 0)) * 3.5;
    expect(Math.abs(aligned - 2.0)).toBeLessThan(0.15);
    expect(Math.abs(proportional - 2.0)).toBeGreaterThan(0.3);
  });

  it("stays monotonic and finite even when pauses don't match the punctuation", () => {
    const starts = alignWords("No punctuation here at all just words", analyze(wav)!);
    starts.slice(1).forEach((t, i) => expect(t).toBeGreaterThanOrEqual(starts[i]));
    expect(starts.every(Number.isFinite)).toBe(true);
  });
});
