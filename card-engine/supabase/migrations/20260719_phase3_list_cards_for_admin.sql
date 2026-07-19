-- Phase 3: cross-user card listing for /admin/cards. Widened cards RLS
-- already lets an admin SELECT all rows, but joining auth.users for the
-- owner email needs SECURITY DEFINER (same pattern as list_users_for_admin).
--
-- Returns just the fields the gallery needs — full card blob is fetched
-- on demand from the widened public.cards SELECT when a row is opened.

create or replace function public.list_cards_for_admin(
  search_query text default null,
  archetype_filter text default null,
  limit_count int default 50,
  offset_count int default 0
)
returns table(
  card_id text,
  user_id uuid,
  user_email text,
  archetype text,
  card_name text,
  name_and_title text,
  portrait_url text,
  created_at timestamptz,
  total_count bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  with filtered as (
    select
      c.card_id,
      c.user_id,
      u.email as user_email,
      c.archetype,
      c.data->>'cardName' as card_name,
      c.data->>'nameAndTitle' as name_and_title,
      c.portrait_url,
      c.created_at
    from public.cards c
    left join auth.users u on u.id = c.user_id
    where public.is_admin()
      and (
        archetype_filter is null or c.archetype = archetype_filter
      )
      and (
        search_query is null
        or c.card_id ilike '%' || search_query || '%'
        or c.data->>'cardName' ilike '%' || search_query || '%'
        or c.data->>'nameAndTitle' ilike '%' || search_query || '%'
        or coalesce(u.email, '') ilike '%' || search_query || '%'
        or c.user_id::text ilike '%' || search_query || '%'
      )
  ),
  counted as (
    select count(*) as n from filtered
  )
  select
    f.card_id,
    f.user_id,
    f.user_email,
    f.archetype,
    f.card_name,
    f.name_and_title,
    f.portrait_url,
    f.created_at,
    counted.n as total_count
  from filtered f
  cross join counted
  order by f.created_at desc
  limit limit_count
  offset offset_count;
$$;

revoke execute on function public.list_cards_for_admin(text, text, int, int) from public;
revoke execute on function public.list_cards_for_admin(text, text, int, int) from anon;
grant execute on function public.list_cards_for_admin(text, text, int, int) to authenticated;
