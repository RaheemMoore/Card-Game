-- Phase 3 abilities: permanent library + per-card references + per-player discoveries.
--
-- Follows the Phase 2 pattern:
--   - jsonb `data` holds the full TS object; a small set of columns are
--     promoted for filter/sort/query purposes.
--   - Library tables (families, definitions, versions, canonical_art) are
--     globally readable to authenticated users so the Codex can render
--     without exposing individual player state; only admins may write.
--   - Per-user tables (card_ability_references, player_ability_discoveries)
--     use the same owner-or-admin RLS pattern as cards + economy_transactions.
--
-- ability_evolution_links is intentionally deferred (spec §3.4). Adds later
-- only if lore-branching evolution shows up in real cards at A5.

-- ability_families: 8 launch families + future additions.
create table public.ability_families (
  id text primary key,
  name text not null,
  status text not null default 'active' check (status in ('active', 'experimental', 'retired')),
  sort_order integer not null default 100,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ability_families_status_idx on public.ability_families(status);

create trigger ability_families_set_updated_at
before update on public.ability_families
for each row execute function public.set_updated_at();

alter table public.ability_families enable row level security;

create policy "ability_families: authenticated read"
  on public.ability_families for select
  to authenticated
  using (true);

create policy "ability_families: admin write"
  on public.ability_families for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ability_definitions: permanent identities. current_version_id is a soft
-- pointer (no FK) because versions may be inserted after the definition —
-- we validate the pointer in the service layer.
create table public.ability_definitions (
  id text primary key,
  slug text not null unique,
  display_name text not null,
  rarity text not null check (rarity in ('common', 'uncommon', 'rare', 'legendary', 'mythic')),
  role text not null check (role in ('damage', 'defense', 'support', 'control', 'summon', 'utility', 'hybrid')),
  status text not null check (status in ('proposed', 'experimental', 'approved', 'deprecated', 'merged')),
  current_version_id text,
  first_discovered_by_user_id uuid references auth.users(id) on delete set null,
  first_discovered_at timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ability_definitions_status_idx on public.ability_definitions(status);
create index ability_definitions_rarity_idx on public.ability_definitions(rarity);

create trigger ability_definitions_set_updated_at
before update on public.ability_definitions
for each row execute function public.set_updated_at();

alter table public.ability_definitions enable row level security;

create policy "ability_definitions: authenticated read"
  on public.ability_definitions for select
  to authenticated
  using (true);

create policy "ability_definitions: admin write"
  on public.ability_definitions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ability_versions: approved mechanical versions. FK to definitions cascades
-- so a merged/deleted definition takes its versions with it. version_number
-- is monotonic per ability_id — enforced by the service layer.
create table public.ability_versions (
  id text primary key,
  ability_id text not null references public.ability_definitions(id) on delete cascade,
  version_number integer not null,
  slot_type text not null check (slot_type in ('core', 'signature', 'ultimate')),
  resource_type text not null check (resource_type in ('mana', 'tech', 'none')),
  status text not null check (status in ('draft', 'experimental', 'approved', 'deprecated')),
  published_at timestamptz,
  deprecated_at timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (ability_id, version_number)
);

create index ability_versions_ability_id_idx on public.ability_versions(ability_id);
create index ability_versions_status_idx on public.ability_versions(status);

alter table public.ability_versions enable row level security;

create policy "ability_versions: authenticated read"
  on public.ability_versions for select
  to authenticated
  using (true);

create policy "ability_versions: admin write"
  on public.ability_versions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- card_ability_references: which abilities each card has, per slot per rank.
-- Multi-row per card. Composite PK covers the natural key so upserts by
-- (card_id, slot_type, local_tier) work without a synthetic id.
--
-- FK to cards cascades so deleting a card takes its references with it.
-- ability_id is text FK to definitions.
create table public.card_ability_references (
  card_id text not null references public.cards(card_id) on delete cascade,
  slot_type text not null check (slot_type in ('core', 'signature', 'ultimate')),
  local_tier text not null check (local_tier in ('Foundation', 'Forged', 'Ascendant')),
  user_id uuid not null references auth.users(id) on delete cascade,
  ability_id text not null references public.ability_definitions(id) on delete restrict,
  ability_version_id text references public.ability_versions(id) on delete set null,
  display_order integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (card_id, slot_type, local_tier)
);

create index card_ability_refs_user_id_idx on public.card_ability_references(user_id);
create index card_ability_refs_ability_id_idx on public.card_ability_references(ability_id);

create trigger card_ability_refs_set_updated_at
before update on public.card_ability_references
for each row execute function public.set_updated_at();

alter table public.card_ability_references enable row level security;

create policy "card_ability_references: owner or admin"
  on public.card_ability_references for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- player_ability_discoveries: per-user discovery ledger. Composite PK on
-- (user_id, ability_id). reward_transaction_id is optional and FKs into the
-- existing economy ledger so reward idempotency lives in one place.
create table public.player_ability_discoveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  ability_id text not null references public.ability_definitions(id) on delete cascade,
  discovered_at timestamptz not null default now(),
  first_discovered_globally boolean not null default false,
  times_seen integer not null default 1,
  times_owned_on_cards integer not null default 0,
  reward_granted boolean not null default false,
  reward_transaction_id text references public.economy_transactions(transaction_id) on delete set null,
  data jsonb not null,
  primary key (user_id, ability_id)
);

create index player_discoveries_ability_id_idx on public.player_ability_discoveries(ability_id);

alter table public.player_ability_discoveries enable row level security;

create policy "player_ability_discoveries: owner or admin"
  on public.player_ability_discoveries for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- canonical_art_assets: Leonardo (or manual/placeholder) artwork per ability.
-- One approved asset per ability at a time; provider + status track lifecycle.
-- Globally readable so the Codex can show art to any player.
create table public.canonical_art_assets (
  id text primary key,
  ability_id text not null references public.ability_definitions(id) on delete cascade,
  provider text not null check (provider in ('leonardo', 'manual', 'placeholder')),
  status text not null check (status in ('pending', 'generating', 'approved', 'rejected', 'replaced')),
  asset_url text not null,
  thumbnail_url text,
  source_prompt_version text,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index canonical_art_ability_id_idx on public.canonical_art_assets(ability_id);
create index canonical_art_status_idx on public.canonical_art_assets(status);

alter table public.canonical_art_assets enable row level security;

create policy "canonical_art_assets: authenticated read"
  on public.canonical_art_assets for select
  to authenticated
  using (true);

create policy "canonical_art_assets: admin write"
  on public.canonical_art_assets for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
