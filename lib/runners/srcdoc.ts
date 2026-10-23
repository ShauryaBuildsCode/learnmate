import type { Files, Language, TestCase } from "./types";

const REACT_CDN = "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js";
const REACT_DOM_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js";
const BABEL_CDN = "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js";

/** Keeps user text from closing the <script> element it is embedded in. */
function scriptSafe(code: string): string {
  return code.replace(/<\/(script)/gi, "<\\/$1");
}

function prelude(runId: string): string {
  return `<script>
(function () {
  var id = ${JSON.stringify(runId)};
  function send(type, payload) { parent.postMessage(Object.assign({ __lm: id, type: type }, payload), "*"); }
  ["log", "info", "warn", "error"].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      var text = Array.prototype.map.call(arguments, function (a) {
        try { return typeof a === "string" ? a : JSON.stringify(a); } catch (e) { return String(a); }
      }).join(" ");
      send("console", { level: level, text: text });
      original.apply(console, arguments);
    };
  });
  window.addEventListener("error", function (e) { send("console", { level: "error", text: e.message + (e.lineno ? " (line " + e.lineno + ")" : "") }); });
  window.addEventListener("unhandledrejection", function (e) { send("console", { level: "error", text: "Unhandled promise rejection: " + e.reason }); });
  window.__lm_result = function (index, passed, message) { send("test", { index: index, passed: passed, message: message }); };
  window.addEventListener("load", function () { setTimeout(function () { send("done", {}); }, 350); });
})();
</script>`;
}

function testScripts(tests: TestCase[]): string {
  return tests
    .map((t, i) =>
      t.kind === "assert"
        ? `<script>
try {
${scriptSafe(t.code)}
__lm_result(${i}, true);
} catch (e) { __lm_result(${i}, false, String(e && e.message ? e.message : e)); }
</script>`
        : "",
    )
    .join("\n");
}

function inlineHtml(files: Files): string {
  let html = files["index.html"] ?? "<!doctype html><html><body></body></html>";
  const usedCss = new Set<string>();
  const usedJs = new Set<string>();
  html = html.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href: string) => {
    if (!(href in files)) return tag;
    usedCss.add(href);
    return `<style>${files[href]}</style>`;
  });
  html = html.replace(
    /<script[^>]*src=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (tag, src: string) => {
      if (!(src in files)) return tag;
      usedJs.add(src);
      return `<script>${scriptSafe(files[src])}</script>`;
    },
  );
  const extras = Object.entries(files)
    .filter(([name]) => name !== "index.html")
    .map(([name, content]) => {
      if (name.endsWith(".css") && !usedCss.has(name)) return `<style>${content}</style>`;
      if (name.endsWith(".js") && !usedJs.has(name))
        return `<script>${scriptSafe(content)}</script>`;
      return "";
    })
    .join("\n");
  return html.includes("</body>") ? html.replace("</body>", `${extras}\n</body>`) : html + extras;
}

/** Turns ES-module React files into one script of plain declarations (imports/exports removed). */
export function flattenReactModules(files: Files): string {
  const order = Object.keys(files)
    .filter((n) => /\.(jsx?|tsx?)$/.test(n))
    .sort((a, b) => Number(/^App\./.test(a)) - Number(/^App\./.test(b)));
  return order
    .map((name) =>
      files[name]
        .replace(/^\s*import\s+[^;]*?from\s+["'][^"']+["'];?\s*$/gm, "")
        .replace(/^\s*import\s+["'][^"']+["'];?\s*$/gm, "")
        .replace(/^\s*export\s+default\s+function\s+/gm, "function ")
        .replace(/^\s*export\s+default\s+[A-Za-z_$][\w$]*\s*;?\s*$/gm, "")
        .replace(/^\s*export\s+(?=(?:async\s+)?function|const|let|class)/gm, ""),
    )
    .join("\n");
}

/** Builds the full srcdoc for a sandboxed iframe (HTML/CSS/JS, plain JS, or headless React). */
export function buildSrcdoc(
  files: Files,
  language: Language,
  runId: string,
  tests: TestCase[] = [],
): string {
  if (language === "react") {
    const body = flattenReactModules(files);
    return `<!doctype html><html><head><meta charset="utf-8">${prelude(runId)}
<script src="${REACT_CDN}"></script><script src="${REACT_DOM_CDN}"></script><script src="${BABEL_CDN}"></script>
</head><body><div id="root"></div>
<script type="text/babel" data-presets="react">
const { useState, useEffect, useMemo, useRef, useReducer, useCallback, useContext, createContext, Fragment } = React;
${scriptSafe(body)}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
</script>
<script>window.addEventListener("load", function () { setTimeout(function () {
${testScripts(tests)
  .replace(/<\/?script>/g, "")
  .trim()}
}, 250); });</script>
</body></html>`;
  }
  if (language === "javascript") {
    const js = files["main.js"] ?? files["script.js"] ?? Object.values(files)[0] ?? "";
    return `<!doctype html><html><head><meta charset="utf-8">${prelude(runId)}</head><body>
<script>${scriptSafe(js)}</script>${testScripts(tests)}</body></html>`;
  }
  const page = inlineHtml(files);
  const withPrelude = page.includes("<head>")
    ? page.replace("<head>", `<head>${prelude(runId)}`)
    : `${prelude(runId)}${page}`;
  return withPrelude.includes("</body>")
    ? withPrelude.replace("</body>", `${testScripts(tests)}</body>`)
    : withPrelude + testScripts(tests);
}
