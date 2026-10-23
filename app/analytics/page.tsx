import Link from "next/link";
import { Flame, Target } from "lucide-react";
import { ActivityChart, MasteryTrend, ScoreChart } from "@/components/analytics/charts";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import { createClient } from "@/lib/supabase/server";
import { loadOverview } from "@/lib/study/overview";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="space-y-1 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const o = await loadOverview(supabase);
  const empty = o.courses.length === 0;
  // Merge plan snapshots that happened on the same date label into rows the chart can draw per course.
  const trend = o.masteryTrend.map((p) => ({ ...p }));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            How you are studying and where you are strong, across all your courses.
          </p>
        </div>

        {empty ? (
          <Card className="space-y-2 text-sm">
            <p className="font-medium">Nothing to show yet</p>
            <p className="text-muted-foreground">
              Add a course and take a quiz. Your streak, scores and weak spots will appear here.
            </p>
            <Link href="/dashboard" className="font-medium underline underline-offset-2">
              Go to the dashboard
            </Link>
          </Card>
        ) : (
          <>
            <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Current streak"
                value={`${o.streak.current} day${o.streak.current === 1 ? "" : "s"}`}
                hint={`Best: ${o.streak.longest}`}
              />
              <Stat label="Active days (30d)" value={o.activeDays} />
              <Stat
                label="Average quiz score"
                value={o.totals.avgScore === null ? "–" : `${o.totals.avgScore}%`}
                hint={`${o.totals.quizzes} quiz${o.totals.quizzes === 1 ? "" : "zes"} taken`}
              />
              <Stat
                label="Exercises passed"
                value={o.totals.exercisesPassed}
                hint={`${o.totals.tutorQuestions} questions to Guru`}
              />
            </section>

            <section className="space-y-3" aria-label="Activity">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Flame className="h-5 w-5" aria-hidden="true" /> Study activity
              </h2>
              <Card>
                <ActivityChart data={o.activity} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Counts quizzes, exercise runs, lessons and notes opened, and questions to Guru.
                </p>
              </Card>
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
              <section className="space-y-3" aria-label="Quiz scores">
                <h2 className="text-lg font-semibold">Quiz scores</h2>
                <Card>
                  {o.scores.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Take a quiz to see your scores here.
                    </p>
                  ) : (
                    <ScoreChart
                      data={o.scores.map((s) => ({
                        label: new Date(s.at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        }),
                        pct: s.pct,
                        kind: s.kind,
                      }))}
                    />
                  )}
                </Card>
              </section>

              <section className="space-y-3" aria-label="Mastery over time">
                <h2 className="text-lg font-semibold">Mastery over time</h2>
                <Card>
                  {trend.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Your revision plan records mastery after each quiz. Take one to start the
                      line.
                    </p>
                  ) : (
                    <MasteryTrend data={trend} courses={o.masteryCourses} />
                  )}
                </Card>
              </section>
            </div>

            <section className="space-y-3" aria-label="Weak areas">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Target className="h-5 w-5" aria-hidden="true" /> Where to focus
              </h2>
              {o.weakTopics.filter((t) => t.pct < 80).length === 0 ? (
                <Card className="text-sm text-muted-foreground">
                  {o.weakTopics.length === 0
                    ? "Quiz results by topic will show the topics you miss most."
                    : "Every topic you have been quizzed on is at 80% or better. Nice work."}
                </Card>
              ) : (
                <Card className="divide-y p-0">
                  {o.weakTopics
                    .filter((t) => t.pct < 80)
                    .map((t) => (
                      <Link
                        key={t.topicId}
                        href={`/learn/${t.topicId}`}
                        className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{t.topic}</p>
                          <p className="truncate text-xs text-muted-foreground">{t.course}</p>
                        </div>
                        <div
                          className="hidden h-2 w-32 overflow-hidden rounded-full bg-muted sm:block"
                          role="img"
                          aria-label={`${t.pct} percent correct`}
                        >
                          <div
                            className="h-full rounded-full bg-foreground/70"
                            style={{ width: `${t.pct}%` }}
                          />
                        </div>
                        <span className="w-20 text-right text-xs text-muted-foreground">
                          {t.pct}% of {t.total}
                        </span>
                      </Link>
                    ))}
                </Card>
              )}
            </section>

            <section className="space-y-3" aria-label="Courses">
              <h2 className="text-lg font-semibold">By course</h2>
              <Card className="divide-y p-0">
                {o.courses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/progress/${c.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-accent sm:grid-cols-[1fr_90px_110px_90px]"
                  >
                    <span className="truncate font-medium">{c.title}</span>
                    <span className="text-muted-foreground">
                      {c.mastery === null ? "No quiz yet" : `${c.mastery}% mastery`}
                    </span>
                    <span className="hidden text-muted-foreground sm:block">
                      {c.exercisesPassed}/{c.exerciseTotal} exercises
                    </span>
                    <span className="hidden text-muted-foreground sm:block">
                      {c.quizzes} quiz{c.quizzes === 1 ? "" : "zes"}
                    </span>
                  </Link>
                ))}
              </Card>
            </section>
          </>
        )}
      </main>
    </>
  );
}
