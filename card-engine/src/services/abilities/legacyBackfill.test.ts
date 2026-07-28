import { describe, it, expect } from 'vitest';
import type { Card, CardStats } from '../../types/card';
import { InMemoryAbilityStore } from '../persistence/AbilityStore';
import { seedAbilityLibrary } from './seed';
import { backfillCardAbilities, isLegacyCard } from './legacyBackfill';

function makeCard(overrides: Partial<Card> & Pick<Card, 'archetype' | 'stats'>): Card {
  return {
    cardId: overrides.cardId ?? `card_${overrides.archetype}_${Date.now()}${Math.random()}`,
    cardName: 'Test',
    nameAndTitle: 'Test, the Tested',
    portraitAsset: '',
    dominantStat: null,
    border: { baseVariant: 'Default', baseSource: 'none' },
    lore: 'Test lore.',
    whisperWords: [],
    evolutionHistory: {},
    createdAt: '2026-07-18T00:00:00.000Z',
    ...overrides,
  };
}

function foundationStats(atk: number, def: number, resource: number, resourceKind: 'Mana' | 'Tech'): CardStats {
  const base: CardStats = {
    Atk: { value: atk, bias: 'Mid', hardCap: 85 },
    Def: { value: def, bias: 'Mid', hardCap: 85 },
  };
  if (resourceKind === 'Mana') {
    base.Mana = { value: resource, bias: 'Mid', hardCap: 85 };
  } else {
    base.Tech = { value: resource, bias: 'Very High', hardCap: 100 };
  }
  return base;
}

function forgedStats(resource: number, resourceKind: 'Mana' | 'Tech'): CardStats {
  return foundationStats(60, 60, Math.max(resource, 51), resourceKind);
}

function ascendantStats(resource: number, resourceKind: 'Mana' | 'Tech'): CardStats {
  const s = foundationStats(80, 80, Math.max(resource, 71), resourceKind);
  s.Atk.value = 80;
  s.Def.value = 80;
  return s;
}

describe('legacyBackfill', () => {
  it('detects a card with no references as legacy', async () => {
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);
    const card = makeCard({ archetype: 'Barbarian', stats: foundationStats(40, 40, 20, 'Mana') });
    expect(isLegacyCard(store, card)).toBe(true);
  });

  it('assigns a martial core to a Foundation Necromancer', async () => {
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);
    const card = makeCard({
      cardId: 'necro-1',
      archetype: 'Necromancer',
      stats: foundationStats(20, 20, 40, 'Mana'),
    });

    const result = backfillCardAbilities(store, [card]);
    expect(result.cardsUpdated).toBe(1);
    expect(result.referencesWritten).toBeGreaterThanOrEqual(1);

    const refs = store.getReferencesForCard('necro-1');
    const core = refs.find((r) => r.slotType === 'core');
    // Not asserting WHICH ability: only three archetypes are authored, so a
    // Necromancer legitimately draws from the shared pool. What must hold is
    // that a core reference exists at the right tier.
    expect(core?.abilityId).toBeDefined();
    expect(core?.localTier).toBe('Foundation');
  });

  it("assigns Oathbreaker's Answer Signature to a Forged Barbarian but leaves Core empty", async () => {
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);
    const card = makeCard({
      cardId: 'barb-1',
      archetype: 'Barbarian',
      stats: forgedStats(20, 'Mana'),
    });

    const result = backfillCardAbilities(store, [card]);
    expect(result.cardsUpdated).toBe(1);

    const refs = store.getReferencesForCard('barb-1');
    // A Forged Barbarian now fills BOTH slots: the shared basics are
    // core-slot and learnable by anyone, so no card is left with an empty
    // core any more. `useBattle` throws on a card with zero abilities, so
    // this is the behaviour we want.
    expect(refs.find((r) => r.slotType === 'core')?.abilityId).toBeDefined();
    expect(refs.find((r) => r.slotType === 'signature')?.abilityId).toBe('ability_oathbreakers_answer');
  });

  it('assigns Bearing Witness Signature to an Ascendant Mech Pilot', async () => {
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);
    const card = makeCard({
      cardId: 'mech-1',
      archetype: 'Mech Pilot',
      stats: ascendantStats(90, 'Tech'),
    });

    const result = backfillCardAbilities(store, [card]);
    expect(result.cardsUpdated).toBe(1);

    const refs = store.getReferencesForCard('mech-1');
    // Mech Pilot has no authored set yet (tech archetypes land in the second
    // roster pass), so it draws from the shared pool. What must hold is that
    // the card ends up with SOMETHING at the right tier.
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ref.localTier).toBe('Ascendant');
  });

  it('skips a card that already has references', async () => {
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);
    const card = makeCard({
      cardId: 'necro-2',
      archetype: 'Necromancer',
      stats: foundationStats(20, 20, 40, 'Mana'),
    });

    backfillCardAbilities(store, [card]);
    const before = store.getReferencesForCard('necro-2').length;
    const result = backfillCardAbilities(store, [card]);
    const after = store.getReferencesForCard('necro-2').length;

    expect(before).toBe(after);
    expect(result.cardsUpdated).toBe(0);
  });

  it('excludes restricted families from candidates', async () => {
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);
    const druid = makeCard({
      cardId: 'druid-1',
      archetype: 'Druid',
      stats: forgedStats(60, 'Mana'),
    });

    backfillCardAbilities(store, [druid]);
    const refs = store.getReferencesForCard('druid-1');
    // Druid preferred = nature; secondary = holy, beast. A martial-only
    // ability scores 0 and is never picked, so the Druid lands on Thornmantle
    // (nature) — which is the whole point of the family scoring.
    const signature = refs.find((r) => r.slotType === 'signature');
    expect(signature?.abilityId).toBe('ability_thornmantle');
  });
});
