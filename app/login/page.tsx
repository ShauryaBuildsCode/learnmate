"use client";

import { GraduationCap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
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
    <Card className="w-full max-w-sm space-y-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold">LearnMate</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Turn any chapter into animated lessons, hands-on practice and a tutor that sees your code.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          aria-label="Email"
        />
        {mode === "password" && (
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            aria-label="Password"
          />
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "magic" ? "Email me a magic link" : "Sign in"}
        </Button>
      </form>
      <Button variant="outline" className="w-full" onClick={google}>
        Continue with Google
      </Button>
      <button
        type="button"
        className="w-full text-xs text-muted-foreground underline"
        onClick={() => setMode(mode === "magic" ? "password" : "magic")}
      >
        {mode === "magic" ? "Use a password instead" : "Use a magic link instead"}
      </button>
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
