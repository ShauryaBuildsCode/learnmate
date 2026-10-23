"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { inputClassName } from "@/components/design/input";
import { Logo } from "@/components/design/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";

type Mode = "signin" | "signup";

const COPY: Record<
  Mode,
  { title: string; subtitle: string; cta: string; alt: string; altHref: string; altCta: string }
> = {
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to pick up where you left off.",
    cta: "Sign in",
    alt: "New to LearnMate?",
    altHref: "/signup",
    altCta: "Create an account",
  },
  signup: {
    title: "Create your account",
    subtitle: "Turn your first chapter into a lesson in minutes.",
    cta: "Create account",
    alt: "Already have an account?",
    altHref: "/signin",
    altCta: "Sign in",
  },
};

const inputClass = inputClassName;

function Form({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const copy = COPY[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    params.get("error") ? "Sign-in failed. Please try again." : null,
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else router.replace("/dashboard");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim() || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setMessage(error.message);
      else if (data.session) router.replace("/dashboard");
      else setMessage("Almost there. Check your inbox to confirm your email, then sign in.");
    }
    setBusy(false);
  }

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setMessage(error.message);
  }

  return (
    <Card className="w-full max-w-sm space-y-5 p-6 shadow-md sm:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <input
            type="text"
            autoComplete="name"
            placeholder="Your name"
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        )}
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="Password (8+ characters)"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "One moment…" : copy.cta}
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
      {message && (
        <p role="status" className="rounded-lg border bg-muted px-3 py-2 text-sm">
          {message}
        </p>
      )}
      <p className="text-center text-sm text-muted-foreground">
        {copy.alt}{" "}
        <Link
          href={copy.altHref}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {copy.altCta}
        </Link>
      </p>
    </Card>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  return (
    <main className="bg-dots flex flex-1 flex-col items-center justify-center gap-6 p-4 sm:p-6">
      <Link href="/" aria-label="LearnMate home" className="rounded-md">
        <Logo />
      </Link>
      <Suspense>
        <Form mode={mode} />
      </Suspense>
    </main>
  );
}
