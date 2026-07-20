-- Emberborn Wraith v4 — enables the reducer's interrupt window on the two
-- long-telegraphed heavy attacks (Ember Slash in the Teach phase, Ember
-- Lance in the Mechanical phase). Rage phase actions stay uninterruptible.
--
-- Companion to seedBosses.ts EMBERBORN_V4 + PersistenceGate's
-- version-gated re-seed. This migration writes the row directly so the
-- rollout doesn't depend on an admin's client running the seed.
--
-- Idempotent: `on conflict do nothing` on the insert; guarded updates on
-- the definition + v3 status.
--
-- Rollback: DELETE the v4 row, revert boss_definitions.current_version_id
-- to 'bv_fire_elemental_v0_3', and reset v3.status to 'active'. Numbers
-- didn't change so no data loss risk.

-- 1. Insert v4 as a copy of v3's data with two `interruptible` flags flipped
--    on the target action ids. Assumes v3 is present (seeded on any prior
--    boot).
insert into public.boss_versions (
  id,
  boss_id,
  version_number,
  status,
  published_at,
  deprecated_at,
  data
)
select
  'bv_fire_elemental_v0_4',
  boss_id,
  4,
  'active',
  '2026-07-20T00:00:00.000Z',
  null,
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            data,
            '{id}',
            '"bv_fire_elemental_v0_4"'::jsonb
          ),
          '{versionNumber}',
          '4'::jsonb
        ),
        '{publishedAt}',
        '"2026-07-20T00:00:00.000Z"'::jsonb
      ),
      -- phase 1 action 0 = Ember Slash (verified id ordering in seed)
      '{phases,0,actions,0,interruptible}',
      'true'::jsonb
    ),
    -- phase 2 action 0 = Ember Lance
    '{phases,1,actions,0,interruptible}',
    'true'::jsonb
  )
from public.boss_versions
where id = 'bv_fire_elemental_v0_3'
on conflict (id) do nothing;

-- 2. Deprecate v3 so admin history is accurate. Only touches the row if
--    it's still active (idempotent on re-run).
update public.boss_versions
set status = 'deprecated',
    deprecated_at = '2026-07-20T00:00:00.000Z'
where id = 'bv_fire_elemental_v0_3'
  and status = 'active';

-- 3. Point the definition at v4. Also patches the embedded `data` payload
--    so hydrate reads a consistent view (SupabaseBossStore.hydrate copies
--    data → in-memory cache).
update public.boss_definitions
set current_version_id = 'bv_fire_elemental_v0_4',
    data = jsonb_set(
      data,
      '{currentVersionId}',
      '"bv_fire_elemental_v0_4"'::jsonb
    )
where id = 'boss_fire_elemental_v0'
  and current_version_id = 'bv_fire_elemental_v0_3';
