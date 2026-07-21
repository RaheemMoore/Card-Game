-- Grant lore_director FULL admin-dashboard access (every page + menu), EXCEPT
-- two capabilities that stay strictly admin-only:
--   (1) changing user roles, and
--   (2) approving/merging Archetype Workshop proposals.
--
-- Design: is_admin() stays STRICT (role = 'admin'). Every carve-out already
-- gates on is_admin() — set_user_role(), the archetype_proposals ship/approve/
-- delete gates, and the profiles owner-or-admin policy — so leaving is_admin()
-- alone keeps those admin-only BY CONSTRUCTION. We only widen the page-backing
-- surfaces to is_lore_director() (true for admin OR lore_director). A trigger
-- closes a pre-existing profiles self-escalation hole (any user could
-- previously UPDATE their own profiles.role) so the "cannot change roles"
-- boundary is actually enforced, not just hidden in the UI.

-- 1. Page-backing admin RPCs: widen the internal gate is_admin() -> is_lore_director().
--    Bodies are otherwise verbatim (fetched from pg_get_functiondef).

create or replace function public.get_system_stats()
  returns json language sql stable security definer set search_path to ''
as $function$
  select case when public.is_lore_director() then json_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_admins', (select count(*) from public.profiles where role = 'admin'),
    'total_cards', (select count(*) from public.cards),
    'total_txns', (select count(*) from public.economy_transactions),
    'aggregate_premium', (select coalesce(sum(amount), 0) from public.economy_transactions where currency = 'premium' and status in ('pending','committed')),
    'aggregate_gameplay', (select coalesce(sum(amount), 0) from public.economy_transactions where currency = 'gameplay' and status in ('pending','committed'))
  ) else null end;
$function$;

create or replace function public.list_users_for_admin()
  returns table(user_id uuid, email text, role text, is_anonymous boolean, card_count bigint, txn_count bigint, premium_balance numeric, gameplay_balance numeric, last_activity timestamp with time zone, created_at timestamp with time zone)
  language sql stable security definer set search_path to ''
as $function$
  select
    p.user_id, u.email, p.role,
    coalesce(u.is_anonymous, false) as is_anonymous,
    coalesce(c.n, 0) as card_count,
    coalesce(t.n, 0) as txn_count,
    coalesce(pt.s, 0) as premium_balance,
    coalesce(gt.s, 0) as gameplay_balance,
    greatest(p.updated_at, coalesce(c.max_updated, '-infinity'::timestamptz), coalesce(t.max_created, '-infinity'::timestamptz)) as last_activity,
    p.created_at
  from public.profiles p
  left join auth.users u on u.id = p.user_id
  left join lateral (select count(*) as n, max(updated_at) as max_updated from public.cards where user_id = p.user_id) c on true
  left join lateral (select count(*) as n, max(created_at) as max_created from public.economy_transactions where user_id = p.user_id) t on true
  left join lateral (select sum(amount) as s from public.economy_transactions where user_id = p.user_id and currency = 'premium' and status in ('pending','committed')) pt on true
  left join lateral (select sum(amount) as s from public.economy_transactions where user_id = p.user_id and currency = 'gameplay' and status in ('pending','committed')) gt on true
  where public.is_lore_director();
$function$;

create or replace function public.list_cards_for_admin(search_query text default null::text, archetype_filter text default null::text, limit_count integer default 50, offset_count integer default 0)
  returns table(card_id text, user_id uuid, user_email text, archetype text, card_name text, name_and_title text, portrait_url text, created_at timestamp with time zone, total_count bigint)
  language sql stable security definer set search_path to ''
as $function$
  with filtered as (
    select
      c.card_id, c.user_id, u.email as user_email, c.archetype,
      c.data->>'cardName' as card_name,
      c.data->>'nameAndTitle' as name_and_title,
      c.portrait_url, c.created_at
    from public.cards c
    left join auth.users u on u.id = c.user_id
    where public.is_lore_director()
      and (archetype_filter is null or c.archetype = archetype_filter)
      and (
        search_query is null
        or c.card_id ilike '%' || search_query || '%'
        or c.data->>'cardName' ilike '%' || search_query || '%'
        or c.data->>'nameAndTitle' ilike '%' || search_query || '%'
        or coalesce(u.email, '') ilike '%' || search_query || '%'
        or c.user_id::text ilike '%' || search_query || '%'
      )
  ),
  counted as (select count(*) as n from filtered)
  select f.card_id, f.user_id, f.user_email, f.archetype, f.card_name, f.name_and_title, f.portrait_url, f.created_at, counted.n as total_count
  from filtered f cross join counted
  order by f.created_at desc
  limit limit_count offset offset_count;
$function$;

-- Currency grants are NOT one of the two carve-outs — lore_director keeps them.
create or replace function public.grant_admin_adjustment(target_user_id uuid, target_currency text, target_amount numeric, target_reason text)
  returns json language plpgsql security definer set search_path to ''
as $function$
declare
  v_id text; v_seq bigint; v_before numeric; v_after numeric;
