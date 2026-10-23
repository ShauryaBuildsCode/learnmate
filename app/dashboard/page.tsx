import Link from "next/link";
import { BookOpen, ChevronRight, FileText } from "lucide-react";
import { UploadCard } from "@/components/upload/upload-card";
import { Reveal, Stagger, StaggerItem } from "@/components/design/motion-primitives";
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
    <div className="dashboard-canvas min-h-screen">
      <SiteHeader />
      <main className="relative mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <Reveal className="dashboard-heading relative overflow-hidden rounded-3xl border bg-card/70 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="dashboard-heading__glow" aria-hidden="true" />
            <div className="relative">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Your learning space
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">Your courses</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick up where you left off, or start something new.
              </p>
            </div>
          </Reveal>
          {(courses ?? []).length === 0 ? (
            <Reveal>
              <Card className="empty-course-state surface-sheen flex flex-col items-center gap-3 border-dashed px-6 py-16 text-center shadow-none">
                <span className="empty-course-state__icon flex h-12 w-12 items-center justify-center rounded-2xl border bg-card shadow-sm">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-medium">No courses yet</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Nothing here yet. Add a chapter and LearnMate will build your first course.
                </p>
              </Card>
            </Reveal>
          ) : (
            <Stagger className="grid gap-4 sm:grid-cols-2" role="list">
              {(courses ?? []).map((c) => (
                <StaggerItem key={c.id} role="listitem">
                  <Link href={`/course/${c.id}`} className="group block rounded-xl">
                    <Card interactive className="course-card flex h-full flex-col gap-4">
                      <span className="course-card__icon flex h-10 w-10 items-center justify-center rounded-xl border bg-accent">
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
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
        <Reveal delay={0.1} className="dashboard-upload-shell h-fit lg:sticky lg:top-24">
          <div className="dashboard-upload-shell__glow" aria-hidden="true" />
          <div className="relative">
            <UploadCard />
          </div>
        </Reveal>
      </main>
    </div>
  );
}
