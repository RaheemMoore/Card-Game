import type {
  AbilityForm,
  AbilityPerformanceRecipe,
  StageRecipe,
} from '../../../services/combat/performance/types';

/**
 * Authored performance recipes.
 *
 * A recipe says WHAT SHAPE an ability takes and WHICH STAGES it moves through.
 * It deliberately says nothing about what the ability is made of — that is the
 * material axis, resolved from the casting card's element at runtime. One
 * recipe therefore serves every caster: `attuned_strike` is a lash whether the
 * caster is a Blood vampire, a Water druid or a Fire barbarian, and the three
 * look nothing alike while sharing every line of path code.
 *
 * Resolution precedence (implemented in `resolvePerformance.ts`, tested in
 * `resolvePerformance.test.ts`):
 *
 *   1. exact recipe by `abilityDefinitionId`   — `BY_ABILITY` below
 *   2. form recipe + caster material           — `BY_FORM` below
 *   3. form recipe + generic material treatment
 *   4. generic fallback by event category      — `GENERIC_RECIPE`
 *
 * Everything here is `approvalStatus: 'placeholder'` for Delivery 1. The
 * shapes and timings are real and reviewable; the ART is not generated yet,
 * and nothing is promoted to `'approved'` until Raheem has seen it in the
 * Ability Theater at real rendered scale.
 */

/* ------------------------------------------------------------------ */
/*  Tempo                                                              */
/* ------------------------------------------------------------------ */

/**
 * The single dial for how fast combat performances play.
 *
 * Every stage duration below is written at a readable "base" tempo and then
 * multiplied by this. Tuning the pace of the whole game is therefore one
 * number, not thirty — which matters because this has already been retuned
 * twice and will be again.
 *
 * **3.25 (Raheem, 2026-08-01).** Settled on the dial after two rounds. He first
 * described it as "0.35 of the old speed" (≈2.85), then found the exact value
 * himself once the slider existed: "I really like tempo of 3.25x because it
 * just fits all of them very well." That is the whole reason the dial was
 * built — a number found by watching beats a number argued about in prose.
 *
 * Applied uniformly on purpose. The RATIOS between stages were tuned
 * separately and he liked them — impact stays proportionally short so contact
 * snaps, travel and aftermath stay long. Scaling everything by one factor
 * preserves the shape he approved rather than inventing a new one.
 *
 * **The consequence, stated plainly:** a basic attack now runs ~5.4s instead
 * of ~1.7s. With three heroes acting in sequence that is roughly 16s of hero
 * performance per round before the boss moves. That is a deliberate choice to
 * make combat a thing you watch; if rounds start feeling long in real play,
 * this is the one number to turn down.
 */
export const PERFORMANCE_TEMPO = 3.25;

/** Apply the global tempo to an authored stage list. */
function paced(stages: readonly StageRecipe[]): readonly StageRecipe[] {
  return stages.map((s) => ({
    ...s,
    durationMs: Math.round(s.durationMs * PERFORMANCE_TEMPO),
  }));
}

/* ------------------------------------------------------------------ */
/*  Stage vocabularies                                                 */
/* ------------------------------------------------------------------ */

/**
 * The plain outbound attack: wind up, throw, cross the gap, land, settle.
 *
 * ## The pacing rule (Raheem, 2026-08-01)
 *
 * "We're making beautiful art. I want people to enjoy all of this charging and
 * different textures." So the shape is deliberately NOT uniform:
 *
 *  - **charge and travel are long.** These are the stages where the material
 *    is on screen doing its thing — a Blood jet crossing the gap is the whole
 *    point, and at 150ms nobody saw it.
 *  - **impact is SHORT.** The moment between the beam arriving and the splash
 *    appearing has to be tight or contact feels mushy. Snap, not fade.
 *  - **aftermath is long.** The splash sits on the boss and is looked at.
 *
 * These are BASE numbers — `paced()` multiplies them by `PERFORMANCE_TEMPO`,
 * so the shipped attack runs ~5.4s. Edit the ratios here; edit the overall
 * speed with the tempo constant.
 *
 * ## The coupling to watch
 *
 * The presentation queue has its own beat budget (`TIMINGS` in
 * `presentation/types.ts` — an impact beat holds 400ms). Nothing is truncated
 * TODAY because the performance layer is not yet wired into live combat, but
 * when it is, a ~5.4s performance inside a 400ms beat would be cut off almost
 * immediately. Those timings have to grow to match at that point, and the gap
 * is now an order of magnitude rather than a rounding error — this is the
 * single biggest thing to get right when combat integration lands. The Ability
 * Theater drives the clock directly and is unaffected.
 */
const OUTBOUND_STAGES: readonly StageRecipe[] = paced([
  { stage: 'charge', durationMs: 260, accepts: ['resource'] },
  { stage: 'cast', durationMs: 130, accepts: [] },
  { stage: 'travel', durationMs: 420, accepts: [] },
  // Short on purpose — see the pacing rule above.
  { stage: 'impact', durationMs: 150, accepts: ['damage', 'defeat'] },
  { stage: 'aftermath', durationMs: 560, accepts: ['status_applied', 'status_removed'] },
  { stage: 'recover', durationMs: 140, accepts: [] },
]);

