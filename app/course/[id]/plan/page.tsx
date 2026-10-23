import { notFound } from "next/navigation";
import Link from "next/link";
import { PlanView, LevelChip } from "@/components/plan/plan-view";
import { Card } from "@/components/ui/card";
import { parsePlanRow } from "@/lib/plan/build";
import { createClient } from "@/lib/supabase/server";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("plans").select("*").eq("course_id", id).order("version", { ascending: false }),
    supabase.from("profiles").select("ui_lang").eq("id", user.id).maybeSingle(),
  ]);
  const plans = (rows ?? []).flatMap((r) => {
    const p = parsePlanRow(r);
    return p ? [p] : [];
  });

  if (plans.length === 0)
    return (
      <Card className="space-y-3 text-sm">
        <p className="font-medium">No revision plan yet</p>
        <p className="text-muted-foreground">
          Your plan is built from a quiz: it puts the topics you know least first. Take the
          diagnostic quiz to get version 1.
        </p>
        <Link
          href={`/course/${id}/quizzes`}
          className="inline-block rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground"
        >
          Take the quiz
        </Link>
      </Card>
    );

  const [latest, ...older] = plans;
  return (
    <div className="space-y-8">
      <PlanView plan={latest} uiLang={profile?.ui_lang ?? "en"} />
      {older.length > 0 && (
        <section className="space-y-3" aria-label="Earlier plans">
          <h2 className="text-lg font-semibold">Earlier versions</h2>
          <ol className="space-y-3">
            {older.map((p) => (
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
                  <div className="flex flex-wrap gap-3">
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
      )}
    </div>
  );
}
