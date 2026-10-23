import Link from "next/link";
import { LangToggle } from "./lang-toggle";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center gap-3 p-6 pb-0">
      <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
        LearnMate
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <LangToggle />
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
