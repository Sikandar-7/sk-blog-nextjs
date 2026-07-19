-- ============================================================
--  SK Blog — database schema
--  Run this once in: Supabase → SQL Editor → New query → Run
--  Safe to re-run: every statement is guarded.
-- ============================================================

-- ── PROFILES ────────────────────────────────────────────────
-- One row per registered user. Mirrors auth.users, which we
-- never expose to the client directly.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  full_name   text,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now()
);

-- ── POSTS ───────────────────────────────────────────────────
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  slug            text unique not null,
  title           text not null,
  excerpt         text,
  content         text not null,          -- markdown
  cover_url       text,
  category        text not null default 'General',
  tags            text[] not null default '{}',
  status          text not null default 'draft' check (status in ('draft','published')),
  reading_minutes int  not null default 1,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists posts_status_published_idx on public.posts (status, published_at desc);
create index if not exists posts_author_idx           on public.posts (author_id);
create index if not exists posts_category_idx         on public.posts (category);

-- ── COMMENTS ────────────────────────────────────────────────
-- Keyed by slug rather than a posts.id foreign key on purpose: articles come
-- from two places (MDX files in the repo and rows in `posts`), and readers
-- should be able to comment on either without the two models diverging.
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_slug  text not null,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_slug, created_at desc);

-- ── LIKES ───────────────────────────────────────────────────
create table if not exists public.likes (
  post_slug  text not null,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_slug, user_id)
);

-- ============================================================
--  ROW LEVEL SECURITY
--  Without these every anon key holder could rewrite the site,
--  so RLS is on for every table and the policies are explicit.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.comments enable row level security;
alter table public.likes    enable row level security;

-- PROFILES: world-readable, self-writable
drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "users insert their own profile" on public.profiles;
create policy "users insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- POSTS: published are public; drafts only for their author
drop policy if exists "published posts are viewable by everyone" on public.posts;
create policy "published posts are viewable by everyone"
  on public.posts for select
  using (status = 'published' or auth.uid() = author_id);

drop policy if exists "authors create their own posts" on public.posts;
create policy "authors create their own posts"
  on public.posts for insert with check (auth.uid() = author_id);

drop policy if exists "authors update their own posts" on public.posts;
create policy "authors update their own posts"
  on public.posts for update using (auth.uid() = author_id);

drop policy if exists "authors delete their own posts" on public.posts;
create policy "authors delete their own posts"
  on public.posts for delete using (auth.uid() = author_id);

-- COMMENTS: readable by all, written by signed-in users, deletable by their author
drop policy if exists "comments are viewable by everyone" on public.comments;
create policy "comments are viewable by everyone"
  on public.comments for select using (true);

drop policy if exists "signed-in users write comments" on public.comments;
create policy "signed-in users write comments"
  on public.comments for insert with check (auth.uid() = author_id);

drop policy if exists "users delete their own comments" on public.comments;
create policy "users delete their own comments"
  on public.comments for delete using (auth.uid() = author_id);

-- LIKES: counts are public, a user may only toggle their own
drop policy if exists "likes are viewable by everyone" on public.likes;
create policy "likes are viewable by everyone"
  on public.likes for select using (true);

drop policy if exists "users like as themselves" on public.likes;
create policy "users like as themselves"
  on public.likes for insert with check (auth.uid() = user_id);

drop policy if exists "users remove their own like" on public.likes;
create policy "users remove their own like"
  on public.likes for delete using (auth.uid() = user_id);

-- ============================================================
--  TRIGGERS
-- ============================================================

-- Give every new auth user a profile automatically, so the app never
-- has to deal with a signed-in user that has no profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    -- derive a unique username from the email local-part
    lower(split_part(new.email, '@', 1)) || '-' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- ============================================================
--  PUBLIC VIEW — posts with author + counts, for the site
-- ============================================================
create or replace view public.posts_with_meta as
select
  p.*,
  pr.username     as author_username,
  pr.full_name    as author_name,
  pr.avatar_url   as author_avatar,
  (select count(*) from public.likes    l where l.post_slug = p.slug) as like_count,
  (select count(*) from public.comments c where c.post_slug = p.slug) as comment_count
from public.posts p
join public.profiles pr on pr.id = p.author_id;

-- Done. Tables, policies, triggers and the read view are in place.
