import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Code2,
  MessageCircle,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { AnimatedAuroraBackground } from "@/components/design/animated-aurora-background";
import { LearningJourney } from "@/components/design/learning-journey";
import { FloatingProductPreview } from "@/components/design/floating-product-preview";
import { InteractiveFeatureCard } from "@/components/design/interactive-feature-card";
import { LandingHeader } from "@/components/design/landing-header";
import { Logo } from "@/components/design/logo";
import { Reveal, Stagger, StaggerItem } from "@/components/design/motion-primitives";
import { ProductPreview } from "@/components/design/product-preview";
import { createClient } from "@/lib/supabase/server";

const linkButton =
  "button-shine relative isolate inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-lg px-4 text-sm font-medium transition-[background-color,border-color,box-shadow,opacity,transform] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const primaryLink = `${linkButton} bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:opacity-90`;
const outlineLink = `${linkButton} border bg-card shadow-xs hover:border-muted-foreground/40 hover:bg-muted hover:shadow-sm`;

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
      <LandingHeader signedIn={Boolean(user)} />

      <main className="flex-1">
        <section className="hero-cinematic relative overflow-hidden">
          <AnimatedAuroraBackground />
          <div
            aria-hidden="true"
            className="bg-dots pointer-events-none absolute inset-0 -z-[1] opacity-55 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 pt-20 pb-14 text-center sm:px-6 sm:pt-28 lg:pt-32">
            <div>
              <p className="hero-label-enter mx-auto mb-6 w-fit rounded-full border bg-card/65 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
                Learn by doing
              </p>
              <h1 className="text-gradient mx-auto max-w-5xl text-4xl leading-[0.96] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[5rem]">
                <span className="hero-line">
                  <span>Turn your study material</span>
                </span>
                <span className="hero-line">
                  <span>into something you can</span>
                </span>
                <span className="hero-line">
                  <span>learn by doing.</span>
                </span>
              </h1>
              <p className="hero-copy-enter mx-auto mt-7 max-w-2xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
                Upload a chapter. LearnMate finds the topics, finds what you don&apos;t know yet,
                and builds a lesson, a coding workspace and a revision plan around you.
              </p>
              <div className="hero-actions-enter mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
            </div>
          </div>
          <div className="hero-preview-enter relative mx-auto w-full max-w-5xl px-4 sm:px-6">
            <div className="hero-preview-glow" aria-hidden="true" />
            <FloatingProductPreview>
              <ProductPreview />
            </FloatingProductPreview>
          </div>
          <a
            href="#how-it-works"
            className="hero-scroll-enter group relative mx-auto mt-10 mb-8 flex w-fit flex-col items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground sm:mt-12 sm:mb-10"
          >
            Explore the journey
            <span className="flex h-8 w-5 items-start justify-center rounded-full border border-foreground/20 p-1">
              <ChevronDown className="hero-scroll-dot h-3 w-3" aria-hidden="true" />
            </span>
          </a>
        </section>

        <section
          id="how-it-works"
          className="brand-section brand-section--journey scroll-mt-14 border-t py-20"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <LearningJourney />
          </div>
        </section>

        <section
          className="brand-section brand-section--features py-20"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Reveal className="scroll-reveal">
              <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Designed for momentum
              </p>
              <h2
                id="features-heading"
                className="text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                Built around practice
              </h2>
            </Reveal>
            <Stagger className="scroll-reveal mt-10 grid gap-4 md:grid-cols-3">
              {FEATURES.map((f) => (
                <StaggerItem key={f.title}>
                  <InteractiveFeatureCard className="p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent transition-transform duration-300 group-hover:rotate-[-3deg] group-hover:scale-105">
                      <f.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-medium">{f.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.body}</p>
                  </InteractiveFeatureCard>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <Reveal className="scroll-reveal scroll-reveal--scale mx-auto w-full max-w-4xl">
            <div className="brand-cta relative flex w-full flex-col items-center overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-lg sm:py-16">
              <div
                className="bg-dots pointer-events-none absolute inset-0 opacity-20"
                aria-hidden="true"
              />
              <div className="relative flex flex-col items-center">
                <h2 className="text-3xl font-semibold tracking-tight text-balance">
                  Ready to learn something by doing it?
                </h2>
                <p className="mt-3 max-w-md text-primary-foreground/70">
                  Bring one chapter of notes. Leave with a lesson, a plan and a tutor.
                </p>
                <Link
                  href={user ? "/dashboard" : "/signup"}
                  className={`${linkButton} group mt-7 h-11 bg-primary-foreground px-6 text-primary shadow-md hover:shadow-lg hover:opacity-90`}
                >
                  {user ? "Open dashboard" : "Get started"}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="brand-footer border-t py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>Learn by doing.</p>
        </div>
      </footer>
    </div>
  );
}
