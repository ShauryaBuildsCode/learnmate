"use client";

import { SandpackConsole, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { useEffect, useState } from "react";
import { buildSrcdoc } from "@/lib/runners/srcdoc";
import type { Files, Language } from "@/lib/schemas/exercise";

/** Live preview: a sandboxed iframe for HTML, Sandpack (multi-file bundler + console) for React. */
export function PreviewPane({ files, language }: { files: Files; language: Language }) {
  const [debounced, setDebounced] = useState(files);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(files), 500);
    return () => clearTimeout(t);
  }, [files]);

  if (language === "react") {
    const sandpackFiles = Object.fromEntries(
      Object.entries(debounced).map(([name, code]) => [`/${name}`, code]),
    );
    return (
      <SandpackProvider
        template="react"
        files={sandpackFiles}
        options={{ recompileMode: "delayed", recompileDelay: 400 }}
      >
        <SandpackPreview showNavigator={false} style={{ height: "60%" }} />
        <SandpackConsole style={{ height: "40%" }} />
      </SandpackProvider>
    );
  }
  return (
    <iframe
      title="Live preview"
      sandbox="allow-scripts"
      srcDoc={buildSrcdoc(debounced, language, "preview")}
      className="h-full w-full bg-white"
    />
  );
}
