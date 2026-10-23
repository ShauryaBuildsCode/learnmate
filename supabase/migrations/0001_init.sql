-- LearnMate schema. Every table has RLS: rows are visible/writable only to their owner,
-- or (course child tables) to the owner of the parent course.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  ui_lang text not null default 'en' check (ui_lang in ('en', 'hi'))
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  subject text not null,
  source_type text not null check (source_type in ('pdf', 'text')),
  storage_path text,
  page_count int not null,
  created_at timestamptz not null default now()
);
create index courses_user_idx on public.courses (user_id);

create table public.course_pages (
  course_id uuid not null references public.courses (id) on delete cascade,
  page_no int not null,
  text text not null,
  primary key (course_id, page_no)
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position int not null,
  name text not null,
  summary text not null,
  pages int[] not null default '{}'
);
create index topics_course_idx on public.topics (course_id, position);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  language text not null,
  prompt text not null,
  starter_files jsonb not null,
  tests jsonb not null,
  hints jsonb not null,
  page int not null
);
create index exercises_topic_idx on public.exercises (topic_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  ui_lang text not null default 'en',
  script jsonb not null,
  created_at timestamptz not null default now(),
  unique (topic_id, ui_lang)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  kind text not null check (kind in ('diagnostic', 'practice')),
  questions jsonb not null,
  answers jsonb not null,
  per_topic jsonb not null,
  created_at timestamptz not null default now()
);
create index quiz_attempts_idx on public.quiz_attempts (user_id, course_id, created_at);

create table public.exercise_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  language text not null,
  code jsonb not null,
  passed boolean not null,
  results jsonb not null,
  created_at timestamptz not null default now()
);
create index exercise_runs_idx on public.exercise_runs (user_id, exercise_id, created_at);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  version int not null,
  mastery jsonb not null,
  items jsonb not null,
  change_summary text,
  based_on text not null,
  created_at timestamptz not null default now(),
  unique (user_id, course_id, version)
);

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  context jsonb,
  provider text,
  created_at timestamptz not null default now()
);
create index tutor_messages_idx on public.tutor_messages (user_id, course_id, created_at);

-- Per-exercise hint ladder position (0..3), stored per user.
create table public.hint_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  rung int not null default 0 check (rung between 0 and 3),
  primary key (user_id, exercise_id)
);

-- Row level security ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_pages enable row level security;
alter table public.topics enable row level security;
alter table public.exercises enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.exercise_runs enable row level security;
alter table public.plans enable row level security;
alter table public.tutor_messages enable row level security;
alter table public.hint_state enable row level security;

create policy profiles_own on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

create policy courses_own on public.courses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy course_pages_own on public.course_pages for all
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));

create policy topics_own on public.topics for all
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));

create policy exercises_own on public.exercises for all
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));

create policy lessons_own on public.lessons for all
  using (exists (
    select 1 from public.topics t join public.courses c on c.id = t.course_id
    where t.id = topic_id and c.user_id = auth.uid()))
  with check (exists (
    select 1 from public.topics t join public.courses c on c.id = t.course_id
    where t.id = topic_id and c.user_id = auth.uid()));

create policy quiz_attempts_own on public.quiz_attempts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy exercise_runs_own on public.exercise_runs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy plans_own on public.plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tutor_messages_own on public.tutor_messages for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy hint_state_own on public.hint_state for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create a profile row whenever a user signs up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage: private bucket, each user can only touch materials/{uid}/* ---------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy materials_select_own on storage.objects for select
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy materials_insert_own on storage.objects for insert
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy materials_update_own on storage.objects for update
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy materials_delete_own on storage.objects for delete
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
