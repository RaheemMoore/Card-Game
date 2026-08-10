-- The permanent roster — the Workshop's output.
--
-- Direction change (Raheem, 2026-08-10): the game stops generating characters
-- at runtime. Raheem + Tori hand-curate ~10 CHARACTERS per archetype, and each
-- character is produced in every element its archetype allows. Players answer
-- Story Pillar questions (which character) and pick an element (which variant).
--
-- "Only cards that go through this workshop and are now labeled as permanent
-- cards will be included in the game." Everything in public.cards is TEMPORARY
-- and stays that way — nothing migrates across the boundary. These two tables
-- ARE the boundary.
--
-- Shape follows the Phase 3 ability library (20260718_phase3_ability_tables):
-- jsonb `data` holds the full TS object, a few columns are promoted for
-- filter/sort, globally readable to authenticated users so the game can render
-- the roster, and writes are restricted to operators.
--
-- Two tables, not one: Story Pillars resolve to a CHARACTER, element resolves
-- to a VARIANT, and publishing happens per variant (a Monk has 8 elements and
-- must not wait for all of them). One table would force duplicated identity per
-- element, or a nested array that cannot be queried or RLS'd per variant.

-- ---------------------------------------------------------------------------
-- curated_characters — one identity across Foundation / Forged / Ascendant.
-- ---------------------------------------------------------------------------

create table public.curated_characters (
  id text primary key,
  archetype text not null,
  -- 1..10. The roster slot on the Workshop's board.
  slot_index integer not null,
  -- 'seeded' is a real working state, not a nicety: a bench candidate has been
  -- chosen and the three rank images are being made OUTSIDE the app. Without it
  -- a half-started character is invisible and gets stranded.
  status text not null default 'draft'
    check (status in ('draft', 'seeded', 'in_review', 'permanent', 'retired')),
  display_name text,
  data jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (archetype, slot_index)
);

create index curated_characters_archetype_status_idx
  on public.curated_characters(archetype, status);

create trigger curated_characters_set_updated_at
before update on public.curated_characters
for each row execute function public.set_updated_at();

alter table public.curated_characters enable row level security;

create policy "curated_characters: authenticated read"
  on public.curated_characters for select
  to authenticated
  using (true);

create policy "curated_characters: director write"
  on public.curated_characters for all
  to authenticated
  using (public.is_lore_director())
  with check (public.is_lore_director());

-- ---------------------------------------------------------------------------
-- curated_variants — the character as it manifests in one element.
-- ---------------------------------------------------------------------------

create table public.curated_variants (
  id text primary key,
  character_id text not null
    references public.curated_characters(id) on delete cascade,
  element text not null,
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'permanent', 'hidden')),
  -- 'bespoke' = three images generated for this element specifically.
  -- 'derived' = reuses the character's master art. Recorded so we always know
  -- which variants got real art and which are wearing the master's.
  art_mode text not null default 'bespoke'
    check (art_mode in ('bespoke', 'derived')),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (character_id, element)
);

create index curated_variants_character_idx on public.curated_variants(character_id);
create index curated_variants_status_idx on public.curated_variants(status);

create trigger curated_variants_set_updated_at
before update on public.curated_variants
for each row execute function public.set_updated_at();

alter table public.curated_variants enable row level security;

create policy "curated_variants: authenticated read"
  on public.curated_variants for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- The permanence gate.
--
-- Raheem: "It's like a filter. A card should have to reach a certain state
-- before it gets through this." So it is enforced, not merely displayed.
--
-- HONEST SCOPE: this SQL is the BACKSTOP, not the whole gate. It checks what
-- the database can genuinely verify on its own — three rank images, lore, a
-- name, bindings, a tiebreaker, stats, and a signed human note. The semantic
-- criteria (coverage rules across the whole archetype, per-question binding
-- completeness, stats inside the archetype's bias tiers) need game data the DB
-- does not have and live in services/workshop/permanenceGate.ts.
--
-- The two must be changed together. The TS gate is what an operator sees; this
-- is what stops a direct PostgREST call from skipping the UI entirely.
-- Follows the idiom of 20260720_workshop_approval_conditions_v2.
-- ---------------------------------------------------------------------------

create or replace function public.curated_character_is_ready(p_character_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- The outer coalesce matters: without it a missing character makes this
  -- return NULL rather than false. RLS happens to treat NULL as false, so it
  -- would still fail closed — but a gate should say no out loud, not rely on
  -- a three-valued-logic coincidence in the policy that calls it.
  select coalesce(
    (
      select
        nullif(trim(c.display_name), '') is not null
        and nullif(trim(c.data ->> 'coreLore'), '') is not null
        -- Written only when a human has accepted the identity sheet field by field.
        and c.data ->> 'identityAcceptedAt' is not null
        and jsonb_typeof(c.data -> 'answerBindings') = 'array'
        and jsonb_array_length(c.data -> 'answerBindings') > 0
        and nullif(trim(c.data -> 'visualTiebreaker' ->> 'optionId'), '') is not null
        and jsonb_typeof(c.data -> 'stats') = 'object'
      from public.curated_characters c
      where c.id = p_character_id
    ),
    false
  );
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function, so the revoke is
-- the part that actually does something — without it these are reachable at
-- /rest/v1/rpc/... without signing in. `authenticated` must keep EXECUTE
-- because RLS policy expressions are evaluated as the querying role.
revoke execute on function public.curated_character_is_ready(text) from public;
revoke execute on function public.curated_character_is_ready(text) from anon;
grant  execute on function public.curated_character_is_ready(text) to authenticated;

create or replace function public.curated_variant_art_is_complete(p_data jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (
      select bool_and(
        nullif(trim(p_data -> 'ranks' -> r ->> 'portraitUrl'), '') is not null
      )
      from unnest(array['Foundation', 'Forged', 'Ascendant']) as r
    ),
    false
  );
$$;

revoke execute on function public.curated_variant_art_is_complete(jsonb) from public;
revoke execute on function public.curated_variant_art_is_complete(jsonb) from anon;
grant  execute on function public.curated_variant_art_is_complete(jsonb) to authenticated;

create policy "curated_variants: director write"
  on public.curated_variants for all
  to authenticated
  using (public.is_lore_director())
  with check (
    public.is_lore_director()
    and (
      public.is_admin()
      or status <> 'permanent'
      or (
        public.curated_variant_art_is_complete(data)
        and nullif(trim(data -> 'signOff' ->> 'by'), '') is not null
        and nullif(trim(data -> 'signOff' ->> 'note'), '') is not null
        and public.curated_character_is_ready(character_id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- curated-art bucket.
--
-- Public read, operator write — the same call made for ability-art in
-- 20260719_phase4_ability_art_bucket, and for the same reason: this is shared
-- game content with no per-user semantics, so per-view signed URLs would
-- multiply requests for nothing.
--
-- Deliberately NOT the `portraits` bucket. That one is private and strictly
-- owner-path-scoped ({user_id}/...), with no admin policy at all — an operator
-- cannot even read another user's object there.
--
-- Path: {characterId}/{element|_master}/{rank}.{ext}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('curated-art', 'curated-art', true)
on conflict (id) do nothing;

create policy "curated-art: director write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'curated-art' and public.is_lore_director());

create policy "curated-art: director update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'curated-art' and public.is_lore_director())
  with check (bucket_id = 'curated-art' and public.is_lore_director());

create policy "curated-art: director delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'curated-art' and public.is_lore_director());
