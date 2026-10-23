import Link from "next/link";
import { redirect } from "next/navigation";
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
import { Reveal, Stagger, StaggerItem } from "@/components/design/motion-primitives";
import { UploadCard } from "@/components/upload/upload-card";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import { createClient } from "@/lib/supabase/server";
import { loadOverview, type CourseSummary } from "@/lib/study/overview";

function Tile({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="space-y-0.5 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </Card>
  );
}

/** The last seven days as tiny bars, so a streak is something you can see. */
function WeekBars({ days }: { days: { date: string; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div
      className="flex h-6 items-end gap-1 pt-1"
      role="img"
      aria-label="Activity over the last 7 days"
    >
      {days.map((d) => (
        <span
          key={d.date}
          title={`${d.date}: ${d.count}`}
          className={d.count ? "flex-1 rounded-sm bg-foreground/70" : "flex-1 rounded-sm bg-muted"}
          style={{ height: `${d.count ? 25 + (d.count / max) * 75 : 14}%` }}
        />
      ))}
    </div>
  );
}

function greeting(name: string | null | undefined): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
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

      {c.next ? (
        <Link
          href={`/learn/${c.next.topicId}`}
          className="flex items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium"
        >
          <span className="min-w-0 truncate">Continue: {c.next.topicName}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      ) : (
        <Link
          href={`/course/${c.id}/quizzes`}
          className="flex items-center justify-between gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-medium"
        >
          Take the diagnostic quiz
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      )}

      <ul className="grid grid-cols-2 gap-1.5">
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [o, { data: profile }] = await Promise.all([
    loadOverview(supabase),
    user
      ? supabase
          .from("profiles")
          .select("display_name,onboarded_at")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  // First visit after sign-up: the animated welcome comes first.
  if (user && profile && !profile.onboarded_at) redirect("/welcome");
  const next = o.courses.find((c) => c.next);
  const first = profile?.display_name?.split(/\s+/)[0];

  return (
    <div className="dashboard-canvas min-h-screen">
      <SiteHeader />
      <main className="relative mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-6">
          <Reveal className="dashboard-heading relative overflow-hidden rounded-3xl border bg-card/70 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="dashboard-heading__glow" aria-hidden="true" />
            <div className="relative">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Your learning space
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">{greeting(first)}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {o.courses.length === 0
                  ? "Let's build your first course."
                  : "Pick up where you left off, or start something new."}
              </p>
            </div>
          </Reveal>

          {o.courses.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Courses" value={String(o.courses.length)} />
              <Tile
                label="Day streak"
                value={String(o.streak.current)}
                hint={o.streak.current > 0 ? "Keep it going" : "Study today to start one"}
              >
                <WeekBars days={o.activity.slice(-7)} />
              </Tile>
              <Tile
                label="Avg quiz score"
                value={o.totals.avgScore === null ? "–" : `${o.totals.avgScore}%`}
              />
              <Tile label="Exercises passed" value={String(o.totals.exercisesPassed)} />
            </div>
          )}

          {next?.next && (
            <Card className="flex flex-col gap-4 border-primary/20 bg-accent sm:flex-row sm:items-center">
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
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground"
              >
                Start <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
          )}

          {o.courses.length === 0 ? (
            <Card className="empty-course-state surface-sheen space-y-5 border-dashed px-6 py-10 shadow-none">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-medium">No courses yet</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Add a chapter and LearnMate will build your first course.
                </p>
              </div>
              <ol className="mx-auto grid max-w-md gap-2 text-sm">
                {[
                  "Upload a PDF or paste your notes",
                  "Take a short quiz to find your weak spots",
                  "Learn from animated lessons and practise in the editor",
                ].map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Your courses</h2>
              <Stagger className="grid gap-4 sm:grid-cols-2" role="list">
                {o.courses.map((c) => (
                  <StaggerItem key={c.id} role="listitem">
                    <CourseCard c={c} />
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          )}
        </section>
        <Reveal delay={0.1} className="dashboard-upload-shell h-fit lg:sticky lg:top-24">
          <div className="dashboard-upload-shell__glow" aria-hidden="true" />
          <div className="relative">
            <UploadCard />
          </div>
        </Reveal>
      </main>
    </div>
  );
}
