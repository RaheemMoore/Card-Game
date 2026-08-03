import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { summarizeJournal } from './journalSummary';
import { initializeBattle } from '../reducer';
import { buildBattleSnapshot, buildHeroSnapshot, buildAbilitySnapshot, buildFireElementalBossSnapshot } from '../harness';
import { SEED_ABILITIES } from '../../../data/abilities/seedAbilities';
import { getAbilityStore, setAbilityStore } from '../../abilities/registry';
import type { AbilityStore } from '../../persistence/AbilityStore';
import type { AbilityDefinition } from '../../../types/abilities';
import type { CardStats } from '../../../types/card';
import type { BattleEvent, BattleState } from '../../../types/combat';

// The default ability store is only seeded at app boot (not in unit tests) —
// stub just the lookup this module needs so ability display names resolve
// without pulling in the full seeding pipeline.
const originalStore = getAbilityStore();
beforeAll(() => {
  const definitionsById = new Map<string, AbilityDefinition>(
    SEED_ABILITIES.map((s) => [s.definition.id, s.definition]),
  );
  setAbilityStore({
    getDefinition: (id: string) => definitionsById.get(id),
  } as unknown as AbilityStore);
});
afterAll(() => {
  setAbilityStore(originalStore);
});

function testStats(atk = 55, def = 45, mana = 60): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

function twoHeroState(): BattleState {
  const emberCleave = SEED_ABILITIES.find((s) => s.definition.id === 'ability_oathbreakers_answer')!;
  const heroes = ['Seojin', 'Ashvara'].map((name, i) =>
    buildHeroSnapshot({
      cardId: `card_${i}`,
      archetype: 'Barbarian',
      displayName: name,
      stats: testStats(),
      rank: 'Forged',
      // These suites assert combat MATH, not element interaction.
      elementDamageType: 'kinetic',
      abilities: [buildAbilitySnapshot(emberCleave.definition, emberCleave.version)],
    }),
  );
  const snap = buildBattleSnapshot({ seed: 1, heroes, boss: buildFireElementalBossSnapshot(1000) });
  return initializeBattle(snap);
}

