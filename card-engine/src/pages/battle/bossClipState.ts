import type { AnimationBeat } from '../../services/combat/presentation/types';
import type { BossSpriteState } from '../../data/combat/bossSpriteManifest';

/**
 * Which clip the boss should be playing, derived from the CURRENT BEAT.
 *
 * ── Why this reads the beat and not live battle state ────────────────────
 * The beat queue already paces the fight for the human eye — it knows which
 * event is on screen right now and how long it holds. Live reducer state has
 * already run ahead: by the time the player sees the boss swing, `state` may
 * be three events later and the boss may already have taken a counterattack.
 * Driving the sprite off live state would show the hit reaction before the
 * blow that caused it.
 *
 * So this is deliberately NOT a second animation state machine sitting beside
 * the queue. It is a pure projection of one beat onto one clip name, which is
 * why it needs no memory and no effects.
 *
 * Precedence is dramatic, not structural: death outranks being hit, being hit
 * outranks attacking, and rage is only the resting pose once nothing else is
 * happening.
 */
export function bossClipForBeat(
  beat: AnimationBeat | null,
  ctx: { bossActorId: string; bossDefeated: boolean; enraged: boolean },
): BossSpriteState {
  const resting: BossSpriteState = ctx.enraged ? 'rage' : 'idle';
  if (ctx.bossDefeated) return 'defeat';
  if (!beat) return resting;

  const e = beat.event;
  switch (e.kind) {
    case 'actor_defeated':
      return e.actorId === ctx.bossActorId ? 'defeat' : resting;

    case 'damage_dealt':
      // Struck BY someone else — flinch. The boss damaging a hero is its own
      // attack landing, which the wind_up already covered.
      if (e.targetActorId === ctx.bossActorId) return 'hit';
      return e.sourceActorId === ctx.bossActorId ? 'attack' : resting;

    // A damage-over-time tick is a quiet recurring burn, not a struck blow.
    // Flinching every round of a poison would read as the boss being
    // permanently staggered and would drown out real hits.
    case 'dot_ticked':
      return resting;

    case 'boss_intent_declared':
      return 'attack';

    default:
      break;
  }

  // Cue-level fallback: a boss wind-up is an attack pose even when the event
  // underneath it isn't damage (a shield or a curse still needs a gesture).
  if (beat.cue === 'wind_up' || beat.cue === 'ultimate') {
    return isBossEvent(e, ctx.bossActorId) ? 'attack' : resting;
  }
  return resting;
}

function isBossEvent(e: AnimationBeat['event'], bossActorId: string): boolean {
  if ('sourceActorId' in e) return e.sourceActorId === bossActorId;
  if ('actorId' in e) return e.actorId === bossActorId;
  return e.kind === 'boss_intent_declared';
}
