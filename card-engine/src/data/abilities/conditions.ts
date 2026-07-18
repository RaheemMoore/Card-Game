import type { ConditionType } from '../../types/abilities';

/**
 * Condition metadata + budget credit. Conditions reduce the ability's
 * effective power budget because the effect only fires when the condition
 * holds — the harder to satisfy, the more credit (i.e. the more power the
 * ability can carry within budget).
 *
 * Governance §12: adding a new ConditionType requires explicit Raheem approval.
 */
export interface ConditionCatalogEntry {
  type: ConditionType;
  displayName: string;
  description: string;
  /**
   * Multiplier applied to the effect budget when this condition guards it.
   * < 1.0 discounts because the effect is unreliable; ~1.0 is easy to trigger.
   */
  budgetMultiplier: number;
}

export const CONDITION_CATALOG: Record<ConditionType, ConditionCatalogEntry> = {
  target_has_status: {
    type: 'target_has_status',
    displayName: 'Target has Status',
    description: 'Fires only when the target already carries a named status.',
    budgetMultiplier: 0.75,
  },
  user_has_status: {
    type: 'user_has_status',
    displayName: 'User has Status',
    description: 'Fires only when the caster carries a named status.',
    budgetMultiplier: 0.85,
  },
  user_hp_below_threshold: {
    type: 'user_hp_below_threshold',
    displayName: 'User HP Below Threshold',
    description: 'Fires only when the caster is under a percentage of max HP.',
    budgetMultiplier: 0.7,
  },
  boss_hp_below_threshold: {
    type: 'boss_hp_below_threshold',
    displayName: 'Boss HP Below Threshold',
    description: 'Fires only when the boss is under a percentage of max HP.',
    budgetMultiplier: 0.75,
  },
  resource_above_threshold: {
    type: 'resource_above_threshold',
    displayName: 'Resource Above Threshold',
    description: 'Fires only when Mana/Tech exceeds a threshold.',
    budgetMultiplier: 0.85,
  },
  summon_exists: {
    type: 'summon_exists',
    displayName: 'Summon Exists',
    description: 'Fires only when the caster has an active summon.',
    budgetMultiplier: 0.8,
  },
  shield_active: {
    type: 'shield_active',
    displayName: 'Shield Active',
    description: 'Fires only when a shield/barrier is up on the specified target.',
    budgetMultiplier: 0.85,
  },
  family_ability_used_earlier: {
    type: 'family_ability_used_earlier',
    displayName: 'Family Ability Used Earlier',
    description:
      'Fires only when an ability from a specific family has been used earlier in the battle.',
    budgetMultiplier: 0.8,
  },
};

export function getConditionEntry(type: ConditionType): ConditionCatalogEntry {
  return CONDITION_CATALOG[type];
}
