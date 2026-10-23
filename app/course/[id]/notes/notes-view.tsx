"use client";

import { Check, Loader2, Printer, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PageChip } from "@/components/source/source-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProviderBadge } from "@/components/ui/provider-badge";
import type { StoredNotes } from "@/lib/schemas/study";

interface Props {
  courseId: string;
  uiLang: "en" | "hi";
  topicNames: Record<string, string>;
  initial: StoredNotes | null;
  readTopicIds: string[];
}

async function call<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export function NotesView({ courseId, uiLang, topicNames, initial, readTopicIds }: Props) {
  const [notes, setNotes] = useState<StoredNotes | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [read, setRead] = useState(new Set(readTopicIds));
  const [shown, setShown] = useState<Set<string>>(new Set());

  async function generate(regenerate: boolean) {
    setBusy(true);
    setError(null);
    try {
      const out = await call<{ notes: StoredNotes }>("/api/notes", {
        courseId,
        uiLang,
        regenerate,
      });
      setNotes(out.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't write the notes.");
    } finally {
      setBusy(false);
    }
  }

  async function markRead(topicId: string) {
    setRead((prev) => new Set(prev).add(topicId));
    await call("/api/events", { courseId, topicId, kind: "notes" }).catch(() => undefined);
  }

  // Jump to a topic from the checklist (#topic-id).
  useEffect(() => {
    if (notes && window.location.hash)
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [notes]);

  if (!notes)
    return (
      <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="font-medium">Revision notes for the whole course</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            A short summary, key points, terms, common mistakes and self-check questions for every
            topic, each point linked to its page in your material.
          </p>
        </div>
        <Button onClick={() => generate(false)} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Writing your notes…" : "Write my notes"}
        </Button>
        {busy && <p className="text-xs text-muted-foreground">This can take about a minute.</p>}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </Card>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <h2 className="text-lg font-semibold">Revision notes</h2>
        <ProviderBadge provider={notes.directedBy === "groq" ? "groq" : "claude"} />
        <span className="text-xs text-muted-foreground">
          {read.size} of {notes.topics.length} topics read
        </span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button size="sm" variant="outline" onClick={() => generate(true)} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Rewrite
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {notes.topics.map((n) => (
        <Card key={n.topicId} id={n.topicId} className="space-y-4 scroll-mt-6 break-inside-avoid">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{topicNames[n.topicId] ?? "Topic"}</h3>
            {read.has(n.topicId) && (
              <span className="flex items-center gap-1 text-xs text-success">
                <Check className="h-3.5 w-3.5" /> Read
              </span>
            )}
          </div>
          <p className="rounded-lg bg-accent px-3 py-2 text-sm">{n.tldr}</p>

          <section aria-label="Key points">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Remember
            </h4>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {n.keyPoints.map((k, i) => (
                <li key={i}>
                  {k.text} <PageChip page={k.page} />
                </li>
              ))}
            </ul>
          </section>

          {n.terms.length > 0 && (
            <section aria-label="Terms">
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Terms
              </h4>
              <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
                {n.terms.map((t, i) => (
                  <div key={i} className="contents">
                    <dt className="font-medium">{t.term}</dt>
                    <dd className="text-muted-foreground">
                      {t.meaning} <PageChip page={t.page} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {n.example && (
            <section aria-label="Example">
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Example: {n.example.title}
              </h4>
              <pre className="whitespace-pre-wrap rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                {n.example.body}
              </pre>
            </section>
          )}

          {n.mistakes.length > 0 && (
            <section aria-label="Common mistakes">
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
                Watch out
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {n.mistakes.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Self check">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Test yourself
            </h4>
            <ul className="space-y-2 text-sm">
              {n.selfCheck.map((q, i) => {
                const key = `${n.topicId}:${i}`;
                const visible = shown.has(key);
                return (
                  <li key={key} className="space-y-1">
                    <p>{q.question}</p>
                    {visible ? (
                      <p className="rounded-md bg-success/10 px-2 py-1 text-success">{q.answer}</p>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-medium underline underline-offset-2 print:hidden"
                        onClick={() => setShown((prev) => new Set(prev).add(key))}
                      >
                        Show answer
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {!read.has(n.topicId) && (
            <Button
              size="sm"
              variant="outline"
              className="print:hidden"
              onClick={() => markRead(n.topicId)}
            >
              <Check className="h-4 w-4" /> Mark as read
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}