/**
 * Drain: everything the outbound attack does, and then the material comes
 * BACK carrying what it took.
 *
 * The `return` → `arrival` split is the entire point of this vocabulary and
 * the single most important thing Sanguine Tithe proves. `healing` is accepted
 * ONLY on `arrival`, never on `impact`, so the heal resolves visually when the
 * blood reaches the card rather than at the same instant as the damage. Two
 * numbers appearing together reads as an accounting entry; a thing taken and
 * carried home reads as a drain.
 */
const DRAIN_STAGES: readonly StageRecipe[] = paced([
  { stage: 'charge', durationMs: 300, accepts: ['resource'] },
  { stage: 'cast', durationMs: 130, accepts: [] },
  { stage: 'travel', durationMs: 420, accepts: [] },
  { stage: 'impact', durationMs: 150, accepts: ['damage', 'defeat'] },
  // The return leg is the drain's signature — it has to be long enough to
  // watch material travel back, or the heal reads as a coincidence.
  { stage: 'return', durationMs: 420, accepts: [] },
  { stage: 'arrival', durationMs: 300, accepts: ['healing'] },
  { stage: 'aftermath', durationMs: 420, accepts: ['status_applied', 'status_removed'] },
  { stage: 'recover', durationMs: 140, accepts: [] },
]);

/**
 * Growth: the ground tells you first, then it takes you.
 *
 * `manifest` is long here — 320ms against travel's 150 — because staged
 * emergence IS the performance. Roots that appear instantly are a projectile
 * with a leaf texture. The damage lands on `impact`, which is the moment of
 * constriction, not the moment the first tip breaks the surface.
 */
const GROWTH_STAGES: readonly StageRecipe[] = paced([
  { stage: 'charge', durationMs: 280, accepts: ['resource'] },
  { stage: 'cast', durationMs: 140, accepts: [] },
  // The longest stage in the game, and correctly so: staged emergence IS this
  // ability, and five roots breaking ground in sequence needs room to read.
  { stage: 'manifest', durationMs: 640, accepts: [] },
  { stage: 'impact', durationMs: 160, accepts: ['damage', 'defeat'] },
  { stage: 'aftermath', durationMs: 560, accepts: ['status_applied', 'status_removed'] },
  { stage: 'recover', durationMs: 140, accepts: [] },
]);

/**
 * Barrier: interpose, build, and then STAY.
 *
 * There is no `impact` and no `travel` — a barrier does not go anywhere. The
 * cleanse (`status_removed`) is given its own beat after the shield lands so
 * "you are protected" and "what was on you is lifted" are two readable events
 * rather than one flash.
 *
 * Persistence is NOT a stage. The pane lives as long as the shield does, bound
 * to live battle state; the recipe only describes how it arrives.
 */
const BARRIER_STAGES: readonly StageRecipe[] = paced([
  { stage: 'charge', durationMs: 280, accepts: ['resource'] },
  { stage: 'cast', durationMs: 140, accepts: [] },
  { stage: 'manifest', durationMs: 460, accepts: ['shield'] },
  { stage: 'aftermath', durationMs: 520, accepts: ['status_removed', 'status_applied', 'healing'] },
  { stage: 'recover', durationMs: 140, accepts: [] },
]);

/**
 * The catch-all. Accepts everything on one beat, because by definition we do
 * not know what this ability is doing.
 */
const GENERIC_STAGES: readonly StageRecipe[] = paced([
  { stage: 'cast', durationMs: 160, accepts: ['resource'] },
  {
    stage: 'impact',
    durationMs: 420,
    accepts: ['damage', 'healing', 'shield', 'status_applied', 'status_removed', 'defeat'],
  },
  { stage: 'recover', durationMs: 120, accepts: [] },
]);

/* ------------------------------------------------------------------ */
/*  Form defaults — precedence level 2                                 */
/* ------------------------------------------------------------------ */

const base = (
  id: string,
  form: AbilityForm,
  stages: readonly StageRecipe[],
  overrides: Partial<AbilityPerformanceRecipe> = {},
): AbilityPerformanceRecipe => ({
  id,
  version: 1,
  form,
  material: { kind: 'caster_element' },
  stages,
  castAnchor: 'caster_card_edge',
  targetAnchor: 'boss_center',
  intensity: 'derive',
  fallbackRecipeId: 'form_generic',
  approvalStatus: 'placeholder',
  ...overrides,
});

