import type { BattleEvent } from '../../../types/combat';
import type { AnimationBeat } from './types';

export const BOSS_PREPARE_MS = 900;
export const BOSS_ATTACK_MS = 750;
export const PARTY_HIT_REACTION_MS = 700;
export const PARTY_HIT_STAGGER_MS = 180;
export const BOSS_RECOVERY_MS = 450;
export const PLAYER_TURN_RETURN_MS = 250;

/**
 * Turn reducer truth into a readable retaliation without changing event truth.
 * The intent is replayed as contemplation, then a suppressed copy of the hit
 * holds the attack pose before the real damage beat lands on the card.
 */
export function paceBossResponseBeats(
  beats: readonly AnimationBeat[],
  rawEvents: readonly BattleEvent[],
  bossActorId: string,
): AnimationBeat[] {
  const damagePositions = beats.flatMap((beat, position) =>
    beat.event.kind === 'damage_dealt' && beat.event.sourceActorId === bossActorId
      ? [position]
      : [],
  );
  const firstDamagePosition = damagePositions[0] ?? -1;
  if (firstDamagePosition < 0) return [...beats];
  const lastDamagePosition = damagePositions[damagePositions.length - 1];

  const damageBeat = beats[firstDamagePosition];
  const damageIndex = rawEventIndex(damageBeat);
  if (damageIndex < 0) return [...beats];
  const intent = latestIntent(rawEvents, damageIndex);
  if (!intent) return [...beats];

  const prepare: AnimationBeat = {
    id: `presentation_boss_prepare_${damageIndex}`,
    event: intent.event,
    cue: 'wind_up',
    severity: damageBeat.severity,
    durationMs: BOSS_PREPARE_MS,
    reducedDurationMs: BOSS_PREPARE_MS,
    presentationPhase: 'boss_prepare',
    suppressEffects: true,
  };
  const attack: AnimationBeat = {
    id: `presentation_boss_attack_${damageIndex}`,
    event: damageBeat.event,
    cue: 'wind_up',
    severity: damageBeat.severity,
    durationMs: BOSS_ATTACK_MS,
    reducedDurationMs: BOSS_ATTACK_MS,
    presentationPhase: 'boss_attack',
    suppressEffects: true,
  };
  const recovery: AnimationBeat = {
    id: `presentation_boss_recovery_${damageIndex}`,
    event: damageBeat.event,
    cue: 'handoff',
    durationMs: BOSS_RECOVERY_MS,
    reducedDurationMs: BOSS_RECOVERY_MS,
    presentationPhase: 'boss_recovery',
    suppressEffects: true,
  };
  const returnBeat: AnimationBeat = {
    id: `presentation_player_return_${damageIndex}`,
    event: damageBeat.event,
    cue: 'handoff',
    durationMs: PLAYER_TURN_RETURN_MS,
    reducedDurationMs: PLAYER_TURN_RETURN_MS,
    presentationPhase: 'player_turn_return',
    suppressEffects: true,
  };

  const response = beats.slice(firstDamagePosition, lastDamagePosition + 1).map<AnimationBeat>(
    (beat, localPosition) => {
      const isDamage = beat.event.kind === 'damage_dealt' && beat.event.sourceActorId === bossActorId;
      if (!isDamage) {
        return {
          ...beat,
          durationMs: 1,
          reducedDurationMs: 1,
          suppressEffects: true,
          preserveActivePerformance: true,
        };
      }
      const absolutePosition = firstDamagePosition + localPosition;
      const isLastHit = absolutePosition === lastDamagePosition;
      return {
        ...beat,
        durationMs: isLastHit ? PARTY_HIT_REACTION_MS : PARTY_HIT_STAGGER_MS,
        reducedDurationMs: isLastHit ? PARTY_HIT_REACTION_MS : PARTY_HIT_STAGGER_MS,
        presentationPhase: 'party_hit',
      };
    },
  );

  return [
    ...beats.slice(0, firstDamagePosition),
    prepare,
    attack,
    ...response,
    recovery,
    returnBeat,
    ...beats.slice(lastDamagePosition + 1),
  ];
}

function rawEventIndex(beat: AnimationBeat): number {
  const match = /^beat_(\d+)$/.exec(beat.id);
  return match ? Number(match[1]) : -1;
}

function latestIntent(
  events: readonly BattleEvent[],
  beforeIndex: number,
): { event: Extract<BattleEvent, { kind: 'boss_intent_declared' }>; index: number } | null {
  for (let index = beforeIndex - 1; index >= 0; index--) {
    const event = events[index];
    if (event.kind === 'boss_intent_declared') return { event, index };
  }
  return null;
}
