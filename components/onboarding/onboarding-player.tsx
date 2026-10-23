"use client";

import { ArrowLeft, ArrowRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { speak, speechSupported, stopSpeaking } from "@/lib/lesson/narration";
import { FrameProvider } from "@/lib/motion";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Guru, Lessons, Plan, Practice, Ready, Upload, Welcome, type Profile } from "./scenes";

const FPS = 30;
const STAGE_W = 1280;
const STAGE_H = 720;

interface SceneDef {
  seconds: number;
  narration: string;
  render: (p: Profile) => ReactNode;
}

function scenesFor(p: Profile): SceneDef[] {
  return [
    {
      seconds: 5,
      narration: `Hi ${p.name}. Welcome to LearnMate. Let's make it stick.`,
      render: (x) => <Welcome p={x} />,
    },
    {
      seconds: 6.5,
      narration: "Drop in any chapter or your own notes. LearnMate finds the topics for you.",
      render: (x) => <Upload p={x} />,
    },
    {
      seconds: 5.5,
      narration: "Each topic becomes an animated lesson, narrated, and built from your own pages.",
      render: () => <Lessons />,
    },
    {
      seconds: 6,
      narration: p.codey
        ? "Then practise in a real code editor, right beside the lesson."
        : "Then practise with interactive questions that check you instantly.",
      render: (x) => <Practice p={x} />,
    },
    {
      seconds: 6,
      narration:
        "Stuck? Guru sees your work, and teaches you, without just handing over the answer.",
      render: () => <Guru />,
    },
    {
      seconds: 6,
      narration: p.minutes
        ? `${p.minutes} minutes a day is plenty. Your plan adapts as you improve.`
        : "Your revision plan adapts as you improve.",
      render: (x) => <Plan p={x} />,
    },
    {
      seconds: 5,
      narration: `Ready, ${p.name}? Upload your first chapter.`,
      render: (x) => <Ready p={x} />,
    },
  ];
}

/**
 * A short motion-video style welcome built from the same animation engine as the lessons: personalised with the
 * learner's name and interests, captioned, with an optional voice. Skippable at any moment.
 */
export function OnboardingPlayer({ profile, userId }: { profile: Profile; userId: string }) {
  const router = useRouter();
  const scenes = useRef(scenesFor(profile)).current;
  const [index, setIndex] = useState(0);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [voice, setVoice] = useState(false);
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null);
  const clock = useRef({ start: performance.now(), raf: 0 });

  const finish = useCallback(async () => {
    stopSpeaking();
    await createClient()
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", userId);
    router.replace("/dashboard");
    router.refresh();
  }, [router, userId]);

  const go = useCallback(
    (i: number) => {
      if (i >= scenes.length) return void finish();
      const next = Math.max(0, i);
      setIndex(next);
      setFrame(0);
      clock.current.start = performance.now();
    },
    [scenes.length, finish],
  );

  // The clock: frames advance with real time while playing, and the scene changes when its time is up.
  useEffect(() => {
    if (!playing) return;
    const c = clock.current;
    c.start = performance.now() - (frame / FPS) * 1000;
    const tick = () => {
      const f = ((performance.now() - c.start) / 1000) * FPS;
      if (f >= scenes[index].seconds * FPS) return go(index + 1);
      setFrame(f);
      c.raf = requestAnimationFrame(tick);
    };
    c.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(c.raf);
    // frame is read once at (re)start only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, scenes, go]);

  useEffect(() => {
    if (voice && playing) speak(scenes[index].narration, "en");
    else stopSpeaking();
    return stopSpeaking;
  }, [voice, playing, index, scenes]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const o = new ResizeObserver(([e]) => setScale(e.contentRect.width / STAGE_W));
    o.observe(el);
    return () => o.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.key === "Escape") void finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, finish]);

  const scene = scenes[index];
  const last = index === scenes.length - 1;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div
        ref={box}
        className="relative w-full overflow-hidden rounded-2xl border shadow-lg"
        style={{ aspectRatio: "16 / 9" }}
        role="region"
        aria-label="Welcome tour"
        aria-live="polite"
      >
        <div
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        >
          <FrameProvider
            frame={frame}
            fps={FPS}
            durationInFrames={scene.seconds * FPS}
            speechInFrames={scene.seconds * FPS}
            narration={scene.narration}
          >
            {scene.render(profile)}
          </FrameProvider>
        </div>
        <button
          type="button"
          onClick={() => void finish()}
          className="absolute right-3 top-3 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-background"
        >
          Skip
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-1.5" role="tablist" aria-label="Tour progress">
          {scenes.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => go(i)}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            >
              <span
                className={cn("block h-full rounded-full bg-foreground")}
                style={{
                  width:
                    i < index
                      ? "100%"
                      : i === index
                        ? `${Math.min(100, (frame / (scene.seconds * FPS)) * 100)}%`
                        : "0%",
                }}
              />
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous"
          onClick={() => go(index - 1)}
          disabled={index === 0}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        {speechSupported() && (
          <Button
            variant="outline"
            size="icon"
            aria-label={voice ? "Turn voice off" : "Turn voice on"}
            aria-pressed={voice}
            onClick={() => setVoice((v) => !v)}
          >
            {voice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        )}
        <Button onClick={() => (last ? void finish() : go(index + 1))}>
          {last ? "Build my first course" : "Next"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
