import { describe, expect, it } from 'vitest';
import type { BattleEvent } from '../../../types/combat';
import type { AnimationBeat } from './types';
import {
  BOSS_ATTACK_MS,
  BOSS_PREPARE_MS,
  BOSS_RECOVERY_MS,
  PARTY_HIT_REACTION_MS,
  PARTY_HIT_STAGGER_MS,
  PLAYER_TURN_RETURN_MS,
  paceBossResponseBeats,
} from './bossResponse';

describe('boss response pacing', () => {
  it('stages preparation, attack, contact, recovery, then control return', () => {
    const events: BattleEvent[] = [
      {
        kind: 'boss_intent_declared',
        round: 1,
        intent: {
          actionId: 'slam', intentType: 'heavy_attack', telegraphText: 'raises a fist',
          targetActorIds: ['hero'], interruptible: false,
        },
      },
      { kind: 'player_action_selected', actorId: 'hero', action: { kind: 'wait' } },
      {
        kind: 'damage_dealt', sourceActorId: 'boss', targetActorId: 'hero',
        amount: 8, damageType: 'kinetic', blockedByShield: 0,
      },
    ];
    const beats: AnimationBeat[] = events.map((event, index) => ({
      id: `beat_${index}`, event, cue: 'impact', durationMs: 400,
    }));

    const paced = paceBossResponseBeats(beats, events, 'boss');
    expect(paced.slice(2).map((beat) => [beat.presentationPhase, beat.durationMs])).toEqual([
      ['boss_prepare', BOSS_PREPARE_MS],
      ['boss_attack', BOSS_ATTACK_MS],
      ['party_hit', PARTY_HIT_REACTION_MS],
      ['boss_recovery', BOSS_RECOVERY_MS],
      ['player_turn_return', PLAYER_TURN_RETURN_MS],
    ]);
    expect(paced[2].event.kind).toBe('boss_intent_declared');
    expect(paced[3].suppressEffects).toBe(true);
    expect(paced[4].suppressEffects).toBeUndefined();
    expect(paced.slice(2).every((beat) => beat.reducedDurationMs === beat.durationMs)).toBe(true);
  });

  it('holds control return until every area-attack target has reacted', () => {
    const events: BattleEvent[] = [
      {
        kind: 'boss_intent_declared', round: 1,
        intent: { actionId: 'sweep', intentType: 'area_attack', telegraphText: 'sweeps', targetActorIds: ['h1', 'h2', 'h3'], interruptible: false },
      },
      { kind: 'damage_dealt', sourceActorId: 'boss', targetActorId: 'h1', amount: 8, damageType: 'kinetic', blockedByShield: 0 },
      { kind: 'status_applied', sourceActorId: 'boss', targetActorId: 'h1', statusId: 'marked', instanceId: 'marked_1', duration: 1 },
      { kind: 'damage_dealt', sourceActorId: 'boss', targetActorId: 'h2', amount: 8, damageType: 'kinetic', blockedByShield: 0 },
      { kind: 'damage_dealt', sourceActorId: 'boss', targetActorId: 'h3', amount: 8, damageType: 'kinetic', blockedByShield: 0 },
    ];
    const beats: AnimationBeat[] = events.map((event, index) => ({ id: `beat_${index}`, event, cue: 'impact', durationMs: 400 }));
    const paced = paceBossResponseBeats(beats, events, 'boss');
    const phases = paced.map((beat) => beat.presentationPhase).filter(Boolean);
    expect(phases).toEqual([
      'boss_prepare', 'boss_attack', 'party_hit', 'party_hit', 'party_hit',
      'boss_recovery', 'player_turn_return',
    ]);
    const hits = paced.filter((beat) => beat.presentationPhase === 'party_hit');
    expect(hits.map((beat) => beat.durationMs)).toEqual([
      PARTY_HIT_STAGGER_MS, PARTY_HIT_STAGGER_MS, PARTY_HIT_REACTION_MS,
    ]);
    const status = paced.find((beat) => beat.event.kind === 'status_applied');
    expect(status).toMatchObject({ durationMs: 1, suppressEffects: true });
  });
});
