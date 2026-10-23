import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,border-color,box-shadow,opacity,transform] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "button-shine relative isolate overflow-hidden bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:opacity-90",
        outline:
          "button-shine relative isolate overflow-hidden border bg-card shadow-xs hover:border-muted-foreground/40 hover:bg-muted hover:shadow-sm",
        ghost: "hover:bg-muted",
        danger: "bg-danger text-background shadow-xs hover:opacity-90",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", icon: "h-8 w-8" },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