describe('summarizeJournal', () => {
  it('collapses a costed damage ability into one action entry with cost + outcome', () => {
    const state = twoHeroState();
    const [seojin, ashvara] = state.heroes;
    const boss = state.boss.actorId;

    const events: BattleEvent[] = [
      { kind: 'round_started', round: 1 },
      { kind: 'player_action_selected', actorId: seojin.actorId, action: { kind: 'ability', abilityDefinitionId: 'ability_oathbreakers_answer', targetActorIds: [boss] } },
      { kind: 'resource_changed', actorId: seojin.actorId, delta: -3, source: 'ability_cost' },
      { kind: 'cooldown_started', actorId: seojin.actorId, abilityDefinitionId: 'ability_oathbreakers_answer', rounds: 2 },
      { kind: 'damage_dealt', sourceActorId: seojin.actorId, targetActorId: boss, amount: 49, damageType: 'searing', blockedByShield: 0 },
      { kind: 'ultimate_charge_changed', actorId: seojin.actorId, delta: 2, source: 'damage_dealt' },
    ];

    const entries = summarizeJournal(events, state);
    const action = entries.find((e) => e.kind === 'action');
    expect(action).toBeDefined();
    expect(action!.text).toBe(`Seojin used "Oathbreaker's Answer" on ${state.boss.snapshot.name} for 3 energy — 49 damage`);
    expect(action!.receipts.map((receipt) => receipt.text)).toContain('49 DAMAGE');
    void ashvara;
  });

  it('produces zero entries for a free ability with only a heal outcome', () => {
    const state = twoHeroState();
    const [seojin, ashvara] = state.heroes;

    const events: BattleEvent[] = [
      { kind: 'player_action_selected', actorId: seojin.actorId, action: { kind: 'ability', abilityDefinitionId: 'ability_bearing_witness', targetActorIds: [ashvara.actorId] } },
      { kind: 'healing_applied', sourceActorId: seojin.actorId, targetActorId: ashvara.actorId, amount: 30, overheal: 0 },
    ];

    const entries = summarizeJournal(events, state);
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe(`Seojin used "Bearing Witness" on Ashvara — healed 30`);
    expect(entries[0].receipts.map((receipt) => receipt.text)).toContain('+30 HP');
  });

  it('drops regen resource_changed events entirely', () => {
    const state = twoHeroState();
    const [seojin, ashvara] = state.heroes;
    const events: BattleEvent[] = [
      { kind: 'resource_changed', actorId: seojin.actorId, delta: 1, source: 'regen' },
      { kind: 'resource_changed', actorId: ashvara.actorId, delta: 1, source: 'regen' },
    ];
    expect(summarizeJournal(events, state)).toEqual([]);
  });

  it('formats guard and focus actions with their outcome', () => {
    const state = twoHeroState();
    const [seojin] = state.heroes;

    const guardEvents: BattleEvent[] = [
      { kind: 'player_action_selected', actorId: seojin.actorId, action: { kind: 'guard' } },
      { kind: 'shield_gained', sourceActorId: seojin.actorId, targetActorId: seojin.actorId, amount: 27, types: [] },
      { kind: 'ultimate_charge_changed', actorId: seojin.actorId, delta: 5, source: 'guard' },
    ];
    expect(summarizeJournal(guardEvents, state)[0].text).toBe('Seojin guarded (+27 shield)');

    const focusEvents: BattleEvent[] = [
      { kind: 'player_action_selected', actorId: seojin.actorId, action: { kind: 'focus' } },
      { kind: 'resource_changed', actorId: seojin.actorId, delta: 2, source: 'focus' },
      { kind: 'ultimate_charge_changed', actorId: seojin.actorId, delta: 3, source: 'focus' },
    ];
    expect(summarizeJournal(focusEvents, state)[0].text).toBe('Seojin focused (+2 energy)');
  });

  it('collapses a boss action into one boss_action entry', () => {
    const state = twoHeroState();
    const [seojin] = state.heroes;
    const boss = state.boss.actorId;

    const events: BattleEvent[] = [
      { kind: 'damage_dealt', sourceActorId: boss, targetActorId: seojin.actorId, amount: 27, damageType: 'searing', blockedByShield: 0 },
    ];
    const entries = summarizeJournal(events, state);
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('boss_action');
    expect(entries[0].text).toBe(`${state.boss.snapshot.name} hits Seojin for 27 damage`);
  });

  it('keeps a hero action group separate from a following boss action', () => {
    const state = twoHeroState();
    const [seojin] = state.heroes;
    const boss = state.boss.actorId;

    const events: BattleEvent[] = [
      { kind: 'player_action_selected', actorId: seojin.actorId, action: { kind: 'ability', abilityDefinitionId: 'ability_oathbreakers_answer', targetActorIds: [boss] } },
      { kind: 'damage_dealt', sourceActorId: seojin.actorId, targetActorId: boss, amount: 49, damageType: 'searing', blockedByShield: 0 },
      { kind: 'damage_dealt', sourceActorId: boss, targetActorId: seojin.actorId, amount: 27, damageType: 'searing', blockedByShield: 0 },
    ];
    const entries = summarizeJournal(events, state);
    expect(entries).toHaveLength(2);
    expect(entries[0].kind).toBe('action');
    expect(entries[1].kind).toBe('boss_action');
  });

  it('reports a denied ability distinctly', () => {
    const state = twoHeroState();
    const [seojin] = state.heroes;
    const boss = state.boss.actorId;
    const events: BattleEvent[] = [
      { kind: 'player_action_selected', actorId: seojin.actorId, action: { kind: 'ability', abilityDefinitionId: 'ability_oathbreakers_answer', targetActorIds: [boss] } },
      { kind: 'action_denied', actorId: seojin.actorId, reason: 'insufficient_resource' },
    ];
    const entries = summarizeJournal(events, state);
    expect(entries[0].text).toBe("Seojin tried to use \"Oathbreaker's Answer\" but insufficient resource");
  });
});
