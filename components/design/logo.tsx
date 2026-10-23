import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/** LearnMate wordmark with its mark. Purely presentational. */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
          size === "lg" ? "h-9 w-9" : "h-7 w-7",
        )}
      >
        <GraduationCap className={size === "lg" ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
      </span>
      <span className={size === "lg" ? "text-xl" : "text-base"}>LearnMate</span>
    </span>
  );
}
