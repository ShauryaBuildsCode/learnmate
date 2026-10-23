"use client";

import type { PointerEvent, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type InteractiveFeatureCardProps = {
  children: ReactNode;
  className?: string;
};

export function InteractiveFeatureCard({ children, className }: InteractiveFeatureCardProps) {
  function updateSpotlight(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      !window.matchMedia(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      ).matches
    )
      return;
    const card = event.currentTarget;
    const bounds = card.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const tiltX = ((y / bounds.height - 0.5) * -4).toFixed(2);
    const tiltY = ((x / bounds.width - 0.5) * 4).toFixed(2);
    card.style.setProperty("--spot-x", `${x}px`);
    card.style.setProperty("--spot-y", `${y}px`);
    card.style.setProperty("--tilt-x", `${tiltX}deg`);
    card.style.setProperty("--tilt-y", `${tiltY}deg`);
  }

  function resetSpotlight(event: PointerEvent<HTMLDivElement>) {
    const card = event.currentTarget;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      className="interactive-card h-full"
      onPointerMove={updateSpotlight}
      onPointerLeave={resetSpotlight}
    >
      <Card
        className={cn("interactive-card__surface group relative h-full overflow-hidden", className)}
      >
        <span className="interactive-card__spotlight" aria-hidden="true" />
        <div className="relative z-10 h-full">{children}</div>
      </Card>
    </div>
  );
}
