import { describe, it, expect } from 'vitest';
import type { Card, CardStats } from '../../types/card';
import { InMemoryAbilityStore } from '../persistence/AbilityStore';
import { seedAbilityLibrary } from './seed';
import { assignAbilitiesForCard, assignAbilitiesForCards } from './rosterAssigner';
import { SHARED_BASIC_ABILITY_IDS } from '../../data/abilities/seedAbilities';
import { ARCHETYPE_PREFERRED_FAMILIES } from '../../data/abilities/families';

function makeCard(overrides: Partial<Card> & Pick<Card, 'archetype' | 'stats'>): Card {
  return {
    cardId: overrides.cardId ?? `card_${overrides.archetype}`,
    cardName: 'Test',
    nameAndTitle: 'Test, the Tested',
    portraitAsset: '',
    dominantStat: null,
    border: { baseVariant: 'Default', baseSource: 'none' },
    lore: 'Test lore.',
    whisperWords: [],
    evolutionHistory: {},
    createdAt: '2026-07-28T00:00:00.000Z',
    ...overrides,
  };
}

function stats(atk: number, def: number, resource: number, kind: 'Mana' | 'Tech'): CardStats {
  const base: CardStats = {
    Atk: { value: atk, bias: 'Mid', hardCap: 85 },
    Def: { value: def, bias: 'Mid', hardCap: 85 },
  };
  if (kind === 'Mana') base.Mana = { value: resource, bias: 'Mid', hardCap: 85 };
  else base.Tech = { value: resource, bias: 'Very High', hardCap: 100 };
  return base;
}

const foundation = (kind: 'Mana' | 'Tech' = 'Mana') => stats(40, 40, 20, kind);
const forged = (kind: 'Mana' | 'Tech' = 'Mana') => stats(60, 60, 60, kind);
const ascendant = (kind: 'Mana' | 'Tech' = 'Mana') => stats(80, 80, 80, kind);

async function seededStore() {
  const store = new InMemoryAbilityStore();
  await seedAbilityLibrary(store);
  return store;
}

