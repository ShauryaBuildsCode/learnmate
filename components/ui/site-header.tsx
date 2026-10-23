import Link from "next/link";
import { Logo } from "../design/logo";
import { LangToggle } from "./lang-toggle";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader({ children }: { children?: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
    : { data: null };
  const email = user?.email ?? "";
  const name = profile?.display_name || email.split("@")[0] || "You";
  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link href="/dashboard" aria-label="LearnMate dashboard" className="rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Main" className="ml-2 hidden items-center gap-1 sm:flex">
          <Link
            href="/dashboard"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/analytics"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Analytics
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {children}
          <LangToggle />
          <ThemeToggle />
          {user && <UserMenu name={name} email={email} />}
        </div>
      </div>
    </header>
  );
}
