import { cn } from "@/lib/utils";

export type Provider = "gemini" | "claude" | "groq";

const STYLES: Record<Provider, { label: string; className: string }> = {
  gemini: { label: "Gemini", className: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  claude: { label: "Claude", className: "bg-orange-500/10 text-orange-600 dark:text-orange-300" },
  groq: { label: "Groq", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
};

/** Small chip shown on every AI response so the routing is visible. */
export function ProviderBadge({ provider, note }: { provider: Provider; note?: string }) {
  const s = STYLES[provider];
  return (
    <span
      title={note}
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        s.className,
      )}
    >
      {s.label}
      {note ? ` · ${note}` : ""}
    </span>
  );
}
