import type { BossStore } from '../persistence/BossStore';
import { SEED_BOSSES, SEED_BOSS_LEGACY_VERSIONS } from '../../data/bosses/seedBosses';

/**
 * Idempotent seed loader. Upserts every SEED_BOSSES entry into the store.
 * Callers: PersistenceGate on cold boot, tests that need a populated store.
 *
 * Returns counters for logging. Safe to call multiple times — writes are
 * upserts.
 */
export interface SeedBossResult {
  definitionsUpserted: number;
  versionsUpserted: number;
}

export async function seedBossLibrary(store: BossStore): Promise<SeedBossResult> {
  let definitionsUpserted = 0;
  let versionsUpserted = 0;

  for (const seed of SEED_BOSSES) {
    await store.saveDefinition(seed.definition);
    definitionsUpserted++;
    await store.saveVersion(seed.version);
    versionsUpserted++;
  }

  // Legacy (deprecated) versions are seeded so any battle that was snapshotted
  // against an older version can still resolve against the frozen numbers.
  for (const legacy of SEED_BOSS_LEGACY_VERSIONS) {
    await store.saveVersion(legacy);
    versionsUpserted++;
  }

  return { definitionsUpserted, versionsUpserted };
}
