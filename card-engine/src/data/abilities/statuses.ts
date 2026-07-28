import type { DamageType, StatusDefinition } from '../../types/abilities';

/**
 * Starter status catalog — 12 entries covering damage-over-time, control,
 * buff, and utility. Referenced by id from ApplyStatusEffect, RemoveStatusEffect,
 * TargetHasStatusCondition, etc.
 *
 * Boss behavior column follows Master Plan §15 — bosses are rarely immune,
 * more often use `reduced_duration` or `resistance`. Enforced by the combat
 * simulator at Stage B; recorded here so ability authors can reason about it.
 *
 * Governance §12: adding a new status requires explicit Raheem approval.
 *
 * WHAT A STATUS DOES vs WHAT IT IS. This file is the catalog — identity,
 * stacking, duration, dispel class. The MAGNITUDES live next to the damage
 * pipeline in `services/combat/formulas.ts` (`statusDamageModifiers`,
 * THORNS_REFLECT_SHARE, REGENERATION_PER_STACK), because they are balance
 * numbers that have to be read in the same breath as `resolveDamage`.
 *
 * `rooted` was cut 2026-07-28: "cannot target other enemies" is a no-op in a
 * single-boss fight, so it was a status that could be applied and never do
 * anything. It comes back if PvP lands.
 */
export const STATUS_CATALOG: Record<string, StatusDefinition> = {
  burn: {
    id: 'burn',
    displayName: 'Burn',
    category: 'negative',
    stackBehavior: 'stack',
    maxStacks: 5,
    defaultDuration: 3,
    dispelCategory: 'basic',
    bossBehavior: 'reduced_duration',
    description: 'Fire damage over time. Each stack ticks damage at end of round.',
  },
  bleed: {
    id: 'bleed',
    displayName: 'Bleed',
    category: 'negative',
    stackBehavior: 'stack',
    maxStacks: 5,
    defaultDuration: 3,
    dispelCategory: 'basic',
    bossBehavior: 'reduced_duration',
    description: 'Physical damage over time. Extends when the target is struck again.',
  },
  poison: {
    id: 'poison',
    displayName: 'Poison',
    category: 'negative',
    stackBehavior: 'stack',
    maxStacks: 8,
    defaultDuration: 4,
    dispelCategory: 'basic',
    bossBehavior: 'reduced_duration',
    description: 'Nature damage over time. Scales with stacks rather than duration.',
  },
  mark: {
    id: 'mark',
    displayName: 'Mark',
    category: 'negative',
    stackBehavior: 'refresh',
    maxStacks: 1,
    defaultDuration: 2,
    dispelCategory: 'basic',
    bossBehavior: 'normal',
    description: 'Marked targets take bonus damage from allied Beast + Martial abilities.',
  },
  stunned: {
    id: 'stunned',
    displayName: 'Stunned',
    category: 'negative',
    stackBehavior: 'ignore',
    maxStacks: 1,
    defaultDuration: 1,
    dispelCategory: 'strong',
    bossBehavior: 'resistance',
    description: 'Cannot act next round. Bosses resist with diminishing returns.',
  },
  weakened: {
    id: 'weakened',
    displayName: 'Weakened',
    category: 'negative',
    stackBehavior: 'refresh',
    maxStacks: 1,
    defaultDuration: 2,
    dispelCategory: 'basic',
    bossBehavior: 'normal',
    description: 'Damage dealt reduced by 30%.',
  },
  regeneration: {
    id: 'regeneration',
    displayName: 'Regeneration',
    category: 'positive',
    stackBehavior: 'refresh',
    maxStacks: 3,
    defaultDuration: 3,
    dispelCategory: 'basic',
    bossBehavior: 'normal',
    description: 'Heals a percentage of max HP each round for the duration.',
  },
  barrier: {
    id: 'barrier',
    displayName: 'Barrier',
    category: 'positive',
    stackBehavior: 'stack',
    maxStacks: 3,
    defaultDuration: 3,
    dispelCategory: 'strong',
    bossBehavior: 'normal',
    description: 'Absorbs incoming damage until depleted or expired.',
  },
  thorns: {
    id: 'thorns',
    displayName: 'Thorns',
    category: 'positive',
    stackBehavior: 'refresh',
    maxStacks: 1,
    defaultDuration: 3,
    dispelCategory: 'basic',
    bossBehavior: 'normal',
    description: 'Reflects a portion of physical damage back to the attacker.',
  },
  rage: {
    id: 'rage',
    displayName: 'Rage',
    category: 'positive',
    stackBehavior: 'stack',
    maxStacks: 4,
    defaultDuration: 3,
    dispelCategory: 'strong',
    bossBehavior: 'normal',
    description: 'Each stack increases damage dealt. Barbarian signature status.',
  },
  focus: {
    id: 'focus',
    displayName: 'Focus',
    category: 'positive',
    stackBehavior: 'stack',
    maxStacks: 3,
    defaultDuration: 2,
    dispelCategory: 'basic',
    bossBehavior: 'normal',
    description: 'Each stack improves the next ability. Monk signature status.',
  },
  /* --- Applied by EFFECTS rather than by `apply_status` ---------------
     `guard` and `taunt` effects materialise these directly in the reducer.
     They live here anyway so their stacking is defined rather than falling
     back to a default, and so `remove_status` can find them by category. */
  guarded: {
    id: 'guarded',
    displayName: 'Guarding',
    category: 'positive',
    // Refresh, not stack: two guards should not multiply into immunity. The
    // stronger application wins and resets the clock.
    stackBehavior: 'refresh',
    maxStacks: 1,
    defaultDuration: 1,
    dispelCategory: 'unremovable',
    bossBehavior: 'normal',
    description: 'Incoming damage reduced. The reduction is carried by the application.',
  },
  taunt: {
    id: 'taunt',
    displayName: 'Taunting',
    category: 'positive',
    stackBehavior: 'refresh',
    maxStacks: 1,
    defaultDuration: 2,
    dispelCategory: 'unremovable',
    bossBehavior: 'normal',
    description: 'The boss attacks this hero, overriding its own target choice.',
  },
};

/**
 * What a damage-over-time status burns AS.
 *
 * Without this a DoT has no damage type of its own and falls back to a
 * default — which had the fire-resistant Emberborn Wraith halving BLEED
 * damage, caught by actually playing a round rather than by any test.
 * A cut is a cut; only fire is fire.
 *
 * An ability may still override this by declaring its own element typing;
 * this is the floor, not a ceiling.
 */
export const STATUS_DAMAGE_TYPE: Record<string, DamageType> = {
  burn: 'fire',
  bleed: 'physical',
  poison: 'nature',
};

export const STATUS_IDS = Object.keys(STATUS_CATALOG);

export function getStatus(id: string): StatusDefinition | undefined {
  return STATUS_CATALOG[id];
}
