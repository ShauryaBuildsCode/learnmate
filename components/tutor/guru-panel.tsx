"use client";

import { AlertTriangle, Bot, Lightbulb, Loader2, Pencil, ScanSearch } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageChip } from "@/components/source/source-context";
import { Button } from "@/components/ui/button";
import { ProviderBadge } from "@/components/ui/provider-badge";
import { BEYOND_PREFIX } from "@/lib/grounding";
import type { Diagnostic } from "@/lib/schemas/diagnostic";
import type { CodeEdit } from "@/lib/ide/edits";
import { diagnosticSchema } from "@/lib/schemas/diagnostic";
import type { TutorContext, TutorFrame } from "@/lib/schemas/tutor";
import { createClient } from "@/lib/supabase/browser";
import { streamGuru } from "@/lib/tutor/client";
import {
  GuruPanelFrame,
  type GuruMessage as FrameMessage,
} from "@/components/design/guru-panel-frame";
import { MessageText } from "./message-text";

type Looked = Extract<TutorFrame, { t: "final" }>["looked"];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  provider?: "claude" | "groq";
  note?: string;
  beyond?: boolean;
  looked?: Looked;
  streaming?: boolean;
  error?: boolean;
  /** How many code changes Guru made with this reply. */
  edits?: number;
}

export interface GuruSignals {
  failedChecks: number;
  hasError: boolean;
  codeVersion: number;
  allPassed: boolean;
}

interface Props {
  courseId: string;
  uiLang: "en" | "hi";
  getContext: () => TutorContext;
  exercise: { id: string; prompt: string } | null;
  signals: GuruSignals;
  /** Increments each time the student presses "Ask Guru" in the IDE. */
  askRequest: number;
  onDiagnostics: (diagnostics: Diagnostic[]) => void;
  /** Guru edited the code; the editor applies the change straight away and offers Undo. */
  onEdits: (edits: CodeEdit[]) => void;
}

const MAX_RUNG = 3;
const STUCK_MS = 60_000;
const uid = () => crypto.randomUUID();

function LookedAt({ looked }: { looked: Looked }) {
  const nothing =
    !looked.pages.length &&
    !looked.hadCode &&
    !looked.hadRunOutput &&
    !looked.tests &&
    !looked.scene;
  if (nothing) return null;
  return (
    <details className="mt-2 text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none">What Guru looked at</summary>
      <ul className="mt-1 space-y-0.5 pl-4">
        {looked.scene && <li>Lesson scene {looked.scene}</li>}
        {looked.pages.length > 0 && (
          <li className="flex flex-wrap items-center gap-1">
            Pages:{" "}
            {looked.pages.map((p) => (
              <PageChip key={p} page={p} />
            ))}
          </li>
        )}
        {looked.hadCode && <li>Your current code</li>}
        {looked.hadRunOutput && <li>Your last run output</li>}
        {looked.tests && (
          <li>
            Test results ({looked.tests.passed}/{looked.tests.total} passing)
          </li>
        )}
      </ul>
    </details>
  );
}

