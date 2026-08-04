import type { BattleEvent } from '../../../types/combat';
import type { Card } from '../../../types/card';
import type { ElementName } from '../../../types/bible';
import type { MotionLevel } from '../../../vfx/types';
import { resolveCurrentElement } from '../../elementResolver';
import { assetKitIdFor, assetAvailable, getAssetKit } from '../../../data/combat/performance/assetKits';
import { materialKitFor } from '../../../data/combat/performance/materialKits';
import { BY_FORM, GENERIC_RECIPE, recipeForAbility } from '../../../data/combat/performance/recipes';
import type { ActionScope } from './actionScope';
import { buildStagePlan } from './stagePlan';
import type {
  AbilityForm,
  AbilityPerformanceRecipe,
  MaterialKit,
  PerformanceIntensity,
  ResolvedPerformance,
  Trajectory,
} from './types';

/**
 * Turns an action scope into something a renderer can draw.
 *
 * This is the resolution precedence the contract requires, and it is written
 * as an explicit ordered chain rather than a pile of `??` because each rung
 * needs its own test and its own reason to exist:
 *
 *   1. Exact approved recipe for this ability id.
 *   2. Form recipe + the caster's material.
 *   3. Form recipe + generic material treatment (caster has no element).
 *   4. Generic fallback by consequence category.
 *
 * The rule that governs all four: an unknown ability or a missing asset must
 * DEGRADE VISIBLY AND SAFELY. It must never render nothing, and it must never
 * hold the queue open waiting for something that will not arrive. Rungs 3 and
 * 4 set `isFallback`, and the Ability Theater badges them — the point is that
 * unmapped abilities look like debt, not like a finished decision. The old
 * bolt survives here as the `projectile` generic damage treatment and nowhere
 * else; it must not quietly become the permanent answer for everything.
 */

export interface ResolveContext {
  /** Full cumulative log — scope indices point into this. */
  events: readonly BattleEvent[];
  /** The player's live cards, keyed by the actor id they were snapshotted as. */
  cardByActorId: ReadonlyMap<string, Card>;
  motionLevel: MotionLevel;
  /** Severity the presentation queue already computed for the opener beat. */
  severity?: PerformanceIntensity;
  /**
   * Test/theater hook: force every asset to be treated as unavailable, to
   * exercise the procedural fallback path without editing the manifest.
   */
  simulateMissingAssets?: boolean;
}

/**
 * The material for a scope.
 *
 * Element comes from the LIVE CARD, deliberately, and this is the one place
 * the performance layer reads the card store at all.
 *
 * `HeroSnapshot` freezes `elementDamageType` — the derived damage type — and
 * not the element name, because the reducer must be a pure function of
 * (snapshot, seed, actions) and a card's `currentElement` mutates between
 * battles when a Fallen Seraph's Light transmutes to Infernal. Its own
 * docstring records the split: "cosmetics may follow the live card, but combat
 * MATH may not." This is the cosmetic side of that seam, so reading the live
 * card is correct here and would be a determinism bug anywhere below the
 * reducer line.
 *
 * Reading `elementDamageType` instead would collapse Blood, Void, Bone,
 * Shadow, Nocturne, Sanguine, Dream, Psychic and Infernal into one look —
 * which is precisely the bug this system exists to fix.
 */
function materialFor(
  scope: ActionScope,
  ctx: ResolveContext,
): { kit: MaterialKit; element: ElementName | undefined } {
  const card = ctx.cardByActorId.get(scope.actorId);
  const element = card ? resolveCurrentElement(card) : undefined;
  return { kit: materialKitFor(element), element };
}

/** Severity → intensity, honouring a recipe that pins its own. */
function intensityFor(
  recipe: AbilityPerformanceRecipe,
  ctx: ResolveContext,
): PerformanceIntensity {
  if (recipe.intensity !== 'derive') return recipe.intensity;
  return ctx.severity ?? 'normal';
}

