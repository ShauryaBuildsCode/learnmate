import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Adds a hover lift for cards that act as links. */
  interactive?: boolean;
};

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition-[box-shadow,border-color,transform,background-color] duration-200 ease-out",
        interactive &&
          "hover:-translate-y-1 hover:border-muted-foreground/40 hover:shadow-lg active:translate-y-0 active:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
