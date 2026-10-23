import { loadPyodide, type PyodideInterface } from "pyodide";
import type { TestCase } from "../lib/schemas/exercise";

let pyodide: PyodideInterface | undefined;

const HARNESS = `
def _run(src, tests):
    ns = {"__name__": "__main__"}
    try:
        exec(compile(src, "main.py", "exec"), ns)
    except BaseException as e:
        return [False for _ in tests]
    out = []
    for t in tests:
        try:
            exec(compile(t, "test", "exec"), ns)
            out.append(True)
        except BaseException:
            out.append(False)
    return out
`;

/** Runs assert-style tests against Python source with the same semantics as the browser worker. */
export async function runPythonTests(source: string, tests: TestCase[]): Promise<boolean[]> {
  pyodide ??= await loadPyodide();
  pyodide.runPython(HARNESS);
  const asserts = tests.filter((t) => t.kind === "assert").map((t) => t.code);
  const run = pyodide.globals.get("_run");
  const result = run(source, pyodide.toPy(asserts)).toJs() as boolean[];
  return result;
}
