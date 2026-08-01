import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../../types/combat';
import { compileActionScopes, scopeForEventIndex } from './actionScope';

const BOSS = 'boss_1';
const HERO = 'hero_0';
const ALLY = 'hero_1';

const round = (n = 1): BattleEvent => ({ kind: 'round_started', round: n });

const cast = (abilityDefinitionId: string, actorId = HERO, targets: string[] = [BOSS]): BattleEvent => ({
  kind: 'player_action_selected',
  actorId,
  action: { kind: 'ability', abilityDefinitionId, targetActorIds: targets },
});

const damage = (sourceActorId: string, targetActorId: string, amount = 10): BattleEvent => ({
  kind: 'damage_dealt',
  sourceActorId,
  targetActorId,
  amount,
  damageType: 'kinetic',
  blockedByShield: 0,
});

describe('compileActionScopes', () => {
  it('groups a compound ability into one scope', () => {
    // Sanguine Tithe's real shape: damage, lifesteal heal, and a debuff, none
    // of which share an id. This grouping is the whole reason the compiler
    // exists.
    const events: BattleEvent[] = [
      round(),
      cast('ability_sanguine_tithe'),
      { kind: 'resource_changed', actorId: HERO, delta: -3, source: 'x' },
      damage(HERO, BOSS, 30),
      { kind: 'healing_applied', sourceActorId: HERO, targetActorId: HERO, amount: 18, overheal: 0 },
      { kind: 'status_applied', sourceActorId: HERO, targetActorId: BOSS, statusId: 'weakened', instanceId: 'i1', duration: 2 },
    ];

    const { scopes } = compileActionScopes(events, BOSS);

    expect(scopes).toHaveLength(1);
    expect(scopes[0].abilityDefinitionId).toBe('ability_sanguine_tithe');
    expect(scopes[0].memberIndices).toEqual([2, 3, 4, 5]);
    expect(scopes[0].targetActorIds).toEqual([BOSS, HERO]);
  });

  it('leaves a defender-sourced reflection unowned rather than misattributing it', () => {
    // Thorns during the hero's cast. Sourced by the BOSS, so it fails the
    // actor check and must not join the hero's performance — otherwise the
    // hero appears to damage themselves as part of their own ability.
    const events: BattleEvent[] = [
      round(),
      cast('ability_attuned_strike'),
      damage(HERO, BOSS, 14),
      damage(BOSS, HERO, 4),
    ];

    const { scopes, unownedIndices } = compileActionScopes(events, BOSS);

    expect(scopes[0].memberIndices).toEqual([2]);
    expect(unownedIndices).toContain(3);
  });

  it('closes a scope at the next opener and at a hard boundary', () => {
    const events: BattleEvent[] = [
      round(1),
      cast('a1'),
      damage(HERO, BOSS),
      cast('a2', ALLY),
      damage(ALLY, BOSS),
      round(2),
      damage(HERO, BOSS),
    ];

    const { scopes, unownedIndices } = compileActionScopes(events, BOSS);

    expect(scopes).toHaveLength(2);
    expect(scopes[0].memberIndices).toEqual([2]);
    expect(scopes[1].actorId).toBe(ALLY);
    expect(scopes[1].memberIndices).toEqual([4]);
    // The damage after round 2 belongs to no open action.
    expect(unownedIndices).toContain(6);
  });

  it('opens a boss scope from the intent and resolves the boss actor id', () => {
    const events: BattleEvent[] = [
      round(),
      {
        kind: 'boss_intent_declared',
        round: 1,
        intent: { actionId: 'b1', displayName: 'Ember Lash', intentType: 'heavy_attack', telegraphText: '', interruptible: true, targetActorIds: [HERO] },
      } as unknown as BattleEvent,
      damage(BOSS, HERO, 12),
    ];

    const { scopes } = compileActionScopes(events, BOSS);

    expect(scopes).toHaveLength(1);
    expect(scopes[0].isBoss).toBe(true);
    expect(scopes[0].actorId).toBe(BOSS);
    expect(scopes[0].memberIndices).toEqual([2]);
  });

  it('attributes a sourceless cleanse by target, and only within the scope', () => {
    // `status_removed` carries no sourceActorId at all. Bearing Witness shields
    // an ally and then lifts what was on them; the cleanse must join that
    // scope. An unrelated expiry on somebody the scope never touched must not.
    const events: BattleEvent[] = [
      round(),
      cast('ability_bearing_witness', HERO, [ALLY]),
      { kind: 'shield_gained', sourceActorId: HERO, targetActorId: ALLY, amount: 22, types: [] },
      { kind: 'status_removed', targetActorId: ALLY, instanceId: 'i1', reason: 'cleansed' },
      { kind: 'status_removed', targetActorId: BOSS, instanceId: 'i2', reason: 'expired' },
    ];

    const { scopes, unownedIndices } = compileActionScopes(events, BOSS);

    expect(scopes[0].memberIndices).toEqual([2, 3]);
    expect(unownedIndices).toContain(4);
  });

  it('attributes a defeat to the scope whose damage caused it', () => {
    const events: BattleEvent[] = [
      round(),
      cast('a1'),
      damage(HERO, BOSS, 999),
      { kind: 'actor_defeated', actorId: BOSS },
    ];

    const { scopes } = compileActionScopes(events, BOSS);
    expect(scopes[0].memberIndices).toEqual([2, 3]);
  });

  it('is deterministic — the same log compiles identically', () => {
    const events: BattleEvent[] = [round(), cast('a1'), damage(HERO, BOSS)];
    expect(compileActionScopes(events, BOSS)).toEqual(compileActionScopes(events, BOSS));
  });

  it('handles an empty log without throwing', () => {
    const { scopes, unownedIndices } = compileActionScopes([], BOSS);
    expect(scopes).toEqual([]);
    expect(unownedIndices).toEqual([]);
  });

  it('finds the owning scope for an index, opener or member', () => {
    const events: BattleEvent[] = [round(), cast('a1'), damage(HERO, BOSS)];
    const compiled = compileActionScopes(events, BOSS);

    expect(scopeForEventIndex(compiled, 1)?.abilityDefinitionId).toBe('a1');
    expect(scopeForEventIndex(compiled, 2)?.abilityDefinitionId).toBe('a1');
    expect(scopeForEventIndex(compiled, 0)).toBeNull();
  });
});
