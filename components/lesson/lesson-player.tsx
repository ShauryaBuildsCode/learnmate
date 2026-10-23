"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageChip } from "@/components/source/source-context";
import { Skeleton } from "@/components/ui/skeleton";
import { FPS, layout, sceneIndexAt } from "@/lib/lesson/timing";
import { speak, speechSupported, stopSpeaking, type NarrationLang } from "@/lib/lesson/narration";
import { tracePython } from "@/lib/runners/python";
import type { LessonScript, Scene } from "@/lib/schemas/lesson";
import { cn } from "@/lib/utils";
import { LessonComposition } from "./lesson-composition";

/** Let the Checkpoint card finish animating in before the video stops on it. */
const CHECKPOINT_PAUSE_FRAMES = 45;

interface Props {
  script: LessonScript;
  lang: NarrationLang;
  /** Called when playback reaches a Checkpoint; the lesson pauses and the IDE opens. */
  onCheckpoint: (exerciseId: string) => void;
  onSceneChange: (index: number, scene: Scene) => void;
}

/** Fills each VariableTracker scene with a real execution trace. Scenes that can't be traced are dropped. */
async function withTraces(scenes: Scene[]): Promise<Scene[]> {
  const out: Scene[] = [];
  for (const scene of scenes) {
    if (scene.type !== "VariableTracker") {
      out.push(scene);
      continue;
    }
    try {
      const steps = await tracePython(scene.code);
      if (steps.length > 1) out.push({ ...scene, steps });
    } catch {
      // The animation must never show values nobody computed, so an untraceable scene is skipped.
    }
  }
  return out;
}

export function LessonPlayer({ script, lang, onCheckpoint, onSceneChange }: Props) {
  const playerRef = useRef<PlayerRef>(null);
  const triggered = useRef(new Set<number>());
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [index, setIndex] = useState(0);
  const [narrate, setNarrate] = useState(true);
  const playing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void withTraces(script.scenes).then((prepared) => {
      if (!cancelled) setScenes(prepared);
    });
    return () => {
      cancelled = true;
    };
  }, [script]);

  const { timed, totalFrames } = useMemo(() => layout(scenes ?? []), [scenes]);
  const timedRef = useRef(timed);
  const narrateRef = useRef(narrate);
  useEffect(() => {
    timedRef.current = timed;
    narrateRef.current = narrate;
  }, [timed, narrate]);

  const speakScene = useCallback(
    (i: number) => {
      const t = timedRef.current[i];
      if (t && narrateRef.current) speak(t.scene.narration, lang);
    },
    [lang],
  );

  useEffect(() => {
    const player = playerRef.current;
    if (!player || timed.length === 0) return;
    let last = -1;
    const onFrame = (e: { detail: { frame: number } }) => {
      const frame = e.detail.frame;
      const i = sceneIndexAt(timedRef.current, frame);
      if (i !== last) {
        last = i;
        setIndex(i);
        onSceneChange(i, timedRef.current[i].scene);
        if (playing.current) speakScene(i);
      }
      timedRef.current.forEach((t, ti) => {
        if (t.scene.type !== "Checkpoint") return;
        if (frame < t.from) triggered.current.delete(ti);
        else if (frame >= t.from + CHECKPOINT_PAUSE_FRAMES && !triggered.current.has(ti)) {
          triggered.current.add(ti);
          player.pause();
          onCheckpoint(t.scene.exerciseId);
        }
      });
    };
    const onPlay = () => {
      playing.current = true;
      speakScene(last < 0 ? 0 : last);
    };
    const onPause = () => {
      playing.current = false;
      stopSpeaking();
    };
    const onSeeked = () => {
      stopSpeaking();
      last = -1;
      if (playing.current) speakScene(sceneIndexAt(timedRef.current, player.getCurrentFrame()));
    };
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);
    player.addEventListener("ended", onPause);
    player.addEventListener("seeked", onSeeked);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
      player.removeEventListener("ended", onPause);
      player.removeEventListener("seeked", onSeeked);
      stopSpeaking();
    };
  }, [timed, onCheckpoint, onSceneChange, speakScene]);

  if (!scenes) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Preparing lesson">
        <Skeleton className="aspect-video w-full" />
        <p className="text-sm text-muted-foreground">
          Running the lesson code to record real variable traces…
        </p>
      </div>
    );
  }

  const current = timed[index]?.scene;
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-black shadow-lg">
        <Player
          ref={playerRef}
          component={LessonComposition}
          inputProps={{ timed }}
          durationInFrames={Math.max(totalFrames, 1)}
          fps={FPS}
          compositionWidth={1280}
          compositionHeight={720}
          controls
          clickToPlay
          doubleClickToFullscreen
          spaceKeyToPlayOrPause
          acknowledgeRemotionLicense
          style={{ width: "100%" }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          Scene {index + 1} of {timed.length}
          {current ? ` · ${current.type}` : ""}
        </span>
        {current && (
          <span className="flex items-center gap-1">
            Source: <PageChip page={current.page} />
          </span>
        )}
        {speechSupported() && (
          <button
            type="button"
            aria-pressed={narrate}
            onClick={() => {
              setNarrate((n) => !n);
              stopSpeaking();
            }}
            className="ml-auto flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-muted"
          >
            {narrate ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Narration {narrate ? "on" : "off"}
          </button>
        )}
      </div>
      <div role="list" className="flex gap-1">
        {timed.map((t, i) => (
          <button
            key={i}
            role="listitem"
            title={`${t.scene.type} (p. ${t.scene.page})`}
            onClick={() => playerRef.current?.seekTo(t.from)}
            className={cn(
              "h-2 rounded-full transition-colors",
              i === index ? "bg-primary" : "bg-muted hover:bg-primary/40",
            )}
            style={{ flex: t.frames }}
          />
        ))}
      </div>
    </div>
  );
}
