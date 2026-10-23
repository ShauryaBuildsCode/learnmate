"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface SourceApi {
  pages: Record<number, string>;
  open: (page: number) => void;
}

const SourceContext = createContext<SourceApi | null>(null);

export function useSource(): SourceApi {
  const ctx = useContext(SourceContext);
  if (!ctx) throw new Error("useSource must be used inside <SourceProvider>");
  return ctx;
}

/** Makes every page chip in the app open the matching passage from the uploaded material. */
export function SourceProvider({
  pages,
  children,
}: {
  pages: Record<number, string>;
  children: ReactNode;
}) {
  const [page, setPage] = useState<number | null>(null);
  const open = useCallback((n: number) => setPage(n), []);
  const value = useMemo(() => ({ pages, open }), [pages, open]);
  return (
    <SourceContext.Provider value={value}>
      {children}
      {page !== null && (
        <div
          role="dialog"
          aria-label={`Source passage, page ${page}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPage(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-xl overflow-auto rounded-xl border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Page {page}</h2>
              <button aria-label="Close" onClick={() => setPage(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {pages[page] ?? "That page isn't in your material."}
            </pre>
          </div>
        </div>
      )}
    </SourceContext.Provider>
  );
}

export function PageChip({ page }: { page: number }) {
  const { open } = useSource();
  return (
    <button
      type="button"
      onClick={() => open(page)}
      className="inline-flex items-center rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-medium text-primary hover:underline"
      title="Open the source passage"
    >
      p. {page}
    </button>
  );
}
