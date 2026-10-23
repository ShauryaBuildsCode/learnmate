"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Input } from "@/components/design/input";
import { Logo } from "@/components/design/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [message, setMessage] = useState<string | null>(
    params.get("error") ? "Sign-in failed. Please try again." : null,
  );
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const redirectTo = `${typeof window === "undefined" ? "" : window.location.origin}/auth/callback`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      setMessage(error ? error.message : "Check your inbox for the sign-in link.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else router.replace("/dashboard");
    }
    setBusy(false);
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setMessage(error.message);
  }

  return (
    <Card className="w-full max-w-sm space-y-5 p-6 shadow-md sm:p-8">
      <div className="space-y-2">
        <Link href="/" aria-label="LearnMate home" className="inline-block rounded-md">
          <Logo />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Turn any chapter into animated lessons, hands-on practice and a tutor that sees your code.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
        {mode === "password" && (
          <Input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
          />
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "magic" ? "Email me a magic link" : "Sign in"}
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button variant="outline" className="w-full" onClick={google}>
        Continue with Google
      </Button>
      <button
        type="button"
        className="w-full rounded-md py-1 text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        onClick={() => setMode(mode === "magic" ? "password" : "magic")}
      >
        {mode === "magic" ? "Use a password instead" : "Use a magic link instead"}
      </button>
      {message && (
        <p role="status" className="rounded-lg border bg-muted px-3 py-2 text-sm">
          {message}
        </p>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="bg-dots flex flex-1 items-center justify-center p-4 sm:p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
