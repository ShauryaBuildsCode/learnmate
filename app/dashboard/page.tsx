import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id,title,subject,page_count,created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Your courses</h1>
        </div>
        <ThemeToggle />
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(courses ?? []).map((c) => (
          <Link key={c.id} href={`/course/${c.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <h2 className="font-medium">{c.title}</h2>
              <p className="text-sm text-muted-foreground">
                {c.subject} · {c.page_count} pages
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