describe('rosterAssigner', () => {
  it('never leaves a card with zero abilities, for any archetype', async () => {
    const store = await seededStore();
    // The load-bearing one. `useBattle` THROWS on a card that resolves to no
    // abilities, and only three of eleven archetypes are authored — so every
    // other archetype depends on the shared-basics fallback to be playable at
    // all. If this fails, entering a battle is a crash, not a degradation.
    for (const archetype of Object.keys(ARCHETYPE_PREFERRED_FAMILIES) as Card['archetype'][]) {
      const kind = archetype === 'Mech Pilot' || archetype === 'Android' ? 'Tech' : 'Mana';
      const card = makeCard({ cardId: `c_${archetype}`, archetype, stats: foundation(kind) });
      const assigned = assignAbilitiesForCard(store, card);
      expect(assigned.length, `${archetype} got no abilities`).toBeGreaterThan(0);
    }
  });

  it('is deterministic — the same card always resolves to the same loadout', async () => {
    const store = await seededStore();
    const card = makeCard({ cardId: 'stable-1', archetype: 'Barbarian', stats: forged() });
    const a = assignAbilitiesForCard(store, card).map((s) => s.definition.id);
    const b = assignAbilitiesForCard(store, card).map((s) => s.definition.id);
    expect(a).toEqual(b);
  });

  it('gives different cards different loadouts', async () => {
    const store = await seededStore();
    // Seeded from cardId, so two Barbarians are not obliged to be identical —
    // which is the whole reason this replaced "always take the top score".
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) =>
      assignAbilitiesForCard(
        store,
        makeCard({ cardId: `barb-${id}`, archetype: 'Barbarian', stats: forged() }),
      )
        .map((s) => s.definition.id)
        .join('+'),
    );
    expect(new Set(ids).size).toBeGreaterThan(1);
  });

  it('respects rank — more slots unlock as a card advances', async () => {
    const store = await seededStore();
    const at = (s: CardStats) =>
      assignAbilitiesForCard(store, makeCard({ cardId: 'rank-1', archetype: 'Druid', stats: s }))
        .map((a) => a.slot);
    expect(at(foundation())).toEqual(['core']);
    expect(at(forged())).toEqual(['core', 'signature']);
    expect(at(ascendant())).toEqual(['core', 'signature', 'ultimate']);
  });

  it('never assigns an ability from a restricted family', async () => {
    const store = await seededStore();
    for (const archetype of Object.keys(ARCHETYPE_PREFERRED_FAMILIES) as Card['archetype'][]) {
      const restricted = ARCHETYPE_PREFERRED_FAMILIES[archetype].restricted;
      if (restricted.length === 0) continue;
      const kind = archetype === 'Mech Pilot' || archetype === 'Android' ? 'Tech' : 'Mana';
      const assigned = assignAbilitiesForCard(
        store,
        makeCard({ cardId: `r_${archetype}`, archetype, stats: ascendant(kind) }),
      );
      for (const a of assigned) {
        // The shared basics are the fallback and are exempt: they are
        // deliberately family-neutral, so nothing is "restricted" about them.
        if (SHARED_BASIC_ABILITY_IDS.includes(a.definition.id)) continue;
        for (const fam of a.definition.familyIds) {
          expect(restricted, `${archetype} got restricted family ${fam}`).not.toContain(fam);
        }
      }
    }
  });

  it('gives a Druid a nature ability rather than a martial one', async () => {
    const store = await seededStore();
    const assigned = assignAbilitiesForCard(
      store,
      makeCard({ cardId: 'druid-1', archetype: 'Druid', stats: forged() }),
    );
    const signature = assigned.find((a) => a.slot === 'signature');
    // Family scoring is the point of the whole picker: preferred beats
    // secondary beats nothing, and a martial-only ability scores zero here.
    expect(signature?.definition.familyIds).toContain('nature');
  });

  it('falls back to the shared basics for an unauthored archetype', async () => {
    const store = await seededStore();
    // Mech Pilot has no authored set yet — tech archetypes land in the second
    // roster pass — so it must draw from the shared pool.
    const assigned = assignAbilitiesForCard(
      store,
      makeCard({ cardId: 'mech-1', archetype: 'Mech Pilot', stats: forged('Tech') }),
    );
    // Asserting WHERE the abilities come from, not the internal flag: a Mech
    // Pilot may reach the basics through family affinity (they are 'defense',
    // which Mech Pilot prefers) rather than through the fallback branch. What
    // matters is that nothing archetype-specific exists for it yet, so its
    // whole kit is drawn from the shared pool.
    expect(assigned.length).toBeGreaterThan(0);
    for (const a of assigned) {
      expect(SHARED_BASIC_ABILITY_IDS).toContain(a.definition.id);
    }
  });

  it('leaves an existing loadout alone unless forced', async () => {
    const store = await seededStore();
    const card = makeCard({ cardId: 'keep-1', archetype: 'Seraph', stats: forged() });

    assignAbilitiesForCards(store, [card]);
    const before = store.getReferencesForCard('keep-1').map((r) => r.abilityId);

    const second = assignAbilitiesForCards(store, [card]);
    expect(second.cardsUpdated).toBe(0);
    expect(store.getReferencesForCard('keep-1').map((r) => r.abilityId)).toEqual(before);
  });

  it('replaces the loadout when forced, without duplicating references', async () => {
    const store = await seededStore();
    const card = makeCard({ cardId: 'force-1', archetype: 'Seraph', stats: forged() });

    assignAbilitiesForCards(store, [card]);
    const countBefore = store.getReferencesForCard('force-1').length;

    assignAbilitiesForCards(store, [card], { force: true });
    // The migration path re-runs this over every card; stale references must
    // be cleared first or a card accumulates a slot's worth per boot.
    expect(store.getReferencesForCard('force-1').length).toBe(countBefore);
  });
});
