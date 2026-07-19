-- ============================================================
--  SK Blog — closed by default
--  Run AFTER schema.sql and admin.sql. Safe to re-run.
--
--  New accounts arrive with no permissions at all: they can read the
--  site (which is public anyway) and nothing else. An admin has to grant
--  access before they can comment or publish.
-- ============================================================

-- ── 1. Everyone new starts blocked ──────────────────────────
alter table public.profiles
  alter column banned set default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url, email, role, banned)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)) || '-' || substr(new.id::text, 1, 4),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    'reader',
    true            -- blocked until an admin approves them
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 2. Blocked users may not write anything ─────────────────
-- can_publish() already excludes banned accounts; this makes the same
-- rule explicit for comments so a blocked account is read-only, full stop.
drop policy if exists "unbanned users write comments" on public.comments;
drop policy if exists "approved users write comments" on public.comments;
create policy "approved users write comments"
  on public.comments for insert
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and banned = false
    )
  );

-- ── 3. Existing admins must stay usable ─────────────────────
-- The new default would otherwise leave the site with no working admin.
update public.profiles set banned = false where role = 'admin';

-- ── 4. Anyone who signed up before this change is now pending ──
-- Comment the next line out if you would rather leave current users alone.
update public.profiles set banned = true where role = 'reader';

-- Done. Signups are read-only until approved from /admin.
