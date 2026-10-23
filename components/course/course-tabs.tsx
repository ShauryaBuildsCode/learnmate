"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "quizzes", label: "Quizzes" },
  { slug: "notes", label: "Revision notes" },
  { slug: "mindmap", label: "Mind map" },
  { slug: "plan", label: "Revision plan" },
  { slug: "checklist", label: "Checklist" },
] as const;

/** Section navigation inside one course. */
export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const base = `/course/${courseId}`;
  return (
    <nav aria-label="Course sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b">
        {TABS.map((t) => {
          const href = t.slug ? `${base}/${t.slug}` : base;
          const active = t.slug ? pathname.startsWith(href) : pathname === base;
          return (
            <li key={t.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
