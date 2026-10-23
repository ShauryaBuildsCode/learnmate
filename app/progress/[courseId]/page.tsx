import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MasteryChart, type MasteryPoint } from "@/components/progress/mastery-chart";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import { LevelChip } from "@/components/plan/plan-view";
import { loadCourseSnapshot } from "@/lib/course-data";
import { parsePlanRow } from "@/lib/plan/build";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage({ params }: PageProps<"/progress/[courseId]">) {
  const { courseId } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id,title")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) notFound();

  const [snapshot, { data: planRows }] = await Promise.all([
    loadCourseSnapshot(supabase, courseId),
    supabase.from("plans").select("*").eq("course_id", courseId).order("version"),
  ]);
  const plans = (planRows ?? []).flatMap((r) => {
    const p = parsePlanRow(r);
    return p ? [p] : [];
  });
  const names = Object.fromEntries(snapshot.topics.map((t) => [t.id, t.name]));
  const data: MasteryPoint[] = plans.map((p) => ({
    label: `v${p.version}`,
    ...Object.fromEntries(
      Object.values(p.mastery).map((m) => [
        names[m.topicId] ?? m.topicId,
        Math.round(m.score * 100),
      ]),
    ),
  }));
  const runCount = snapshot.exercises.length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 p-6">
        <div>
          <Link
            href={`/course/${courseId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> {course.title}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Your progress</h1>
        </div>

        {plans.length === 0 ? (
          <Card className="text-sm text-muted-foreground">
            Take the diagnostic quiz to start tracking your progress.
          </Card>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Mastery by topic</h2>
              <Card>
                <MasteryChart data={data} topics={snapshot.topics.map((t) => t.name)} />
              </Card>
              <p className="text-xs text-muted-foreground">
                Mastery is 50% your latest quiz accuracy and 50% the share of the topic&apos;s
                exercises you have passed ({snapshot.passedExerciseIds.size} of {runCount} exercises
                passed so far).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Plan history</h2>
              <ol className="space-y-3">
                {[...plans].reverse().map((p) => (
                  <li key={p.id}>
                    <Card className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          v{p.version}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {p.changeSummary && <p className="text-sm">{p.changeSummary}</p>}
                      <div className="flex flex-wrap gap-2">
                        {p.items.map((i) => (
                          <span key={i.topicId} className="flex items-center gap-1 text-xs">
                            {i.topicName} <LevelChip level={i.level} />
                          </span>
                        ))}
                      </div>
                    </Card>
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Quiz attempts</h2>
              <Card className="divide-y p-0">
                {snapshot.attempts.map((a) => {
                  const correct = Object.values(a.perTopic).reduce((n, t) => n + t.correct, 0);
                  const total = Object.values(a.perTopic).reduce((n, t) => n + t.total, 0);
                  return (
                    <div key={a.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="capitalize">{a.kind}</span>
                      <span className="text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                      <span className="font-medium">
                        {correct}/{total}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </section>
          </>
        )}
      </main>
    </>
  );
}
