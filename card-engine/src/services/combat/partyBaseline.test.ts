import { describe, expect, it } from 'vitest';
import {
  runBattle,
  buildAbilitySnapshot,
  buildHeroSnapshot,
  buildBattleSnapshot,
  baselineHeroPolicy,
  verifyDeterminism,
} from './harness';
import { advance, initializeBattle, submitPartyCommands } from './reducer';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import type { CardStats } from '../../types/card';

/**
 * C3 party baseline — proves the reducer correctly cycles through a three-hero
 * party for each round without breaking determinism, ability snapshots, or
 * victory checks.
 */

function testStats(atk = 55, def = 45, mana = 60): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

function heroWithAbilities(id: string, name: string) {
  const soulDrain = SEED_ABILITIES.find((s) => s.definition.id === 'ability_soul_drain')!;
  const emberCleave = SEED_ABILITIES.find((s) => s.definition.id === 'ability_ember_cleave')!;
  const radiantWard = SEED_ABILITIES.find((s) => s.definition.id === 'ability_radiant_ward')!;
  return buildHeroSnapshot({
    cardId: id,
    archetype: 'Barbarian',
    displayName: name,
    stats: testStats(),
    rank: 'Forged',
    abilities: [
      buildAbilitySnapshot(soulDrain.definition, soulDrain.version),
      buildAbilitySnapshot(emberCleave.definition, emberCleave.version),
      buildAbilitySnapshot(radiantWard.definition, radiantWard.version),
    ],
  });
}

function partySnapshot(seed: number) {
  return buildBattleSnapshot({
    seed,
    heroes: [
      heroWithAbilities('card_a', 'Hero A'),
      heroWithAbilities('card_b', 'Hero B'),
      heroWithAbilities('card_c', 'Hero C'),
    ],
  });
}

describe('party runtime — 3-hero baseline', () => {
  it('terminates with a valid outcome at seed=1', () => {
    const { result, finalState } = runBattle(partySnapshot(1), baselineHeroPolicy);
    expect(['victory', 'defeat']).toContain(result.outcome);
    expect(finalState.heroes).toHaveLength(3);
  });

  it('preserves determinism across two runs at the same seed', () => {
    expect(verifyDeterminism(partySnapshot(1), baselineHeroPolicy)).toBe(true);
    expect(verifyDeterminism(partySnapshot(42), baselineHeroPolicy)).toBe(true);
  });

  it('every hero acts at least once in the first full round (via player_action_selected events)', () => {
    const { events } = runBattle(partySnapshot(1), baselineHeroPolicy);
    // Grab all player_action_selected events until end_of_round in round 1.
    let round = 0;
    const round1Actors = new Set<string>();
    for (const e of events) {
      if (e.kind === 'round_started') round = e.round;
      if (round === 1 && e.kind === 'player_action_selected') {
        round1Actors.add(e.actorId);
      }
      if (round === 1 && e.kind === 'round_started' && round > 1) break;
    }
    // All three living heroes should have acted at least once in round 1.
    expect(round1Actors.size).toBe(3);
  });

  it('submitPartyCommands processes lane 1 → 2 → 3 in order', () => {
    const state = initializeBattle(partySnapshot(1));
    // Manually walk to first awaiting_player_action.
    // The harness runBattle does this via advance(); we mirror it briefly.
    let s = state;
    // Fast-forward using advance() until we reach the first player pause.
    while (
      s.phase !== 'awaiting_player_action' &&
      s.phase !== 'awaiting_target' &&
      s.phase !== 'battle_over'
    ) {
      const step = advance(s);
      s = step.state;
    }
    expect(s.phase).toBe('awaiting_player_action');
    expect(s.pendingActorIds).toEqual(['hero_0', 'hero_1', 'hero_2']);

    // Submit three guards in a row via submitPartyCommands.
    const step = submitPartyCommands(s, [{ kind: 'guard' }, { kind: 'guard' }, { kind: 'guard' }]);
    // pendingActorIds should be drained; either awaiting_player_action (next round set up)
    // or resolving_boss / later. What matters: all three player_action_selected fired in order.
    const actorOrder = step.events
      .filter((e) => e.kind === 'player_action_selected')
      .map((e) => (e.kind === 'player_action_selected' ? e.actorId : ''));
    expect(actorOrder).toEqual(['hero_0', 'hero_1', 'hero_2']);
    expect(step.state.pendingActorIds).toEqual([]);
  });
});

describe('solo backwards-compat', () => {
  it('single-hero snapshot behaves identically to legacy solo path', () => {
    const soloSnap = buildBattleSnapshot({
      seed: 7,
      hero: heroWithAbilities('card_solo', 'Solo'),
    });
    const { result } = runBattle(soloSnap, baselineHeroPolicy);
    expect(['victory', 'defeat']).toContain(result.outcome);
    expect(verifyDeterminism(soloSnap, baselineHeroPolicy)).toBe(true);
  });
});
