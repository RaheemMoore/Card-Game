import type { BattleEvent } from '../../../types/combat';
import { TIMINGS, type AnimationBeat, type BeatCue, type BeatSeverity } from './types';

/**
 * Pure mapper from reducer events to paced animation beats.
 * Deterministic — same events in, same beats out. No timers, no I/O.
 * The queue hook (useCombatPresentation) owns actual playback.
 *
 * `severityAt` is supplied by `queue.ts`, which is the only layer that can see
 * far enough back through the cumulative log to know whether a given event is
 * heavy or ultimate. Severity has to arrive HERE rather than being stamped on
 * afterward because it changes a beat's DURATION, not just its look — a heavy
 * boss telegraph earns 900ms and an ultimate earns 3000ms. Omit it and
 * everything falls back to the normal timings, which is what keeps the pure
 * two-argument call in adapter.test.ts honest.
 */
export function mapEventsToBeats(
  events: readonly BattleEvent[],
  startIndex = 0,
  severityAt?: (index: number) => BeatSeverity | undefined,
): AnimationBeat[] {
  return events.map((event, i) => {
    const severity = severityAt?.(i);
    const { cue, durationMs } = cueFor(event, severity);
    return {
      id: `beat_${startIndex + i}`,
      event,
      cue,
      durationMs,
      ...(severity ? { severity } : {}),
    };
  });
}

function cueFor(
  event: BattleEvent,
  severity?: BeatSeverity,
): { cue: BeatCue; durationMs: number } {
  switch (event.kind) {
    case 'battle_started':
      return { cue: 'narration', durationMs: TIMINGS.narration };
    case 'round_started':
      return { cue: 'handoff', durationMs: TIMINGS.handoff };
    case 'boss_intent_declared':
      // A telegraphed, interruptible charge is the one moment the player can
      // actually react to, so it gets the long hold to breathe in.
      return severity === 'heavy'
        ? { cue: 'wind_up', durationMs: TIMINGS.windUpHeavy }
        : { cue: 'intent', durationMs: TIMINGS.intent };
    case 'player_action_selected':
      return severity === 'ultimate'
        ? { cue: 'ultimate', durationMs: TIMINGS.ultimate }
        : { cue: 'wind_up', durationMs: TIMINGS.windUpNormal };
    case 'damage_dealt':
      return severity === 'heavy' || severity === 'ultimate'
        ? { cue: 'impact', durationMs: TIMINGS.impactHeavy }
        : { cue: 'impact', durationMs: TIMINGS.impact };
    case 'healing_applied':
    case 'shield_gained':
      return { cue: 'floating', durationMs: TIMINGS.floating };
    case 'status_applied':
    case 'status_removed':
    case 'resource_changed':
    case 'ultimate_charge_changed':
    case 'cooldown_started':
    case 'cooldown_ticked':
    case 'action_denied':
      return { cue: 'narration', durationMs: TIMINGS.narration };
    case 'actor_defeated':
      return { cue: 'impact', durationMs: TIMINGS.floating };
    case 'phase_transition':
      return { cue: 'phase', durationMs: TIMINGS.phase };
    case 'battle_ended':
      return { cue: 'phase', durationMs: TIMINGS.phase };
    default: {
      const _exhaustive: never = event;
      void _exhaustive;
      return { cue: 'narration', durationMs: TIMINGS.narration };
    }
  }
}
