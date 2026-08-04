import type {
  AbilityCombatSnapshot,
  ActionDenialReason,
  BattleState,
  HeroCombatant,
} from '../../types/combat';
import { ULTIMATE_CHARGE_MAX } from './formulas';

/** Reducer-owned truth for whether one snapshotted ability can be used now. */
export function abilityDenialReason(
  state: BattleState,
  hero: HeroCombatant,
  ability: AbilityCombatSnapshot,
): Extract<ActionDenialReason, 'insufficient_resource' | 'on_cooldown' | 'stunned' | 'silenced' | 'invalid_target'> | null {
  if (hero.defeated) return 'invalid_target';
  if (hero.statuses.some((status) => status.statusId === 'stunned')) return 'stunned';
  if (hero.statuses.some((status) => status.statusId === 'silenced')) return 'silenced';
  if (hero.cooldowns.some((entry) => entry.abilityDefinitionId === ability.definitionId)) {
    return 'on_cooldown';
  }
  if (ability.version.resourceCost > state.partyResource[hero.snapshot.resourceType]) {
    return 'insufficient_resource';
  }
  if (ability.slot === 'ultimate' && hero.ultimateCharge < ULTIMATE_CHARGE_MAX) {
    return 'on_cooldown';
  }
  if (!hasLivingTarget(state, hero, ability)) return 'invalid_target';
  return null;
}

export function hasCurrentlyUsableAbility(state: BattleState, hero: HeroCombatant): boolean {
  return visibleCommandAbilities(hero).some(
    (ability) => abilityDenialReason(state, hero, ability) === null,
  );
}

export function visibleCommandAbilities(hero: HeroCombatant): AbilityCombatSnapshot[] {
  // Saved cards can carry more than one historical snapshot for the same
  // slot. The command palette exposes the first core/signature/ultimate only,
  // so a hidden duplicate must never keep Strike or Guard artificially legal.
  const visibleBySlot = new Map<AbilityCombatSnapshot['slot'], AbilityCombatSnapshot>();
  for (const ability of hero.snapshot.abilities) {
    if (!visibleBySlot.has(ability.slot)) visibleBySlot.set(ability.slot, ability);
  }
  return [...visibleBySlot.values()];
}

function hasLivingTarget(
  state: BattleState,
  hero: HeroCombatant,
  ability: AbilityCombatSnapshot,
): boolean {
  switch (ability.version.targetRule.type) {
    case 'self':
      return !hero.defeated;
    case 'boss_object':
    case 'single_enemy':
    case 'current_attacker':
    case 'all_enemies':
    case 'highest_attack_enemy':
    case 'random_enemy':
      return !state.boss.defeated;
    case 'lowest_health_ally':
    case 'all_allies':
    case 'single_ally':
      return state.heroes.some((candidate) => !candidate.defeated);
  }
}
