"use client";

import { CheckCircle2, FileText, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { IngestFrame } from "@/app/api/ingest/route";
import { MAX_PAGES, MAX_PDF_BYTES } from "@/lib/ingest/limits";
import { prefetchFirstLesson } from "@/lib/prefetch";
import { readNdjson } from "@/lib/ndjson";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const STAGES: { id: Extract<IngestFrame, { t: "progress" }>["stage"]; label: string }[] = [
  { id: "reading", label: "Reading pages…" },
  { id: "topics", label: "Finding topics…" },
  { id: "exercises", label: "Building exercises…" },
  { id: "saving", label: "Saving your course…" },
];

type Mode = "pdf" | "text";

export function UploadCard() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [stage, setStage] = useState<number | null>(null);
  // The pipeline says what it is doing ("Building exercises" or "Writing practice questions"), so show its words.
  const [exercisesLabel, setExercisesLabel] = useState("Building exercises…");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const busy = stage !== null;
  const canStart = mode === "pdf" ? !!file : text.trim().length > 0;

  function pick(next: File | null) {
    setError(null);
    if (next && next.size > MAX_PDF_BYTES) {
      setFile(null);
      setError(
        `That PDF is ${(next.size / 1024 / 1024).toFixed(1)} MB. Please pick one up to ${MAX_PDF_BYTES / 1024 / 1024} MB.`,
      );
      return;
    }
    setFile(next);
  }

  async function start() {
    setError(null);
    setWarnings([]);
    setStage(0);
    try {
      let body: Record<string, unknown>;
      if (mode === "pdf" && file) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Please sign in again.");
        const storagePath = `${user.id}/${crypto.randomUUID()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("materials")
          .upload(storagePath, file, { contentType: "application/pdf" });
        if (uploadError) throw new Error("The upload failed. Check your connection and try again.");
        body = { kind: "pdf", storagePath };
      } else {
        body = { kind: "text", text };
      }

      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      let courseId: string | null = null;
      await readNdjson(response, (line) => {
        const frame = line as IngestFrame;
        if (frame.t === "progress") {
          setStage(STAGES.findIndex((s) => s.id === frame.stage));
          if (frame.stage === "exercises") setExercisesLabel(frame.message);
        } else if (frame.t === "error") throw new Error(frame.message);
        else if (frame.t === "done") {
          courseId = frame.courseId;
          setWarnings(frame.warnings);
        }
      });
      if (!courseId) throw new Error("Something went wrong. Please try again.");
      // Start writing the first lesson now, so it is ready when the student gets there.
      void prefetchFirstLesson(courseId);
      router.push(`/course/${courseId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage(null);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Add study material</h2>
        <p className="text-sm text-muted-foreground">
          One subject, up to {MAX_PAGES} pages. Upload a text-based PDF or paste your notes.
        </p>
      </div>
      <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
        {(["pdf", "text"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            disabled={busy}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5",
              mode === m ? "bg-card font-medium shadow-sm" : "text-muted-foreground",
            )}
          >
            {m === "pdf" ? "Upload PDF" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "pdf" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0] ?? null);
          }}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm text-muted-foreground hover:bg-muted"
        >
          {file ? <FileText className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
          {file ? file.name : "Drop a PDF here or click to choose"}
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </button>
      ) : (
        <textarea
          value={text}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Paste your notes or a chapter here. Use a line with --- to mark page breaks."
          aria-label="Study material"
          className="w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
        />
      )}

      {busy && (
        <ol className="space-y-1.5 text-sm" aria-live="polite">
          {STAGES.map((s, i) => (
            <li
              key={s.id}
              className={cn("flex items-center gap-2", i > (stage ?? 0) && "text-muted-foreground")}
            >
              {i < (stage ?? 0) ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : i === stage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="h-4 w-4" />
              )}
              {s.id === "exercises" ? exercisesLabel : s.label}
            </li>
          ))}
        </ol>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {warnings.map((w) => (
        <p key={w} className="text-sm text-warning">
          {w}
        </p>
      ))}
      <Button onClick={start} disabled={busy || !canStart} className="w-full">
        {busy ? "Working…" : error ? "Try again" : "Build my course"}
      </Button>
    </Card>
  );
}
