-- Let the client page its own collection by BYTES instead of rows.
--
-- hydrate() has always counted a page in rows while paying for it in bytes.
-- With portraits still stored as inline base64 a single card averages 3.2 MB,
-- so any fixed row count is a guess: 200 rows blew the 8s statement timeout
-- outright, and 5 rows (~11 MB) was still not reliably under it.
--
-- Measured on the live database, the SERVER detoasts and serialises all 44 MB
-- of one account's cards in 1.6 s. The timeout is therefore not computation —
-- it is the statement staying open while those bytes cross the wire. The only
-- lever that helps is bytes per statement.
--
-- pg_column_size() reads the stored size WITHOUT detoasting the value, so
-- asking "how big is each card" costs 0.19 ms for a whole collection. The
-- client then builds pages that fit a byte budget.
--
-- SECURITY INVOKER (the default) on purpose: the existing "cards: owner or
-- admin" RLS policy is what scopes this, so it cannot leak another user's card
-- list, and there is no definer privilege to reason about.

create or replace function public.card_payload_sizes()
returns table (card_id text, bytes bigint)
language sql
stable
set search_path = ''
as $$
  select c.card_id, pg_column_size(c.data)::bigint
  from public.cards c
  order by c.card_id;
$$;

revoke execute on function public.card_payload_sizes() from public;
revoke execute on function public.card_payload_sizes() from anon;
grant  execute on function public.card_payload_sizes() to authenticated;
