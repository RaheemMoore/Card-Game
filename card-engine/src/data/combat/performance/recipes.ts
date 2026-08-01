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
/*  Stage vocabularies                                                 */
/* ------------------------------------------------------------------ */

/**
 * The plain outbound attack: wind up, throw, cross the gap, land, settle.
 *
 * Durations are nominal-at-full-motion and were chosen to sit INSIDE the
 * existing beat budget rather than alongside it — the queue already holds an
 * impact beat for 400ms (`TIMINGS.impact`), so a performance that ran 1200ms
 * would still be mid-travel when the journal had moved on. Total here is
 * 620ms for exactly that reason.
 */
const OUTBOUND_STAGES: readonly StageRecipe[] = [
  { stage: 'charge', durationMs: 140, accepts: ['resource'] },
  { stage: 'cast', durationMs: 90, accepts: [] },
  { stage: 'travel', durationMs: 150, accepts: [] },
  { stage: 'impact', durationMs: 160, accepts: ['damage', 'defeat'] },
  { stage: 'aftermath', durationMs: 80, accepts: ['status_applied', 'status_removed'] },
  { stage: 'recover', durationMs: 0, accepts: [] },
];

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
const DRAIN_STAGES: readonly StageRecipe[] = [
  { stage: 'charge', durationMs: 180, accepts: ['resource'] },
  { stage: 'cast', durationMs: 90, accepts: [] },
  { stage: 'travel', durationMs: 150, accepts: [] },
  { stage: 'impact', durationMs: 170, accepts: ['damage', 'defeat'] },
  { stage: 'return', durationMs: 180, accepts: [] },
  { stage: 'arrival', durationMs: 150, accepts: ['healing'] },
  { stage: 'aftermath', durationMs: 120, accepts: ['status_applied', 'status_removed'] },
  { stage: 'recover', durationMs: 0, accepts: [] },
];

/**
 * Growth: the ground tells you first, then it takes you.
 *
 * `manifest` is long here — 320ms against travel's 150 — because staged
 * emergence IS the performance. Roots that appear instantly are a projectile
 * with a leaf texture. The damage lands on `impact`, which is the moment of
 * constriction, not the moment the first tip breaks the surface.
 */
const GROWTH_STAGES: readonly StageRecipe[] = [
  { stage: 'charge', durationMs: 160, accepts: ['resource'] },
  { stage: 'cast', durationMs: 100, accepts: [] },
  { stage: 'manifest', durationMs: 320, accepts: [] },
  { stage: 'impact', durationMs: 170, accepts: ['damage', 'defeat'] },
  { stage: 'aftermath', durationMs: 200, accepts: ['status_applied', 'status_removed'] },
  { stage: 'recover', durationMs: 0, accepts: [] },
];

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
const BARRIER_STAGES: readonly StageRecipe[] = [
  { stage: 'charge', durationMs: 160, accepts: ['resource'] },
  { stage: 'cast', durationMs: 110, accepts: [] },
  { stage: 'manifest', durationMs: 260, accepts: ['shield'] },
  { stage: 'aftermath', durationMs: 200, accepts: ['status_removed', 'status_applied', 'healing'] },
  { stage: 'recover', durationMs: 0, accepts: [] },
];

/**
 * The catch-all. Accepts everything on one beat, because by definition we do
 * not know what this ability is doing.
 */
const GENERIC_STAGES: readonly StageRecipe[] = [
  { stage: 'cast', durationMs: 90, accepts: ['resource'] },
  {
    stage: 'impact',
    durationMs: 260,
    accepts: ['damage', 'healing', 'shield', 'status_applied', 'status_removed', 'defeat'],
  },
  { stage: 'recover', durationMs: 0, accepts: [] },
];

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
