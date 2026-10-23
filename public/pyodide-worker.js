// Classic Web Worker that hosts Pyodide. The main thread terminates and recreates it on timeout.
importScripts("https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js");

let pyodideReady = loadPyodide();

const HARNESS = `
import sys, io, traceback, json

def _run(src, tests):
    ns = {"__name__": "__main__"}
    results = []
    try:
        exec(compile(src, "main.py", "exec"), ns)
    except BaseException:
        et, ev, tb = sys.exc_info()
        err = "".join(traceback.format_exception(et, ev, tb.tb_next))
        return {"error": err, "results": [{"name": t["name"], "passed": False, "message": "Your code raised an error before the tests ran."} for t in tests]}
    for t in tests:
        try:
            exec(compile(t["code"], "test", "exec"), ns)
            results.append({"name": t["name"], "passed": True})
        except AssertionError as e:
            results.append({"name": t["name"], "passed": False, "message": "Assertion failed: " + (str(e) or "wrong result")})
        except BaseException as e:
            results.append({"name": t["name"], "passed": False, "message": type(e).__name__ + ": " + str(e)})
    return {"error": None, "results": results}

def _trace(src, max_steps=60):
    steps = []
    out = io.StringIO()
    real_stdout = sys.stdout
    def snapshot(frame):
        snap = {}
        for k, v in frame.f_locals.items():
            if k.startswith("__"):
                continue
            if isinstance(v, (int, float, str, bool, list, tuple, dict, set)) or v is None:
                snap[k] = repr(v)
        return snap
    def tracer(frame, event, arg):
        if frame.f_code.co_filename != "<lesson>":
            return None
        if event == "line" and len(steps) < max_steps:
            steps.append({"line": frame.f_lineno, "vars": snapshot(frame), "output": out.getvalue()})
        return tracer
    ns = {"__name__": "__main__"}
    sys.stdout = out
    sys.settrace(tracer)
    try:
        exec(compile(src, "<lesson>", "exec"), ns)
    except BaseException:
        pass
    finally:
        sys.settrace(None)
        sys.stdout = real_stdout
    # Each step is the state just before its line runs; the last step is the final state.
    steps.append({"line": steps[-1]["line"] if steps else 1, "vars": {k: repr(v) for k, v in ns.items() if not k.startswith("__") and isinstance(v, (int, float, str, bool, list, tuple, dict, set))}, "output": out.getvalue(), "final": True})
    return steps
`;

self.onmessage = async (event) => {
  const { id, kind, source, stdin, tests } = event.data;
  const pyodide = await pyodideReady;
  const started = performance.now();
  let stdout = "";
  let stderr = "";
  try {
    if (!pyodide.globals.get("_run")) await pyodide.runPythonAsync(HARNESS);
    pyodide.setStdout({ batched: (line) => (stdout += line + "\n") });
    pyodide.setStderr({ batched: (line) => (stderr += line + "\n") });
    const lines = (stdin || "").split("\n");
    let cursor = 0;
    pyodide.setStdin({ stdin: () => (cursor < lines.length ? lines[cursor++] : undefined) });

    if (kind === "trace") {
      const steps = pyodide.globals.get("_trace")(source).toJs({ dict_converter: Object.fromEntries });
      self.postMessage({ id, ok: true, steps });
    } else if (kind === "test") {
      const out = pyodide.globals.get("_run")(source, pyodide.toPy(tests)).toJs({ dict_converter: Object.fromEntries });
      self.postMessage({ id, ok: true, results: out.results, error: out.error, stdout });
    } else {
      const out = pyodide.globals.get("_run")(source, pyodide.toPy([])).toJs({ dict_converter: Object.fromEntries });
      if (out.error) stderr += out.error;
      self.postMessage({
        id,
        ok: true,
        stdout,
        stderr,
        exitCode: out.error ? 1 : 0,
        durationMs: Math.round(performance.now() - started),
      });
    }
  } catch (error) {
    self.postMessage({ id, ok: false, message: String(error) });
  }
};

pyodideReady.then(() => self.postMessage({ id: "ready", ok: true }));
