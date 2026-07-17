-- Admin-only RPCs: list_users_for_admin, get_system_stats,
-- grant_admin_adjustment. All three check is_admin() internally so a
-- non-admin session gets empty/null/exception rather than data leakage.
-- Access to auth.users requires SECURITY DEFINER; we colocate that
-- with the is_admin() guard.

create or replace function public.list_users_for_admin()
returns table(
  user_id uuid,
  email text,
  role text,
  is_anonymous boolean,
  card_count bigint,
  txn_count bigint,
  premium_balance numeric,
  gameplay_balance numeric,
  last_activity timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    p.user_id,
    u.email,
    p.role,
    coalesce(u.is_anonymous, false) as is_anonymous,
    coalesce(c.n, 0) as card_count,
    coalesce(t.n, 0) as txn_count,
    coalesce(pt.s, 0) as premium_balance,
    coalesce(gt.s, 0) as gameplay_balance,
    greatest(
      p.updated_at,
      coalesce(c.max_updated, '-infinity'::timestamptz),
      coalesce(t.max_created, '-infinity'::timestamptz)
    ) as last_activity,
    p.created_at
  from public.profiles p
  left join auth.users u on u.id = p.user_id
  left join lateral (
    select count(*) as n, max(updated_at) as max_updated
    from public.cards where user_id = p.user_id
  ) c on true
  left join lateral (
    select count(*) as n, max(created_at) as max_created
    from public.economy_transactions where user_id = p.user_id
  ) t on true
  left join lateral (
    select sum(amount) as s
    from public.economy_transactions
    where user_id = p.user_id and currency = 'premium' and status in ('pending','committed')
  ) pt on true
  left join lateral (
    select sum(amount) as s
    from public.economy_transactions
    where user_id = p.user_id and currency = 'gameplay' and status in ('pending','committed')
  ) gt on true
  where public.is_admin();
$$;

revoke execute on function public.list_users_for_admin() from public;
revoke execute on function public.list_users_for_admin() from anon;
grant execute on function public.list_users_for_admin() to authenticated;

create or replace function public.get_system_stats()
returns json
language sql
security definer
set search_path = ''
stable
as $$
  select case when public.is_admin() then json_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_admins', (select count(*) from public.profiles where role = 'admin'),
    'total_cards', (select count(*) from public.cards),
    'total_txns', (select count(*) from public.economy_transactions),
    'aggregate_premium', (select coalesce(sum(amount), 0) from public.economy_transactions where currency = 'premium' and status in ('pending','committed')),
    'aggregate_gameplay', (select coalesce(sum(amount), 0) from public.economy_transactions where currency = 'gameplay' and status in ('pending','committed'))
  ) else null end;
$$;

revoke execute on function public.get_system_stats() from public;
revoke execute on function public.get_system_stats() from anon;
grant execute on function public.get_system_stats() to authenticated;

create or replace function public.grant_admin_adjustment(
  target_user_id uuid,
  target_currency text,
  target_amount numeric,
  target_reason text
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
  v_seq bigint;
  v_before numeric;
  v_after numeric;
begin
  if not public.is_admin() then
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

  select coalesce(sum(amount), 0)
    into v_before
    from public.economy_transactions
    where user_id = target_user_id
      and currency = target_currency
      and status in ('pending','committed');
  v_after := v_before + target_amount;

  select coalesce(max(sequence), 0) + 1
    into v_seq
    from public.economy_transactions
    where user_id = target_user_id;

  v_id := 'admin_' || gen_random_uuid()::text;

  insert into public.economy_transactions(
    transaction_id, user_id, currency, amount, type, status,
    balance_before, balance_after, sequence, metadata,
    created_at, completed_at
  ) values (
    v_id, target_user_id, target_currency, target_amount,
    'admin_adjustment', 'committed',
    v_before, v_after, v_seq,
    jsonb_build_object('reason', target_reason, 'grantedBy', auth.uid()::text),
    now(), now()
  );

  return json_build_object(
    'transaction_id', v_id,
    'balance_after', v_after,
    'sequence', v_seq
  );
end;
$$;

revoke execute on function public.grant_admin_adjustment(uuid, text, numeric, text) from public;
revoke execute on function public.grant_admin_adjustment(uuid, text, numeric, text) from anon;
grant execute on function public.grant_admin_adjustment(uuid, text, numeric, text) to authenticated;
