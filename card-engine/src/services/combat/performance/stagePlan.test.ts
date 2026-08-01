import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../../types/combat';
import { BY_ABILITY } from '../../../data/combat/performance/recipes';
import { compileActionScopes } from './actionScope';
import { buildStagePlan, consequenceKindOf, stageForEvent } from './stagePlan';

const BOSS = 'boss_1';
const HERO = 'hero_0';
const ALLY = 'hero_1';

const cast = (id: string, targets = [BOSS]): BattleEvent => ({
  kind: 'player_action_selected',
  actorId: HERO,
  action: { kind: 'ability', abilityDefinitionId: id, targetActorIds: targets },
});

function planFor(events: BattleEvent[], recipeKey: string, motion: 'full' | 'off' = 'full') {
  const scope = compileActionScopes(events, BOSS).scopes[0];
  return buildStagePlan(scope, events, BY_ABILITY[recipeKey], motion);
}

function stageOf(
  plan: ReturnType<typeof buildStagePlan>,
  kind: string,
): string | undefined {
  return plan.stages.find((s) => s.consequences.some((c) => c.kind === kind))?.stage;
}

describe('buildStagePlan — the pilot sequences', () => {
  it('Sanguine Tithe separates damage from healing across impact and arrival', () => {
    // The single most important assertion in this file. Two numbers appearing
    // together reads as an accounting entry; a thing taken and carried home
    // reads as a drain.
    const events: BattleEvent[] = [
      cast('ability_sanguine_tithe'),
      { kind: 'damage_dealt', sourceActorId: HERO, targetActorId: BOSS, amount: 30, damageType: 'umbral', blockedByShield: 0 },
      { kind: 'healing_applied', sourceActorId: HERO, targetActorId: HERO, amount: 18, overheal: 0 },
      { kind: 'status_applied', sourceActorId: HERO, targetActorId: BOSS, statusId: 'weakened', instanceId: 'i', duration: 2 },
    ];
    const plan = planFor(events, 'ability_sanguine_tithe');

    expect(stageOf(plan, 'damage')).toBe('impact');
    expect(stageOf(plan, 'healing')).toBe('arrival');
    expect(stageOf(plan, 'status_applied')).toBe('aftermath');

    // And they must actually be ordered in time, not merely labelled.
    const impact = plan.stages.find((s) => s.stage === 'impact')!;
    const arrival = plan.stages.find((s) => s.stage === 'arrival')!;
    expect(arrival.startMs).toBeGreaterThan(impact.startMs);
  });

  it('Rootgrasp lands damage on the constriction, not on first emergence', () => {
    const events: BattleEvent[] = [
      cast('ability_rootgrasp'),
      { kind: 'damage_dealt', sourceActorId: HERO, targetActorId: BOSS, amount: 13, damageType: 'primal', blockedByShield: 0 },
      { kind: 'status_applied', sourceActorId: HERO, targetActorId: BOSS, statusId: 'weakened', instanceId: 'i', duration: 2 },
    ];
    const plan = planFor(events, 'ability_rootgrasp');

    const manifest = plan.stages.find((s) => s.stage === 'manifest')!;
    expect(manifest.consequences).toHaveLength(0);
    expect(stageOf(plan, 'damage')).toBe('impact');
    // The bind has to outlast the grab or `weakened` reads as a flash.
    expect(plan.stages.find((s) => s.stage === 'aftermath')!.durationMs).toBeGreaterThan(0);
  });

  it('Bearing Witness gives the cleanse its own beat after the shield', () => {
    const events: BattleEvent[] = [
      cast('ability_bearing_witness', [ALLY]),
      { kind: 'shield_gained', sourceActorId: HERO, targetActorId: ALLY, amount: 22, types: [] },
      { kind: 'status_removed', targetActorId: ALLY, instanceId: 'i', reason: 'cleansed' },
    ];
    const plan = planFor(events, 'ability_bearing_witness');

    expect(stageOf(plan, 'shield')).toBe('manifest');
    expect(stageOf(plan, 'status_removed')).toBe('aftermath');
  });
});

describe('buildStagePlan — mechanics', () => {
  it('places a consequence on the FIRST accepting stage', () => {
    const events: BattleEvent[] = [
      cast('ability_sanguine_tithe'),
      { kind: 'resource_changed', actorId: HERO, delta: -3, source: 'x' },
    ];
    expect(stageOf(planFor(events, 'ability_sanguine_tithe'), 'resource')).toBe('charge');
  });

  it('never drops a consequence no stage accepts', () => {
    // The barrier recipe has no stage accepting `damage`. A barrier that also
    // dealt damage must still show it somewhere rather than swallowing a
    // mechanical fact the player needs.
    const events: BattleEvent[] = [
      cast('ability_bearing_witness', [ALLY]),
      { kind: 'damage_dealt', sourceActorId: HERO, targetActorId: BOSS, amount: 5, damageType: 'radiant', blockedByShield: 0 },
    ];
    const plan = planFor(events, 'ability_bearing_witness');

    const total = plan.stages.reduce((n, s) => n + s.consequences.length, 0);
    expect(total).toBe(1);
  });

  it('lays stages end to end with no gaps', () => {
    const events: BattleEvent[] = [cast('ability_rootgrasp')];
    const plan = planFor(events, 'ability_rootgrasp');

    let cursor = 0;
    for (const s of plan.stages) {
      expect(s.startMs).toBe(cursor);
      cursor += s.durationMs;
    }
    expect(plan.totalMs).toBe(cursor);
  });

  it('preserves sequence and placement under reduced motion', () => {
    const events: BattleEvent[] = [
      cast('ability_sanguine_tithe'),
      { kind: 'damage_dealt', sourceActorId: HERO, targetActorId: BOSS, amount: 30, damageType: 'umbral', blockedByShield: 0 },
      { kind: 'healing_applied', sourceActorId: HERO, targetActorId: HERO, amount: 18, overheal: 0 },
    ];
    const full = planFor(events, 'ability_sanguine_tithe', 'full');
    const off = planFor(events, 'ability_sanguine_tithe', 'off');

    expect(off.totalMs).toBeLessThan(full.totalMs);
    expect(off.totalMs).toBeGreaterThan(0);
    expect(stageOf(off, 'damage')).toBe('impact');
    expect(stageOf(off, 'healing')).toBe('arrival');
  });

  it('resolves the stage a given event landed on', () => {
    const events: BattleEvent[] = [
      cast('ability_rootgrasp'),
      { kind: 'damage_dealt', sourceActorId: HERO, targetActorId: BOSS, amount: 13, damageType: 'primal', blockedByShield: 0 },
    ];
    const plan = planFor(events, 'ability_rootgrasp');
    expect(stageForEvent(plan.stages, 1)?.stage).toBe('impact');
    expect(stageForEvent(plan.stages, 99)).toBeNull();
  });
});

describe('consequenceKindOf', () => {
  it('maps every visible event kind and ignores the rest', () => {
    expect(consequenceKindOf({ kind: 'damage_dealt' } as BattleEvent)).toBe('damage');
    expect(consequenceKindOf({ kind: 'dot_ticked' } as BattleEvent)).toBe('damage');
    expect(consequenceKindOf({ kind: 'healing_applied' } as BattleEvent)).toBe('healing');
    expect(consequenceKindOf({ kind: 'shield_gained' } as BattleEvent)).toBe('shield');
    expect(consequenceKindOf({ kind: 'actor_defeated' } as BattleEvent)).toBe('defeat');
    expect(consequenceKindOf({ kind: 'round_started' } as BattleEvent)).toBeNull();
  });
});
