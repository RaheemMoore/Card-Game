import type { TriggerType } from '../../types/abilities';

/**
 * Trigger metadata + frequency multiplier for the power-budget calculation.
 * A trigger that fires every round costs more budget than one that fires
 * once per battle. `on_use` is the baseline (multiplier 1.0).
 *
 * Governance §12: adding a new TriggerType requires explicit Raheem approval.
 */
export interface TriggerCatalogEntry {
  type: TriggerType;
  displayName: string;
  description: string;
  /** Multiplier against the effect-budget total. */
  budgetMultiplier: number;
  /** Whether the trigger requires no player action (passive) or is an active use. */
  passive: boolean;
}

export const TRIGGER_CATALOG: Record<TriggerType, TriggerCatalogEntry> = {
  on_use: {
    type: 'on_use',
    displayName: 'On Use',
    description: 'Fires when the player activates the ability.',
    budgetMultiplier: 1.0,
    passive: false,
  },
  start_of_round: {
    type: 'start_of_round',
    displayName: 'Start of Round',
    description: 'Fires at the beginning of every round.',
    budgetMultiplier: 1.8,
    passive: true,
  },
  end_of_round: {
    type: 'end_of_round',
    displayName: 'End of Round',
    description: 'Fires at the end of every round.',
    budgetMultiplier: 1.8,
    passive: true,
  },
  on_damage_dealt: {
    type: 'on_damage_dealt',
    displayName: 'On Damage Dealt',
    description: 'Fires whenever the caster deals damage.',
    budgetMultiplier: 1.5,
    passive: true,
  },
  on_damage_received: {
    type: 'on_damage_received',
    displayName: 'On Damage Received',
    description: 'Fires whenever the caster is damaged.',
    budgetMultiplier: 1.3,
    passive: true,
  },
  on_block: {
    type: 'on_block',
    displayName: 'On Block',
    description: 'Fires when the caster blocks or guards incoming damage.',
    budgetMultiplier: 1.1,
    passive: true,
  },
  on_heal: {
    type: 'on_heal',
    displayName: 'On Heal',
    description: 'Fires when the caster or an ally is healed.',
    budgetMultiplier: 1.0,
    passive: true,
  },
  on_status_applied: {
    type: 'on_status_applied',
    displayName: 'On Status Applied',
    description: 'Fires when a specified status is applied to a target.',
    budgetMultiplier: 1.2,
    passive: true,
  },
  below_health_threshold: {
    type: 'below_health_threshold',
    displayName: 'Below Health Threshold',
    description: 'Fires once per battle when caster HP drops below a percentage.',
    budgetMultiplier: 0.85,
    passive: true,
  },
  above_resource_threshold: {
    type: 'above_resource_threshold',
    displayName: 'Above Resource Threshold',
    description: 'Fires when caster resource (Mana or Tech) exceeds a threshold.',
    budgetMultiplier: 0.9,
    passive: true,
  },
};

export function getTriggerEntry(type: TriggerType): TriggerCatalogEntry {
  return TRIGGER_CATALOG[type];
}
