import type { BattleState } from '../../types/combat';
import { computeDockCardXPercents, DOCK_CARD_POINT_Y } from './PartyDock';

/**
 * Where things are on the battlefield, as percentages of the combat viewport.
 *
 * Hoisted out of AttackVFX so the flash, the VFX layer, and anything added
 * later all read one source. When these lived inside AttackVFX, a second
 * consumer had no option but to copy them — and a copied anchor drifts off
 * the sprites the moment either side is tweaked.
 *
 * Hero X is NOT a constant: the cards sit in a fanned dock whose card width is
 * fluid, so it must come from `computeDockCardXPercents()` — the same layout
 * maths PartyDock itself positions with.
 *
 * The hero anchor moved from the arena FLOOR to the DOCK when the pixel hero
 * sprites were removed. Blows now travel to the card, which rises to meet
 * them; a beam still aimed at the old floor lanes would land on empty stone.
 */
export interface Point {
  x: number;
  y: number;
}

/** Boss sprite's approximate centre of mass. */
export const BOSS_POINT: Point = { x: 50, y: 34 };

/**
 * Where a blow lands on a hero, vertically.
 *
 * Re-exported from PartyDock rather than declared here so the dock owns its
 * own geometry — this file describes RELATIONSHIPS between points, not where
 * the dock happens to sit.
 */
export const HERO_POINT_Y = DOCK_CARD_POINT_Y;

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

  const cardX = computeDockCardXPercents(viewportWidth);
  const heroPoint: Point = { x: cardX[heroIndex] ?? 50, y: HERO_POINT_Y };

  return {
    from: sourceIsBoss ? BOSS_POINT : heroPoint,
    to: sourceIsBoss ? heroPoint : BOSS_POINT,
    sourceIsBoss,
  };
}
