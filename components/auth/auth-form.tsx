"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { BookOpen, Code2, Loader2, MessageCircle } from "lucide-react";
import { AnimatedAuroraBackground } from "@/components/design/animated-aurora-background";
import { inputClassName } from "@/components/design/input";
import { Logo } from "@/components/design/logo";
import { Reveal } from "@/components/design/motion-primitives";
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

const BENEFITS = [
  { icon: BookOpen, text: "Turn your own material into a focused lesson" },
  { icon: Code2, text: "Practise beside the explanation while it is fresh" },
  { icon: MessageCircle, text: "Ask Guru for a hint when you get stuck" },
] as const;

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
    <Card className="auth-panel-enter surface-sheen w-full max-w-md space-y-5 rounded-3xl p-6 shadow-[0_28px_80px_-40px_rgb(var(--shadow-color)/0.38)] sm:p-8">
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
            className={inputClassName}
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
          className={inputClassName}
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
          className={inputClassName}
        />
        <Button type="submit" className="w-full" disabled={busy} aria-busy={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
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
    <main className="auth-stage relative isolate flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-10">
      <AnimatedAuroraBackground />
      <div className="bg-dots pointer-events-none absolute inset-0 -z-[1] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_74%)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border bg-background/55 shadow-[0_32px_100px_-48px_rgb(var(--shadow-color)/0.45)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-story-enter relative hidden min-h-[36rem] flex-col justify-between overflow-hidden border-r p-10 lg:flex">
          <div className="auth-story-glow" aria-hidden="true" />
          <Link
            href="/"
            aria-label="LearnMate home"
            className="relative w-fit rounded-md transition-transform duration-200 hover:scale-[1.02]"
          >
            <Logo />
          </Link>
          <div className="relative max-w-md">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Learn with momentum
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Your notes become somewhere to think, try and improve.
            </h2>
            <ul className="mt-8 space-y-4">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-card/70 text-foreground shadow-sm">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-muted-foreground">
            A calmer path from reading to understanding.
          </p>
        </section>
        <Reveal className="flex min-h-[36rem] flex-col items-center justify-center gap-6 p-5 sm:p-10">
          <Link
            href="/"
            aria-label="LearnMate home"
            className="rounded-md transition-transform duration-200 hover:scale-[1.02] lg:hidden"
          >
            <Logo />
          </Link>
          <Suspense>
            <Form mode={mode} />
          </Suspense>
        </Reveal>
      </div>
    </main>
  );
}
