import type { HiddenFate, ElementName, ElementBond } from '../../types/bible';
import type { ArchetypeName, Rank } from '../../types/card';
import type { CardAbilityReference } from '../../types/abilities';
import type { CharacterSheet } from '../../types/characterSheet';
import { getWeaponPool, getWeaponDescriptor } from '../../data/archetypeWeapons';
import { getEnvironmentPool, isTraditionCoupled } from '../../data/archetypeEnvironments';
import {
  getCompanionPool,
  getCompanionById,
  companionAppears,
  companionPresence,
} from '../../data/archetypeCompanions';
import { getPosePool } from '../../data/archetypePoses';

/**
 * The seam that builds the ephemeral CharacterSheet the Image Engine
 * (services/portraitAssembler.ts) reads. Split into two pure functions:
 *
 *  - resolveLockedSelections: rolls + LOCKS the weapon / companion /
 *    environment identity onto the persisted HiddenFate. Fill-if-absent, so a
 *    fresh Foundation forge rolls every id, a tier-up reads what was locked
 *    (carried in by preserveIdentityAcrossRanks), and a legacy card missing an
 *    id gets it filled on its next pass — all without re-rolling a locked value.
 *
 *  - buildCharacterSheet: pure read of the (already-locked) HiddenFate + render
 *    context into a CharacterSheet. The rank-scaled POSE is rolled here (poses
 *    are per-rank, not a locked identity — see archetypePoses per-rank pools);
 *    the weapon/companion DESCRIPTORS are looked up from the locked ids.
 *
 * Both take an injectable `rng` so they are deterministic + unit-testable.
 */

export type Rng = () => number;

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Roll + lock the weapon / companion / environment ids onto a HiddenFate.
 * Returns a new object (never mutates the input). Any id already present is
 * kept verbatim — the lock is drift-proof even when a pool later gains entries.
 * Archetypes with an empty pool simply get no id (the assembler falls back).
 */
export function resolveLockedSelections(
  hiddenFate: HiddenFate,
  archetype: ArchetypeName,
  rng: Rng = Math.random,
): HiddenFate {
  const out: HiddenFate = { ...hiddenFate };

  if (out.weaponId === undefined) {
    const pool = getWeaponPool(archetype);
    if (pool.length > 0) out.weaponId = pick(pool, rng).id;
  }

  if (out.environmentId === undefined) {
    const pool = getEnvironmentPool(archetype);
    // Tradition coupling (Barbarian): when the env pool is authored 1:1 parallel
    // to the fashion variants, pick the family matching the chosen Tradition so
    // the background never mismatches the culture. Falls back to a random roll
    // when the index is absent (legacy/tier-up) or out of range.
    const idx = out.fashionVariantIndex;
    if (
      pool.length > 0 &&
      isTraditionCoupled(archetype) &&
      idx !== undefined &&
      idx >= 0 &&
      idx < pool.length
    ) {
      out.environmentId = pool[idx].id;
    } else if (pool.length > 0) {
      out.environmentId = pick(pool, rng).id;
    }
  }

  // Bare-chest retired game-wide (Raheem 2026-07-23): NO shirtless, ever.
  // Force false so no card carries the flag (allowsBareChest also hard-returns false).
  if (out.bareChestRoll === undefined) {
    out.bareChestRoll = false;
  }

  // companionPresent is the 50/50 gate (Beastmaster always true; empty-pool
  // archetypes always false). Rolled once and locked; the id is only set when
  // the character actually has a retinue.
  if (out.companionPresent === undefined) {
    const present = companionAppears(archetype, rng());
    out.companionPresent = present;
    if (present) {
      const pool = getCompanionPool(archetype);
      if (pool.length > 0) out.companionId = pick(pool, rng).id;
    }
  }

  return out;
}

/** Caller-supplied render context — everything about HOW to stage this render
 *  that is not part of the persisted identity substrate. */
export interface RenderContext {
  archetype: ArchetypeName;
  rank: Rank;
  /** The element as it should render NOW (Fallen-Seraph Infernal is resolved
   *  by the caller before this point). */
  resolvedElement: ElementName;
  elementBond?: ElementBond;
  diversityAxis: string;
  isEvolution: boolean;
  narrativeAxisPath?: string;
  abilityRefs: readonly CardAbilityReference[];
  storyMotifs: readonly string[];
  /** Explicit pose that overrides the pool roll (e.g. the Vampire feral-
   *  Foundation gate). When absent, a rank-appropriate pose is rolled. */
  poseOverride?: string;
}

/**
 * Pure read: (locked) HiddenFate + render context → CharacterSheet. The Image
 * Engine consumes the result. Deterministic given `rng` (only the pose roll
 * uses it).
 */
export function buildCharacterSheet(
  hiddenFate: HiddenFate,
  ctx: RenderContext,
  rng: Rng = Math.random,
): CharacterSheet {
  const pool = getPosePool(ctx.archetype, ctx.rank);
  const pose = ctx.poseOverride ?? (pool.length > 0 ? pick(pool, rng) : '');

  const weapon = hiddenFate.weaponId
    ? getWeaponDescriptor(ctx.archetype, hiddenFate.weaponId, ctx.rank)
    : '';

  let companion = '';
  if (hiddenFate.companionPresent && hiddenFate.companionId) {
    const entry = getCompanionById(ctx.archetype, hiddenFate.companionId);
    if (entry) companion = companionPresence(ctx.archetype, ctx.rank, entry.descriptor);
  }

  return {
    hiddenFate,
    storyMotifs: ctx.storyMotifs,
    archetype: ctx.archetype,
    rank: ctx.rank,
    resolvedElement: ctx.resolvedElement,
    elementBond: ctx.elementBond,
    pose,
    weapon,
    diversityAxis: ctx.diversityAxis,
    isEvolution: ctx.isEvolution,
    narrativeAxisPath: ctx.narrativeAxisPath,
    companion,
    abilityRefs: ctx.abilityRefs,
  };
}
