-- Revision notes, mind maps, checklist and study activity. RLS on everything: rows belong to their owner.

create table public.study_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  ui_lang text not null default 'en' check (ui_lang in ('en', 'hi')),
  notes jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, course_id, ui_lang)
);

create table public.mind_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  ui_lang text not null default 'en' check (ui_lang in ('en', 'hi')),
  graph jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, course_id, ui_lang)
);

-- Student-written to-dos. Study steps (lesson, exercise, quiz, notes) are derived from real progress, not stored.
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index checklist_items_idx on public.checklist_items (user_id, course_id, created_at);

-- Something the student did: opened a lesson, read the notes, explored the mind map. Feeds the checklist and analytics.
create table public.study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid references public.topics (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'notes', 'mindmap')),
  created_at timestamptz not null default now()
);
create index study_events_idx on public.study_events (user_id, created_at);

alter table public.study_notes enable row level security;
alter table public.mind_maps enable row level security;
alter table public.checklist_items enable row level security;
alter table public.study_events enable row level security;

create policy study_notes_own on public.study_notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy mind_maps_own on public.mind_maps for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy checklist_items_own on public.checklist_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy study_events_own on public.study_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
