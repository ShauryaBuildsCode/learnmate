"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { animate, useInView } from "framer-motion";
import {
  Bot,
  ChevronDown,
  FileUp,
  Globe,
  Lightbulb,
  ListChecks,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { DeviceFrame } from "@/components/design/device-frame";
import { FallingText } from "@/components/design/falling-text";
import { InView } from "@/components/design/section-motion";
import { StoryScene } from "@/components/design/story-scenes";
import { Swap } from "@/components/design/swap";
import { cn } from "@/lib/utils";

interface Moment {
  id: string;
  icon: LucideIcon;
  label: string;
  title: string;
  summary: string;
  points: string[];
  /** Story scenes the miniature plays through, in order, and how much of the loop each gets. */
  scenes: number[];
  weights?: number[];
  /** Accent lighting: two brand colours. */
  glow: [string, string];
}

const MOMENTS: Moment[] = [
  {
    id: "upload",
    icon: FileUp,
    label: "Moment 1",
    title: "When you upload your notes",
    summary: "LearnMate starts turning raw material into a structured course.",
    points: [
      "Upload a PDF or paste your notes",
      "Key passages are highlighted, with page numbers",
      "Concepts become a mind map you can explore",
      "Pick a concept to start learning it",
    ],
    scenes: [1, 2],
    weights: [0.4, 0.6],
    glow: ["var(--brand-1)", "var(--brand-2)"],
  },
  {
    id: "gap",
    icon: ListChecks,
    label: "Moment 2",
    title: "When you realise what you don't understand",
    summary: "A short diagnostic shows which ideas need practice before you start.",
    points: [
      "Answer a few questions on your own material",
      "Get feedback on every answer",
      "Weak topics are flagged, not guessed at",
      "Your plan puts them first",
    ],
    scenes: [3],
    glow: ["var(--brand-3)", "var(--brand-2)"],
  },
  {
    id: "click",
    icon: Lightbulb,
    label: "Moment 3",
    title: "When a concept finally clicks",
    summary: "Animated lessons walk through the idea one step at a time.",
    points: [
      "Watch the concept drawn out",
      "Follow the code one line at a time",
      "See the variable and output change together",
      "Every scene links back to its source page",
    ],
    scenes: [4],
    glow: ["var(--brand-2)", "var(--brand-1)"],
  },
  {
    id: "web",
    icon: Globe,
    label: "Moment 4",
    title: "When you learn something new for the web",
    summary: "Markup and styles are explained by showing what each one does.",
    points: [
      "HTML code builds a tree of elements",
      "Pick a node to see its code and its place on the page",
      "CSS rules restyle the page one declaration at a time",
      "Practise it in the HTML, CSS and JS workspace",
    ],
    scenes: [5],
    glow: ["var(--brand-1)", "var(--brand-2)"],
  },
  {
    id: "stuck",
    icon: Bot,
    label: "Moment 5",
    title: "When you get stuck while coding",
    summary: "Guru sees your code and results, then guides you to the fix.",
    points: [
      "Write and run real Python beside the lesson",
      "Check against hidden tests",
      "Get a hint that fits your code, not a full answer",
      "Fix the mistake and understand why",
    ],
    scenes: [7],
    glow: ["var(--brand-2)", "var(--brand-3)"],
  },
  {
    id: "progress",
    icon: TrendingUp,
    label: "Moment 6",
    title: "When your practice starts paying off",
    summary: "Mastery rises as you pass exercises, and the plan updates.",
    points: [
      "Complete targeted exercises",
      "See each topic's mastery improve",
      "Read what changed in your plan",
      "Move on to the next recommended topic",
    ],
    scenes: [8],
    glow: ["var(--brand-1)", "var(--brand-3)"],
  },
];

const STEPS = 150;
const LOOP_SECONDS = 11;

function subscribeQuery(query: string) {
  return (onChange: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  };
}
function useQuery(query: string, server = false) {
  return useSyncExternalStore(
    subscribeQuery(query),
    () => window.matchMedia(query).matches,
    () => server,
  );
}

/**
 * One miniature renderer. Its clock exists only while it is mounted and on screen, so closing a
 * moment or scrolling away stops all work. Loops with a short hold on the finished state.
 */
function MomentPreview({ moment, reduced }: { moment: Moment; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.3 });
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!visible || reduced) return;
    const controls = animate(0, 1, {
      duration: LOOP_SECONDS,
      ease: "linear",
      repeat: Infinity,
      repeatDelay: 1.4,
      onUpdate: (v) => setP(Math.round(v * STEPS) / STEPS),
    });
    return () => controls.stop();
  }, [visible, reduced, moment.id]);

  // Split the loop between scenes by weight; each scene gets its own 0..1 progress.
  const weights = moment.weights ?? moment.scenes.map(() => 1 / moment.scenes.length);
  const t = reduced ? 0.92 : Math.min(0.999, p);
  let idx = 0;
  let from = 0;
  while (idx < weights.length - 1 && t >= from + weights[idx]) from += weights[idx++];
  const local = reduced ? 0.92 : Math.min(1, (t - from) / weights[idx]);

  return (
    <div ref={ref} className="h-full">
      <StoryScene stage={moment.scenes[idx]} p={local} href="/signup" />
    </div>
  );
}

