"use client";

import { CheckCircle2, ChevronDown, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LevelChip } from "@/components/plan/plan-view";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { PageChip } from "@/components/source/source-context";
import { Card } from "@/components/ui/card";
import type { MasteryLevel } from "@/lib/mastery";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  topicId: string;
  question: string;
  options: string[];
  correctIndex: number;
  chosen: number;
  explanation: string;
  page: number;
}
interface Attempt {
  id: string;
  kind: "diagnostic" | "practice";
  createdAt: string;
  perTopic: Record<string, { correct: number; total: number }>;
  review: Review[];
}
interface Props {
  courseId: string;
  uiLang: "en" | "hi";
  topics: { id: string; name: string }[];
  mastery: { topicId: string; score: number; level: MasteryLevel }[];
  attempts: Attempt[];
}

const totals = (a: Attempt) => {
  const v = Object.values(a.perTopic);
  return {
    correct: v.reduce((n, t) => n + t.correct, 0),
    total: v.reduce((n, t) => n + t.total, 0),
  };
};

export function QuizzesView({ courseId, uiLang, topics, mastery, attempts }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const names = Object.fromEntries(topics.map((t) => [t.id, t.name]));
  const hasDiagnostic = attempts.length > 0;
  const level = Object.fromEntries(mastery.map((m) => [m.topicId, m]));

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-label="Take a quiz">
        <h2 className="text-lg font-semibold">
          {hasDiagnostic ? "Practice quiz" : "Diagnostic quiz"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasDiagnostic
            ? "Fresh questions on your weakest topics. Every question quotes the page it comes from, and none repeat."
            : "A short quiz over every topic. Your answers decide what goes first in your revision plan."}
        </p>
        <QuizRunner
          courseId={courseId}
          kind={hasDiagnostic ? "practice" : "diagnostic"}
          uiLang={uiLang}
          topicNames={names}
          onFinished={() => router.refresh()}
        />
      </section>

      {hasDiagnostic && (
        <section className="space-y-3" aria-label="Accuracy by topic">
          <h2 className="text-lg font-semibold">Where you stand</h2>
          <Card className="divide-y p-0">
            {topics.map((t) => {
              const m = level[t.id];
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <div
                    className="hidden h-2 w-32 overflow-hidden rounded-full bg-muted sm:block"
                    role="img"
                    aria-label={`${Math.round((m?.score ?? 0) * 100)} percent mastery`}
                  >
                    <div
                      className="h-full rounded-full bg-foreground/70"
                      style={{ width: `${Math.round((m?.score ?? 0) * 100)}%` }}
                    />
                  </div>
                  {m && <LevelChip level={m.level} score={m.score} />}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      <section className="space-y-3" aria-label="Quiz history">
        <h2 className="text-lg font-semibold">History</h2>
        {attempts.length === 0 ? (
          <Card className="text-sm text-muted-foreground">
            No quizzes yet. Your results and a review of every question will show up here.
          </Card>
        ) : (
          <ul className="space-y-2">
            {attempts.map((a) => {
              const { correct, total } = totals(a);
              const isOpen = open === a.id;
              return (
                <li key={a.id}>
                  <Card className="p-0">
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : a.id)}
                    >
                      <span className="font-medium capitalize">{a.kind}</span>
                      <span className="text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                      <span className="ml-auto font-semibold">
                        {correct}/{total}
                      </span>
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <ol className="space-y-4 border-t px-4 py-4">
                        {a.review.map((q) => {
                          const right = q.chosen === q.correctIndex;
                          return (
                            <li key={q.id} className="space-y-1.5 text-sm">
                              <p className="flex items-start gap-2 font-medium">
                                {right ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                                ) : (
                                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                                )}
                                {q.question}
                              </p>
                              <p className="pl-6 text-muted-foreground">
                                {names[q.topicId] ?? "Topic"} ·{" "}
                                {q.chosen >= 0 ? (
                                  <>
                                    You said:{" "}
                                    <span className="text-foreground">{q.options[q.chosen]}</span>
                                  </>
                                ) : (
                                  "No answer"
                                )}
                              </p>
                              {!right && (
                                <p className="pl-6">
                                  Correct:{" "}
                                  <span className="font-medium">{q.options[q.correctIndex]}</span>
                                </p>
                              )}
                              <p className="pl-6 text-muted-foreground">
                                {q.explanation} <PageChip page={q.page} />
                              </p>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
