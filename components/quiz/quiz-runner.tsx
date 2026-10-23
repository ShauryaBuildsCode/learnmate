"use client";

import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { PageChip } from "@/components/source/source-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProviderBadge } from "@/components/ui/provider-badge";
import type { QuestionResult } from "@/lib/quiz/score";

interface PublicQuestion {
  id: string;
  topicId: string;
  question: string;
  options: string[];
  page: number;
}

type Phase =
  | { name: "idle" }
  | { name: "generating" }
  | { name: "answering"; attemptId: string; questions: PublicQuestion[] }
  | { name: "submitting" }
  | { name: "planning" }
  | { name: "done"; results: QuestionResult[]; questions: PublicQuestion[]; planVersion: number | null }
  | { name: "error"; message: string; retry: "start" | "finish" };

interface Props {
  courseId: string;
  kind: "diagnostic" | "practice";
  uiLang: "en" | "hi";
  topicNames: Record<string, string>;
  /** Called after a quiz is scored and the plan is rebuilt, so the page can refresh. */
  onFinished: () => void;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export function QuizRunner({ courseId, kind, uiLang, topicNames, onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | "loading" | null>(null);

  async function start() {
    setPhase({ name: "generating" });
    setIndex(0);
    setAnswers([]);
    setFeedback(null);
    try {
      const data = await post<{ attemptId: string; questions: PublicQuestion[] }>("/api/quiz", { courseId, kind, uiLang });
      setPhase({ name: "answering", attemptId: data.attemptId, questions: data.questions });
    } catch (e) {
      setPhase({ name: "error", message: e instanceof Error ? e.message : "Couldn't build the quiz.", retry: "start" });
    }
  }

  async function choose(attemptId: string, q: PublicQuestion, selected: number) {
    if (feedback) return;
    setAnswers((a) => [...a.slice(0, index), selected]);
    setFeedback("loading");
    try {
      const data = await post<{ text: string; correct: boolean }>("/api/assist", {
        kind: "quiz_feedback",
        attemptId,
        questionId: q.id,
        selectedIndex: selected,
      });
      setFeedback({ text: data.text, correct: data.correct });
    } catch {
      setFeedback({ text: "Answer saved. Ask Guru if you'd like more.", correct: false });
    }
  }

  async function finish(attemptId: string, questions: PublicQuestion[], final: number[]) {
    setPhase({ name: "submitting" });
    try {
      const scored = await post<{ results: QuestionResult[] }>("/api/quiz/submit", { attemptId, answers: final });
      setPhase({ name: "planning" });
      const plan = await post<{ plan: { version: number } }>("/api/plan", { courseId, basedOn: `quiz:${attemptId}`, uiLang });
      setPhase({ name: "done", results: scored.results, questions, planVersion: plan.plan.version });
      onFinished();
    } catch (e) {
      setPhase({ name: "error", message: e instanceof Error ? e.message : "Couldn't finish the quiz.", retry: "finish" });
    }
  }

  if (phase.name === "idle") {
    return (
      <Button onClick={start}>{kind === "diagnostic" ? "Start diagnostic quiz" : "Practice weak topics"}</Button>
    );
  }
  if (phase.name === "generating") {
    return (
      <Card className="flex items-center gap-3 text-sm" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Gemini is writing questions from your pages and checking every quote…</span>
        <ProviderBadge provider="gemini" />
      </Card>
    );
  }
  if (phase.name === "error") {
    return (
      <Card role="alert" className="space-y-3 border-danger/40 text-sm">
        <p>{phase.message}</p>
        <Button size="sm" onClick={phase.retry === "start" ? start : () => setPhase({ name: "idle" })}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      </Card>
    );
  }
  if (phase.name === "submitting" || phase.name === "planning") {
    return (
      <Card className="flex items-center gap-3 text-sm" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin" />
        {phase.name === "submitting" ? "Scoring your answers…" : "Building your revision plan…"}
      </Card>
    );
  }
  if (phase.name === "done") {
    const correct = phase.results.filter((r) => r.correct).length;
    return (
      <Card className="space-y-4">
        <div>
          <h3 className="font-semibold">
            You got {correct} of {phase.results.length}
          </h3>
          {phase.planVersion !== null && (
            <p className="text-sm text-muted-foreground">Your revision plan is now version {phase.planVersion}.</p>
          )}
        </div>
        <ul className="space-y-3">
          {phase.results.map((r, i) => {
            const q = phase.questions[i];
            return (
              <li key={r.questionId} className="space-y-1 text-sm">
                <div className="flex items-start gap-2">
                  {r.correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}
                  <div>
                    <p className="font-medium">{q.question}</p>
                    <p className="text-muted-foreground">
                      {topicNames[q.topicId]} · {r.explanation} <PageChip page={r.page} />
                    </p>
                    {!r.correct && <p>Correct answer: {q.options[r.correctIndex]}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Button variant="outline" size="sm" onClick={() => setPhase({ name: "idle" })}>
          Close
        </Button>
      </Card>
    );
  }

  const { attemptId, questions } = phase;
  const q = questions[index];
  const last = index === questions.length - 1;
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Question {index + 1} of {questions.length} · {topicNames[q.topicId]}
        </span>
        <PageChip page={q.page} />
      </div>
      <h3 className="font-medium">{q.question}</h3>
      <div className="space-y-2" role="radiogroup" aria-label="Answers">
        {q.options.map((option, i) => (
          <button
            key={i}
            role="radio"
            aria-checked={answers[index] === i}
            disabled={feedback !== null}
            onClick={() => choose(attemptId, q, i)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              answers[index] === i ? "border-primary bg-accent" : "hover:bg-muted"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {feedback === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking…
        </p>
      )}
      {feedback && feedback !== "loading" && (
        <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
          <ProviderBadge provider="groq" />
          <p>{feedback.text}</p>
          <Button
            size="sm"
            onClick={() => {
              const final = answers;
              setFeedback(null);
              if (last) void finish(attemptId, questions, final);
              else setIndex(index + 1);
            }}
          >
            {last ? "Finish quiz" : "Next question"}
          </Button>
        </div>
      )}
    </Card>
  );
}
