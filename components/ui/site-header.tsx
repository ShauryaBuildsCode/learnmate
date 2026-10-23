import Link from "next/link";
import { Logo } from "../design/logo";
import { LangToggle } from "./lang-toggle";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b bg-background/80 backdrop-blur">
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
