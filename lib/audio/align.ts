/**
 * Word timing from the audio itself. A TTS voice pauses at sentence ends and commas, so the silent gaps
 * in a recording are reliable anchors: we find them, pin them to the punctuation in the narration, and
 * spread the words between anchors by length. That is far closer than guessing from character counts alone.
 */

export interface Analysis {
  duration: number;
  /** Seconds where speech starts and ends (leading and trailing silence trimmed). */
  speechStart: number;
  speechEnd: number;
  /** Silent gaps inside the speech. */
  pauses: { start: number; end: number }[];
}

const WINDOW_SECONDS = 0.01;
const MIN_PAUSE_SECONDS = 0.1;

/** Reads the 16-bit PCM samples out of a WAV. */
export function pcmSamples(wav: Buffer): { samples: Int16Array; sampleRate: number } | null {
  if (wav.length < 44 || wav.toString("ascii", 0, 4) !== "RIFF") return null;
  let offset = 12;
  let sampleRate = 24000;
  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === "fmt ") sampleRate = wav.readUInt32LE(offset + 12);
    if (id === "data") {
      const end =
        size === 0 || size === 0xffffffff || offset + 8 + size > wav.length
          ? wav.length
          : offset + 8 + size;
      const bytes = wav.subarray(offset + 8, end);
      const copy = Buffer.from(bytes); // aligned copy so Int16Array views are valid
      return {
        samples: new Int16Array(copy.buffer, copy.byteOffset, Math.floor(copy.length / 2)),
        sampleRate,
      };
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

/** Finds speech boundaries and pauses from loudness in 10 ms windows. */
export function analyze(wav: Buffer): Analysis | null {
  const pcm = pcmSamples(wav);
  if (!pcm) return null;
  const win = Math.max(1, Math.round(pcm.sampleRate * WINDOW_SECONDS));
  const rms: number[] = [];
  for (let i = 0; i + win <= pcm.samples.length; i += win) {
    let sum = 0;
    for (let k = 0; k < win; k++) sum += pcm.samples[i + k] ** 2;
    rms.push(Math.sqrt(sum / win));
  }
  if (rms.length < 20) return null;
  const sorted = [...rms].sort((a, b) => a - b);
  const loud = sorted[Math.floor(sorted.length * 0.95)];
  if (loud < 50) return null; // essentially silent
  const threshold = loud * 0.06;

  const runs: { start: number; end: number }[] = [];
  let start = -1;
  rms.forEach((r, i) => {
    if (r < threshold) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      runs.push({ start, end: i });
      start = -1;
    }
  });
  if (start >= 0) runs.push({ start, end: rms.length });

  const duration = rms.length * WINDOW_SECONDS;
  let speechStart = 0;
  let speechEnd = duration;
  const inner = runs.filter((r) => {
    if (r.start === 0) {
      speechStart = r.end * WINDOW_SECONDS;
      return false;
    }
    if (r.end === rms.length) {
      speechEnd = r.start * WINDOW_SECONDS;
      return false;
    }
    return (r.end - r.start) * WINDOW_SECONDS >= MIN_PAUSE_SECONDS;
  });
  return {
    duration,
    speechStart,
    speechEnd,
    pauses: inner.map((r) => ({ start: r.start * WINDOW_SECONDS, end: r.end * WINDOW_SECONDS })),
  };
}

interface Anchor {
  /** Index of the word that starts right after the pause. */
  word: number;
  start: number;
  /** When the previous word's speech ended (the pause began). */
  prevEnd: number;
}

