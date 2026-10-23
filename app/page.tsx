import Link from "next/link";
import { Code2, MessageCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
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
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between p-6">
        <span className="text-lg font-semibold tracking-tight">LearnMate</span>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/signin">
                <Button size="sm" variant="ghost">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-6 pb-16">
        <section className="max-w-2xl space-y-5">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Turn your study material into something you can learn by doing.
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload a chapter. LearnMate finds the topics, finds what you don&apos;t know yet, and
            builds a lesson, a coding workspace and a revision plan around you.
          </p>
          <div className="flex gap-3">
            <Link href={user ? "/dashboard" : "/signup"}>
              <Button size="md">{user ? "Open dashboard" : "Get started"}</Button>
            </Link>
            <Link href="/scenes">
              <Button size="md" variant="outline">
                See a lesson
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="space-y-2 rounded-xl border bg-card p-5">
              <Icon className="h-5 w-5" />
              <h2 className="font-medium">{title}</h2>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