export function MomentsSection() {
  const [open, setOpen] = useState<number | null>(0);
  // The renderer keeps showing the last moment that was opened, even after it is collapsed.
  const [shown, setShown] = useState(0);
  const wide = useQuery("(min-width: 1024px)");
  const reduced = useQuery("(prefers-reduced-motion: reduce)");
  const uid = useId();

  function toggle(i: number) {
    setOpen((cur) => (cur === i ? null : i));
    setShown(i);
  }

  const current = MOMENTS[shown];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
        <div className="min-w-0">
          <InView>
            <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Designed for momentum
            </p>
          </InView>
          <h2
            id="features-heading"
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            <FallingText text="Built around moments" trigger="view" />
          </h2>
          <InView className="mt-3 max-w-lg text-muted-foreground" delay={0.15}>
            <p>
              Learning is a handful of moments: starting, finding the gap, understanding, getting
              stuck, improving. Open one to see what LearnMate does.
            </p>
          </InView>

          <div className="relative mt-8 space-y-2.5">
            {MOMENTS.map((m, i) => {
              const active = open === i;
              const Icon = m.icon;
              const panelId = `${uid}-panel-${m.id}`;
              const buttonId = `${uid}-button-${m.id}`;
              return (
                <InView key={m.id} delay={0.05 * i}>
                  <div
                    data-active={active}
                    className="moment-card rounded-2xl border bg-card/80"
                    style={{ "--m-a": m.glow[0], "--m-b": m.glow[1] } as CSSProperties}
                  >
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={active}
                        aria-controls={panelId}
                        onClick={() => toggle(i)}
                        className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:p-4"
                      >
                        <span className="moment-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                            {m.label}
                          </span>
                          <span className="block text-sm font-semibold sm:text-base">
                            {m.title}
                          </span>
                        </span>
                        <ChevronDown
                          className="moment-chevron h-4 w-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>
                    </h3>
                    <div className="moment-panel" data-open={active}>
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className="min-h-0 overflow-hidden"
                        // Collapsed panels leave the tab order and the accessibility tree.
                        inert={!active}
                      >
                        <div className="px-3.5 pb-4 sm:px-4">
                          <p className="text-sm leading-6 text-muted-foreground">{m.summary}</p>
                          <ul className="mt-3 space-y-1.5">
                            {m.points.map((pt, k) => (
                              <li
                                key={pt}
                                className="moment-point flex gap-2 text-sm"
                                style={{ "--k": k } as CSSProperties}
                              >
                                <span
                                  aria-hidden="true"
                                  className="brand-fill mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full"
                                />
                                {pt}
                              </li>
                            ))}
                          </ul>
                          {/* Phones and tablets: the renderer sits inside the open card. */}
                          {active && !wide && (
                            <div className="mt-4">
                              <PreviewFrame moment={m} reduced={reduced} compact />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </InView>
              );
            })}
          </div>
        </div>

        {wide && (
          <div className="relative isolate min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div aria-hidden="true" className="moment-lights">
              {MOMENTS.map((m, i) => (
                <div
                  key={m.id}
                  className="moment-light"
                  data-on={i === shown}
                  style={{ "--m-a": m.glow[0], "--m-b": m.glow[1] } as CSSProperties}
                />
              ))}
            </div>
            <Swap
              value={shown}
              className="relative"
              render={(v, phase) =>
                phase === "out" ? (
                  <PreviewFrame moment={MOMENTS[v]} reduced staticFrame />
                ) : (
                  <PreviewFrame moment={MOMENTS[v]} reduced={reduced} />
                )
              }
            />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {current.title} · illustrative demo data
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewFrame({
  moment,
  reduced,
  compact = false,
  staticFrame = false,
}: {
  moment: Moment;
  reduced: boolean;
  compact?: boolean;
  staticFrame?: boolean;
}) {
  return (
    <DeviceFrame
      address={`learnmate.app / ${moment.id}`}
      className={cn(compact ? "h-[28rem]" : "h-[31rem]", "w-full max-w-none")}
    >
      {staticFrame ? (
        <StoryScene stage={moment.scenes[moment.scenes.length - 1]} p={0.9} href="/signup" />
      ) : (
        <MomentPreview moment={moment} reduced={reduced} />
      )}
    </DeviceFrame>
  );
}
