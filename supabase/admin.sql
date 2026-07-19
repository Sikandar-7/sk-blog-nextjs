-- ============================================================
--  SK Blog — roles, moderation and the admin panel
--  Run AFTER schema.sql, in: Supabase → SQL Editor → Run
--  Safe to re-run.
-- ============================================================

-- ── 1. Roles + email on profiles ────────────────────────────
-- reader : can sign in and comment (this is what everyone starts as)
-- writer : approved by an admin, can publish articles
-- admin  : can see and moderate everything
alter table public.profiles
  add column if not exists role   text not null default 'reader'
    check (role in ('reader','writer','admin')),
  add column if not exists email  text,
  add column if not exists banned boolean not null default false;

-- Backfill emails for users who signed up before this migration
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- ── 2. Keep capturing email on new signups ──────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url, email, role)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)) || '-' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    'reader'          -- nobody can publish until an admin approves them
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 3. Role helpers ─────────────────────────────────────────
-- SECURITY DEFINER on purpose: a policy on `profiles` that queried
-- `profiles` directly would recurse. These run outside RLS.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and banned = false
  );
$$;

create or replace function public.can_publish()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('writer','admin') and banned = false
  );
$$;

-- ── 4. Profiles: emails must NOT be world-readable ──────────
-- The old policy exposed every column to anyone with the public key.
drop policy if exists "profiles are viewable by everyone" on public.profiles;

drop policy if exists "own profile or admin" on public.profiles;
create policy "own profile or admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "admins update any profile" on public.profiles;
create policy "admins update any profile"
  on public.profiles for update using (public.is_admin());

-- Public identity (name + avatar) still needs to be readable so comment
-- authors can be shown — exposed through a view with no email column.
create or replace view public.public_profiles as
select id, username, full_name, avatar_url
from public.profiles
where banned = false;

grant select on public.public_profiles to anon, authenticated;

-- ── 5. Only approved writers may publish ────────────────────
drop policy if exists "authors create their own posts" on public.posts;
create policy "approved writers create their own posts"
  on public.posts for insert
  with check (auth.uid() = author_id and public.can_publish());

drop policy if exists "authors update their own posts" on public.posts;
create policy "authors or admins update posts"
  on public.posts for update
  using ((auth.uid() = author_id and public.can_publish()) or public.is_admin());

drop policy if exists "authors delete their own posts" on public.posts;
create policy "authors or admins delete posts"
  on public.posts for delete
  using (auth.uid() = author_id or public.is_admin());

drop policy if exists "published posts are viewable by everyone" on public.posts;
create policy "published posts, own drafts, or admin"
  on public.posts for select
  using (status = 'published' or auth.uid() = author_id or public.is_admin());

-- ── 6. Comments: banned users can't post, admins can remove any ──
drop policy if exists "signed-in users write comments" on public.comments;
create policy "unbanned users write comments"
  on public.comments for insert
  with check (
    auth.uid() = author_id
    and not exists (select 1 from public.profiles where id = auth.uid() and banned)
  );

drop policy if exists "users delete their own comments" on public.comments;
create policy "authors or admins delete comments"
  on public.comments for delete
  using (auth.uid() = author_id or public.is_admin());

-- ── 7. Admin dashboard view ─────────────────────────────────
create or replace view public.admin_users as
select
  p.id,
  p.username,
  p.full_name,
  p.email,
  p.role,
  p.banned,
  p.created_at,
  (select count(*) from public.posts    x where x.author_id = p.id) as post_count,
  (select count(*) from public.comments c where c.author_id = p.id) as comment_count
from public.profiles p
order by p.created_at desc;

grant select on public.admin_users to authenticated;

-- The view runs as its caller, so the profiles policy above is what
-- actually restricts it: a non-admin selecting from admin_users sees
-- only their own row.

-- ============================================================
--  LAST STEP — make yourself the admin
--  Replace the email below with yours, then run it.
-- ============================================================
-- update public.profiles set role = 'admin' where email = 'you@example.com';
