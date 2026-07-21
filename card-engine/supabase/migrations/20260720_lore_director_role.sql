-- Adds a third role, `lore_director`, sitting between `user` and `admin`.
-- A lore director (Tori) can read the Workshop and file/work proposals,
-- but CANNOT ship them to production — is_admin() stays admin-only, so
-- every existing admin gate (ship, currency grants, RPCs) still excludes
-- lore directors. is_lore_director() is provided for future Workshop RLS
-- that wants to grant proposal read/write without full admin.

-- 1. Widen the role check constraint to include lore_director.
alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'lore_director'));

-- 2. is_admin() intentionally UNCHANGED — admin only. Not redefined here
--    so lore_director never inherits admin authority.

-- 3. is_lore_director(): true for admin OR lore_director. SECURITY DEFINER
--    to bypass RLS on profiles while reading the caller's role, mirroring
--    is_admin().
create or replace function public.is_lore_director()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select role in ('admin', 'lore_director')
       from public.profiles where user_id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_lore_director() from public;
revoke execute on function public.is_lore_director() from anon;
grant execute on function public.is_lore_director() to authenticated;

-- 4. set_user_role(): admin-only RPC to assign a role from the console.
--    SECURITY DEFINER so it can update any profiles row past RLS, but the
--    is_admin() guard means only admins can call it. Guards against an
--    admin demoting themselves and locking the console.
create or replace function public.set_user_role(
  target_user_id uuid,
  new_role text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_role text;
begin
  if not public.is_admin() then
    raise exception 'not admin';
  end if;
  if new_role not in ('user', 'admin', 'lore_director') then
    raise exception 'invalid role: %', new_role;
  end if;
  if target_user_id = auth.uid() and new_role <> 'admin' then
    raise exception 'refusing to remove your own admin role';
  end if;

  select role into v_old_role
    from public.profiles where user_id = target_user_id;
  if v_old_role is null then
    raise exception 'no profile for user %', target_user_id;
  end if;

  update public.profiles
    set role = new_role, updated_at = now()
    where user_id = target_user_id;

  return json_build_object(
    'user_id', target_user_id,
    'old_role', v_old_role,
    'new_role', new_role
  );
end;
$$;

revoke execute on function public.set_user_role(uuid, text) from public;
revoke execute on function public.set_user_role(uuid, text) from anon;
grant execute on function public.set_user_role(uuid, text) to authenticated;
