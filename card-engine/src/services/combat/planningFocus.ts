import type { BattleState, PlayerAction } from '../../types/combat';

/**
 * Pick the next living hero who still needs a command, preserving the
 * player's visible lane order. UI focus is deliberately independent from the
 * reducer's pendingActorIds order: looking at another card must never rewrite
 * combat resolution state.
 */
export function nextUnplannedActorId(
  state: BattleState,
  plannedActions: Readonly<Record<string, PlayerAction>>,
  currentActorId: string,
): string | null {
  return state.heroes.find((hero) =>
    !hero.defeated &&
    hero.actorId !== currentActorId &&
    state.pendingActorIds.includes(hero.actorId) &&
    !plannedActions[hero.actorId]
  )?.actorId ?? null;
}
