"use client";

import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

type MotionBlockProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: ReactNode;
  delay?: number;
};

export function Reveal({ children, className, delay = 0, ...props }: MotionBlockProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate="visible"
      variants={revealVariants}
      transition={reduceMotion ? { duration: 0 } : { delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className, ...props }: MotionBlockProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate="visible"
      variants={staggerVariants}
      transition={reduceMotion ? { duration: 0 } : undefined}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }: MotionBlockProps) {
  return (
    <motion.div variants={revealVariants} className={cn("h-full", className)} {...props}>
      {children}
    </motion.div>
  );
}