/**
 * Are this recipe's assets actually on disk?
 *
 * Today the answer is always no — every manifest row is `'placeholder'` — and
 * that is the intended state for Delivery 1. It matters that this is asked
 * rather than assumed, because the renderers must take their procedural path
 * by RESOLUTION rather than by accident, so the day real art lands nothing has
 * to change but the manifest.
 */
function assetsPresent(
  recipe: AbilityPerformanceRecipe,
  element: ElementName | undefined,
  ctx: ResolveContext,
): boolean {
  if (ctx.simulateMissingAssets) return false;
  const kit = getAssetKit(recipe.assetKitId ?? assetKitIdFor(recipe.form, element));
  if (!kit) return false;
  return [kit.head, kit.segment, kit.particle, kit.impact, kit.residue].some(assetAvailable);
}

/**
 * Resolve one scope into a drawable performance.
 *
 * Never returns null. A scope that resolves to nothing would be a silent hole
 * in combat feedback, and the contract forbids it.
 */
export function resolvePerformance(
  scope: ActionScope,
  ctx: ResolveContext,
): ResolvedPerformance {
  const { kit, element } = materialFor(scope, ctx);

  // --- rung 1: exact recipe ------------------------------------------------
  const exact = recipeForAbility(scope.abilityDefinitionId);

  // --- rung 2/3: form default ---------------------------------------------
  // An unmapped ability id tells us nothing on its own, but its CONSEQUENCES
  // do: an action that dealt damage and healed its caster is a drain whatever
  // it is called, and one that granted a shield is a barrier. Inferring from
  // what the reducer actually did — rather than from the ability definition —
  // means a brand-new ability nobody has authored a recipe for still performs
  // as the right SHAPE on the day it ships, with the caster's own material.
  const inferred = exact ? undefined : inferForm(scope, ctx.events);
  const recipe = exact ?? (inferred ? BY_FORM[inferred] : GENERIC_RECIPE);

  const isUnmapped = !exact;
  const hasMaterial = element !== undefined;

  let isFallback = false;
  let fallbackReason: string | undefined;

  if (isUnmapped) {
    isFallback = true;
    fallbackReason = inferred
      ? `No recipe authored for ${scope.abilityDefinitionId ?? 'this action'} — inferred ${inferred} form from its consequences.`
      : scope.abilityDefinitionId
        ? `No recipe authored for ${scope.abilityDefinitionId} and no form inferable — generic treatment.`
        : 'Action carried no ability id — generic treatment.';
  } else if (!hasMaterial) {
    isFallback = true;
    fallbackReason = 'Caster has no element (legacy card) — generic material treatment.';
  } else if (kit.provisional) {
    // Not a fallback in the resolution sense — the recipe and material both
    // resolved — but it IS unfinished art direction, and the theater says so.
    fallbackReason = `Material kit for ${kit.element} is a family default, not authored.`;
  }

  const withAssets = assetsPresent(recipe, element, ctx) ? recipe : withoutAssets(recipe);
  const effective = kit.travelPace === 'instant' ? withInstantTravel(withAssets) : withAssets;

  const { stages, totalMs } = buildStagePlan(scope, ctx.events, effective, ctx.motionLevel);

  return {
    // Keyed on the opener index, so a repeat cast of the same ability later in
    // the battle gets a distinct key and replays cleanly instead of being
    // reconciled onto the previous one's DOM.
    id: `perf_${scope.openerIndex}`,
    recipeId: effective.id,
    form: effective.form,
    trajectory: effective.trajectory ?? DEFAULT_TRAJECTORY[effective.form],
    material: kit,
    intensity: intensityFor(effective, ctx),
    castAnchor: effective.castAnchor,
    targetAnchor: effective.targetAnchor,
    stages,
    totalMs,
    isFallback,
    ...(fallbackReason ? { fallbackReason } : {}),
  };
}

/**
 * How each form crosses the gap when the recipe does not say.
 *
 * A drain is a `beam` because it is a continuous connection — material is
 * flowing along it in both directions, and a whip crack would break the read
 * that something is being siphoned. Growth and barrier never travel at all.
 */
