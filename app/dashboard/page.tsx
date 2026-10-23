import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckSquare,
  FileText,
  Flame,
  Network,
  NotebookPen,
} from "lucide-react";
import { LevelChip } from "@/components/plan/plan-view";
import { UploadCard } from "@/components/upload/upload-card";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import { createClient } from "@/lib/supabase/server";
import { loadOverview, type CourseSummary } from "@/lib/study/overview";

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="space-y-0.5 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function CourseCard({ c }: { c: CourseSummary }) {
  const links = [
    { href: "quizzes", label: "Quizzes", Icon: BarChart3 },
    { href: "notes", label: "Notes", Icon: NotebookPen },
    { href: "mindmap", label: "Mind map", Icon: Network },
    { href: "checklist", label: "Checklist", Icon: CheckSquare },
  ];
  return (
    <Card className="flex h-full flex-col gap-4">
      <Link href={`/course/${c.id}`} className="group flex items-start gap-3 rounded-lg">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-balance group-hover:underline">{c.title}</h2>
          <p className="text-sm text-muted-foreground">
            {c.subject} · {c.pageCount} pages · {c.topicCount} topics
          </p>
        </div>
      </Link>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {c.mastery === null ? "Take the quiz to see your mastery" : `${c.mastery}% mastery`}
          </span>
          <span>
            {c.exercisesPassed}/{c.exerciseTotal} exercises
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${c.title} mastery`}
          aria-valuenow={c.mastery ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-foreground/70"
            style={{ width: `${c.mastery ?? 0}%` }}
          />
        </div>
        {c.mastery !== null && (
          <p className="text-xs text-muted-foreground">
            {c.levels.weak} weak · {c.levels.okay} okay · {c.levels.strong} strong
          </p>
        )}
      </div>

      <ul className="mt-auto grid grid-cols-2 gap-1.5">
        {links.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={`/course/${c.id}/${href}`}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const o = await loadOverview(supabase);
  const next = o.courses.find((c) => c.next);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Pick up where you left off, or start something new.
            </p>
          </div>

          {o.courses.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Courses" value={String(o.courses.length)} />
              <Tile
                label="Day streak"
                value={String(o.streak.current)}
                hint={o.streak.current > 0 ? "Keep it going" : "Study today to start one"}
              />
              <Tile
                label="Avg quiz score"
                value={o.totals.avgScore === null ? "–" : `${o.totals.avgScore}%`}
              />
              <Tile label="Exercises passed" value={String(o.totals.exercisesPassed)} />
            </div>
          )}

          {next?.next && (
            <Card className="flex flex-wrap items-center gap-4 border-primary/20 bg-accent">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Flame className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Up next · {next.title}
                </p>
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {next.next.topicName} <LevelChip level={next.next.level} />
                </p>
                <p className="text-sm text-muted-foreground">{next.next.nextStep}</p>
              </div>
              <Link
                href={`/learn/${next.next.topicId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
              >
                Start <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
          )}

          {o.courses.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 border-dashed px-6 py-14 text-center shadow-none">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="font-medium">No courses yet</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Nothing here yet. Add a chapter and LearnMate will build your first course.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Your courses</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {o.courses.map((c) => (
                  <li key={c.id}>
                    <CourseCard c={c} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <UploadCard />
      </main>
    </>
  );
}
