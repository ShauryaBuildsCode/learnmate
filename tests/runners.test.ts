import { describe, expect, it, vi } from "vitest";
import { allow, resetRateLimits } from "@/lib/rate-limit";
import {
  COMPILERS,
  RunnerUnavailableError,
  runOnCompiler,
  toRunResult,
} from "@/lib/runners/onlinecompiler";
import { buildSrcdoc, flattenReactModules } from "@/lib/runners/srcdoc";
import { clip, MAX_OUTPUT_CHARS, RunTimeoutError, withTimeout } from "@/lib/runners/timeout";

describe("withTimeout", () => {
  it("rejects with RunTimeoutError and fires the kill callback when work hangs", async () => {
    const kill = vi.fn();
    await expect(withTimeout(new Promise(() => {}), 20, kill)).rejects.toBeInstanceOf(
      RunTimeoutError,
    );
    expect(kill).toHaveBeenCalledOnce();
  });

  it("resolves normally and does not kill when work finishes in time", async () => {
    const kill = vi.fn();
    await expect(withTimeout(Promise.resolve(7), 50, kill)).resolves.toBe(7);
    await new Promise((r) => setTimeout(r, 70));
    expect(kill).not.toHaveBeenCalled();
  });

  it("explains the timeout in plain English", () => {
    expect(new RunTimeoutError(5000).message).toContain("5 seconds");
  });
});

describe("clip", () => {
  it("truncates oversized output", () => {
    expect(clip("x".repeat(MAX_OUTPUT_CHARS + 10))).toContain("output truncated");
    expect(clip("ok")).toBe("ok");
  });
});

describe("rate limiter", () => {
  it("allows a burst up to capacity, then blocks, then refills", () => {
    resetRateLimits();
    const cfg = { capacity: 2, refillPerSecond: 1 };
    expect(allow("k", cfg, 0)).toBe(true);
    expect(allow("k", cfg, 0)).toBe(true);
    expect(allow("k", cfg, 0)).toBe(false);
    expect(allow("k", cfg, 1500)).toBe(true);
  });

  it("keeps users separate", () => {
    resetRateLimits();
    const cfg = { capacity: 1, refillPerSecond: 0 };
    expect(allow("a", cfg, 0)).toBe(true);
    expect(allow("b", cfg, 0)).toBe(true);
    expect(allow("a", cfg, 0)).toBe(false);
  });
});

describe("srcdoc builder", () => {
  it("inlines referenced css/js and never needs allow-same-origin", () => {
    const html = buildSrcdoc(
      {
        "index.html":
          '<html><head><link rel="stylesheet" href="style.css"></head><body><script src="script.js"></script></body></html>',
        "style.css": "h1{color:red}",
        "script.js": "console.log('hi')",
      },
      "html",
      "run1",
    );
    expect(html).toContain("<style>h1{color:red}</style>");
    expect(html).toContain("console.log('hi')");
    expect(html).toContain('"run1"');
  });

  it("escapes closing script tags in user code", () => {
    const html = buildSrcdoc({ "main.js": 'console.log("</script><b>")' }, "javascript", "r");
    expect(html).not.toContain('"</script><b>"');
  });

  it("wraps each assert test so one failure cannot stop the others", () => {
    const html = buildSrcdoc({ "main.js": "var x = 1;" }, "javascript", "r", [
      { kind: "assert", name: "a", code: "if (x !== 1) throw new Error('bad')" },
      { kind: "assert", name: "b", code: "throw new Error('boom')" },
    ]);
    expect(html.match(/__lm_result\(\d, true\)/g)).toHaveLength(2);
    expect(html).toContain("__lm_result(1, false");
  });

  it("flattens ES module React files into plain declarations", () => {
    const out = flattenReactModules({
      "App.js":
        'import { useState } from "react";\nimport Item from "./Item";\nexport default function App() { return <Item/>; }',
      "Item.js": "export function Item() { return <b/>; }",
    });
    expect(out).not.toMatch(/\bimport\b/);
    expect(out).not.toMatch(/\bexport\b/);
    expect(out.indexOf("function Item")).toBeLessThan(out.indexOf("function App"));
  });
});

describe("onlinecompiler.io mapping", () => {
  it("maps successful runs", () => {
    const r = toRunResult({
      output: "hello\n",
      error: "",
      status: "success",
      exit_code: 0,
      time: "0.0248",
    });
    expect(r).toMatchObject({ stdout: "hello\n", stderr: "", exitCode: 0, durationMs: 25 });
  });

  it("surfaces compile errors on stderr", () => {
    const r = toRunResult({ output: "", error: "error: x", status: "error", exit_code: 1 });
    expect(r).toMatchObject({ stderr: "error: x", exitCode: 1 });
  });

  it("reports timeouts (124) and memory kills (137) in plain English", () => {
    expect(toRunResult({ exit_code: 124, status: "error" }).stderr).toContain("Time limit");
    expect(toRunResult({ exit_code: 137, status: "error" }).stderr).toContain("Memory limit");
  });

  it("uses the documented compiler ids", () => {
    expect(COMPILERS.cpp).toBe("g++-15");
    expect(COMPILERS.java).toBe("openjdk-25");
  });

  describe("requests", () => {
    const setEnv = () => {
      process.env.ONLINECOMPILER_API_KEY = "key";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "x";
      process.env.GEMINI_API_KEY = "x";
      process.env.ANTHROPIC_API_KEY = "x";
      process.env.GROQ_API_KEY = "x";
    };

    it("sends the raw key, compiler id and stdin", async () => {
      setEnv();
      const ok = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ output: "42\n", status: "success", exit_code: 0 })),
        );
      const r = await runOnCompiler("cpp", "int main(){}", "21", ok);
      const [url, init] = ok.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.onlinecompiler.io/api/run-code-sync/");
      expect((init.headers as Record<string, string>).Authorization).toBe("key");
      expect(JSON.parse(init.body as string)).toMatchObject({
        compiler: "g++-15",
        input: "21",
        time_limit: 5,
      });
      expect(r.stdout).toBe("42\n");
    });

    it("retries once when rate limited", async () => {
      setEnv();
      const f = vi
        .fn()
        .mockResolvedValueOnce(new Response("{}", { status: 429 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ output: "ok", status: "success", exit_code: 0 })),
        );
      await expect(runOnCompiler("c", "x", "", f)).resolves.toMatchObject({ stdout: "ok" });
      expect(f).toHaveBeenCalledTimes(2);
    });

    it("raises a friendly error when the runner is unreachable", async () => {
      setEnv();
      const failing = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      await expect(runOnCompiler("cpp", "int main(){}", "", failing)).rejects.toBeInstanceOf(
        RunnerUnavailableError,
      );
    });
  });
});