const STRONG = /[.!?:;。।]["')\]]*$/;
const WEAK = /[,—–]["')\]]*$/;

/** Start time (seconds) of every word, spreading each stretch of speech between pauses by word length. */
function spread(
  weights: number[],
  anchors: Anchor[],
  speechStart: number,
  speechEnd: number,
): number[] {
  const n = weights.length;
  const all: Anchor[] = [{ word: 0, start: speechStart, prevEnd: speechStart }, ...anchors];
  const starts = new Array<number>(n).fill(speechStart);
  all.forEach((a, k) => {
    const next = all[k + 1];
    const endWord = next ? next.word : n;
    const segEnd = next ? next.prevEnd : speechEnd;
    const total = weights.slice(a.word, endWord).reduce((x, y) => x + y, 0) || 1;
    let acc = 0;
    for (let i = a.word; i < endWord; i++) {
      starts[i] = a.start + (acc / total) * Math.max(0, segEnd - a.start);
      acc += weights[i];
    }
  });
  return starts;
}

interface Boundary {
  /** Index of the word that follows the punctuation. */
  word: number;
  strong: boolean;
}

/**
 * Order-preserving alignment of punctuation boundaries to pauses (dynamic programming). A match is cheap
 * when the pause is near where the boundary is expected, long, and the boundary is a sentence end; skipping a
 * boundary (a pause the voice didn't make) or a pause (a breath mid-phrase) has a cost too.
 */
function matchBoundaries(
  boundaries: Boundary[],
  pauses: Analysis["pauses"],
  expected: (word: number) => number,
): Anchor[] {
  const m = boundaries.length;
  const k = pauses.length;
  const len = (i: number) => pauses[i].end - pauses[i].start;
  const skipBoundary = (j: number) => (boundaries[j].strong ? 1.0 : 0.35);
  const skipPause = (i: number) => 0.25 + 0.6 * Math.max(0, len(i) - 0.3);
  const match = (j: number, i: number) =>
    0.35 * Math.abs(expected(boundaries[j].word) - pauses[i].start) -
    0.8 * Math.min(len(i), 0.9) -
    (boundaries[j].strong ? 0.35 : 0);

  const dp = Array.from({ length: m + 1 }, () => new Array<number>(k + 1).fill(0));
  const from = Array.from({ length: m + 1 }, () => new Array<"b" | "p" | "m">(k + 1).fill("m"));
  for (let j = 1; j <= m; j++) {
    dp[j][0] = dp[j - 1][0] + skipBoundary(j - 1);
    from[j][0] = "b";
  }
  for (let i = 1; i <= k; i++) {
    dp[0][i] = dp[0][i - 1] + skipPause(i - 1);
    from[0][i] = "p";
  }
  for (let j = 1; j <= m; j++) {
    for (let i = 1; i <= k; i++) {
      const options: [number, "b" | "p" | "m"][] = [
        [dp[j - 1][i] + skipBoundary(j - 1), "b"],
        [dp[j][i - 1] + skipPause(i - 1), "p"],
        [dp[j - 1][i - 1] + match(j - 1, i - 1), "m"],
      ];
      const best = options.reduce((x, y) => (y[0] < x[0] ? y : x));
      dp[j][i] = best[0];
      from[j][i] = best[1];
    }
  }
  const anchors: Anchor[] = [];
  let j = m;
  let i = k;
  while (j > 0 || i > 0) {
    const step = j === 0 ? "p" : i === 0 ? "b" : from[j][i];
    if (step === "m") {
      anchors.push({
        word: boundaries[j - 1].word,
        start: pauses[i - 1].end,
        prevEnd: pauses[i - 1].start,
      });
      j--;
      i--;
    } else if (step === "b") j--;
    else i--;
  }
  return anchors.reverse();
}

/** Per-word start times (seconds) for `narration`, measured from the audio's pauses. */
export function alignWords(narration: string, analysis: Analysis): number[] {
  const words = narration.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 1);
  const boundaries: Boundary[] = [];
  words.forEach((w, i) => {
    if (i === words.length - 1) return;
    if (STRONG.test(w)) boundaries.push({ word: i + 1, strong: true });
    else if (WEAK.test(w)) boundaries.push({ word: i + 1, strong: false });
  });
  const { speechStart, speechEnd, pauses } = analysis;

  // Two passes: the second uses the first pass's anchors to place the expected times more accurately.
  let anchors: Anchor[] = [];
  for (let pass = 0; pass < 2; pass++) {
    const est = spread(weights, anchors, speechStart, speechEnd);
    anchors = matchBoundaries(boundaries, pauses, (word) => est[word]);
  }
  return spread(weights, anchors, speechStart, speechEnd);
}
