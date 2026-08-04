import { describe, expect, it } from 'vitest';
import type { CardStats } from '../../types/card';
import type { BattleState, HeroCombatant } from '../../types/combat';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import {
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildFireElementalBossSnapshot,
  buildHeroSnapshot,
} from './harness';
import { advance, initializeBattle } from './reducer';
import { hasCurrentlyUsableAbility } from './actionAvailability';

const STATS: CardStats = {
  Atk: { value: 60, bias: 'Mid', hardCap: 100 },
  Def: { value: 60, bias: 'Mid', hardCap: 100 },
  Mana: { value: 60, bias: 'Mid', hardCap: 100 },
};

function opened(): BattleState {
  const seed = SEED_ABILITIES.find((entry) => entry.definition.id === 'ability_attuned_strike')!;
  const hero = buildHeroSnapshot({
    cardId: 'hero', archetype: 'Barbarian', displayName: 'Hero', stats: STATS,
    rank: 'Forged', elementDamageType: 'searing',
    abilities: [buildAbilitySnapshot(seed.definition, seed.version)],
  });
  let state = initializeBattle(buildBattleSnapshot({
    seed: 7, heroes: [hero], boss: buildFireElementalBossSnapshot(4000),
  }));
  while (state.phase !== 'awaiting_player_action') state = advance(state).state;
  return state;
}

function replaceHero(state: BattleState, update: (hero: HeroCombatant) => HeroCombatant): BattleState {
  return { ...state, heroes: [update(state.heroes[0])] };
}

describe('current ability availability', () => {
  it('uses the same live cooldown, resource, charge, status, and target gates as the reducer', () => {
    const state = opened();
    const hero = state.heroes[0];
    const ability = hero.snapshot.abilities[0];
    expect(hasCurrentlyUsableAbility(state, hero)).toBe(true);

    const dry = replaceHero(
      { ...state, partyResource: { mana: 0, tech: 0 } },
      (current) => ({
        ...current,
        snapshot: {
          ...current.snapshot,
          abilities: [{
            ...ability,
            resourceCost: 1,
            version: { ...ability.version, resourceCost: 1 },
          }],
        },
      }),
    );
    expect(hasCurrentlyUsableAbility(dry, dry.heroes[0])).toBe(false);

    const cooling = replaceHero(state, (current) => ({
      ...current,
      cooldowns: [{ abilityDefinitionId: ability.definitionId, remainingRounds: 1 }],
    }));
    expect(hasCurrentlyUsableAbility(cooling, cooling.heroes[0])).toBe(false);

    for (const statusId of ['stunned', 'silenced'] as const) {
      const blocked = replaceHero(state, (current) => ({
        ...current,
        statuses: [{
          instanceId: `status_${statusId}`,
          statusId,
          sourceActorId: state.boss.actorId,
          application: { statusId, duration: 1, stacks: 1 },
          stacks: 1,
          remainingRounds: 1,
        }],
      }));
      expect(hasCurrentlyUsableAbility(blocked, blocked.heroes[0])).toBe(false);
    }

    const defeatedBoss = { ...state, boss: { ...state.boss, defeated: true } };
    expect(hasCurrentlyUsableAbility(defeatedBoss, defeatedBoss.heroes[0])).toBe(false);

    const uncharged = replaceHero(state, (current) => ({
      ...current,
      ultimateCharge: 99,
      snapshot: { ...current.snapshot, abilities: [{ ...ability, slot: 'ultimate' }] },
    }));
    expect(hasCurrentlyUsableAbility(uncharged, uncharged.heroes[0])).toBe(false);
  });

  it('accepts the hero when any one snapshotted ability remains legal', () => {
    const state = opened();
    const base = state.heroes[0].snapshot.abilities[0];
    const second = {
      ...base,
      definitionId: `${base.definitionId}_ready`,
      slot: base.slot === 'core' ? 'signature' as const : 'core' as const,
    };
    const mixed = replaceHero(state, (hero) => ({
      ...hero,
      snapshot: { ...hero.snapshot, abilities: [base, second] },
      cooldowns: [{ abilityDefinitionId: base.definitionId, remainingRounds: 2 }],
    }));
    expect(hasCurrentlyUsableAbility(mixed, mixed.heroes[0])).toBe(true);
  });

  it('does not count a hidden duplicate of a locked command slot', () => {
    const state = opened();
    const base = state.heroes[0].snapshot.abilities[0];
    const hiddenDuplicate = { ...base, definitionId: `${base.definitionId}_hidden` };
    const duplicate = replaceHero(state, (hero) => ({
      ...hero,
      snapshot: { ...hero.snapshot, abilities: [base, hiddenDuplicate] },
      cooldowns: [{ abilityDefinitionId: base.definitionId, remainingRounds: 2 }],
    }));
    expect(hasCurrentlyUsableAbility(duplicate, duplicate.heroes[0])).toBe(false);
  });
});
