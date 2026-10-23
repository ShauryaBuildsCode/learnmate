import { Bot, SendHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type GuruMessage = { id: string; role: "user" | "guru"; text: string; meta?: ReactNode };

type GuruPanelFrameProps = {
  messages: GuruMessage[];
  /** Controlled input value. */
  value: string;
  onChange?: (value: string) => void;
  onSend?: () => void;
  onClose?: () => void;
  thinking?: boolean;
  className?: string;
};

/** Visual frame for the Guru tutor panel: header, message bubbles, composer. Props in, JSX out. */
export function GuruPanelFrame({
  messages,
  value,
  onChange,
  onSend,
  onClose,
  thinking,
  className,
}: GuruPanelFrameProps) {
  return (
    <aside
      aria-label="Guru tutor"
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm",
        className,
      )}
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium">Guru</span>
        </div>
        <button
          type="button"
          aria-label="Close Guru"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <ul className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <li key={m.id} className={cn("flex flex-col gap-1", m.role === "user" && "items-end")}>
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                m.role === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-muted",
              )}
            >
              {m.text}
            </p>
            {m.meta}
          </li>
        ))}
        {thinking && (
          <li aria-label="Guru is thinking" className="flex gap-1 px-1 py-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </li>
        )}
      </ul>
      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSend?.();
        }}
      >
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Ask Guru about your code"
          aria-label="Ask Guru"
          className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:border-foreground"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
