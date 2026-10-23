"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type { Diagnostic } from "@/lib/schemas/diagnostic";
import { MONACO_LANGUAGE } from "@/lib/schemas/exercise";

type Monaco = Parameters<OnMount>[1];
type CodeEditor = Parameters<OnMount>[0];

interface Props {
  path: string;
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  diagnostics: Diagnostic[];
}

const SEVERITY = { error: 8, warning: 4, info: 2 } as const;

/** Monaco wrapper. Guru's diagnostics are written in as editor markers with hover tooltips. */
export function CodeEditorView({ path, value, onChange, onRun, diagnostics }: Props) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<CodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const runRef = useRef(onRun);
  runRef.current = onRun;

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!monaco || !model) return;
    monaco.editor.setModelMarkers(
      model,
      "guru",
      diagnostics
        .filter((d) => d.line <= model.getLineCount())
        .map((d) => ({
          startLineNumber: d.line,
          endLineNumber: d.line,
          startColumn: model.getLineFirstNonWhitespaceColumn(d.line) || 1,
          endColumn: model.getLineMaxColumn(d.line),
          message: `Guru: ${d.message}`,
          severity: SEVERITY[d.severity],
          source: "Guru",
        })),
    );
  }, [diagnostics, path]);

  const ext = path.split(".").pop() ?? "";
  return (
    <Editor
      path={path}
      value={value}
      language={MONACO_LANGUAGE[ext] ?? "plaintext"}
      theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
      onChange={(v) => onChange(v ?? "")}
      onMount={onMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 12 },
      }}
    />
  );
}
