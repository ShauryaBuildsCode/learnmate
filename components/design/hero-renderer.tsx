"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, useInView } from "framer-motion";
import { DeviceFrame } from "@/components/design/device-frame";
import { StoryScene } from "@/components/design/story-scenes";

/** The hero loops the mind map and the loop execution on a local clock. The scroll story below owns its own progress. */
const LOOP = [2, 4] as const;
const SECONDS = 9;
const STEPS = 180;

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function HeroRenderer() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.25 });
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const [slot, setSlot] = useState(0);
  const [p, setP] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (!visible || reduced) return;
    // Starts after the entrance choreography so the first beat lands on screen.
    const controls = animate(0, 1, {
      duration: SECONDS,
      ease: "linear",
      delay: first.current ? 1.1 : 0.5,
      onUpdate: (v) => {
        first.current = false;
        setP(Math.round(v * STEPS) / STEPS);
      },
      onComplete: () => {
        setP(0);
        setSlot((s) => (s + 1) % LOOP.length);
      },
    });
    return () => controls.stop();
  }, [visible, reduced, slot]);

  return (
    <div ref={ref} className="relative">
      <div className="brand-border rounded-[1.9rem] sm:rounded-2xl">
        <DeviceFrame
          address="learnmate.app / course"
          className="h-[22rem] sm:h-[27rem] lg:h-[31rem]"
        >
          <StoryScene stage={LOOP[slot]} p={reduced ? 0.9 : p} href="/signup" />
        </DeviceFrame>
      </div>
    </div>
  );
}
