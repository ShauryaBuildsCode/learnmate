import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shared text-field styling; use in place of raw <input> classes. */
export const inputClassName =
  "premium-input h-11 w-full rounded-xl border bg-card/80 px-3.5 text-sm shadow-xs transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-muted-foreground hover:border-muted-foreground/50 focus-visible:border-foreground focus-visible:bg-card focus-visible:outline-none disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClassName, className)} {...props} />;
}
