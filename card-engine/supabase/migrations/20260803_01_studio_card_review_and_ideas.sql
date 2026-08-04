-- Studio Wiki live alpha card review + Raheem's private ideas notebook.
--
-- Review decisions are append-only collaboration metadata. They never mutate
-- or delete the underlying Card JSON. During alpha every authenticated team
-- account can read the eligible pool and record the shared Keep / X-out
-- disposition; the latest event is the current team verdict.

create table public.studio_card_review_settings (
  key text primary key check (key = 'alpha'),
  auto_include_until timestamptz,
  review_writes_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.studio_card_review_settings(key, auto_include_until, review_writes_open)
values ('alpha', null, true);

create trigger studio_card_review_settings_set_updated_at
before update on public.studio_card_review_settings
for each row execute function public.set_updated_at();

alter table public.studio_card_review_settings enable row level security;

create policy "studio review settings: authenticated read"
  on public.studio_card_review_settings for select
  using (auth.uid() is not null);

create policy "studio review settings: admin update"
  on public.studio_card_review_settings for update
  using (public.is_admin())
  with check (public.is_admin());

create table public.card_review_decisions (
  id uuid primary key default gen_random_uuid(),
  card_id text not null,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  disposition text not null check (disposition in ('needs_review', 'keep', 'x_out')),
  reason text,
  card_name_snapshot text not null,
  archetype_snapshot text not null,
  created_at timestamptz not null default now(),
  constraint card_review_reason_length check (reason is null or length(reason) <= 2000)
);

create index card_review_decisions_card_created_idx
  on public.card_review_decisions(card_id, created_at desc);
create index card_review_decisions_reviewer_created_idx
  on public.card_review_decisions(reviewer_id, created_at desc);

create or replace function public.fill_card_review_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select
    coalesce(c.data->>'nameAndTitle', c.data->>'cardName', c.card_id),
    c.archetype
  into new.card_name_snapshot, new.archetype_snapshot
  from public.cards c
  cross join public.studio_card_review_settings s
  where c.card_id = new.card_id
    and s.key = 'alpha'
    and (s.auto_include_until is null or c.created_at <= s.auto_include_until);

  if not found then
    raise exception 'card is not eligible for alpha review';
  end if;
  return new;
end;
$$;

create trigger card_review_decisions_fill_snapshot
before insert on public.card_review_decisions
for each row execute function public.fill_card_review_snapshot();

alter table public.card_review_decisions enable row level security;

create policy "card review decisions: authenticated read"
  on public.card_review_decisions for select
  using (auth.uid() is not null);

create policy "card review decisions: alpha insert"
  on public.card_review_decisions for insert
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from public.studio_card_review_settings s
      where s.key = 'alpha' and s.review_writes_open
    )
    and exists (
      select 1
      from public.cards c
      cross join public.studio_card_review_settings s
      where c.card_id = card_review_decisions.card_id
        and s.key = 'alpha'
        and (s.auto_include_until is null or c.created_at <= s.auto_include_until)
    )
  );

-- Server-paginated review-room projection. SECURITY DEFINER is deliberate:
-- authenticated alpha collaborators need to see the shared development pool,
-- while the base cards table keeps its owner/admin RLS unchanged.
create or replace function public.list_studio_card_reviews(
  search_query text default null,
  archetype_filter text default null,
  disposition_filter text default null,
  sort_direction text default 'newest',
  limit_count integer default 24,
  offset_count integer default 0
)
returns table(
  card_id text,
  user_id uuid,
  creator_name text,
  archetype text,
  card_name text,
  name_and_title text,
  portrait_url text,
  card_data jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  review_disposition text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if disposition_filter is not null and disposition_filter not in ('needs_review', 'keep', 'x_out') then
    raise exception 'invalid disposition filter';
  end if;
  if sort_direction not in ('newest', 'oldest') then
    raise exception 'invalid sort direction';
  end if;

  return query
  with eligible as (
    select c.*
    from public.cards c
    cross join public.studio_card_review_settings s
    where s.key = 'alpha'
      and (s.auto_include_until is null or c.created_at <= s.auto_include_until)
  ), current_reviews as (
    select distinct on (d.card_id)
      d.card_id, d.disposition, d.reviewer_id, d.created_at
    from public.card_review_decisions d
    order by d.card_id, d.created_at desc, d.id desc
  ), filtered as (
    select
      c.card_id,
      c.user_id,
      coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Team member') as creator_name,
      c.archetype,
      c.data->>'cardName' as card_name,
      c.data->>'nameAndTitle' as name_and_title,
      c.portrait_url,
      c.data as card_data,
      c.created_at,
      c.updated_at,
      coalesce(r.disposition, 'needs_review') as review_disposition,
      r.reviewer_id as reviewed_by,
      r.created_at as reviewed_at
    from eligible c
    left join public.profiles p on p.user_id = c.user_id
    left join current_reviews r on r.card_id = c.card_id
    where (archetype_filter is null or c.archetype = archetype_filter)
      and (
        disposition_filter is null
        or coalesce(r.disposition, 'needs_review') = disposition_filter
      )
      and (
        search_query is null
        or c.card_id ilike '%' || search_query || '%'
        or coalesce(c.data->>'cardName', '') ilike '%' || search_query || '%'
        or coalesce(c.data->>'nameAndTitle', '') ilike '%' || search_query || '%'
        or c.archetype ilike '%' || search_query || '%'
        or coalesce(p.display_name, p.username, '') ilike '%' || search_query || '%'
      )
  )
  select
    f.card_id, f.user_id, f.creator_name, f.archetype, f.card_name,
    f.name_and_title, f.portrait_url, f.card_data, f.created_at,
    f.updated_at, f.review_disposition, f.reviewed_by, f.reviewed_at,
    count(*) over() as total_count
  from filtered f
  order by
    case when sort_direction = 'oldest' then f.created_at end asc,
    case when sort_direction = 'newest' then f.created_at end desc,
    f.card_id
  limit greatest(1, least(limit_count, 100))
  offset greatest(0, offset_count);
end;
$$;

revoke execute on function public.list_studio_card_reviews(text, text, text, text, integer, integer) from public;
revoke execute on function public.list_studio_card_reviews(text, text, text, text, integer, integer) from anon;
grant execute on function public.list_studio_card_reviews(text, text, text, text, integer, integer) to authenticated;

-- Raheem's Desk: personal durable notes, deliberately not tasks.
create table public.studio_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_ideas_body_nonempty check (length(trim(body)) > 0),
  constraint studio_ideas_body_length check (length(body) <= 20000)
);

create index studio_ideas_owner_updated_idx
  on public.studio_ideas(owner_id, updated_at desc);

create trigger studio_ideas_set_updated_at
before update on public.studio_ideas
for each row execute function public.set_updated_at();

alter table public.studio_ideas enable row level security;

create policy "studio ideas: own admin read"
  on public.studio_ideas for select
  using (owner_id = auth.uid() and public.is_admin());

create policy "studio ideas: own admin insert"
  on public.studio_ideas for insert
  with check (owner_id = auth.uid() and public.is_admin());

create policy "studio ideas: own admin update"
  on public.studio_ideas for update
  using (owner_id = auth.uid() and public.is_admin())
  with check (owner_id = auth.uid() and public.is_admin());

-- Intentionally no DELETE policy in v1. Notes can be edited, but accidental
-- permanent loss is not exposed until Raheem asks for an archive workflow.
