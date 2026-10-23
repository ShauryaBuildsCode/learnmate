"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const COLORS = ["#ff8a00", "#16a34a", "#5b4fa8", "#111111", "#dc2626", "#0072B2"];

/** A short burst of confetti. Re-trigger it by changing `burst`; respects reduced-motion. */
export function Celebrate({ burst }: { burst: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!burst || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown(burst);
    const t = setTimeout(() => setShown(0), 1600);
    return () => clearTimeout(t);
  }, [burst]);
  return (
    <AnimatePresence>
      {shown > 0 && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 36 }, (_, i) => {
            const angle = (i / 36) * Math.PI * 2;
            const dist = 160 + ((i * 53) % 200);
            return (
              <motion.span
                key={`${shown}-${i}`}
                className="absolute left-1/2 top-1/3 block h-2.5 w-1.5 rounded-sm"
                style={{ background: COLORS[i % COLORS.length] }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist + 220,
                  opacity: 0,
                  rotate: (i % 2 ? 1 : -1) * 540,
                  scale: 0.8,
                }}
                transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
