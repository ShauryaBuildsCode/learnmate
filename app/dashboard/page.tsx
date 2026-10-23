import Link from "next/link";
import { BookOpen } from "lucide-react";
import { UploadCard } from "@/components/upload/upload-card";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id,title,subject,page_count,created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 p-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <h1 className="text-xl font-semibold">Your courses</h1>
          {(courses ?? []).length === 0 ? (
            <Card className="text-sm text-muted-foreground">
              Nothing here yet. Add a chapter and LearnMate will build your first course.
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(courses ?? []).map((c) => (
                <Link key={c.id} href={`/course/${c.id}`}>
                  <Card className="h-full space-y-1 transition-shadow hover:shadow-md">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-medium">{c.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {c.subject} · {c.page_count} pages
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
        <UploadCard />
      </main>
    </>
  );
}
