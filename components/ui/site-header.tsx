import Link from "next/link";
import { Logo } from "../design/logo";
import { LangToggle } from "./lang-toggle";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 shadow-[0_1px_0_rgb(var(--shadow-color)/0.02)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link href="/dashboard" aria-label="LearnMate dashboard" className="rounded-md">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {children}
          <LangToggle />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
