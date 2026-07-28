import type { BattleState } from '../../types/combat';
import { computeHeroLaneXPercents } from './PartyDock';

/**
 * Where things are on the battlefield, as percentages of the combat viewport.
 *
 * Hoisted out of AttackVFX so the flash, the VFX layer, and anything added
 * later all read one source. When these lived inside AttackVFX, a second
 * consumer had no option but to copy them — and a copied anchor drifts off
 * the sprites the moment either side is tweaked.
 *
 * Hero X is NOT a constant: lanes sit right of the party dock and the dock's
 * width is fluid, so it must come from `computeHeroLaneXPercents()` — the
 * same function HeroSpriteLayer positions with.
 */
export interface Point {
  x: number;
  y: number;
}

/** Boss sprite's approximate centre of mass. */
export const BOSS_POINT: Point = { x: 50, y: 34 };

/** Hero chest height — where a blow reads as landing, not the floor line. */
export const HERO_POINT_Y = 74;

export interface ImpactAnchors {
  from: Point;
  to: Point;
  /** True when the boss dealt the damage. */
  sourceIsBoss: boolean;
}

/**
 * Resolve attacker and target points for a `damage_dealt` event. Returns null
 * if the hero side of the exchange can't be located (a defeated actor pruned
 * from state, say) — callers should skip the effect rather than draw it at a
 * fallback position, which would look like a stray beam from nowhere.
 */
export function resolveImpactAnchors(
  state: BattleState,
  sourceActorId: string,
  targetActorId: string,
  viewportWidth: number,
): ImpactAnchors | null {
  const sourceIsBoss = sourceActorId === state.boss.actorId;
  const heroActorId = sourceIsBoss ? targetActorId : sourceActorId;
  const heroIndex = state.heroes.findIndex((h) => h.actorId === heroActorId);
  if (heroIndex === -1) return null;

  const laneX = computeHeroLaneXPercents(viewportWidth);
  const heroPoint: Point = { x: laneX[heroIndex] ?? 50, y: HERO_POINT_Y };

  return {
    from: sourceIsBoss ? BOSS_POINT : heroPoint,
    to: sourceIsBoss ? heroPoint : BOSS_POINT,
    sourceIsBoss,
  };
}
