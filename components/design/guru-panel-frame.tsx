import { Bot, SendHorizontal, X } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

export type GuruMessage = {
  id: string;
  role: "user" | "guru";
  /** Plain text, or rich content (formatted reply, spinner) once the frame is adopted by the real panel. */
  text: ReactNode;
  meta?: ReactNode;
  /** Shown above the bubble, e.g. a provider badge or an out-of-scope banner. */
  before?: ReactNode;
  /** Colours the bubble text for failures. */
  tone?: "default" | "error";
};

type GuruPanelFrameProps = {
  messages: GuruMessage[];
  /** Controlled input value. */
  value: string;
  onChange?: (value: string) => void;
  onSend?: () => void;
  onClose?: () => void;
  thinking?: boolean;
  className?: string;
  /** Optional slots, added when the frame was adopted by the real panel. All are backward compatible. */
  /** Small line under the name in the header. */
  tagline?: string;
  /** Shown instead of the list while there are no messages. */
  emptyState?: ReactNode;
  /** Rendered after the last message inside the list, e.g. a dismissible nudge. */
  trailing?: ReactNode;
  /** A row above the composer, e.g. hint and review buttons. */
  aboveComposer?: ReactNode;
  sendDisabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  listRef?: Ref<HTMLUListElement>;
  placeholder?: string;
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
  tagline,
  emptyState,
  trailing,
  aboveComposer,
  sendDisabled,
  inputRef,
  listRef,
  placeholder = "Ask Guru about your code",
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
          <div className="leading-tight">
            <span className="text-sm font-medium">Guru</span>
            {tagline && <p className="text-[11px] text-muted-foreground">{tagline}</p>}
          </div>
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
      <ul ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && emptyState && <li>{emptyState}</li>}
        {messages.map((m) => (
          <li key={m.id} className={cn("flex flex-col gap-1", m.role === "user" && "items-end")}>
            {m.before}
            <div
              className={cn(
                "max-w-[90%] rounded-2xl px-3.5 py-2 text-sm",
                m.role === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-muted",
                m.tone === "error" && "text-danger",
              )}
            >
              {m.text}
            </div>
            {m.meta}
          </li>
        ))}
        {trailing && <li>{trailing}</li>}
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
      {aboveComposer}
      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSend?.();
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          aria-label="Ask Guru"
          className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:border-foreground"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={sendDisabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
