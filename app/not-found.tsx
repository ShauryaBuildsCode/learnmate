import Link from "next/link";
import { Logo } from "@/components/design/logo";

export default function NotFound() {
  return (
    <main className="bg-dots flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
