import type { Scene } from "@/lib/schemas/lesson";

export const FPS = 30;
const WORDS_PER_SECOND = 2.4;
const PADDING_SECONDS = 1.2;
const MIN_SECONDS = 5;

/** Scene length follows the narration: word count at a calm speaking pace, never shorter than the script asked for. */
export function sceneSeconds(scene: Pick<Scene, "narration" | "seconds">): number {
  const words = scene.narration.trim().split(/\s+/).filter(Boolean).length;
  const fromWords = words / WORDS_PER_SECOND + PADDING_SECONDS;
  return Math.max(MIN_SECONDS, scene.seconds, Math.ceil(fromWords));
}

export interface TimedScene {
  scene: Scene;
  from: number;
  frames: number;
}

export function layout(scenes: Scene[]): { timed: TimedScene[]; totalFrames: number } {
  let from = 0;
  const timed = scenes.map((scene) => {
    const frames = Math.round(sceneSeconds(scene) * FPS);
    const entry = { scene, from, frames };
    from += frames;
    return entry;
  });
  return { timed, totalFrames: from };
}

export function sceneIndexAt(timed: TimedScene[], frame: number): number {
  const i = timed.findIndex((t) => frame >= t.from && frame < t.from + t.frames);
  return i === -1 ? timed.length - 1 : i;
}
