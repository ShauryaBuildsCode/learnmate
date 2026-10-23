import { Award, Flame, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import { Avatar } from "@/components/ui/user-menu";
import { createClient } from "@/lib/supabase/server";
import { computeBadges } from "@/lib/study/badges";
import { loadOverview } from "@/lib/study/overview";
import { cn } from "@/lib/utils";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");
  const [{ data: profile }, o] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,goal,level,interests,daily_minutes")
      .eq("id", user.id)
      .maybeSingle(),
    loadOverview(supabase),
  ]);
  const name = profile?.display_name || user.email?.split("@")[0] || "You";
  const badges = computeBadges({
    courses: o.courses.length,
    quizzes: o.totals.quizzes,
    perfectQuiz: o.totals.perfectQuiz,
    exercisesPassed: o.totals.exercisesPassed,
    tutorQuestions: o.totals.tutorQuestions,
    currentStreak: o.streak.current,
    longestStreak: o.streak.longest,
    studySteps: o.totals.studySteps,
    strongTopics: o.totals.strongTopics,
  });
  const earned = badges.filter((b) => b.earned).length;
  const since = new Date(user.created_at).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6">
        <section className="flex flex-wrap items-center gap-4">
          <Avatar name={name} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {user.email} · learning since {since}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5">
            <Flame className="h-5 w-5" aria-hidden="true" />
            <div className="leading-tight">
              <p className="text-lg font-semibold">{o.streak.current}</p>
              <p className="text-[11px] text-muted-foreground">day streak</p>
            </div>
          </div>
        </section>

        <section aria-label="Stats" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Courses", o.courses.length],
            ["Quizzes", o.totals.quizzes],
            ["Practice passed", o.totals.exercisesPassed],
            ["Best streak", o.streak.longest],
          ].map(([label, value]) => (
            <Card key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
            </Card>
          ))}
        </section>

        <section className="space-y-3" aria-label="Milestones">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Award className="h-5 w-5" aria-hidden="true" /> Milestones
            <span className="text-sm font-normal text-muted-foreground">
              {earned} of {badges.length}
            </span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {badges.map((b) => (
              <li key={b.id}>
                <Card
                  className={cn(
                    "flex h-full flex-col gap-1 p-4",
                    !b.earned && "border-dashed bg-transparent shadow-none",
                  )}
                >
                  <span
                    className={cn(
                      "mb-1 flex h-9 w-9 items-center justify-center rounded-full",
                      b.earned
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {b.earned ? (
                      <Award className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.description}</p>
                  {!b.earned && b.progress && (
                    <p className="mt-auto pt-2 text-xs font-medium text-muted-foreground">
                      {b.progress}
                    </p>
                  )}
                  <span className="sr-only">{b.earned ? "Earned" : "Locked"}</span>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3" aria-label="About you">
          <h2 className="text-lg font-semibold">About you</h2>
          <p className="text-sm text-muted-foreground">
            LearnMate uses this to pitch lessons, notes and Guru&apos;s help at the right level.
          </p>
          <ProfileForm
            userId={user.id}
            initial={{
              name: profile?.display_name ?? "",
              goal: profile?.goal ?? null,
              level: profile?.level ?? null,
              interests: profile?.interests ?? "",
              dailyMinutes: profile?.daily_minutes ?? null,
            }}
          />
        </section>
      </main>
    </>
  );
}
