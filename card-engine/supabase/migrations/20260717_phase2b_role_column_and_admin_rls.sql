-- Phase 2b: role-based admin. Adds profiles.role + widens every RLS
-- policy on public tables to allow admins to reach any user's row.
--
-- We use a SECURITY DEFINER helper (is_admin) to break the recursion
-- that would otherwise happen when profile's own RLS policy queries
-- profiles to check role.

alter table public.profiles
  add column role text not null default 'user'
  check (role in ('user', 'admin'));

-- Backfill: Raheem's two known anon uids from Phase 2 testing become
-- admin. Real login later will linkIdentity onto one of these uids so
-- the role carries.
update public.profiles
  set role = 'admin'
  where user_id in (
    '26e6deff-35eb-4c80-9dc7-8181fc4b7376',
    '7e09b95a-095f-444b-ad2d-b95e210b9b6e'
  );

-- SECURITY DEFINER so it bypasses RLS on profiles while checking the
-- caller's role. Without this the widened RLS policies would recurse.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where user_id = auth.uid()),
    false
  );
$$;

-- is_admin() is only meaningful for signed-in users. Revoke anon +
-- public and grant only authenticated. RLS policies invoke it in the
-- caller's role context so authenticated is the only role that needs it.
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- Widen every existing owner-only policy to (owner OR admin).
drop policy if exists "profiles: owner all" on public.profiles;
create policy "profiles: owner or admin"
  on public.profiles for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "cards: owner all" on public.cards;
create policy "cards: owner or admin"
  on public.cards for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "economy_transactions: owner all" on public.economy_transactions;
create policy "economy_transactions: owner or admin"
  on public.economy_transactions for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());
