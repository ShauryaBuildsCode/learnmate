"use client";

import { Lightbulb, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProviderBadge } from "@/components/ui/provider-badge";
import type { Language } from "@/lib/schemas/exercise";

const IDLE_MS = 1500;

async function ask(body: Record<string, unknown>, signal: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch("/api/assist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) return null;
    return ((await res.json()) as { text?: string }).text ?? null;
  } catch {
    return null;
  }
}

/** Groq tip after 1.5 s of idle typing. Quiet on failure: a missing tip is never an error state. */
export function TipBar({
  language,
  code,
  exercise,
}: {
  language: Language;
  code: string;
  exercise: string | null;
}) {
  const [tip, setTip] = useState<{ forCode: string; text: string } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (code.trim().length < 20) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const text = await ask(
        { kind: "tip", language, code: code.slice(0, 4000), exercise },
        controller.signal,
      );
      if (text) setTip({ forCode: code, text });
    }, IDLE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [code, language, exercise]);

  if (!tip || dismissed === tip.text) return null;
  return (
    <div role="status" className="flex items-center gap-2 border-t bg-accent px-3 py-1.5 text-xs">
      <Lightbulb className="h-3.5 w-3.5 shrink-0" />
      <ProviderBadge provider="groq" />
      <span className="flex-1">{tip.text}</span>
      <button aria-label="Dismiss tip" onClick={() => setDismissed(tip.text)}>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** One-line plain-English translation of a compiler or runtime error, shown under the console. */
export function ErrorExplainer({ language, stderr }: { language: Language; stderr: string }) {
  const [result, setResult] = useState<{ forError: string; text: string | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    ask({ kind: "error", language, stderr: stderr.slice(0, 3000) }, controller.signal).then(
      (text) => {
        if (!controller.signal.aborted) setResult({ forError: stderr, text });
      },
    );
    return () => controller.abort();
  }, [language, stderr]);

  if (!result || result.forError !== stderr) {
    return (
      <p className="flex items-center gap-2 px-3 pb-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Translating the error…
      </p>
    );
  }
  if (!result.text) return null;
  return (
    <p className="flex flex-wrap items-center gap-2 px-3 pb-3 text-xs">
      <ProviderBadge provider="groq" />
      {result.text}
    </p>
  );
}