/** Maps a chat message to the frame's bubble: the provider badge and banner above, the reply inside, sources below. */
function toFrameMessage(m: ChatMessage): FrameMessage {
  if (m.role === "user") return { id: m.id, role: "user", text: m.text };
  return {
    id: m.id,
    role: "guru",
    tone: m.error ? "error" : "default",
    before: (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          {m.provider && <ProviderBadge provider={m.provider} />}
          {m.note && <span className="text-[11px] text-warning">{m.note}</span>}
        </div>
        {m.beyond && (
          <div
            role="note"
            className="flex items-center gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-medium text-warning"
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Beyond your uploaded material
          </div>
        )}
      </div>
    ),
    text: (
      <>
        {m.text ? (
          <MessageText text={m.text} />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {m.streaming && m.text && (
          <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-foreground align-middle" />
        )}
      </>
    ),
    meta: (
      <>
        {m.edits ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Pencil className="h-3.5 w-3.5" /> Guru proposed {m.edits} change
            {m.edits > 1 ? "s" : ""}: review it in the editor
          </div>
        ) : null}
        {m.looked && !m.streaming ? <LookedAt looked={m.looked} /> : null}
      </>
    ),
  };
}

export function GuruPanel({
  courseId,
  uiLang,
  getContext,
  exercise,
  signals,
  askRequest,
  onDiagnostics,
  onEdits,
}: Props) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [rungs, setRungs] = useState<Record<string, number>>({});
  const [nudgeState, setNudge] = useState<{
    exerciseId: string;
    text: string;
    streaming: boolean;
  } | null>(null);
  const [reviewState, setReviewNote] = useState<{ exerciseId: string | null; text: string } | null>(
    null,
  );
  const [seenAsk, setSeenAsk] = useState(0);
  const dismissedFor = useRef<string | null>(null);
  const scroller = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exerciseId = exercise?.id ?? null;
  const rung = exerciseId ? (rungs[exerciseId] ?? 0) : 0;
  const nudge = nudgeState && nudgeState.exerciseId === exerciseId ? nudgeState : null;
  const reviewNote = reviewState && reviewState.exerciseId === exerciseId ? reviewState.text : null;
  const setRung = useCallback(
    (value: number) => exerciseId && setRungs((prev) => ({ ...prev, [exerciseId]: value })),
    [exerciseId],
  );

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, nudge]);

  // Load how far up the hint ladder this student already is for this exercise.
  useEffect(() => {
    if (!exerciseId) return;
    createClient()
      .from("hint_state")
      .select("rung")
      .eq("exercise_id", exerciseId)
      .maybeSingle()
      .then(({ data }) => setRungs((prev) => ({ ...prev, [exerciseId]: data?.rung ?? 0 })));
  }, [exerciseId]);

  /** Streams one Guru call into a new assistant bubble. */
  const run = useCallback(
    async (url: string, body: Record<string, unknown>, userText: string | null) => {
      const id = uid();
      setBusy(true);
      setMessages((prev) => [
        ...prev,
        ...(userText ? [{ id: uid(), role: "user" as const, text: userText }] : []),
        { id, role: "assistant", text: "", provider: "claude", streaming: true },
      ]);
      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
      try {
        await streamGuru(url, body, (frame) => {
          if (frame.t === "meta") {
            patch((m) => ({
              ...m,
              provider: frame.provider,
              note: frame.note,
              text: frame.reset ? "" : m.text,
            }));
          } else if (frame.t === "delta") {
            patch((m) => ({ ...m, text: m.text + frame.text }));
          } else if (frame.t === "edit") {
            patch((m) => ({ ...m, edits: frame.edits.length }));
            onEdits(frame.edits);
          } else if (frame.t === "final") {
            const text = frame.text.startsWith(BEYOND_PREFIX)
              ? frame.text.slice(BEYOND_PREFIX.length).trim()
              : frame.text;
            patch((m) => ({
              ...m,
              text,
              beyond: frame.beyond,
              looked: frame.looked,
              streaming: false,
            }));
            if (frame.rung !== undefined) setRung(frame.rung);
          } else {
            patch((m) => ({ ...m, text: frame.message, error: true, streaming: false }));
          }
        });
      } catch {
        patch((m) => ({
          ...m,
          text: "Couldn't reach Guru. Check your connection and try again.",
          error: true,
          streaming: false,
        }));
      } finally {
        patch((m) => ({ ...m, streaming: false }));
        setBusy(false);
      }
    },
    [setRung, onEdits],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setInput("");
      const history = messages
        .filter((m) => !m.streaming && !m.error && m.text)
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.role === "assistant" && m.beyond ? `${BEYOND_PREFIX} ${m.text}` : m.text,
        }));
      void run(
        "/api/tutor",
        { courseId, message: trimmed, history, context: getContext(), uiLang },
        trimmed,
      );
    },
    [busy, messages, run, courseId, getContext, uiLang],
  );

  const askHint = useCallback(
    (reveal: boolean) => {
      if (!exerciseId || busy) return;
      setNudge(null);
      void run(
        "/api/tutor/hint",
        { courseId, exerciseId, context: getContext(), uiLang, reveal, kind: "hint" },
        reveal
          ? "Show me the full solution"
          : `Hint please (${Math.min(rung + 1, MAX_RUNG)}/${MAX_RUNG})`,
      );
    },
    [exerciseId, busy, run, courseId, getContext, uiLang, rung],
  );

  const review = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setReviewNote({ exerciseId, text: "Guru is reading your code…" });
    try {
      const response = await fetch("/api/tutor/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId, context: getContext(), uiLang }),
      });
      const data = (await response.json()) as { diagnostics?: unknown; error?: string };
      if (!response.ok) throw new Error(data.error);
      const list = diagnosticSchema.array().safeParse(data.diagnostics);
      const diagnostics = list.success ? list.data : [];
      onDiagnostics(diagnostics);
      setReviewNote({
        exerciseId,
        text: diagnostics.length
          ? `Guru marked ${diagnostics.length} line${diagnostics.length > 1 ? "s" : ""} in your editor. Hover to read.`
          : "Guru found nothing to flag. Nice.",
      });
    } catch (e) {
      setReviewNote({
        exerciseId,
        text:
          e instanceof Error && e.message ? e.message : "Guru couldn't review your code right now.",
      });
    } finally {
      setBusy(false);
    }
  }, [busy, courseId, getContext, uiLang, onDiagnostics, exerciseId]);

  // Proactive nudge: after 2 failed Checks, or 60s stuck on an error. Dismissible, never forced.
  const triggerNudge = useCallback(() => {
    if (!exerciseId || nudge || dismissedFor.current === `${exerciseId}:${signals.failedChecks}`)
      return;
    setNudge({ exerciseId, text: "", streaming: true });
    void streamGuru(
      "/api/tutor/hint",
      { courseId, exerciseId, context: getContext(), uiLang, kind: "nudge" },
      (frame) => {
        if (frame.t === "delta") setNudge((n) => (n ? { ...n, text: n.text + frame.text } : n));
        else if (frame.t === "final") setNudge({ exerciseId, text: frame.text, streaming: false });
        else if (frame.t === "error")
          setNudge({ exerciseId, text: "Stuck? I can give you a hint.", streaming: false });
      },
    );
  }, [exerciseId, nudge, signals.failedChecks, courseId, getContext, uiLang]);

  useEffect(() => {
    if (signals.failedChecks >= 2) triggerNudge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals.failedChecks]);

  useEffect(() => {
    if (!signals.hasError || !exerciseId) return;
    const timer = setTimeout(triggerNudge, STUCK_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals.hasError, signals.codeVersion, exerciseId]);

  // Understanding check: one prediction question right after every test passes.
  const wasPassed = useRef(false);
  useEffect(() => {
    if (signals.allPassed && !wasPassed.current && exerciseId) {
      setNudge(null);
      void run(
        "/api/tutor/hint",
        { courseId, exerciseId, context: getContext(), uiLang, kind: "understanding" },
        null,
      );
    }
    wasPassed.current = signals.allPassed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals.allPassed]);

  // "Ask Guru" in the IDE opens the panel with the student's code attached.
  if (askRequest !== seenAsk) {
    setSeenAsk(askRequest);
    setOpen(true);
    setInput("Can you look at my code and tell me what to try next?");
  }
  useEffect(() => {
    if (askRequest > 0) inputRef.current?.focus();
  }, [askRequest]);

  if (!open) {
    return (
      <button
        aria-label="Open Guru"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  const ladderDone = rung >= MAX_RUNG;
  return (
    <GuruPanelFrame
      className="fixed bottom-4 right-4 z-40 h-[34rem] max-h-[calc(100vh-2rem)] w-96 max-w-[calc(100vw-2rem)] shadow-2xl"
      tagline="Your tutor. Sees your code, cites your pages."
      messages={messages.map(toFrameMessage)}
      listRef={scroller}
      inputRef={inputRef}
      value={input}
      onChange={setInput}
      onSend={() => send(input)}
      onClose={() => setOpen(false)}
      sendDisabled={busy || !input.trim()}
      placeholder="Ask Guru…"
      emptyState={
        <p className="text-sm text-muted-foreground">
          Ask me anything about this lesson, or press Hint when you get stuck. I will ask questions
          before I give answers.
        </p>
      }
      trailing={
        nudge ? (
          <div className="rounded-xl border border-primary/30 bg-accent p-3 text-sm">
            {nudge.text ? (
              <MessageText text={nudge.text} />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {!nudge.streaming && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => askHint(false)}>
                  Want a hint?
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dismissedFor.current = `${exerciseId}:${signals.failedChecks}`;
                    setNudge(null);
                  }}
                >
                  Not now
                </Button>
              </div>
            )}
          </div>
        ) : undefined
      }
      aboveComposer={
        exercise ? (
          <div className="space-y-1 border-t px-3 py-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => askHint(ladderDone)}
                title="Rung 1: a question. Rung 2: the concept and page. Rung 3: a partial fix."
              >
                <Lightbulb className="h-3.5 w-3.5" />
                {ladderDone ? "Show full solution" : `Hint ${rung + 1}/${MAX_RUNG}`}
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={review}>
                <ScanSearch className="h-3.5 w-3.5" /> Review my code
              </Button>
            </div>
            {reviewNote && <p className="text-[11px] text-muted-foreground">{reviewNote}</p>}
          </div>
        ) : undefined
      }
    />
  );
}
