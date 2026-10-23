"use client";

import type { PointerEvent, ReactNode } from "react";

export function FloatingProductPreview({ children }: { children: ReactNode }) {
  function updatePerspective(event: PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "mouse" ||
      !window.matchMedia(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      ).matches
    )
      return;
    const surface = event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    surface.style.setProperty(
      "--preview-rx",
      `${((y / bounds.height - 0.5) * -2.4).toFixed(2)}deg`,
    );
    surface.style.setProperty("--preview-ry", `${((x / bounds.width - 0.5) * 2.4).toFixed(2)}deg`);
  }

  function resetPerspective(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--preview-rx", "0deg");
    event.currentTarget.style.setProperty("--preview-ry", "0deg");
  }

  return (
    <div
      className="floating-preview"
      onPointerMove={updatePerspective}
      onPointerLeave={resetPerspective}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
