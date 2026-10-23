"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { inputClassName } from "@/components/design/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DAILY_MINUTES, GOALS, INTEREST_SUGGESTIONS, LEVELS } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

interface Values {
  name: string;
  goal: string | null;
  level: string | null;
  interests: string;
  dailyMinutes: number | null;
}

const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-sm transition-colors",
    on ? "border-foreground bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
  );

export function ProfileForm({ userId, initial }: { userId: string; initial: Values }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const dirty = JSON.stringify(v) !== JSON.stringify(initial) || state === "saved";

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!v.name.trim()) return;
    setState("saving");
    const { error } = await createClient()
      .from("profiles")
      .update({
        display_name: v.name.trim().slice(0, 60),
        goal: v.goal,
        level: v.level as "beginner" | "intermediate" | "advanced" | null,
        interests: v.interests.trim().slice(0, 200) || null,
        daily_minutes: v.dailyMinutes,
      })
      .eq("id", userId);
    setState(error ? "error" : "saved");
    if (!error) router.refresh();
  }

  const set = (patch: Partial<Values>) => {
    setV((prev) => ({ ...prev, ...patch }));
    setState("idle");
  };

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={save} className="space-y-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Name</span>
          <input
            required
            maxLength={60}
            value={v.name}
            onChange={(e) => set({ name: e.target.value })}
            className={inputClassName}
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What brings you here?</legend>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={v.goal === g.id}
                onClick={() => set({ goal: v.goal === g.id ? null : g.id })}
                className={chip(v.goal === g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Level</legend>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={v.level === l.id}
                onClick={() => set({ level: v.level === l.id ? null : l.id })}
                className={chip(v.level === l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">What you study</legend>
          <input
            maxLength={200}
            value={v.interests}
            onChange={(e) => set({ interests: e.target.value })}
            placeholder="e.g. JavaScript, organic chemistry"
            aria-label="What you study"
            className={inputClassName}
          />
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_SUGGESTIONS.map((t) => {
              const on = v.interests.toLowerCase().includes(t.toLowerCase());
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  disabled={on}
                  onClick={() =>
                    set({ interests: [v.interests.trim(), t].filter(Boolean).join(", ") })
                  }
                  className={cn(chip(on), "px-2.5 py-1 text-xs")}
                >
                  {on && <Check className="mr-1 inline h-3 w-3" aria-hidden="true" />}
                  {t}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Minutes a day</legend>
          <div className="flex flex-wrap gap-2">
            {DAILY_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={v.dailyMinutes === m}
                onClick={() => set({ dailyMinutes: v.dailyMinutes === m ? null : m })}
                className={chip(v.dailyMinutes === m)}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={state === "saving" || !dirty || !v.name.trim()}>
            {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
          <span role="status" className="text-sm">
            {state === "saved" && (
              <span className="flex items-center gap-1 text-success">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
            {state === "error" && (
              <span className="text-danger">Couldn&apos;t save. Try again.</span>
            )}
          </span>
        </div>
      </form>
    </Card>
  );
}
