import { describe, expect, it } from "vitest";
import { pcmToWav, wavSeconds } from "@/lib/audio/wav";
import { layout, PAUSE_SECONDS, sceneSeconds, speechSeconds } from "@/lib/lesson/timing";
import type { Scene } from "@/lib/schemas/lesson";

describe("wav helpers", () => {
  it("wraps 24kHz 16-bit mono PCM and reports its exact length", () => {
    const pcm = Buffer.alloc(24000 * 2 * 3); // 3 seconds
    const wav = pcmToWav(pcm, 24000, 1);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wavSeconds(wav)).toBeCloseTo(3, 5);
  });

  it("copes with streaming WAV headers that leave the data size as 0 or 0xFFFFFFFF", () => {
    const wav = pcmToWav(Buffer.alloc(48000), 24000, 1); // 1 second
    wav.writeUInt32LE(0xffffffff, 40);
    expect(wavSeconds(wav)).toBeCloseTo(1, 5);
  });

  it("returns null for bytes that are not a WAV", () => {
    expect(
      wavSeconds(Buffer.from("definitely not audio, just some text padding...........")),
    ).toBeNull();
  });
});

describe("narration timing", () => {
  const base = { type: "TitleCard", title: "T", hook: "h", page: 1, seconds: 6 } as const;
  const scene = (narration: string, audio?: { path: string; seconds: number }): Scene => ({
    ...base,
    narration,
    audio,
  });

  it("uses the recording's real length plus a short pause when there is one", () => {
    const s = scene("A narration long enough to be a scene.", { path: "x.wav", seconds: 14.52 });
    expect(speechSeconds(s)).toBe(14.52);
    expect(sceneSeconds(s)).toBeCloseTo(14.52 + PAUSE_SECONDS);
  });

  it("estimates from the word count when there is no recording", () => {
    const long = scene(Array(60).fill("word").join(" "));
    expect(speechSeconds(long)).toBeCloseTo(25, 0);
  });

  it("lays out frames so captions can follow the speech and not the trailing pause", () => {
    const { timed } = layout([scene("Hello there student friend.", { path: "x.wav", seconds: 4 })]);
    expect(timed[0].speechFrames).toBe(120);
    expect(timed[0].frames).toBeGreaterThan(timed[0].speechFrames);
  });
});
