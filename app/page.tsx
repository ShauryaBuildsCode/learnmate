import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { AnimatedAuroraBackground } from "@/components/design/animated-aurora-background";
import { ScrollShowcase } from "@/components/design/scroll-showcase";
import { MomentsSection } from "@/components/design/moments-section";
import { FinalCta } from "@/components/design/final-cta";
import { FallingText } from "@/components/design/falling-text";
import { HeroRenderer } from "@/components/design/hero-renderer";
import { LandingHeader } from "@/components/design/landing-header";
import { Logo } from "@/components/design/logo";
import { createClient } from "@/lib/supabase/server";

const linkButton =
  "button-shine relative isolate inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg px-4 text-sm font-medium transition-[background-color,border-color,box-shadow,opacity,transform] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const primaryLink = `${linkButton} bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:opacity-90`;
const outlineLink = `${linkButton} border bg-card shadow-xs hover:border-muted-foreground/40 hover:bg-muted hover:shadow-sm`;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <noscript>
        <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
      </noscript>
      <LandingHeader signedIn={Boolean(user)} />

      <main className="flex-1">
        <section className="hero-cinematic relative overflow-hidden">
          <AnimatedAuroraBackground />
          <div
            aria-hidden="true"
            className="bg-dots pointer-events-none absolute inset-0 -z-[1] opacity-55 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]"
          />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pt-10 pb-6 sm:px-6 sm:pt-16 lg:min-h-[calc(100svh-3.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14 lg:pt-8 lg:pb-12">
            <div className="text-left">
              <p className="hero-label-enter mb-6 flex w-fit items-center gap-2 rounded-full border bg-card/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
                <span className="brand-fill h-1.5 w-1.5 rounded-full" aria-hidden="true" />
                LearnMate · Learn by doing
              </p>
              <h1 className="text-5xl leading-[1.02] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[4.75rem]">
                <span className="block">
                  <FallingText text="Learn it." delay={0.2} />
                </span>
                <span className="block">
                  <FallingText text="Code it." delay={0.38} />
                </span>
                <span className="block pb-[0.08em]">
                  <FallingText text="Master it." delay={0.56} wordClassName="brand-text" />
                </span>
              </h1>
              <p className="hero-copy-enter mt-7 max-w-lg text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
                Turn your study material into animated lessons, hands-on coding, and a personal
                learning journey powered by AI.
              </p>
              <div className="hero-actions-enter mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={user ? "/dashboard" : "/signup"}
                  className={`${primaryLink} group h-11 px-6`}
                >
                  {user ? "Open dashboard" : "Get started"}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link href="/scenes" className={`${outlineLink} h-11 px-6`}>
                  See a lesson
                </Link>
              </div>
              <a
                href="#how-it-works"
                className="hero-scroll-enter group mt-10 hidden w-fit items-center gap-3 rounded-lg py-2 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground lg:flex"
              >
                <span className="flex h-8 w-5 items-start justify-center rounded-full border border-foreground/20 p-1">
                  <ChevronDown className="hero-scroll-dot h-3 w-3" aria-hidden="true" />
                </span>
                Scroll to see how it works
              </a>
            </div>
            <div className="hero-preview-enter relative min-w-0">
              <div className="hero-preview-glow" aria-hidden="true" />
              <HeroRenderer />
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="brand-section brand-section--journey scroll-mt-14 border-t"
          aria-labelledby="how-heading"
        >
          <ScrollShowcase href={user ? "/dashboard" : "/signup"} />
        </section>

        <div className="section-seam" aria-hidden="true" />

        <section
          className="brand-section brand-section--features pt-8 pb-20"
          aria-labelledby="features-heading"
        >
          <MomentsSection />
        </section>

        <section className="px-4 pb-24 sm:px-6">
          <FinalCta
            href={user ? "/dashboard" : "/signup"}
            label={user ? "Open dashboard" : "Get started"}
          />
        </section>
      </main>

      <footer className="brand-footer border-t py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-4 text-sm sm:flex-row sm:px-6">
          <div className="flex flex-col items-center gap-1.5 sm:items-start">
            <Logo />
            <p className="text-muted-foreground">Learn by doing.</p>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-6">
            <a href="#how-it-works" className="footer-link">
              How it works
            </a>
            <Link href="/scenes" className="footer-link">
              See a lesson
            </Link>
            <Link href={user ? "/dashboard" : "/signin"} className="footer-link">
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
