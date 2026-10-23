"use client";

import {
  Bot,
  Check,
  Code2,
  FileUp,
  PlayCircle,
  ScanSearch,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

type JourneyStep = {
  icon: LucideIcon;
  title: string;
  body: string;
  detail: string;
};

const STEPS: JourneyStep[] = [
  {
    icon: FileUp,
    title: "Upload your notes",
    body: "Bring one chapter as a PDF or pasted text.",
    detail: "LearnMate keeps the lesson grounded in the material you actually need to study.",
  },
  {
    icon: ScanSearch,
    title: "Discover weak topics",
    body: "A short diagnostic maps what you know.",
    detail: "Your gaps become a focused learning path instead of another generic course.",
  },
  {
    icon: PlayCircle,
    title: "Watch an animated lesson",
    body: "See code, variables and flow unfold visually.",
    detail: "Each scene builds on the last and points back to the source material.",
  },
  {
    icon: Code2,
    title: "Practise Python",
    body: "Move directly from explanation to working code.",
    detail: "Experiment beside the lesson and see the result while the idea is still fresh.",
  },
  {
    icon: Bot,
    title: "Ask Guru for help",
    body: "Get a hint from a tutor that can see your work.",
    detail: "Guru guides your next step without taking the productive struggle away.",
  },
  {
    icon: Trophy,
    title: "Master the topic",
    body: "Revisit weak points and watch understanding grow.",
    detail: "Your plan adapts around real attempts, so progress reflects what you can do.",
  },
];

function JourneyVisual({ step }: { step: number }) {
  const reduced = useReducedMotion();
  if (step === 0)
    return (
      <div className="journey-upload flex min-h-32 items-center gap-4 rounded-xl border border-dashed bg-background/70 p-5">
        <FileUp className="h-10 w-10 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">python-notes.pdf</p>
          <p className="mt-1 text-xs text-muted-foreground">Chapter 2 · Ready to explore</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <span className="journey-upload-progress block h-full origin-left bg-foreground" />
          </div>
        </div>
      </div>
    );
  if (step === 1)
    return (
      <div className="space-y-2 text-sm">
        <p className="mb-3 font-medium">What does a loop help you do?</p>
        {["Repeat an action for each item", "Store a single value", "Stop the program"].map(
          (answer, i) => (
            <div
              key={answer}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5",
                i === 0 ? "bg-accent font-medium" : "text-muted-foreground",
              )}
            >
              {i === 0 && <Check className="h-4 w-4" aria-hidden="true" />}
              {answer}
            </div>
          ),
        )}
      </div>
    );
  if (step === 2)
    return (
      <div className="rounded-xl border bg-background/70 p-5">
        <p className="text-xs text-muted-foreground">A loop, one item at a time</p>
        <div className="my-5 flex justify-between gap-2">
          {[72, 88, 95].map((n, i) => (
            <motion.span
              key={n}
              initial={{ opacity: reduced ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : i * 0.2, duration: reduced ? 0 : 0.2 }}
              className="rounded-lg border bg-card px-3 py-2 font-mono text-sm"
            >
              {n}
            </motion.span>
          ))}
        </div>
        <p className="text-center font-mono text-sm">72 + 88 + 95 = 255</p>
      </div>
    );
  if (step === 3)
    return (
      <div className="overflow-hidden rounded-xl border bg-background/80 p-4">
        <p className="mb-3 text-xs text-muted-foreground">practice.py</p>
        <pre className="journey-code font-mono text-xs leading-6">
          {"total = 0\nfor score in scores:\n    total += score\nprint(total)"}
        </pre>
      </div>
    );
  if (step === 4)
    return (
      <div className="space-y-3 text-sm">
        <p className="ml-8 rounded-xl border bg-background/80 p-3">
          Why does total change each time?
        </p>
        <p className="mr-3 rounded-xl border bg-accent p-3">
          <span className="mb-1 flex items-center gap-2 font-medium">
            <Bot className="h-4 w-4" aria-hidden="true" />
            Guru · Example
          </span>
          Each pass adds the next score. What would total be after adding 72 and 88?
        </p>
      </div>
    );
  return (
    <div className="flex min-h-32 items-center gap-4 rounded-xl border bg-accent/60 p-5">
      <span className="journey-mastery flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-foreground/40">
        <Trophy className="h-7 w-7" aria-hidden="true" />
      </span>
      <div>
        <p className="font-medium">One idea, understood.</p>
        <p className="mt-1 text-xs text-muted-foreground">Lesson → practice → reflection</p>
        <p className="mt-2 text-xs">Illustrative completion</p>
      </div>
    </div>
  );
}