const DEFAULT_TRAJECTORY: Record<AbilityForm, Trajectory> = {
  lash: 'whip',
  drain: 'beam',
  projectile: 'arc',
  growth: 'beam',
  barrier: 'beam',
  generic: 'beam',
};

/**
 * Guess a delivery form from what an action actually did.
 *
 * Only ever consulted for an ability with no authored recipe. The rules are
 * deliberately few and conservative — a wrong guess here is a permanent
 * mis-read of an ability, so anything ambiguous falls through to `undefined`
 * and takes the generic treatment rather than being forced into a shape.
 *
 * Not a substitute for authoring. Every inference is reported as fallback
 * text in the Ability Theater so the coverage gap stays visible.
 */
function inferForm(
  scope: ActionScope,
  events: readonly BattleEvent[],
): AbilityForm | undefined {
  let damage = false;
  let healing = false;
  let shield = false;

  for (const i of scope.memberIndices) {
    const kind = events[i]?.kind;
    if (kind === 'damage_dealt' || kind === 'dot_ticked') damage = true;
    else if (kind === 'healing_applied') healing = true;
    else if (kind === 'shield_gained') shield = true;
  }

  // Order matters: a shield that also healed is still a barrier, and damage
  // that fed a heal is a drain rather than two separate things.
  if (shield) return 'barrier';
  if (damage && healing) return 'drain';
  if (damage) return 'projectile';
  return undefined;
}

/**
 * The same recipe with its asset kit detached.
 *
 * The SHAPE is unchanged — a lash with no art is still a lash and still takes
 * the same path over the same stages. Only the compositing pieces go away, and
 * the renderer draws its procedural body instead. Falling back to a different
 * FORM here would be wrong: missing art is not a reason to stop the ability
 * looking like what it is.
 */
function withoutAssets(recipe: AbilityPerformanceRecipe): AbilityPerformanceRecipe {
  if (!recipe.assetKitId) return recipe;
  const { assetKitId: _dropped, ...rest } = recipe;
  return rest;
}

/**
 * Compresses the `travel` stage to a near-zero duration.
 *
 * The stage still EXISTS — nothing downstream (consequence placement,
 * `contactProgress`, the beam's own extend-toward-target math) has to know
 * this material behaves differently, because a 40ms travel stage naturally
 * pushes `contactProgress` to almost the very start of the performance and
 * everything else follows from that unchanged. This is what lets a
 * `travelPace: 'instant'` material read as a lunge — appearing at the
 * target almost immediately — through the SAME renderer path every other
 * material uses, rather than a parallel "instant" code path that would have
 * to be kept in sync with it forever.
 *
 * 40ms rather than 0ms deliberately: a zero-length stage would make
 * `contactProgress` divide-by-zero-adjacent (`LashRenderer.tsx` already
 * guards with `Math.max(0.05, contactProgress)`, but a stage that visibly
 * exists for one frame reads as "instant" without relying on that guard).
 */
function withInstantTravel(recipe: AbilityPerformanceRecipe): AbilityPerformanceRecipe {
  const hasTravel = recipe.stages.some((s) => s.stage === 'travel');
  if (!hasTravel) return recipe;
  return {
    ...recipe,
    stages: recipe.stages.map((s) => (s.stage === 'travel' ? { ...s, durationMs: 40 } : s)),
  };
}

/**
 * Build the actor-id → card map the resolver needs.
 *
 * Hero actor ids are assigned from the party cards at snapshot time, so the
 * mapping is positional against the same `partyCards` array the view already
 * holds. Kept here rather than in the view so both the real battle and the
 * Ability Theater build it the same way.
 */
export function buildCardLookup(
  heroActorIds: readonly string[],
  partyCards: readonly Card[],
): ReadonlyMap<string, Card> {
  const map = new Map<string, Card>();
  heroActorIds.forEach((actorId, i) => {
    const card = partyCards[i];
    if (card) map.set(actorId, card);
  });
  return map;
}
