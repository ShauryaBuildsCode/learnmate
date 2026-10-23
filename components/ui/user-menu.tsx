"use client";

import { BarChart3, LayoutDashboard, LogOut, PlayCircle, Settings, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, mobileOnly: true },
  { href: "/analytics", label: "Analytics", Icon: BarChart3, mobileOnly: true },
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/welcome?replay=1", label: "Replay the welcome tour", Icon: PlayCircle },
] as const;

/** The account menu: who you are, where your profile and settings live, and sign out. */
export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-full ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <Avatar name={name} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border bg-card p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar name={name} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-border" />
          {ITEMS.map(({ href, label, Icon, ...rest }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-accent",
                "mobileOnly" in rest && "sm:hidden",
              )}
            >
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {label}
            </Link>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await createClient().auth.signOut();
              router.replace("/signin");
              router.refresh();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-accent"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
