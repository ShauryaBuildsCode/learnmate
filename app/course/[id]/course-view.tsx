"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { PlanView, LevelChip } from "@/components/plan/plan-view";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { PageChip } from "@/components/source/source-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TopicMastery } from "@/lib/mastery";
import type { StoredPlan } from "@/lib/plan/build";

interface Props {
  course: { id: string; title: string; subject: string; page_count: number };
  topics: {
    id: string;
    name: string;
    summary: string;
    pages: number[];
    exercises: { id: string; prompt: string; page: number; passed: boolean }[];
    mastery: TopicMastery | null;
  }[];
  plan: StoredPlan | null;
  hasDiagnostic: boolean;
  uiLang: "en" | "hi";
}

export function CourseView({ course, topics, plan, hasDiagnostic, uiLang }: Props) {
  const router = useRouter();
  const names = Object.fromEntries(topics.map((t) => [t.id, t.name]));
  const refresh = () => router.refresh();

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-label="Quiz">
        <h2 className="text-lg font-semibold">
          {hasDiagnostic ? "Practice" : "Find out what to study first"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasDiagnostic
            ? "New questions on your weakest topics, never repeating earlier ones."
            : "A short diagnostic quiz covers every topic. Your answers decide what goes first in your revision plan."}
        </p>
        <QuizRunner
          courseId={course.id}
          kind={hasDiagnostic ? "practice" : "diagnostic"}
          uiLang={uiLang}
          topicNames={names}
          onFinished={refresh}
        />
      </section>

      {plan && <PlanView plan={plan} uiLang={uiLang} />}

      <section className="space-y-3" aria-label="Topic map">
        <h2 className="text-lg font-semibold">Topic map</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map((t, i) => (
            <Card key={t.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{i + 1}.</span>
                <h3 className="font-medium">{t.name}</h3>
                {t.mastery && <LevelChip level={t.mastery.level} score={t.mastery.score} />}
              </div>
              <p className="text-sm text-muted-foreground">{t.summary}</p>
              <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                Pages:{" "}
                {t.pages.map((p) => (
                  <PageChip key={p} page={p} />
                ))}
              </p>
              {t.exercises.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {t.exercises.map((e) => (
                    <li key={e.id} className="flex items-start gap-1.5">
                      {e.passed ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span>
                        {e.prompt} <PageChip page={e.page} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/learn/${t.id}`}>
                <Button size="sm" variant="outline">
                  Open lesson
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
