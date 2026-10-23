"use client";

import { Info, Volume2 } from "lucide-react";
import Link from "next/link";
import { PageChip } from "@/components/source/source-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProviderBadge } from "@/components/ui/provider-badge";
import { speak, speechSupported } from "@/lib/lesson/narration";
import type { MasteryLevel } from "@/lib/mastery";
import type { StoredPlan } from "@/lib/plan/build";
import { cn } from "@/lib/utils";

const LEVEL_STYLE: Record<MasteryLevel, string> = {
  weak: "bg-danger/10 text-danger",
  okay: "bg-warning/10 text-warning",
  strong: "bg-success/10 text-success",
};

export function LevelChip({ level, score }: { level: MasteryLevel; score?: number }) {
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", LEVEL_STYLE[level])}>
      {level}
      {score !== undefined ? ` ${Math.round(score * 100)}%` : ""}
    </span>
  );
}

export function PlanView({ plan, uiLang }: { plan: StoredPlan; uiLang: "en" | "hi" }) {
  const summary = plan.items.map((i, n) => `${n + 1}. ${i.topicName}. ${i.why} ${i.nextStep}`).join(" ");
  return (
    <section className="space-y-3" aria-label="Revision plan">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Revision plan</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">v{plan.version}</span>
        <ProviderBadge provider="gemini" />
        {speechSupported() && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => speak(`Your revision plan, version ${plan.version}. ${summary}`, uiLang)}
          >
            <Volume2 className="h-4 w-4" /> Listen to revision summary
          </Button>
        )}
      </div>

      {plan.changeSummary && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-primary/30 bg-accent p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-medium">What changed in v{plan.version}: </span>
            {plan.changeSummary}
          </p>
        </div>
      )}

      <ol className="space-y-3">
        {plan.items.map((item, i) => {
          const done = item.exercises.filter((e) => e.passed).length;
          return (
            <li key={item.topicId}>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{i + 1}.</span>
                  <h3 className="font-medium">{item.topicName}</h3>
                  <LevelChip level={item.level} score={item.score} />
                </div>
                <p className="text-sm">{item.why}</p>
                <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  Re-read: {item.pagesToReread.map((p) => <PageChip key={p} page={p} />)}
                </p>
                <p className="text-sm text-muted-foreground">{item.nextStep}</p>
                <div className="flex items-center gap-3 pt-1">
                  <Link href={`/learn/${item.topicId}`}>
                    <Button size="sm">Open lesson</Button>
                  </Link>
                  {item.exercises.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {done}/{item.exercises.length} exercises passed
                    </span>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
