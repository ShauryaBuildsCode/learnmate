import Link from "next/link";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
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
      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Your courses</h1>
            <p className="text-sm text-muted-foreground">
              Pick up where you left off, or start something new.
            </p>
          </div>
          {(courses ?? []).length === 0 ? (
            <Card className="flex flex-col items-center gap-3 border-dashed px-6 py-14 text-center shadow-none">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="font-medium">No courses yet</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Nothing here yet. Add a chapter and LearnMate will build your first course.
              </p>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {(courses ?? []).map((c) => (
                <li key={c.id}>
                  <Link href={`/course/${c.id}`} className="group block rounded-xl">
                    <Card interactive className="flex h-full flex-col gap-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <h2 className="font-medium text-balance">{c.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {c.subject} · {c.page_count} pages
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-medium">
                        Open course
                        <ChevronRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <UploadCard />
      </main>
    </>
  );
}
