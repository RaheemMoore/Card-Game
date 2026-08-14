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

  it('gives every card of an archetype that archetype\'s own kit', async () => {
    const store = await seededStore();
    // Ownership deliberately outranks family affinity, so today — with
    // exactly ONE authored ability per archetype per slot — every Barbarian
    // gets the same kit, and that is correct. Identity beats variety while
    // there is only one option; variety returns the moment an archetype has
    // a second core or signature to choose between, because the picker
    // already selects from a band rather than taking the top score.
    const kits = ['a', 'b', 'c', 'd'].map((id) =>
      assignAbilitiesForCard(
        store,
        makeCard({ cardId: `barb-${id}`, archetype: 'Barbarian', stats: forged() }),
      ).map((s) => s.definition.id),
    );
    for (const kit of kits) {
      expect(kit).toEqual(kits[0]);
      // And it must be the Barbarian's own, not a same-family ability
      // borrowed from the Monk or the Beastmaster.
      for (const id of kit) {
        const def = store.getDefinition(id)!;
        const owned = def.tags.includes('barbarian');
        const basic = SHARED_BASIC_ABILITY_IDS.includes(id);
        expect(owned || basic, `${id} belongs to neither Barbarian nor the shared pool`).toBe(true);
      }
    }
  });

  it('does not let one archetype draw another archetype\'s signature', async () => {
    const store = await seededStore();
    // The bug this guards: family scoring alone could not express ownership,
    // so a Barbarian drew the Monk's Repeating Form and the Seraph ended up
    // with a kit containing no damaging ability at all.
    const pairs: [Card['archetype'], string][] = [
      ['Barbarian', 'barbarian'],
      ['Monk', 'monk'],
      ['Seraph', 'seraph'],
      ['Necromancer', 'necromancer'],
      ['Android', 'android'],
    ];
    for (const [archetype, tag] of pairs) {
      const kind = archetype === 'Android' ? 'Tech' : 'Mana';
      const assigned = assignAbilitiesForCard(
        store,
        makeCard({ cardId: `own-${archetype}`, archetype, stats: forged(kind) }),
      );
      for (const a of assigned) {
        if (SHARED_BASIC_ABILITY_IDS.includes(a.definition.id)) continue;
        expect(a.definition.tags, `${archetype} drew ${a.definition.slug}`).toContain(tag);
      }
    }
  });

  it('always gives a hero at least one way to deal damage', async () => {
    const store = await seededStore();
    // A Seraph once resolved to shield + cleanse and literally could not hurt
    // the boss — 120 of 120 sweeps hit the 30-round timeout.
    const archetypes = Object.keys(ARCHETYPE_PREFERRED_FAMILIES) as Card['archetype'][];
    for (const archetype of archetypes) {
      const kind = archetype === 'Mech Pilot' || archetype === 'Android' ? 'Tech' : 'Mana';
      const assigned = assignAbilitiesForCard(
        store,
        makeCard({ cardId: `dmg-${archetype}`, archetype, stats: forged(kind) }),
      );
      const canHurt = assigned.some((a) =>
        a.version.effects.some(
          (e) =>
            e.type === 'direct_damage' || e.type === 'multi_hit' || e.type === 'damage_over_time',
        ),
      );
      expect(canHurt, `${archetype} has no damaging ability`).toBe(true);
    }
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

  it('falls back to the shared basics when an archetype has no set of its own', async () => {
    // Every archetype is authored now, so this constructs the condition
    // explicitly rather than leaning on one being unfinished: a library
    // containing ONLY the shared pool. That is the state the fallback exists
    // for, and it is what the roster looked like mid-authoring.
    const store = new InMemoryAbilityStore();
    await seedAbilityLibrary(store);
    for (const def of store.getAllDefinitions()) {
      if (SHARED_BASIC_ABILITY_IDS.includes(def.id)) continue;
      const version = store.getCurrentVersion(def.id);
      if (version) await store.saveVersion({ ...version, status: 'deprecated' });
    }

    const assigned = assignAbilitiesForCard(
      store,
      makeCard({ cardId: 'mech-1', archetype: 'Mech Pilot', stats: forged('Tech') }),
    );
    expect(assigned.length).toBeGreaterThan(0);
    for (const a of assigned) {
      expect(SHARED_BASIC_ABILITY_IDS).toContain(a.definition.id);
    }
  });

  it('prefers an archetype ability over a basic when one exists', async () => {
    const store = await seededStore();
    // The counterpart: with a full roster a Mech Pilot should reach its own
    // tech kit rather than settling for the universal pool.
    const assigned = assignAbilitiesForCard(
      store,
      makeCard({ cardId: 'mech-2', archetype: 'Mech Pilot', stats: forged('Tech') }),
    );
    expect(assigned.some((a) => !SHARED_BASIC_ABILITY_IDS.includes(a.definition.id))).toBe(true);
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
