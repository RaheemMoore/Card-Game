import type { BattleEvent } from '../../../types/combat';
import { TIMINGS, type AnimationBeat, type BeatCue } from './types';

/**
 * Pure mapper from reducer events to paced animation beats.
 * Deterministic — same events in, same beats out. No timers, no I/O.
 * The queue hook (useCombatPresentation) owns actual playback.
 */
export function mapEventsToBeats(
  events: readonly BattleEvent[],
  startIndex = 0,
): AnimationBeat[] {
  return events.map((event, i) => {
    const { cue, durationMs } = cueFor(event);
    return {
      id: `beat_${startIndex + i}`,
      event,
      cue,
      durationMs,
    };
  });
}

function cueFor(event: BattleEvent): { cue: BeatCue; durationMs: number } {
  switch (event.kind) {
    case 'battle_started':
      return { cue: 'narration', durationMs: TIMINGS.narration };
    case 'round_started':
      return { cue: 'handoff', durationMs: TIMINGS.handoff };
    case 'boss_intent_declared':
      return { cue: 'intent', durationMs: TIMINGS.intent };
    case 'player_action_selected':
      return { cue: 'wind_up', durationMs: TIMINGS.windUpNormal };
    case 'damage_dealt':
      return { cue: 'impact', durationMs: TIMINGS.impact };
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
