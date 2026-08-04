import type { Card } from '../../../types/card';
import type { BattleEvent } from '../../../types/combat';
import type { MotionLevel } from '../../../vfx/types';
import { compileActionScopes } from '../performance/actionScope';
import { buildCardLookup, resolvePerformance } from '../performance/resolvePerformance';

/**
 * Build the real wall-clock budget for every hero action in the cumulative
 * event log.
 *
 * The reducer resolves immediately, while the view deliberately performs an
 * approved cast over several seconds. The presentation queue must therefore
 * hold the action opener for the same duration as the renderer; otherwise the
 * next hero or the boss starts while charge/travel/impact are still playing.
 *
 * This remains presentation-only. It reads the immutable event stream and the
 * live cards used solely for cosmetic material selection, and never feeds a
 * value back into combat state.
 */
export function buildHeroPerformanceDurations(
  events: readonly BattleEvent[],
  bossActorId: string,
  heroActorIds: readonly string[],
  partyCards: readonly Card[],
  motionLevel: MotionLevel,
): ReadonlyMap<number, number> {
  const durations = new Map<number, number>();
  const compiled = compileActionScopes(events, bossActorId);
  const cardByActorId = buildCardLookup(heroActorIds, partyCards);

  for (const scope of compiled.scopes) {
    if (scope.isBoss) continue;
    const performance = resolvePerformance(scope, {
      events,
      cardByActorId,
      motionLevel,
    });
    durations.set(scope.openerIndex, performance.totalMs);
  }

  return durations;
}
