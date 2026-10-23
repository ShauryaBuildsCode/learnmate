import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Code2,
  FileUp,
  Map,
  MessageCircle,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/design/logo";
import { ProductPreview } from "@/components/design/product-preview";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/server";

const linkButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-[background-color,opacity,transform] duration-150 active:scale-[0.98]";
const primaryLink = `${linkButton} bg-primary text-primary-foreground shadow-xs hover:opacity-90`;
const outlineLink = `${linkButton} border bg-card shadow-xs hover:bg-muted`;

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: FileUp,
    title: "Upload your notes",
    body: "Drop in a PDF or paste text. LearnMate pulls out the topics for you.",
  },
  {
    icon: ClipboardCheck,
    title: "Take a short diagnostic",
    body: "A few questions show what you already know and where the gaps are.",
  },
  {
    icon: Map,
    title: "Get your plan",
    body: "A personal path through the topics, ordered by what you need most.",
  },
  {
    icon: PlayCircle,
    title: "Watch it explained",
    body: "Animated walkthroughs of real code, with checkpoints that make you think.",
  },
  {
    icon: Code2,
    title: "Practise with Guru",
    body: "Write code in the built-in editor while your tutor reads it.",
  },
];

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: PlayCircle,
    title: "Animated lessons",
    body: "Every topic becomes a short video with code, variables and flowcharts, each scene tied to your page.",
  },
  {
    icon: Code2,
    title: "Practice that runs",
    body: "Write real code beside the lesson in Python, JavaScript, React, C++, Java and more.",
  },
  {
    icon: MessageCircle,
    title: "A tutor who sees your code",
    body: "Guru asks before it tells, and says plainly when something isn't in your material.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="LearnMate home" className="rounded-md">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
            <a
              href="#how-it-works"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              How it works
            </a>
            {user ? (
              <Link href="/dashboard" className={`${primaryLink} h-8 px-3`}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link href="/signup" className={`${primaryLink} h-8 px-3`}>
                  Sign up
                </Link>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="bg-dots pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24">
            <p className="mx-auto mb-5 w-fit rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
              Learn by doing
            </p>
            <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Turn your study material into something you can learn by doing.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
              Upload a chapter. LearnMate finds the topics, finds what you don&apos;t know yet, and
              builds a lesson, a coding workspace and a revision plan around you.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={user ? "/dashboard" : "/signup"} className={`${primaryLink} h-11 px-6`}>
                {user ? "Open dashboard" : "Get started"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/scenes" className={`${outlineLink} h-11 px-6`}>
                See a lesson
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
            <ProductPreview />
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-14 border-t bg-muted/50 py-20"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 id="how-heading" className="text-3xl font-semibold tracking-tight">
              From notes to understanding
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Five steps, and each one builds on the last.
            </p>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <Card className="h-full">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                        <s.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">0{i + 1}</span>
                    </div>
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-20" aria-labelledby="features-heading">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 id="features-heading" className="text-3xl font-semibold tracking-tight">
              Built around practice
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                  <h3 className="mt-3 font-medium">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground">
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Ready to learn something by doing it?
            </h2>
            <p className="mt-3 max-w-md text-primary-foreground/70">
              Bring one chapter of notes. Leave with a lesson, a plan and a tutor.
            </p>
            <Link
              href={user ? "/dashboard" : "/signup"}
              className={`${linkButton} mt-7 h-11 bg-primary-foreground px-6 text-primary hover:opacity-90`}
            >
              {user ? "Open dashboard" : "Get started"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>Learn by doing.</p>
        </div>
      </footer>
    </div>
  );
}
