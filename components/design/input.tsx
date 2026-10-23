import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shared text-field styling; use in place of raw <input> classes. */
export const inputClassName =
  "h-10 w-full rounded-lg border bg-card px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground hover:border-muted-foreground/50 focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-foreground/20 disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClassName, className)} {...props} />;
}
