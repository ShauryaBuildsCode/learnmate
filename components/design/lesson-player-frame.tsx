import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LessonPlayerFrameProps = {
  title: string;
  /** 0 to 1. */
  progress: number;
  playing?: boolean;
  /** The animated scene goes here. */
  children: ReactNode;
  /** Optional checkpoint / caption area under the stage. */
  caption?: ReactNode;
  onPlayPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
};

/** Visual frame for the animated lesson: title bar, stage, progress and controls. Props in, JSX out. */
export function LessonPlayerFrame({
  title,
  progress,
  playing = false,
  children,
  caption,
  onPlayPause,
  onPrevious,
  onNext,
  className,
}: LessonPlayerFrameProps) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const control =
    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted disabled:opacity-50";
  return (
    <section
      aria-label={title}
      className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", className)}
    >
      <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted bg-dots">
        {children}
      </div>
      <div
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1 bg-muted"
      >
        <div className="h-full bg-foreground transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="truncate text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous scene"
            className={control}
            onClick={onPrevious}
          >
            <SkipBack className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            className={cn(
              control,
              "bg-primary text-primary-foreground hover:bg-primary hover:opacity-90",
            )}
            onClick={onPlayPause}
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button type="button" aria-label="Next scene" className={control} onClick={onNext}>
            <SkipForward className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {caption && <div className="border-t px-4 py-3 text-sm">{caption}</div>}
    </section>
  );
}