begin
  if not public.is_lore_director() then
    raise exception 'not admin';
  end if;
  if target_currency not in ('premium','gameplay') then
    raise exception 'invalid currency: %', target_currency;
  end if;
  if target_amount = 0 then
    raise exception 'amount must be nonzero';
  end if;
  if length(coalesce(trim(target_reason), '')) = 0 then
    raise exception 'reason required';
  end if;

  select coalesce(sum(amount), 0) into v_before
    from public.economy_transactions
    where user_id = target_user_id and currency = target_currency and status in ('pending','committed');
  v_after := v_before + target_amount;

  select coalesce(max(sequence), 0) + 1 into v_seq
    from public.economy_transactions where user_id = target_user_id;

  v_id := 'admin_' || gen_random_uuid()::text;

  insert into public.economy_transactions(
    transaction_id, user_id, currency, amount, type, status,
    balance_before, balance_after, sequence, metadata, created_at, completed_at
  ) values (
    v_id, target_user_id, target_currency, target_amount,
    'admin_adjustment', 'committed',
    v_before, v_after, v_seq,
    jsonb_build_object('reason', target_reason, 'grantedBy', auth.uid()::text),
    now(), now()
  );

  return json_build_object('transaction_id', v_id, 'balance_after', v_after, 'sequence', v_seq);
end;
$function$;

-- 2. Widen page-backing RLS policies from is_admin() to is_lore_director().
--    NOT touched (stay admin-only): profiles owner-or-admin, and every
--    archetype_proposals policy (its is_admin() ship/approve/delete gates).

-- Abilities workspace
alter policy "ability_definitions: admin write" on public.ability_definitions using (public.is_lore_director()) with check (public.is_lore_director());
alter policy "ability_families: admin write"    on public.ability_families    using (public.is_lore_director()) with check (public.is_lore_director());
alter policy "ability_versions: admin write"    on public.ability_versions    using (public.is_lore_director()) with check (public.is_lore_director());
alter policy "canonical_art_assets: admin write" on public.canonical_art_assets using (public.is_lore_director()) with check (public.is_lore_director());

-- Bosses
alter policy "boss_definitions: admin write" on public.boss_definitions using (public.is_lore_director()) with check (public.is_lore_director());
alter policy "boss_versions: admin write"    on public.boss_versions    using (public.is_lore_director()) with check (public.is_lore_director());

-- Prompt Lab
alter policy "prompt_test_batches: admin read/write"   on public.prompt_test_batches   using (public.is_lore_director()) with check (public.is_lore_director());
alter policy "prompt_test_judgments: admin read/write" on public.prompt_test_judgments using (public.is_lore_director()) with check (public.is_lore_director());
alter policy "prompt_test_runs: admin read/write"      on public.prompt_test_runs      using (public.is_lore_director()) with check (public.is_lore_director());

-- Costs / Diagnostics
alter policy "api_usage_events: admin read" on public.api_usage_events using (public.is_lore_director());

-- Player-owned data that admins can reach (Cards page, user drawer, discoveries)
alter policy "cards: owner or admin"                     on public.cards                     using ((auth.uid() = user_id) or public.is_lore_director()) with check ((auth.uid() = user_id) or public.is_lore_director());
alter policy "economy_transactions: owner or admin"      on public.economy_transactions      using ((auth.uid() = user_id) or public.is_lore_director()) with check ((auth.uid() = user_id) or public.is_lore_director());
alter policy "card_ability_references: owner or admin"   on public.card_ability_references   using ((auth.uid() = user_id) or public.is_lore_director()) with check ((auth.uid() = user_id) or public.is_lore_director());
alter policy "player_ability_discoveries: owner or admin" on public.player_ability_discoveries using ((auth.uid() = user_id) or public.is_lore_director()) with check ((auth.uid() = user_id) or public.is_lore_director());

-- Storage: ability art + prompt-test artifacts buckets
alter policy "ability-art: admin delete" on storage.objects using ((bucket_id = 'ability-art') and public.is_lore_director());
alter policy "ability-art: admin update" on storage.objects using ((bucket_id = 'ability-art') and public.is_lore_director()) with check ((bucket_id = 'ability-art') and public.is_lore_director());
alter policy "ability-art: admin write"  on storage.objects with check ((bucket_id = 'ability-art') and public.is_lore_director());
alter policy "prompt-test-artifacts: admin delete" on storage.objects using ((bucket_id = 'prompt-test-artifacts') and public.is_lore_director());
alter policy "prompt-test-artifacts: admin select" on storage.objects using ((bucket_id = 'prompt-test-artifacts') and public.is_lore_director());

-- 3. Close the profiles role self-escalation hole. The owner-or-admin policy
--    lets any user UPDATE their own profile row; without this a lore_director
--    (or any user) could set their own role = 'admin'. Block any role change
--    unless the caller is a true admin. auth.uid() IS NULL covers the
--    service-role / migration context and the SECURITY DEFINER set_user_role()
--    path (which does its own is_admin() check before updating).
create or replace function public.enforce_role_change_admin_only()
  returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'role changes must go through an admin';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_enforce_role_change on public.profiles;
create trigger trg_enforce_role_change
  before update of role on public.profiles
  for each row execute function public.enforce_role_change_admin_only();

-- Trigger functions are never meant to be called directly. Keep it off the
-- exposed REST API surface.
revoke execute on function public.enforce_role_change_admin_only() from public;
revoke execute on function public.enforce_role_change_admin_only() from anon;
revoke execute on function public.enforce_role_change_admin_only() from authenticated;
