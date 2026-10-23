"use client";

import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/** Shared easing for every entrance on the page. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  shown: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT, delay },
  }),
};

const group: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

type Props = Omit<HTMLMotionProps<"div">, "children" | "variants" | "custom"> & {
  children: ReactNode;
  /** Seconds to wait before this block enters. */
  delay?: number;
};

const viewport = { once: true, margin: "0px 0px -10% 0px" } as const;

/**
 * Fades and lifts into place when scrolled into view, once. `data-reveal` lets a <noscript> rule
 * show the content when JavaScript is off, and a reduced-motion rule in globals.css pins it in place.
 */
export function InView({ children, delay = 0, ...props }: Props) {
  return (
    <motion.div
      data-reveal
      custom={delay}
      variants={item}
      initial="hidden"
      whileInView="shown"
      viewport={viewport}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function InViewGroup({ children, ...props }: Props) {
  return (
    <motion.div
      data-reveal
      variants={group}
      initial="hidden"
      whileInView="shown"
      viewport={viewport}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function InViewItem({ children, ...props }: Props) {
  return (
    <motion.div data-reveal variants={item} {...props}>
      {children}
    </motion.div>
  );
}
