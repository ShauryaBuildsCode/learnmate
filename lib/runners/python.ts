import { clip, RUN_TIMEOUT_MS, RunTimeoutError, withTimeout } from "./timeout";
import type { Files, RunResult, TestCase, TestResult } from "./types";

export interface TraceStep {
  line: number;
  vars: Record<string, string>;
  output: string;
  final?: boolean;
}

interface RunReply {
  id: string;
  ok: true;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
interface TestReply {
  id: string;
  ok: true;
  results: TestResult[];
}
interface TraceReply {
  id: string;
  ok: true;
  steps: TraceStep[];
}
type WorkerReply = { id: string; ok: false; message: string } | RunReply | TestReply | TraceReply;

let worker: Worker | null = null;
let ready: Promise<void> | null = null;

const LOAD_TIMEOUT_MS = 60_000;

function spawn(): Promise<void> {
  const w = new Worker("/pyodide-worker.js");
  worker = w;
  const pending = new Promise<void>((resolve, reject) => {
    const fail = () => {
      if (worker === w) {
        worker = null;
        ready = null;
      }
      w.terminate();
      reject(new Error("The Python runtime failed to load. Check your connection and try again."));
    };
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS);
    w.addEventListener("error", () => {
      clearTimeout(timer);
      fail();
    });
    const onReady = (event: MessageEvent<{ id: string }>) => {
      if (event.data.id === "ready") {
        clearTimeout(timer);
        w.removeEventListener("message", onReady);
        resolve();
      }
    };
    w.addEventListener("message", onReady);
  });
  // Callers that never await this (background preload) must not trigger unhandled rejections.
  pending.catch(() => undefined);
  ready = pending;
  return pending;
}

/** Starts loading Pyodide in the background (called when the app opens). */
export function preloadPython(): void {
  if (typeof Worker !== "undefined" && !worker) spawn();
}

function terminateWorker() {
  worker?.terminate();
  worker = null;
  ready = null;
}

async function call(payload: Record<string, unknown>): Promise<WorkerReply> {
  if (!worker) spawn();
  await ready;
  const w = worker;
  if (!w)
    throw new Error("The Python runtime failed to load. Check your connection and try again.");
  const id = crypto.randomUUID();
  const reply = new Promise<WorkerReply>((resolve) => {
    const onMessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.id !== id) return;
      w.removeEventListener("message", onMessage);
      resolve(event.data);
    };
    w.addEventListener("message", onMessage);
    w.postMessage({ id, ...payload });
  });
  // Hard 5s limit: kill the worker (an infinite loop cannot be interrupted) and start a fresh one.
  return withTimeout(reply, RUN_TIMEOUT_MS, () => {
    terminateWorker();
    preloadPython();
  });
}

function source(files: Files): string {
  return files["main.py"] ?? Object.values(files)[0] ?? "";
}

export async function runPython(files: Files, stdin: string): Promise<RunResult> {
  try {
    const reply = await call({ kind: "run", source: source(files), stdin });
    if (!reply.ok) return { stdout: "", stderr: reply.message, exitCode: 1, durationMs: 0 };
    const r = reply as RunReply;
    return {
      stdout: clip(r.stdout),
      stderr: clip(r.stderr),
      exitCode: r.exitCode,
      durationMs: r.durationMs,
    };
  } catch (error) {
    if (error instanceof RunTimeoutError) {
      return { stdout: "", stderr: error.message, exitCode: 124, durationMs: RUN_TIMEOUT_MS };
    }
    throw error;
  }
}

export async function testPython(files: Files, tests: TestCase[]): Promise<TestResult[]> {
  const asserts = tests.filter((t) => t.kind === "assert");
  try {
    const reply = await call({ kind: "test", source: source(files), tests: asserts });
    if (!reply.ok)
      return asserts.map((t) => ({ name: t.name, passed: false, message: reply.message }));
    return (reply as TestReply).results;
  } catch (error) {
    if (error instanceof RunTimeoutError) {
      return asserts.map((t) => ({ name: t.name, passed: false, message: error.message }));
    }
    throw error;
  }
}

/** Executes the code under sys.settrace and returns real per-line variable snapshots. */
export async function tracePython(code: string): Promise<TraceStep[]> {
  const reply = await call({ kind: "trace", source: code, stdin: "" });
  if (!reply.ok) throw new Error(reply.message);
  return (reply as TraceReply).steps;
}
