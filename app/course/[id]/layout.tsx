import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CourseTabs } from "@/components/course/course-tabs";
import { PageChipsProvider } from "@/components/course/page-chips-provider";
import { SiteHeader } from "@/components/ui/site-header";
import { toPageMap } from "@/lib/grounding";
import { createClient } from "@/lib/supabase/server";

export default async function CourseLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id,title,subject,page_count")
    .eq("id", id)
    .maybeSingle();
  if (!course) notFound();
  const { data: pages } = await supabase
    .from("course_pages")
    .select("page_no,text")
    .eq("course_id", id)
    .order("page_no");

  return (
    <PageChipsProvider pages={Object.fromEntries(toPageMap(pages ?? []))}>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            {course.subject} · {course.page_count} pages
          </p>
        </div>
        <CourseTabs courseId={course.id} />
        {children}
      </main>
    </PageChipsProvider>
  );
}
