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

  const heroPoint = heroCardPoint(heroIndex, viewportWidth);

  return {
    from: sourceIsBoss ? BOSS_POINT : heroPoint,
    to: sourceIsBoss ? heroPoint : BOSS_POINT,
    sourceIsBoss,
  };
}

/* ------------------------------------------------------------------ */
/*  Named anchor registry                                              */
/* ------------------------------------------------------------------ */

/**
 * Where a hero's card sits, by dock index.
 *
 * The single place hero-side geometry is computed. `computeDockCardXPercents`
 * is the dock's own layout maths, so re-positioning the dock re-aims
 * everything downstream automatically — which is the whole reason anchors were
 * hoisted out of `AttackVFX` in the first place.
 */
function heroCardPoint(heroIndex: number, viewportWidth: number): Point {
  const cardX = computeDockCardXPercents(viewportWidth);
  return { x: cardX[heroIndex] ?? 50, y: HERO_POINT_Y };
}

/**
 * Every point the performance system is allowed to aim at.
 *
 * Renderers ask for these BY NAME and never compute a percentage. The rule
 * exists because the alternative has already failed once: when the anchor
 * constants lived inside `AttackVFX`, the only way for a second consumer to
 * use them was to copy them, and a copied anchor drifts off its target the
 * moment either side is tweaked. A renderer that needs a point nobody has
 * named adds it here rather than measuring the dock itself.
 *
 * Ground anchors sit BELOW their subject rather than on it — growth emerges
 * from the floor in front of the boss, and a root that erupts out of the
 * boss's centre of mass reads as a spear through the chest, not as terrain.
 */
export type CombatAnchorName =
  | 'boss_center'
  | 'boss_feet'
  | 'boss_ground'
  | 'caster_card'
  | 'caster_card_edge'
  | 'caster_card_front'
  | 'target_card'
  | 'target_card_front';

export interface AnchorContext {
  viewportWidth: number;
  /** Dock index of the acting hero, when there is one. */
  casterIndex?: number;
  /** Dock index of the hero being acted upon, when the target is an ally. */
  targetIndex?: number;
}

/** Vertical offsets from the boss's centre of mass, in viewport-height %. */
const BOSS_FEET_DY = 12;
const BOSS_GROUND_DY = 16;

/** How far in front of a card its barrier/cast point sits, in %. */
const CARD_FRONT_DY = -7;
const CARD_EDGE_DX = 3.2;

/**
 * Resolve a named anchor to a point.
 *
 * Falls back to the boss point for a hero anchor with no index rather than
 * returning null: a renderer mid-animation cannot usefully handle a null
 * anchor, and drawing at a defined-but-wrong place is far easier to SEE and
 * fix than an effect that silently fails to appear.
 */
export function resolveAnchor(name: CombatAnchorName, ctx: AnchorContext): Point {
  switch (name) {
    case 'boss_center':
      return BOSS_POINT;
    case 'boss_feet':
      return { x: BOSS_POINT.x, y: BOSS_POINT.y + BOSS_FEET_DY };
    case 'boss_ground':
      return { x: BOSS_POINT.x, y: BOSS_POINT.y + BOSS_GROUND_DY };

    case 'caster_card':
      return ctx.casterIndex === undefined
        ? BOSS_POINT
        : heroCardPoint(ctx.casterIndex, ctx.viewportWidth);
    case 'caster_card_edge': {
      if (ctx.casterIndex === undefined) return BOSS_POINT;
      const p = heroCardPoint(ctx.casterIndex, ctx.viewportWidth);
      // Cast from the card's leading edge toward the arena, not its centre —
      // a lash that starts at the middle of the portrait looks like it is
      // coming out of the character's chest.
      return { x: p.x + CARD_EDGE_DX, y: p.y + CARD_FRONT_DY };
    }
    case 'caster_card_front': {
      if (ctx.casterIndex === undefined) return BOSS_POINT;
      const p = heroCardPoint(ctx.casterIndex, ctx.viewportWidth);
      return { x: p.x, y: p.y + CARD_FRONT_DY };
    }

    case 'target_card':
      return ctx.targetIndex === undefined
        ? BOSS_POINT
        : heroCardPoint(ctx.targetIndex, ctx.viewportWidth);
    case 'target_card_front': {
      if (ctx.targetIndex === undefined) return BOSS_POINT;
      const p = heroCardPoint(ctx.targetIndex, ctx.viewportWidth);
      return { x: p.x, y: p.y + CARD_FRONT_DY };
    }

    default: {
      const _exhaustive: never = name;
      void _exhaustive;
      return BOSS_POINT;
    }
  }
}