export const BY_FORM: Record<AbilityForm, AbilityPerformanceRecipe> = {
  lash: base('form_lash', 'lash', OUTBOUND_STAGES),
  drain: base('form_drain', 'drain', DRAIN_STAGES),
  growth: base('form_growth', 'growth', GROWTH_STAGES, {
    // Growth comes out of the GROUND, not out of the card. Casting from the
    // card edge and arriving at the boss's centre of mass would draw a beam.
    castAnchor: 'boss_ground',
    targetAnchor: 'boss_feet',
  }),
  barrier: base('form_barrier', 'barrier', BARRIER_STAGES, {
    castAnchor: 'caster_card',
    targetAnchor: 'target_card_front',
  }),
  projectile: base('form_projectile', 'projectile', OUTBOUND_STAGES),
  generic: base('form_generic', 'generic', GENERIC_STAGES, {
    // The one recipe that must never delegate — it is the bottom of the chain.
    fallbackRecipeId: 'form_generic',
  }),
};

/** Precedence level 4. Never null, never absent. */
export const GENERIC_RECIPE = BY_FORM.generic;

/* ------------------------------------------------------------------ */
/*  Exact ability recipes — precedence level 1                         */
/* ------------------------------------------------------------------ */

/**
 * The four Delivery 1 pilots.
 *
 * `attuned_strike` is the lash pilot on purpose: it is the shared ability
 * whose `damageTypeSource` is `'element'`, so it is the one ability in the
 * game that already varies by the caster's element mechanically. Making it the
 * form-reuse proof means the Blood/Water/Fire comparison in the Ability
 * Theater is a real ability three real cards would actually cast, not a
 * contrived demo.
 */
export const BY_ABILITY: Record<string, AbilityPerformanceRecipe> = {
  /*
   * `beam` rather than `whip` after the first review (Raheem, 2026-08-01): the
   * whip's lateral wobble, seen mid-flight, read as "a squiggle" instead of as
   * something being fired. A pressurised stream out of the card says travel far
   * more clearly, and it suits a material under force. `arc` is the alternative
   * he named — lobbed — and both are one word away in this recipe.
   */
  ability_attuned_strike: base('ability_attuned_strike', 'lash', OUTBOUND_STAGES, {
    id: 'recipe_attuned_strike',
    abilityDefinitionId: 'ability_attuned_strike',
    trajectory: 'beam',
    fallbackRecipeId: 'form_lash',
  }),

  /*
   * The one ability that does NOT travel across the arena.
   *
   * Raheem considered a reaching beam and then reversed himself, correctly
   * (2026-08-01): "I kinda like the roots reaching out of the ground and
   * affecting the boss. That's kinda different — it would make this element
   * stand out from the other elements a lot."
   *
   * He is right, and it is worth saying why: every other ability is a thing
   * fired from a card at a target. Nature acting on the terrain AROUND its
   * target is a different sentence, and a roster where every ability is the
   * same sentence in a different colour is exactly the failure this system was
   * built to escape. The variety is worth more than the consistency here.
   *
   * The sequence: a plant blooms on the CARD (the charge tell), and then roots
   * erupt from the ground around the boss and wrap it. Note the charge and the
   * delivery are in two different places, which is why the charge tell is
   * anchored to the caster independently of `castAnchor` — see PerformanceView.
   */
  ability_rootgrasp: base('recipe_rootgrasp', 'growth', GROWTH_STAGES, {
    abilityDefinitionId: 'ability_rootgrasp',
    castAnchor: 'boss_ground',
    targetAnchor: 'boss_feet',
    fallbackRecipeId: 'form_growth',
  }),

  ability_bearing_witness: base('recipe_bearing_witness', 'barrier', BARRIER_STAGES, {
    abilityDefinitionId: 'ability_bearing_witness',
    castAnchor: 'caster_card',
    targetAnchor: 'target_card_front',
    fallbackRecipeId: 'form_barrier',
  }),

  ability_sanguine_tithe: base('recipe_sanguine_tithe', 'drain', DRAIN_STAGES, {
    abilityDefinitionId: 'ability_sanguine_tithe',
    fallbackRecipeId: 'form_drain',
  }),

  /*
   * Load-Bearing is the barrier pilot NOT taken (Raheem chose Bearing Witness,
   * 2026-08-01, partly because it pays off `CardShieldPane` which has existed
   * unused in real combat since it was written). Mapped here as the handoff's
   * "manifest-only follow-up" so the decision is recorded in code rather than
   * only in a plan file — but note it is a SELF taunt+guard, so when its
   * renderer is written the readability requirement is that it must not imply
   * an all-party shield.
   */
  ability_load_bearing: base('recipe_load_bearing', 'barrier', BARRIER_STAGES, {
    abilityDefinitionId: 'ability_load_bearing',
    castAnchor: 'caster_card',
    targetAnchor: 'caster_card_front',
    fallbackRecipeId: 'form_barrier',
  }),
};

/** Look up the exact recipe for an ability, if one is authored. */
export function recipeForAbility(
  abilityDefinitionId: string | undefined,
): AbilityPerformanceRecipe | undefined {
  return abilityDefinitionId ? BY_ABILITY[abilityDefinitionId] : undefined;
}

/** Every recipe, for the Ability Theater's coverage readout. */
export const ALL_RECIPES: readonly AbilityPerformanceRecipe[] = [
  ...Object.values(BY_FORM),
  ...Object.values(BY_ABILITY),
];
