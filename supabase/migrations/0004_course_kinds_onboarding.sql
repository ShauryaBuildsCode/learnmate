-- Course kind (coding vs concept material), practice items for non-coding courses, and learner profile / onboarding.

alter table public.courses
  add column kind text not null default 'programming' check (kind in ('programming', 'concepts')),
  add column language text;

alter table public.profiles
  add column goal text,
  add column level text check (level in ('beginner', 'intermediate', 'advanced')),
  add column interests text,
  add column daily_minutes int check (daily_minutes between 5 and 600),
  add column onboarded_at timestamptz;

-- People who already use the app have seen enough; only new sign-ups get the welcome tour.
update public.profiles set onboarded_at = now() where onboarded_at is null;

-- Interactive practice for material that isn't about programming: multiple choice, short answer, fill in the blank.
create table public.practice_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null references public.topics (id) on delete cascade,
  kind text not null check (kind in ('mcq', 'short', 'cloze')),
  data jsonb not null,
  page int not null
);
create index practice_items_topic_idx on public.practice_items (topic_id);

create table public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.practice_items (id) on delete cascade,
  answer text not null,
  correct boolean not null,
  feedback text,
  created_at timestamptz not null default now()
);
create index practice_answers_idx on public.practice_answers (user_id, item_id, created_at);

alter table public.practice_items enable row level security;
alter table public.practice_answers enable row level security;

create policy practice_items_own on public.practice_items for all
  using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));

create policy practice_answers_own on public.practice_answers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sign-up collects the learner's name and a few preferences; copy them into the profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, ui_lang, goal, level, interests, daily_minutes)
  values (
    new.id,
    coalesce(nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1)),
    case when meta ->> 'ui_lang' = 'hi' then 'hi' else 'en' end,
    nullif(left(meta ->> 'goal', 40), ''),
    case when meta ->> 'level' in ('beginner', 'intermediate', 'advanced') then meta ->> 'level' else null end,
    nullif(left(meta ->> 'interests', 200), ''),
    case when (meta ->> 'daily_minutes') ~ '^[0-9]{1,3}$'
      and (meta ->> 'daily_minutes')::int between 5 and 600
      then (meta ->> 'daily_minutes')::int else null end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
