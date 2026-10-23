"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FallingText } from "@/components/design/falling-text";
import { InView } from "@/components/design/section-motion";

/** The closing beat of the journey: calm lighting, one clear action. */
export function FinalCta({ href, label }: { href: string; label: string }) {
  return (
    <InView className="mx-auto w-full max-w-4xl" style={{ transformOrigin: "50% 100%" }}>
      <div className="brand-cta relative flex w-full flex-col items-center overflow-hidden rounded-3xl px-6 py-14 text-center text-primary-foreground shadow-lg sm:py-16 dark:border dark:text-foreground">
        <div
          className="bg-dots pointer-events-none absolute inset-0 opacity-15"
          aria-hidden="true"
        />
        <div className="relative flex flex-col items-center">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            <FallingText text="Ready to learn something by doing it?" trigger="view" />
          </h2>
          <InView
            className="mt-4 max-w-md text-primary-foreground/70 dark:text-muted-foreground"
            delay={0.25}
          >
            <p>Bring one chapter of notes. Leave with a lesson, a plan and a tutor.</p>
          </InView>
          <Link
            href={href}
            className="group mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-foreground px-6 text-sm font-medium text-primary shadow-md transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground active:translate-y-0 active:scale-[0.98] dark:bg-foreground dark:text-background dark:focus-visible:outline-foreground"
          >
            {label}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </InView>
  );
}
