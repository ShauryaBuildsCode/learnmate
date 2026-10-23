"use client";

import Link from "next/link";
import { useCallback } from "react";
import { IdePanel } from "@/components/ide/ide-panel";
import type { Language } from "@/lib/schemas/exercise";

export function PlaygroundClient({ defaultLanguage }: { defaultLanguage: Language }) {
  const noop = useCallback(() => {}, []);
  return (
    <main className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-2 text-sm">
        <Link href="/dashboard" className="text-muted-foreground hover:underline">
          ← Dashboard
        </Link>
        <h1 className="font-medium">Playground</h1>
      </header>
      <div className="min-h-0 flex-1">
        <IdePanel
          exercise={null}
          defaultLanguage={defaultLanguage}
          diagnostics={[]}
          onSnapshot={noop}
          onAskGuru={noop}
        />
      </div>
    </main>
  );
}
