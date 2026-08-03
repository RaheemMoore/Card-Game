import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../../types/combat';
import type { ResolvedPerformance } from '../performance/types';
import { materialKitFor } from '../../../data/combat/performance/materialKits';
import {
  PARTY_VOLLEY_AFTERMATH_MS,
  PARTY_VOLLEY_CONTACT_AFTER_LAST_LAUNCH_MS,
  PARTY_VOLLEY_MOUNT_COMPENSATION_MS,
  PARTY_VOLLEY_IMPACT_MS,
  PARTY_VOLLEY_LAUNCH_GAP_MS,
  compilePartyVolleySlots,
  pacePartyVolleyBeats,
  retimePerformanceForPartyVolley,
  volleyTimeToImpact,
} from './partyVolley';

const bossId = 'boss';
const events: BattleEvent[] = [
  { kind: 'player_action_selected', actorId: 'h1', action: { kind: 'strike' } },
  { kind: 'damage_dealt', sourceActorId: 'h1', targetActorId: bossId, amount: 10, damageType: 'kinetic', blockedByShield: 0 },
  { kind: 'player_action_selected', actorId: 'h2', action: { kind: 'strike' } },
  { kind: 'damage_dealt', sourceActorId: 'h2', targetActorId: bossId, amount: 11, damageType: 'kinetic', blockedByShield: 0 },
  { kind: 'player_action_selected', actorId: 'h3', action: { kind: 'strike' } },
  { kind: 'damage_dealt', sourceActorId: 'h3', targetActorId: bossId, amount: 12, damageType: 'kinetic', blockedByShield: 0 },
  { kind: 'boss_intent_declared', round: 1, intent: { actionId: 'slam', targetActorIds: ['h1'], interruptible: false, intentType: 'heavy_attack', telegraphText: 'raises a fist' } },
  { kind: 'damage_dealt', sourceActorId: bossId, targetActorId: 'h1', amount: 8, damageType: 'kinetic', blockedByShield: 0 },
];

const performance: ResolvedPerformance = {
  id: 'perf_0', recipeId: 'test', form: 'projectile', trajectory: 'arc',
  material: materialKitFor('Fire'),
  intensity: 'normal', castAnchor: 'caster_card_front', targetAnchor: 'boss_center',
  stages: [
    { stage: 'charge', startMs: 0, durationMs: 240, consequences: [] },
    { stage: 'cast', startMs: 240, durationMs: 120, consequences: [] },
    { stage: 'travel', startMs: 360, durationMs: 400, consequences: [] },
    { stage: 'impact', startMs: 760, durationMs: 400, consequences: [] },
    { stage: 'aftermath', startMs: 1160, durationMs: 300, consequences: [] },
  ],
  totalMs: 1460, isFallback: false,
};

describe('party volley presentation', () => {
  it('recognises the three released hero actions before the boss response', () => {
    const slots = compilePartyVolleySlots(events, bossId);
    expect([...slots.keys()]).toEqual([0, 2, 4]);
    expect([...slots.values()].map((slot) => slot.order)).toEqual([0, 1, 2]);
  });

  it('stagger-launches but gives every action the same absolute impact time', () => {
    const slots = [...compilePartyVolleySlots(events, bossId).values()];
    const absoluteImpacts = slots.map((slot) =>
      slot.order * PARTY_VOLLEY_LAUNCH_GAP_MS + volleyTimeToImpact(slot),
    );
    expect(Math.max(...absoluteImpacts) - Math.min(...absoluteImpacts)).toBe(
      4 * PARTY_VOLLEY_MOUNT_COMPENSATION_MS,
    );
    expect(absoluteImpacts[0]).toBe(
      2 * PARTY_VOLLEY_LAUNCH_GAP_MS + PARTY_VOLLEY_CONTACT_AFTER_LAST_LAUNCH_MS,
    );
    expect(absoluteImpacts[1]).toBe(absoluteImpacts[0] - PARTY_VOLLEY_MOUNT_COMPENSATION_MS);
    expect(absoluteImpacts[2]).toBe(absoluteImpacts[0] - 4 * PARTY_VOLLEY_MOUNT_COMPENSATION_MS);
  });

  it('removes inter-action pauses and holds the last launch through shared impact', () => {
    const beats = events.map((event, index) => ({
      id: `beat_${index}`,
      event,
      cue: event.kind === 'damage_dealt' ? 'impact' as const : 'wind_up' as const,
      durationMs: 999,
    }));
    const paced = pacePartyVolleyBeats(beats, events, bossId);
    expect(paced[0].durationMs).toBe(PARTY_VOLLEY_LAUNCH_GAP_MS);
    expect(paced[1]).toMatchObject({
      durationMs: 1,
      suppressEffects: true,
      preserveActivePerformance: true,
    });
    expect(paced[2].durationMs).toBe(PARTY_VOLLEY_LAUNCH_GAP_MS);
    expect(paced[4].durationMs).toBe(
      PARTY_VOLLEY_CONTACT_AFTER_LAST_LAUNCH_MS +
      PARTY_VOLLEY_IMPACT_MS +
      PARTY_VOLLEY_AFTERMATH_MS,
    );
    expect(paced[5]).toMatchObject({
      durationMs: 1,
      suppressEffects: true,
      preserveActivePerformance: true,
    });
    expect(paced[6].durationMs).toBe(999);
  });

  it('drops the duplicate charge and normalizes shared impact and aftermath', () => {
    const slot = compilePartyVolleySlots(events, bossId).get(0)!;
    const retimed = retimePerformanceForPartyVolley(performance, slot);
    expect(retimed.castAnchor).toBe('caster_charge_lane');
    expect(retimed.stages[0].stage).toBe('cast');
    expect(retimed.stages.find((stage) => stage.stage === 'impact')?.startMs).toBe(volleyTimeToImpact(slot));
    expect(retimed.stages.find((stage) => stage.stage === 'impact')?.durationMs).toBe(PARTY_VOLLEY_IMPACT_MS);
    expect(retimed.totalMs).toBe(volleyTimeToImpact(slot) + PARTY_VOLLEY_IMPACT_MS + PARTY_VOLLEY_AFTERMATH_MS);
  });
});
