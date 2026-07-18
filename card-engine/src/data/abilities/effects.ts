import type { EffectType } from '../../types/abilities';

/**
 * Display + prompt metadata per effect type. Runtime shape is enforced by
 * the discriminated union in types/abilities.ts. This catalog is what the
 * validator and the Claude ability-candidate prompt look up when they need
 * to say "what does effect X do?".
 *
 * Governance §12: adding a new EffectType requires explicit Raheem approval
 * (Master Plan §12.5 escape hatch — quarantined `experimental` first).
 */
export interface EffectCatalogEntry {
  type: EffectType;
  displayName: string;
  /** One-sentence player-facing summary. */
  description: string;
  /** Additive contribution to powerBudgetScore before target/trigger multipliers. */
  budgetBase: number;
  /** Broad category for prompt guidance + power-budget grouping. */
  category: 'offense' | 'defense' | 'support' | 'utility' | 'control' | 'resource';
}

export const EFFECT_CATALOG: Record<EffectType, EffectCatalogEntry> = {
  direct_damage: {
    type: 'direct_damage',
    displayName: 'Direct Damage',
    description: 'Deal a flat amount of damage to the target.',
    budgetBase: 10,
    category: 'offense',
  },
  damage_over_time: {
    type: 'damage_over_time',
    displayName: 'Damage over Time',
    description: 'Apply a status that ticks damage each round for its duration.',
    budgetBase: 12,
    category: 'offense',
  },
  healing: {
    type: 'healing',
    displayName: 'Healing',
    description: 'Restore health to the target.',
    budgetBase: 8,
    category: 'support',
  },
  shielding: {
    type: 'shielding',
    displayName: 'Shielding',
    description: 'Grant a barrier that absorbs incoming damage.',
    budgetBase: 9,
    category: 'defense',
  },
  apply_status: {
    type: 'apply_status',
    displayName: 'Apply Status',
    description: 'Apply a persistent status effect to the target.',
    budgetBase: 7,
    category: 'control',
  },
  remove_status: {
    type: 'remove_status',
    displayName: 'Remove Status',
    description: 'Cleanse or dispel one or more statuses.',
    budgetBase: 6,
    category: 'utility',
  },
  resource_gain: {
    type: 'resource_gain',
    displayName: 'Resource Gain',
    description: 'Grant Mana or Tech.',
    budgetBase: 5,
    category: 'resource',
  },
  resource_drain: {
    type: 'resource_drain',
    displayName: 'Resource Drain',
    description: 'Reduce the target\'s Mana or Tech.',
    budgetBase: 6,
    category: 'control',
  },
  summon: {
    type: 'summon',
    displayName: 'Summon',
    description: 'Create a temporary ally unit.',
    budgetBase: 14,
    category: 'utility',
  },
  lifesteal: {
    type: 'lifesteal',
    displayName: 'Lifesteal',
    description: 'Convert a percentage of damage dealt into healing.',
    budgetBase: 8,
    category: 'offense',
  },
  multi_hit: {
    type: 'multi_hit',
    displayName: 'Multi-Hit',
    description: 'Strike multiple times in a single action.',
    budgetBase: 11,
    category: 'offense',
  },
  guard: {
    type: 'guard',
    displayName: 'Guard',
    description: 'Reduce incoming damage for a duration.',
    budgetBase: 8,
    category: 'defense',
  },
  taunt: {
    type: 'taunt',
    displayName: 'Taunt',
    description: 'Force enemies to target this hero.',
    budgetBase: 7,
    category: 'defense',
  },
  conditional_bonus: {
    type: 'conditional_bonus',
    displayName: 'Conditional Bonus',
    description: 'Apply additional effects when a condition is met.',
    budgetBase: 4,
    category: 'utility',
  },
  ultimate_charge_gain: {
    type: 'ultimate_charge_gain',
    displayName: 'Ultimate Charge',
    description: 'Contribute to the Ultimate charge meter (Stage B).',
    budgetBase: 5,
    category: 'resource',
  },
};

export function getEffectEntry(type: EffectType): EffectCatalogEntry {
  return EFFECT_CATALOG[type];
}
