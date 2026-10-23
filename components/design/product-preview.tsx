"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Bot, CheckCircle2, Pause, Play, RotateCcw } from "lucide-react";

const LINES = [
  "scores = [72, 88, 95]",
  "total = 0",
  "for s in scores:",
  "    total += s",
  "print(total / len(scores))",
];
const DURATION = 12000;
const LINE_STARTS = [400, 2000, 3200, 4900, 6500];

function highlighted(text: string) {
  return text.split(/(\b(?:for|in|print|len)\b|\b\d+\b)/g).map((token, i) => (
    <span
      key={i}
      className={
        /^(for|in|print|len)$/.test(token)
          ? "demo-token-keyword"
          : /^\d+$/.test(token)
            ? "demo-token-number"
            : undefined
      }
    >
      {token}
    </span>
  ));
}

/** Marketing-only React composition: every scene derives from the same elapsed clock. */
export function ProductPreview() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [manualPlay, setManualPlay] = useState(false);
  const playing = visible && pageVisible && !manuallyPaused && (!reducedMotion || manualPlay);
  const [elapsed, setElapsed] = useState(0);
  const position = useRef(0);
  const checkpoint = elapsed >= 9300;
  const guru = elapsed >= 10300;
  const visibleLines = LINES.map((line, index) =>
    line.slice(0, Math.max(0, Math.floor((elapsed - LINE_STARTS[index]) / 55))),
  );
  const activeLine = checkpoint
    ? 3
    : Math.max(
        0,
        LINE_STARTS.findLastIndex((start) => elapsed >= start),
      );
  const step = elapsed < 5000 ? 0 : elapsed < 6200 ? 1 : elapsed < 7500 ? 2 : 3;
  const total = [0, 72, 160, 255][step];
  const sceneOpacity = reducedMotion
    ? 1
    : elapsed > DURATION + 1200
      ? Math.max(0, 1 - (elapsed - DURATION - 1200) / 600)
      : elapsed < 300
        ? 0.65 + (elapsed / 300) * 0.35
        : 1;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25),
      { threshold: [0, 0.25] },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    const updateVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous: number | null = null;
    function tick(now: number) {
      if (previous !== null)
        position.current = (position.current + Math.min(now - previous, 100)) % (DURATION + 1800);
      previous = now;
      setElapsed(position.current);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  function toggle() {
    setManuallyPaused(playing);
    setManualPlay(true);
  }
  function replay() {
    position.current = 0;
    setElapsed(0);
    setManuallyPaused(false);
    setManualPlay(true);
  }

  return (
    <section
      ref={sectionRef}
      aria-label="Interactive LearnMate lesson demo"
      className="demo-preview surface-sheen overflow-hidden rounded-2xl border shadow-lg"
      data-playing={playing}
    >
      <div className="flex items-center gap-2 border-b bg-muted px-4 py-2.5">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="h-2.5 w-2.5 rounded-full bg-border" />
        ))}
        <span className="ml-3 text-xs text-muted-foreground">Python loops · Lesson 2 of 6</span>
      </div>
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4 border-b p-5 md:border-r md:border-b-0">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause lesson demo" : "Play lesson demo"}
            className="demo-stage relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted bg-dots focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
          >
            <span className="flex flex-col items-center" style={{ opacity: sceneOpacity }}>
              <span className="relative mb-4 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {checkpoint ? "Loop complete" : "A running total"}
              </span>
              <span className="relative flex gap-3" aria-hidden="true">
                {[72, 88, 95].map((score, index) => (
                  <span
                    key={score}
                    className={`demo-score flex h-10 w-12 items-center justify-center rounded-xl border font-mono text-sm ${step > index ? "demo-score--added" : "bg-card"}`}
                  >
                    {score}
                  </span>
                ))}
              </span>
              <span className="relative mt-4 font-mono text-sm">
                total = <span className="font-semibold">{total}</span>
              </span>
            </span>
            <span className="demo-control absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full border bg-card/85 text-foreground shadow-lg backdrop-blur-md">
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 translate-x-px" />
              )}
            </span>
            <span className="sr-only">
              {playing ? "Playing" : "Paused"}. Select to {playing ? "pause" : "play"}.
            </span>
          </button>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={DURATION}
              step={50}
              value={Math.min(elapsed, DURATION)}
              aria-label="Seek lesson demo"
              aria-valuetext={`${Math.round(Math.min(elapsed, DURATION) / 1000)} of 12 seconds`}
              onChange={(event) => {
                position.current = Number(event.target.value);
                setElapsed(position.current);
              }}
              className="demo-seek min-h-11 min-w-0 flex-1 cursor-pointer accent-foreground"
            />
            <button
              type="button"
              onClick={replay}
              aria-label="Replay lesson demo"
              className="demo-replay flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-card text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div
            className="demo-checkpoint flex min-h-20 items-start gap-2 rounded-lg border p-3 text-sm"
            data-active={checkpoint}
          >
            <CheckCircle2
              className={`mt-0.5 h-4 w-4 shrink-0 ${checkpoint ? "text-success" : "text-muted-foreground"}`}
              aria-hidden="true"
            />
            <p>
              <span className="font-medium">Checkpoint.</span>{" "}
              <span className="demo-reveal text-muted-foreground" data-visible={checkpoint}>
                What does <code className="font-mono text-foreground">total</code> hold after the
                loop?
              </span>
              <span hidden={checkpoint} className="text-muted-foreground">
                Watch the loop, then check your understanding.
              </span>
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <pre
            aria-label="Python example"
            style={{ opacity: sceneOpacity }}
            className="min-h-48 flex-1 overflow-x-auto bg-background p-4 font-mono text-xs leading-6"
          >
            {LINES.map((line, index) => (
              <div
                key={line}
                className={`demo-code-line -mx-4 px-4 ${activeLine === index ? "bg-warning/15" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="mr-4 inline-block w-3 select-none text-right text-muted-foreground"
                >
                  {index + 1}
                </span>
                <code>{highlighted(visibleLines[index])}</code>
                {activeLine === index && elapsed < 8500 && (
                  <span className="demo-caret" aria-hidden="true">
                    ▎
                  </span>
                )}
              </div>
            ))}
          </pre>
          <div className="flex min-h-32 items-start gap-3 border-t p-4 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Guru:</span>{" "}
              <span hidden={guru}>Follow the scores as the total grows.</span>
              <span className="demo-reveal" data-visible={guru}>
                Line 4 adds each score to the running total. Try printing{" "}
                <code className="font-mono">total</code> inside the loop to watch it grow.
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
