-- Phase 3B bosses: permanent boss library + versioned encounters.
--
-- Two tables mirroring the ability pattern:
--   - boss_definitions: stable identity (id, slug, name, status)
--   - boss_versions: numbered snapshots. Phases + actions live embedded as
--     jsonb inside the version's data payload. No separate boss_phases /
--     boss_actions tables — they're always read together with the version
--     and rebalanced as a unit.
--
-- Library-style RLS: any authenticated user can read (Codex + battle load);
-- only admins may write.
--
-- Battle-record tables (per-user battle history, reward grants, replays) are
-- deferred to B5 when reward integration lands.

-- boss_definitions: permanent identity.
create table public.boss_definitions (
  id text primary key,
  slug text not null unique,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  current_version_id text,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boss_definitions_status_idx on public.boss_definitions(status);

create trigger boss_definitions_set_updated_at
before update on public.boss_definitions
for each row execute function public.set_updated_at();

alter table public.boss_definitions enable row level security;

create policy "boss_definitions: authenticated read"
  on public.boss_definitions for select
  to authenticated
  using (true);

create policy "boss_definitions: admin write"
  on public.boss_definitions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- boss_versions: numbered snapshot of the boss's mechanical shape.
-- Phases + actions are embedded in data.phases[] as jsonb — this mirrors
-- how ability_versions holds effects/triggers.
create table public.boss_versions (
  id text primary key,
  boss_id text not null references public.boss_definitions(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'deprecated')),
  published_at timestamptz,
  deprecated_at timestamptz,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (boss_id, version_number)
);

create index boss_versions_boss_id_idx on public.boss_versions(boss_id);
create index boss_versions_status_idx on public.boss_versions(status);

create trigger boss_versions_set_updated_at
before update on public.boss_versions
for each row execute function public.set_updated_at();

alter table public.boss_versions enable row level security;

create policy "boss_versions: authenticated read"
  on public.boss_versions for select
  to authenticated
  using (true);

create policy "boss_versions: admin write"
  on public.boss_versions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
