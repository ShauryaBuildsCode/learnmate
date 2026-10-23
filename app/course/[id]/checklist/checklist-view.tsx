"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { progressOf, type ChecklistStep } from "@/lib/study/checklist";
import { cn } from "@/lib/utils";

interface Custom {
  id: string;
  label: string;
  done: boolean;
}
interface Props {
  courseId: string;
  steps: ChecklistStep[];
  topicNames: Record<string, string>;
  initialCustom: Custom[];
}

async function send(method: "POST" | "PATCH" | "DELETE", body: unknown) {
  const res = await fetch("/api/checklist", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; item?: Custom };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

function Box({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
        done ? "border-success bg-success text-background" : "border-muted-foreground/50",
      )}
    >
      {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}

export function ChecklistView({ courseId, steps, topicNames, initialCustom }: Props) {
  const [custom, setCustom] = useState(initialCustom);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const overall = progressOf([...steps, ...custom]);
  const topicIds = [...new Set(steps.map((s) => s.topicId))];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const text = label.trim();
    if (!text) return;
    setError(null);
    try {
      const { item } = await send("POST", { courseId, label: text });
      if (item) setCustom((prev) => [...prev, item]);
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that.");
    }
  }
  async function toggle(item: Custom) {
    setCustom((prev) => prev.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)));
    await send("PATCH", { id: item.id, done: !item.done }).catch(() =>
      setCustom((prev) => prev.map((c) => (c.id === item.id ? item : c))),
    );
  }
  async function remove(item: Custom) {
    setCustom((prev) => prev.filter((c) => c.id !== item.id));
    await send("DELETE", { id: item.id }).catch(() => setCustom((prev) => [...prev, item]));
  }

  return (
    <div className="space-y-8">
      <Card className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Your progress</h2>
          <span className="text-sm text-muted-foreground">
            {overall.done} of {overall.total} done
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={overall.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Checklist progress"
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${overall.pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Study steps tick themselves when you watch a lesson, pass an exercise, answer quiz
          questions or read the notes. Topics are ordered by your revision plan, weakest first.
        </p>
      </Card>

      <section className="space-y-3" aria-label="Study steps">
        <h2 className="text-lg font-semibold">Study steps</h2>
        {topicIds.map((id) => {
          const group = steps.filter((s) => s.topicId === id);
          const p = progressOf(group);
          return (
            <Card key={id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{topicNames[id]}</h3>
                <span className="text-xs text-muted-foreground">
                  {p.done}/{p.total}
                </span>
              </div>
              <ul className="space-y-1">
                {group.map((s) => (
                  <li key={s.key}>
                    <Link
                      href={s.href}
                      className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm hover:bg-accent"
                    >
                      <Box done={s.done} />
                      <span className={cn(s.done && "text-muted-foreground line-through")}>
                        {s.label}
                      </span>
                      <span className="sr-only">{s.done ? "(done)" : "(to do)"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </section>

      <section className="space-y-3" aria-label="Your own tasks">
        <h2 className="text-lg font-semibold">Your own tasks</h2>
        <Card className="space-y-3">
          <form onSubmit={add} className="flex gap-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={200}
              placeholder="e.g. Redo the loops exercise without hints"
              aria-label="New task"
              className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="sm" disabled={!label.trim()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {custom.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add anything you want to remember, like &quot;ask a teacher about recursion&quot;.
            </p>
          ) : (
            <ul className="space-y-1">
              {custom.map((c) => (
                <li key={c.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={c.done}
                    onClick={() => toggle(c)}
                    className="flex flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <Box done={c.done} />
                    <span className={cn(c.done && "text-muted-foreground line-through")}>
                      {c.label}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${c.label}`}
                    onClick={() => remove(c)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