export function LearningJourney() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduced = useReducedMotion();
  const transition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 180, damping: 26 };

  return (
    <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <div className="lg:sticky lg:top-28 lg:h-fit">
        <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Your learning loop
        </p>
        <h2
          id="how-heading"
          className="max-w-md text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl"
        >
          From notes to <span className="text-muted-foreground">real understanding.</span>
        </h2>
        <p className="mt-5 max-w-md leading-7 text-muted-foreground">
          One connected journey that finds the gap, explains the idea and gives you somewhere to
          practise it.
        </p>
        <div className="mt-7 flex items-center gap-3 text-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-card font-mono text-xs shadow-sm">
            {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <span className="text-muted-foreground">of {String(STEPS.length).padStart(2, "0")}</span>
        </div>
        <div
          className="journey-preview mt-6 hidden overflow-hidden rounded-2xl border bg-card p-5 shadow-lg sm:p-6 lg:block"
          id="journey-preview"
          role="region"
          aria-label={`${STEPS[activeIndex].title} illustrative preview`}
        >
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Interactive walkthrough · Demo data
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeIndex}
              initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -6 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              className="min-h-48"
            >
              <JourneyVisual step={activeIndex} />
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                {STEPS[activeIndex].detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute top-8 bottom-8 left-[1.45rem] w-px bg-border sm:left-[1.7rem]"
        >
          <motion.div
            className="journey-selection-track h-full origin-top"
            animate={{ scaleY: activeIndex / (STEPS.length - 1) }}
            transition={transition}
          />
        </div>
        <ol className="space-y-5">
          {STEPS.map((step, index) => {
            const active = index === activeIndex;
            const complete = index < activeIndex;
            const Icon = step.icon;

            return (
              <li
                key={step.title}
                className={cn(
                  "journey-step group relative overflow-hidden rounded-2xl border transition-[border-color,box-shadow] duration-300",
                  active
                    ? "translate-x-1 border-foreground/25 bg-card shadow-lg"
                    : "border-transparent bg-card/60 hover:border-border hover:bg-card",
                )}
                aria-current={active ? "step" : undefined}
                data-active={active}
              >
                <button
                  type="button"
                  aria-expanded={active}
                  aria-controls={`journey-preview journey-step-preview-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className="relative grid w-full grid-cols-[3rem_1fr] gap-4 p-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-foreground sm:grid-cols-[3.5rem_1fr] sm:gap-5 sm:p-5"
                >
                  <motion.span
                    animate={{
                      scale: active && !reduced ? 1.05 : 1,
                      rotate: active && !reduced ? -3 : 0,
                    }}
                    transition={transition}
                    className={cn(
                      "relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border bg-card shadow-sm transition-[background-color,color,transform] duration-500 sm:h-14 sm:w-14",
                      active && "scale-105 bg-primary text-primary-foreground",
                      complete && "bg-foreground text-background",
                    )}
                  >
                    {complete ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    )}
                  </motion.span>
                  <div className="min-w-0 py-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-medium sm:text-lg">{step.title}</span>
                      <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/80">{step.body}</p>
                    <p
                      className={cn(
                        "grid text-sm leading-6 text-muted-foreground transition-[grid-template-rows,opacity,margin] duration-500",
                        active
                          ? "mt-3 grid-rows-[1fr] opacity-100"
                          : "mt-0 grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <span className="overflow-hidden">{step.detail}</span>
                    </p>
                  </div>
                </button>
                <div
                  id={`journey-step-preview-${index}`}
                  hidden={!active}
                  className="journey-preview mx-4 mb-4 rounded-xl border p-4 lg:hidden"
                >
                  {active && (
                    <>
                      <p className="mb-4 text-[10px] uppercase tracking-widest text-muted-foreground">
                        Illustrative preview · Demo data
                      </p>
                      <JourneyVisual step={index} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
