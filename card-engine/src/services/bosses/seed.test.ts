import { describe, it, expect } from 'vitest';
import { InMemoryBossStore } from '../persistence/BossStore';
import { seedBossLibrary } from './seed';
import { snapshotFromBossVersion } from '../combat/harness';
import { SEED_BOSSES } from '../../data/bosses/seedBosses';

describe('seedBossLibrary', () => {
  it('populates a fresh store with all seed bosses', async () => {
    const store = new InMemoryBossStore();
    const result = await seedBossLibrary(store);
    expect(result.definitionsUpserted).toBe(SEED_BOSSES.length);
    // seed writes SEED_BOSSES.length current versions + SEED_BOSS_LEGACY_VERSIONS.
    expect(result.versionsUpserted).toBeGreaterThanOrEqual(SEED_BOSSES.length);
    expect(store.getAllDefinitions().length).toBe(SEED_BOSSES.length);
    for (const seed of SEED_BOSSES) {
      expect(store.getDefinition(seed.definition.id)).toBeDefined();
      expect(store.getCurrentVersion(seed.definition.id)?.id).toBe(seed.version.id);
    }
  });

  it('is idempotent — second call does not duplicate rows', async () => {
    const store = new InMemoryBossStore();
    await seedBossLibrary(store);
    await seedBossLibrary(store);
    expect(store.getAllDefinitions().length).toBe(SEED_BOSSES.length);
  });
});

describe('snapshotFromBossVersion', () => {
  it('round-trips the fire elemental into a runtime BossSnapshot', () => {
    const emberborn = SEED_BOSSES.find((s) => s.definition.id === 'boss_fire_elemental_v0')!;
    const snap = snapshotFromBossVersion(emberborn.definition, emberborn.version);
    expect(snap.bossId).toBe(emberborn.definition.id);
    expect(snap.versionId).toBe(emberborn.version.id);
    expect(snap.name).toBe('Emberborn Wraith');
    expect(snap.maxHp).toBe(340);
    expect(snap.phases.length).toBe(2);
    expect(snap.phases[0].actions.length).toBe(2);
    expect(snap.phases[1].actions.some((a) => a.intentType === 'execute')).toBe(true);
  });
});

describe('BossStore InMemory CRUD', () => {
  it('saveDefinition upserts and getDefinition finds it', async () => {
    const store = new InMemoryBossStore();
    const def = SEED_BOSSES[0].definition;
    await store.saveDefinition(def);
    expect(store.getDefinition(def.id)?.name).toBe(def.name);

    // Upsert with modified name.
    await store.saveDefinition({ ...def, name: 'Updated' });
    expect(store.getDefinition(def.id)?.name).toBe('Updated');
    expect(store.getAllDefinitions().length).toBe(1);
  });

  it('subscribe fires on writes', async () => {
    const store = new InMemoryBossStore();
    let ticks = 0;
    const unsub = store.subscribe(() => ticks++);
    await store.saveDefinition(SEED_BOSSES[0].definition);
    expect(ticks).toBe(1);
    unsub();
    await store.saveDefinition(SEED_BOSSES[0].definition);
    expect(ticks).toBe(1);
  });
});
