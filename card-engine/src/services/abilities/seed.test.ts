import { describe, it, expect } from 'vitest';
import { InMemoryAbilityStore } from '../persistence/AbilityStore';
import { seedAbilityLibrary } from './seed';
import { ABILITY_FAMILIES } from '../../data/abilities/families';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';

describe('seedAbilityLibrary', () => {
  it('populates every family and every seed ability + version on a fresh store', async () => {
    const store = new InMemoryAbilityStore();
    const result = await seedAbilityLibrary(store);

    expect(result.familiesUpserted).toBe(ABILITY_FAMILIES.length);
    expect(result.definitionsUpserted).toBe(SEED_ABILITIES.length);
    expect(result.versionsUpserted).toBe(SEED_ABILITIES.length);

    expect(store.getAllFamilies()).toHaveLength(ABILITY_FAMILIES.length);
    expect(store.getAllDefinitions()).toHaveLength(SEED_ABILITIES.length);

    for (const seed of SEED_ABILITIES) {
      const def = store.getDefinition(seed.definition.id);
      const version = store.getVersion(seed.version.id);
      const current = store.getCurrentVersion(seed.definition.id);
      expect(def).toEqual(seed.definition);
      expect(version).toEqual(seed.version);
      expect(current).toEqual(seed.version);
    }
  });

  it('is idempotent — a second call skips everything', async () => {
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);
    const second = await seedAbilityLibrary(store);

    expect(second.familiesUpserted).toBe(0);
    expect(second.definitionsUpserted).toBe(0);
    expect(second.versionsUpserted).toBe(0);
    expect(second.skippedFamilies).toBe(ABILITY_FAMILIES.length);
    expect(second.skippedDefinitions).toBe(SEED_ABILITIES.length);
    expect(second.skippedVersions).toBe(SEED_ABILITIES.length);
  });

  it('re-upserts a family if its values drift', async () => {
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);

    // Mutate an existing family to something else so the seed sees drift.
    const first = ABILITY_FAMILIES[0];
    await store.saveFamily({ ...first, name: 'Drifted Name' });

    const second = await seedAbilityLibrary(store);
    expect(second.familiesUpserted).toBe(1);
    expect(store.getFamily(first.id)?.name).toBe(first.name);
  });
});
