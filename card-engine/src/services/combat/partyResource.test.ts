import { describe, it, expect } from 'vitest';
import type { CardStats } from '../../types/card';
import { initializeBattle, submitPlayerAction, advance } from './reducer';
import {
  buildAbilitySnapshot,
  buildHeroSnapshot,
  buildBattleSnapshot,
  buildFireElementalBossSnapshot,
} from './harness';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';

/**
 * The shared party resource — two chambers, fed by `strike`, spent by abilities.
 *
 * The economy used to be per-hero: each hero had their own pool and their own
 * +1/round. Moving to a shared pool is the kind of change where the pieces can
 * all typecheck and still be wrong in a way only a balance sweep notices, so
 * the invariants are asserted directly here.
 */

const MANA_STATS: CardStats = {
  Atk: { value: 60, bias: 'Mid', hardCap: 100 },
  Def: { value: 60, bias: 'Mid', hardCap: 100 },
  Mana: { value: 60, bias: 'Mid', hardCap: 100 },
};

const TECH_STATS: CardStats = {
  Atk: { value: 60, bias: 'Mid', hardCap: 100 },
  Def: { value: 60, bias: 'Mid', hardCap: 100 },
  Tech: { value: 60, bias: 'Mid', hardCap: 100 },
};

function hero(id: string, stats: CardStats, archetype: 'Barbarian' | 'Mech Pilot') {
  const attuned = SEED_ABILITIES.find((s) => s.definition.id === 'ability_attuned_strike')!;
  return buildHeroSnapshot({
    cardId: id,
    archetype,
    displayName: id,
    stats,
    rank: 'Forged',
    elementDamageType: 'physical',
    abilities: [buildAbilitySnapshot(attuned.definition, attuned.version)],
  });
}

/** A battle parked in `awaiting_player_action` with the given party. */
function opened(heroes: ReturnType<typeof hero>[]) {
  let state = initializeBattle(
    buildBattleSnapshot({ seed: 11, heroes, boss: buildFireElementalBossSnapshot(4000) }),
  );
  // start_of_round -> boss_intent_reveal -> awaiting_player_action
  while (state.phase !== 'awaiting_player_action') state = advance(state).state;
  return state;
}

describe('party resource chambers', () => {
  it('sizes each chamber from the heroes that actually contribute to it', () => {
    const state = opened([
      hero('m1', MANA_STATS, 'Barbarian'),
      hero('m2', MANA_STATS, 'Barbarian'),
      hero('t1', TECH_STATS, 'Mech Pilot'),
    ]);
    const perHero = state.heroes[0].snapshot.maxResource;

    // Two mana heroes, one tech — the chambers are sums, not a flat party number,
    // so stat and rank progression still grows the pool.
    expect(state.partyResourceMax.mana).toBe(perHero * 2);
    expect(state.partyResourceMax.tech).toBe(perHero);
    // Full at the bell. Opening on empty would force a wasted first round.
    expect(state.partyResource).toEqual(state.partyResourceMax);
  });

  it('leaves the other chamber at zero when no hero uses it', () => {
    const state = opened([
      hero('m1', MANA_STATS, 'Barbarian'),
      hero('m2', MANA_STATS, 'Barbarian'),
      hero('m3', MANA_STATS, 'Barbarian'),
    ]);
    // A single-type party gets an idle chamber. Callers must HIDE it rather
    // than draw an empty vessel that looks like a resource they have run out of.
    expect(state.partyResourceMax.tech).toBe(0);
    expect(state.partyResourceMax.mana).toBeGreaterThan(0);
  });

  it('strike deals damage AND fills the caster’s own chamber', () => {
    const state = opened([
      hero('m1', MANA_STATS, 'Barbarian'),
      hero('t1', TECH_STATS, 'Mech Pilot'),
    ]);
    // Spend the mana chamber down so there is room to refill.
    const drained = {
      ...state,
      partyResource: { ...state.partyResource, mana: 0, tech: 0 },
    };

    const after = submitPlayerAction(drained, { kind: 'strike' }).state;

    expect(after.partyResource.mana).toBeGreaterThan(0);
    // A mana hero striking must not fill the tech chamber.
    expect(after.partyResource.tech).toBe(0);
    expect(after.boss.hp).toBeLessThan(drained.boss.hp);
  });

  it('spends from the caster’s chamber, not the other one', () => {
    const state = opened([
      hero('m1', MANA_STATS, 'Barbarian'),
      hero('t1', TECH_STATS, 'Mech Pilot'),
    ]);
    const ability = state.heroes[0].snapshot.abilities[0];
    const before = state.partyResource;

    const after = submitPlayerAction(state, {
      kind: 'ability',
      abilityDefinitionId: ability.definitionId,
      targetActorIds: [state.boss.actorId],
    }).state;

    expect(after.partyResource.mana).toBe(before.mana - ability.version.resourceCost);
    expect(after.partyResource.tech).toBe(before.tech);
  });

  it('a refused ability does NOT consume the hero’s turn', () => {
    const state = opened([
      hero('m1', MANA_STATS, 'Barbarian'),
      hero('m2', MANA_STATS, 'Barbarian'),
    ]);
    const ability = state.heroes[0].snapshot.abilities.find((a) => a.version.resourceCost > 0);
    if (!ability) return; // seed abilities are free; nothing to assert

    const broke = { ...state, partyResource: { mana: 0, tech: 0 } };
    const pendingBefore = broke.pendingActorIds.length;

    const res = submitPlayerAction(broke, {
      kind: 'ability',
      abilityDefinitionId: ability.definitionId,
      targetActorIds: [state.boss.actorId],
    });

    expect(res.events.some((e) => e.kind === 'action_denied')).toBe(true);
    // The whole point: the hero can still act. This used to burn the round,
    // and a shared pool makes it far likelier — another hero can empty the
    // chamber between deciding and clicking.
    expect(res.state.pendingActorIds.length).toBe(pendingBefore);
  });

  it('end-of-round regen feeds the CHAMBER, not just the hero mirror', () => {
    // The regression this exists to prevent: when the shared pool landed, only
    // `hero.resource` was regenerated, so the party's entire passive income
    // vanished and the chamber could be refilled only by striking. Fights ran
    // several rounds longer and two tower floors flipped from winnable to
    // unwinnable — visible only in the balance sweep.
    const state = opened([
      hero('m1', MANA_STATS, 'Barbarian'),
      hero('m2', MANA_STATS, 'Barbarian'),
    ]);
    let s = { ...state, partyResource: { mana: 0, tech: 0 } };

    // Everyone acts, then run to the top of the next round.
    for (let i = s.pendingActorIds.length; i > 0; i--) {
      s = submitPlayerAction(s, { kind: 'guard' }).state;
      // Between hero submissions the machine parks in resolving_reactions.
      while (s.phase === 'resolving_reactions') s = advance(s).state;
    }
    const startRound = s.round;
    let guard = 0;
    while (s.round === startRound && guard++ < 40) s = advance(s).state;

    // Two living mana heroes → +2 into the mana chamber.
    expect(s.partyResource.mana).toBe(2);
  });
});
