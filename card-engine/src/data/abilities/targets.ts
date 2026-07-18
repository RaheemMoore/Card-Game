import type { TargetType } from '../../types/abilities';

/**
 * Target rule metadata + power-budget multiplier. Area-of-effect and reliable
 * targeting cost more than single-target or random targeting. Multipliers are
 * applied to the sum of the ability's effect budgets.
 *
 * Governance §12: adding a new TargetType requires explicit Raheem approval.
 */
export interface TargetCatalogEntry {
  type: TargetType;
  displayName: string;
  description: string;
  /** Multiplier against the ability's summed effect budget. */
  budgetMultiplier: number;
  /** Whether the caller picks the specific unit (true) or the runtime does. */
  playerChooses: boolean;
}

export const TARGET_CATALOG: Record<TargetType, TargetCatalogEntry> = {
  self: {
    type: 'self',
    displayName: 'Self',
    description: 'Affects the caster.',
    budgetMultiplier: 1.0,
    playerChooses: false,
  },
  single_ally: {
    type: 'single_ally',
    displayName: 'Single Ally',
    description: 'Affects one chosen ally.',
    budgetMultiplier: 1.0,
    playerChooses: true,
  },
  all_allies: {
    type: 'all_allies',
    displayName: 'All Allies',
    description: 'Affects every ally in the party.',
    budgetMultiplier: 1.6,
    playerChooses: false,
  },
  single_enemy: {
    type: 'single_enemy',
    displayName: 'Single Enemy',
    description: 'Affects one chosen enemy.',
    budgetMultiplier: 1.0,
    playerChooses: true,
  },
  all_enemies: {
    type: 'all_enemies',
    displayName: 'All Enemies',
    description: 'Affects every enemy on the field.',
    budgetMultiplier: 1.5,
    playerChooses: false,
  },
  random_enemy: {
    type: 'random_enemy',
    displayName: 'Random Enemy',
    description: 'Affects a random enemy (or N random enemies).',
    budgetMultiplier: 0.75,
    playerChooses: false,
  },
  lowest_health_ally: {
    type: 'lowest_health_ally',
    displayName: 'Lowest-Health Ally',
    description: 'Automatically targets the ally with the least remaining HP.',
    budgetMultiplier: 1.1,
    playerChooses: false,
  },
  highest_attack_enemy: {
    type: 'highest_attack_enemy',
    displayName: 'Highest-Attack Enemy',
    description: 'Automatically targets the strongest enemy.',
    budgetMultiplier: 1.1,
    playerChooses: false,
  },
  boss_object: {
    type: 'boss_object',
    displayName: 'Boss',
    description: 'Targets the boss (may not exist outside boss battles).',
    budgetMultiplier: 1.0,
    playerChooses: false,
  },
  current_attacker: {
    type: 'current_attacker',
    displayName: 'Current Attacker',
    description: 'Targets whoever is currently attacking the caster (reaction).',
    budgetMultiplier: 0.9,
    playerChooses: false,
  },
};

export function getTargetEntry(type: TargetType): TargetCatalogEntry {
  return TARGET_CATALOG[type];
}
