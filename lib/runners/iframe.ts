import { buildSrcdoc } from "./srcdoc";
import { clip, RUN_TIMEOUT_MS, RunTimeoutError } from "./timeout";
import type { Files, Language, RunResult, TestCase, TestResult } from "./types";

type FrameMessage =
  | { __lm: string; type: "console"; level: string; text: string }
  | { __lm: string; type: "test"; index: number; passed: boolean; message?: string }
  | { __lm: string; type: "done" };

interface FrameOutcome {
  console: { level: string; text: string }[];
  tests: Map<number, { passed: boolean; message?: string }>;
  durationMs: number;
}

/** Runs the files in a throwaway iframe with `sandbox="allow-scripts"` (never allow-same-origin). */
function executeInFrame(
  files: Files,
  language: Language,
  tests: TestCase[],
  timeoutMs: number,
): Promise<FrameOutcome> {
  return new Promise((resolve, reject) => {
    const runId = crypto.randomUUID();
    const started = performance.now();
    const outcome: FrameOutcome = { console: [], tests: new Map(), durationMs: 0 };
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.style.display = "none";

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      frame.remove();
    };
    const onMessage = (event: MessageEvent<FrameMessage>) => {
      if (event.source !== frame.contentWindow || event.data?.__lm !== runId) return;
      const msg = event.data;
      if (msg.type === "console") {
        if (!msg.text.includes("in-browser Babel transformer"))
          outcome.console.push({ level: msg.level, text: msg.text });
      } else if (msg.type === "test")
        outcome.tests.set(msg.index, { passed: msg.passed, message: msg.message });
      else {
        outcome.durationMs = Math.round(performance.now() - started);
        cleanup();
        resolve(outcome);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new RunTimeoutError(timeoutMs));
    }, timeoutMs);

    window.addEventListener("message", onMessage);
    frame.srcdoc = buildSrcdoc(files, language, runId, tests);
    document.body.appendChild(frame);
  });
}

export async function runInIframe(files: Files, language: Language): Promise<RunResult> {
  try {
    const out = await executeInFrame(files, language, [], RUN_TIMEOUT_MS);
    const stdout = out.console
      .filter((c) => c.level !== "error")
      .map((c) => c.text)
      .join("\n");
    const stderr = out.console
      .filter((c) => c.level === "error")
      .map((c) => c.text)
      .join("\n");
    return {
      stdout: clip(stdout),
      stderr: clip(stderr),
      exitCode: stderr ? 1 : 0,
      durationMs: out.durationMs,
    };
  } catch (error) {
    if (error instanceof RunTimeoutError) {
      return { stdout: "", stderr: error.message, exitCode: 124, durationMs: RUN_TIMEOUT_MS };
    }
    throw error;
  }
}

export async function testInIframe(
  files: Files,
  language: Language,
  tests: TestCase[],
): Promise<TestResult[]> {
  try {
    const out = await executeInFrame(files, language, tests, RUN_TIMEOUT_MS);
    return tests.map((t, i) => {
      const r = out.tests.get(i);
      return r
        ? { name: t.name, passed: r.passed, message: r.message }
        : { name: t.name, passed: false, message: "Test did not run. Check your code for errors." };
    });
  } catch (error) {
    if (error instanceof RunTimeoutError) {
      return tests.map((t) => ({ name: t.name, passed: false, message: error.message }));
    }
    throw error;
  }
}
