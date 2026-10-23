You are working on the FRONTEND DESIGN of LearnMate, in a codebase shared with a teammate who is building the backend, AI logic and the core-feature screens at the same time. Your job is visual design and polish only. The most important rule is NOT overlapping with their work, so read the ownership section first and follow it strictly.

## What LearnMate is
A Next.js 16 (App Router, TypeScript strict, Tailwind v4) app that turns study material (PDF or pasted text) into animated lessons, a live coding workspace and a personal AI tutor, "Guru". Supabase handles auth and data. Pages: landing (/), sign in (/signin), sign up (/signup), dashboard (/dashboard), course (/course/[id]), lesson + IDE (/learn/[topicId]), progress (/progress/[courseId]).

## Design direction
- Minimal, calm, product-quality SaaS. Off-white background, slate-black text and primary elements. No bright accent colours; use the existing success/warning/danger tokens sparingly for status only.
- Light AND dark mode must both look finished. Colours come from CSS variable tokens in `app/globals.css` (`--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--primary`, `--primary-foreground`, `--accent`, `--success`, `--warning`, `--danger`), exposed to Tailwind as `bg-background`, `text-foreground`, `bg-card`, `border-border`, etc. Never hardcode hex colours in components; change the token values instead.
- Consistent spacing, type scale and radii; responsive down to laptop width and graceful on mobile; visible focus states; WCAG AA contrast.
- Icons: `lucide-react`. Animation: CSS transitions or `framer-motion` (already installed). Fonts: Geist via `next/font` (set in `app/layout.tsx`).

## Ownership: STRICT, to avoid merge conflicts

### You OWN these. Edit freely:
- `app/globals.css` (you may change token VALUES and add utilities; do NOT rename or remove existing tokens, other screens depend on them)
- `app/layout.tsx` (fonts, metadata, theme provider wrapper), `app/favicon.ico`, `public/**`
- `app/page.tsx` (landing page)
- `app/signin/page.tsx`, `app/signup/page.tsx`, `components/auth/auth-form.tsx`: visual markup and classes only. Do NOT change the Supabase calls, redirects, form field names/types/validation, or the `mode` prop.
- `app/dashboard/page.tsx`: layout and styling only. Keep the data query and the `<UploadCard />` usage as they are.
- `components/ui/**` (button, card, skeleton, theme-toggle, site-header, sign-out-button, lang-toggle, provider-badge). You may restyle freely, but KEEP every exported component name, prop and behaviour, because other screens import them.
- NEW files you create under `components/design/**`, plus new `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx` (only if they do not exist yet).

### You must NOT edit these. They belong to the teammate and will change while you work:
- `app/api/**`, `lib/**`, `supabase/**`, `proxy.ts`, `instrumentation.ts`, `next.config.ts`
- `tests/**`, `e2e/**`, `evals/**`, `scripts/**`, `fixtures/**`
- `package.json`, `package-lock.json`, `.env*`, `tsconfig.json`, eslint/prettier/vitest/playwright config
- Core-feature screens and their components: `app/course/**`, `app/learn/**`, `app/progress/**`, `app/playground/**`, `app/scenes/**`, `components/ide/**`, `components/tutor/**`, `components/quiz/**`, `components/plan/**`, `components/progress/**`, `components/upload/**`, `components/source/**`, `components/lesson/**`

If a core-feature screen needs a visual change, DO NOT edit it. Instead:
1. Append a request to `docs/design-requests.md` (format is in that file), and/or
2. Build a purely presentational version in `components/design/` (props in, JSX out, no data fetching, no Supabase, no `fetch`, no business logic) so the teammate can adopt it by swapping markup.
Improving the shared tokens and `components/ui/**` will already restyle those screens, which is the intended way to influence them.

### Hard "never" list
- No new dependencies and no changes to `package.json`. If you truly need one, write it in `docs/design-requests.md` and ask.
- Never touch authentication logic, API calls, data fetching, environment variables or database code.
- Never run a repo-wide formatter or "fix all lint" pass. Format only the files you changed (`npx prettier --write <your files>`).
- Never rename or move files you do not own. Never reorder or reformat code you are not changing.
- Keep accessible names that tests rely on: form labels "Email" and "Password", the `aria-label`s "Toggle theme", "Open Guru", "Close Guru", "Ask Guru", "Language", "Dismiss tip", and `role` attributes already present.

## Git workflow
- Work on a branch named `frontend` (create it from the latest `main`). Never commit to `main` directly and never force-push.
- Make small, focused commits, and run `git pull --rebase origin main` before you start each session and before each push, so you pick up the teammate's changes early.
- Before every commit run `npm run typecheck` and `npm run lint`. Both must pass for files you touched.

## Technical notes (Next.js 16 differs from older versions)
- Read the relevant guide in `node_modules/next/dist/docs/` before using a Next API you are unsure of. `middleware.ts` is now `proxy.ts` (not yours). Route `params` are Promises. Typed `PageProps<"/route">` and `LayoutProps` come from `npm run typecheck`.
- Tailwind v4: tokens are declared with `@theme inline` in `app/globals.css`. Dark mode is class-based (`.dark`, via `next-themes`).
- If styles look stale in `npm run dev` after editing `globals.css`, restart the dev server.
- Setup: copy `.env.example` to `.env.local` and get real values from the teammate, then `npm install && npm run dev`. The page `/scenes` is public and needs no backend, so you can preview the lesson player styling there without signing in.
- Do not call real AI providers while designing; they cost money. Use the existing screens as they are.

## Definition of done for your work
Landing, sign in, sign up, dashboard and the shared UI primitives look cohesive in light and dark mode at 1280px, 1024px and mobile widths; focus states are visible; empty, loading and error states are designed; no file outside your ownership list was changed (check with `git diff --stat main...frontend`).
