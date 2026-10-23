"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";

/** Rename or delete a course. Every query runs as the student, so RLS keeps it to their own courses. */
export function CourseMenu({
  courseId,
  title,
  storagePath,
}: {
  courseId: string;
  title: string;
  storagePath: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  async function rename(e: FormEvent) {
    e.preventDefault();
    const next = name.trim().slice(0, 100);
    if (!next) return;
    setBusy(true);
    const { error: err } = await createClient()
      .from("courses")
      .update({ title: next })
      .eq("id", courseId);
    setBusy(false);
    if (err) return setError("Couldn't rename the course.");
    setMode(null);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("courses").delete().eq("id", courseId);
    if (err) {
      setBusy(false);
      return setError("Couldn't delete the course.");
    }
    if (storagePath)
      await supabase.storage
        .from("materials")
        .remove([storagePath])
        .catch(() => undefined);
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div ref={box} className="relative">
      <Button
        variant="outline"
        size="icon"
        aria-label="Course options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border bg-card p-1.5 shadow-lg"
        >
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-accent"
            onClick={() => {
              setOpen(false);
              setName(title);
              setError(null);
              setMode("rename");
            }}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" /> Rename
          </button>
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-accent"
            onClick={() => {
              setOpen(false);
              setError(null);
              setMode("delete");
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete course
          </button>
        </div>
      )}
      {mode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === "rename" ? "Rename course" : "Delete course"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setMode(null)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {mode === "rename" ? (
              <form onSubmit={rename} className="space-y-4">
                <h2 className="text-lg font-semibold">Rename course</h2>
                <input
                  autoFocus
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Course name"
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setMode(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy || !name.trim()}>
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Delete this course?</h2>
                <p className="text-sm text-muted-foreground">
                  &ldquo;{title}&rdquo; and its lessons, quizzes, notes, mind map and progress will
                  be removed for good.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setMode(null)}
                    disabled={busy}
                  >
                    Cancel
                  </Button>
                  <Button type="button" variant="danger" onClick={remove} disabled={busy}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
