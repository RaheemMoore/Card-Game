import type { BattleState } from '../../types/combat';

/** actorId -> display name, for any UI surface (ability preview, journal). */
export function displayNameFor(state: BattleState, actorId: string): string {
  if (actorId === state.boss.actorId) return state.boss.snapshot.name;
  const hero = state.heroes.find((h) => h.actorId === actorId);
  return hero?.snapshot.displayName ?? actorId;
}
