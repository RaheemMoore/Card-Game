import type { StatusDefinition } from '../../types/abilities';

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
  rooted: {
    id: 'rooted',
    displayName: 'Rooted',
    category: 'negative',
    stackBehavior: 'refresh',
    maxStacks: 1,
    defaultDuration: 2,
    dispelCategory: 'basic',
    bossBehavior: 'reduced_duration',
    description: 'Cannot target other enemies until removed. Reactions still fire.',
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
};

export const STATUS_IDS = Object.keys(STATUS_CATALOG);

export function getStatus(id: string): StatusDefinition | undefined {
  return STATUS_CATALOG[id];
}
