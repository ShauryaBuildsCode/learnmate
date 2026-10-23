"use client";

import dynamic from "next/dynamic";
import { Bot, CheckCheck, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CodeWorkspaceFrame } from "@/components/design/code-workspace-frame";
import { Button } from "@/components/ui/button";
import { LANGUAGE_LABELS, TEMPLATES } from "@/lib/ide-templates";
import { runner } from "@/lib/runners";
import { preloadPython } from "@/lib/runners/python";
import type { Diagnostic } from "@/lib/schemas/diagnostic";
import {
  LANGUAGES,
  type Files,
  type Language,
  type RunResult,
  type TestCase,
  type TestResult,
} from "@/lib/schemas/exercise";
import { cn } from "@/lib/utils";
import { ConsolePanel, TestResultList } from "./console-panel";
import { ErrorExplainer, TipBar } from "./quick-assist";

const CodeEditorView = dynamic(() => import("./code-editor").then((m) => m.CodeEditorView), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-muted" />,
});
const PreviewPane = dynamic(() => import("./preview-pane").then((m) => m.PreviewPane), {
  ssr: false,
});

export interface IdeExercise {
  id: string | null;
  language: Language;
  prompt: string;
  starterFiles: Files;
  tests: TestCase[];
}

/** What Guru sees: the live editor state plus the latest run and test output. */
export interface IdeSnapshot {
  language: Language;
  files: Files;
  lastRun: RunResult | null;
  runError: string | null;
  testResults: TestResult[] | null;
}

interface Props {
  exercise: IdeExercise | null;
  diagnostics: Diagnostic[];
  onSnapshot: (snapshot: IdeSnapshot) => void;
  onCheck?: (results: TestResult[], files: Files, language: Language) => void;
  onAskGuru: () => void;
}

type BottomTab = "console" | "tests" | "preview" | "input";

/** Mount with `key={exercise.id}` so a new exercise starts from its own starter files. */
export function IdePanel({ exercise, diagnostics, onSnapshot, onCheck, onAskGuru }: Props) {
  const initialLanguage = exercise?.language ?? "python";
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [files, setFiles] = useState<Files>(exercise?.starterFiles ?? TEMPLATES[initialLanguage]);
  const [active, setActive] = useState(Object.keys(files)[0]);
  const [stdin, setStdin] = useState("");
  const [tab, setTab] = useState<BottomTab>("console");
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [busy, setBusy] = useState<"run" | "check" | null>(null);

  const isScratch = !exercise || exercise.language !== language;
  const hasPreview = language === "html" || language === "react";

  useEffect(() => preloadPython(), []);

  const load = useCallback((lang: Language, next: Files) => {
    setLanguage(lang);
    setFiles(next);
    setActive(Object.keys(next)[0]);
    setLastRun(null);
    setRunError(null);
    setTestResults(null);
    setTab(lang === "html" || lang === "react" ? "preview" : "console");
  }, []);

  useEffect(() => {
    onSnapshot({ language, files, lastRun, runError, testResults });
  }, [language, files, lastRun, runError, testResults, onSnapshot]);

  const run = useCallback(async () => {
    if (busy !== null) return;
    setBusy("run");
    setRunError(null);
    try {
      setLastRun(await runner.run(files, language, stdin));
      setTab("console");
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Something went wrong running your code.");
      setTab("console");
    } finally {
      setBusy(null);
    }
  }, [files, language, stdin, busy]);

  const check = useCallback(async () => {
    if (!exercise || isScratch) return;
    setBusy("check");
    setRunError(null);
    try {
      const results = await runner.test(files, language, exercise.tests);
      setTestResults(results);
      setTab("tests");
      onCheck?.(results, files, language);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Something went wrong checking your code.");
      setTab("console");
    } finally {
      setBusy(null);
    }
  }, [exercise, isScratch, files, language, onCheck]);

  const tabs: { id: BottomTab; label: string }[] = useMemo(
    () => [
      { id: "console", label: "Console" },
      { id: "tests", label: "Tests" },
      ...(hasPreview ? [{ id: "preview" as const, label: "Preview" }] : []),
      { id: "input", label: "Input" },
    ],
    [hasPreview],
  );

  const fileNames = Object.keys(files);
  const panel = (
    <div className="flex h-56 min-h-0 flex-col border-t">
      <TipBar
        language={language}
        code={Object.entries(files)
          .map(([name, code]) => `// ${name}\n${code}`)
          .join("\n")}
        exercise={exercise && !isScratch ? exercise.prompt : null}
      />
      <div role="tablist" className="flex gap-1 border-b bg-muted px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-1.5 text-xs",
              tab === t.id ? "border-b-2 border-primary font-medium" : "text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "console" && (
          <>
            <ConsolePanel result={lastRun} error={runError} />
            {lastRun && lastRun.exitCode !== 0 && lastRun.stderr && (
              <ErrorExplainer language={language} stderr={lastRun.stderr} />
            )}
          </>
        )}
        {tab === "tests" &&
          (testResults ? (
            <TestResultList results={testResults} />
          ) : (
            <p className="p-3 text-sm text-muted-foreground">
              {isScratch
                ? "Open an exercise to run its tests."
                : "Click Check to run the hidden tests."}
            </p>
          ))}
        {tab === "preview" && hasPreview && <PreviewPane files={files} language={language} />}
        {tab === "input" && (
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="Standard input for your program (one value per line)"
            className="h-full w-full resize-none bg-background p-3 font-mono text-xs outline-none"
          />
        )}
      </div>
    </div>
  );

  return (
    <CodeWorkspaceFrame
      className="h-full min-h-0 rounded-none border-0 shadow-none"
      filename={active}
      running={busy === "run"}
      onRun={run}
      runTitle="Ctrl/Cmd + Enter"
      toolbar={
        <select
          aria-label="Language"
          value={language}
          onChange={(e) => {
            const lang = e.target.value as Language;
            load(lang, lang === exercise?.language ? exercise.starterFiles : TEMPLATES[lang]);
          }}
          className="h-8 rounded-lg border bg-background px-2 text-xs"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABELS[l]}
            </option>
          ))}
        </select>
      }
      fileTabs={
        fileNames.length > 1 ? (
          <div role="tablist" className="flex flex-wrap gap-1">
            {fileNames.map((name) => (
              <button
                key={name}
                role="tab"
                aria-selected={name === active}
                onClick={() => setActive(name)}
                className={cn(
                  "rounded-md border px-2.5 py-1 font-mono text-xs",
                  name === active
                    ? "bg-card"
                    : "border-transparent text-muted-foreground hover:bg-card/60",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        ) : undefined
      }
      actions={
        <>
          <Button size="sm" variant="outline" onClick={check} disabled={busy !== null || isScratch}>
            <CheckCheck className="h-3.5 w-3.5" /> {busy === "check" ? "Checking…" : "Check"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              load(exercise?.language ?? language, exercise?.starterFiles ?? TEMPLATES[language])
            }
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" variant="outline" onClick={onAskGuru}>
            <Bot className="h-3.5 w-3.5" /> Ask Guru
          </Button>
        </>
      }
      notice={
        exercise && !isScratch ? (
          <p className="border-b bg-accent px-3 py-2 text-sm">{exercise.prompt}</p>
        ) : undefined
      }
      editor={
        <CodeEditorView
          path={active}
          value={files[active] ?? ""}
          onChange={(value) => setFiles((f) => ({ ...f, [active]: value }))}
          onRun={run}
          diagnostics={isScratch ? [] : diagnostics}
        />
      }
      panel={panel}
    />
  );
}
