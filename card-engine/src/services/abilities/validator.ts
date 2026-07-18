import type {
  AbilityCondition,
  AbilityDefinition,
  AbilityEffect,
  AbilityTrigger,
  AbilityVersion,
  ScalingRule,
  StatusApplication,
} from '../../types/abilities';
import { EFFECT_CATALOG } from '../../data/abilities/effects';
import { TARGET_CATALOG } from '../../data/abilities/targets';
import { TRIGGER_CATALOG } from '../../data/abilities/triggers';
import { CONDITION_CATALOG } from '../../data/abilities/conditions';
import { STATUS_CATALOG } from '../../data/abilities/statuses';
import { ABILITY_FAMILY_IDS } from '../../data/abilities/families';
import { calculatePowerBudget, isWithinBudget, getBudgetBand } from '../../data/abilities/powerBudget';

export type ValidationError = { path: string; message: string };

export type ValidationResult =
  | { ok: true; powerBudgetScore: number }
  | { ok: false; errors: ValidationError[]; powerBudgetScore: number };

const MAX_COOLDOWN_ROUNDS = 6;
const MAX_CHARGES = 5;
const MIN_RESOURCE_COST = 0;
const MAX_RESOURCE_COST = 8;
const MAX_SCALING_COEFFICIENT = 2.5;
const MIN_DESCRIPTION_LENGTH = 8;

/**
 * Validate an ability version against the runtime contract + power budget
 * for its (slot, rarity) band. Also validates the parent AbilityDefinition
 * for family + role coherence.
 *
 * Returns a ValidationResult. On failure, errors[] lists every problem so
 * the admin queue can surface all of them at once rather than round-tripping.
 */
export function validateAbilityVersion(
  version: AbilityVersion,
  definition: AbilityDefinition,
): ValidationResult {
  const errors: ValidationError[] = [];

  // Definition-side sanity
  if (!definition.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(definition.slug)) {
    errors.push({ path: 'definition.slug', message: 'slug must be kebab-case (a-z, 0-9, hyphens)' });
  }
  if (!definition.displayName || definition.displayName.trim().length === 0) {
    errors.push({ path: 'definition.displayName', message: 'displayName is required' });
  }
  if (definition.descriptionShort.length < MIN_DESCRIPTION_LENGTH) {
    errors.push({
      path: 'definition.descriptionShort',
      message: `descriptionShort must be at least ${MIN_DESCRIPTION_LENGTH} chars`,
    });
  }
  if (definition.familyIds.length === 0) {
    errors.push({ path: 'definition.familyIds', message: 'ability must belong to at least one family' });
  }
  for (const familyId of definition.familyIds) {
    if (!ABILITY_FAMILY_IDS.includes(familyId)) {
      errors.push({ path: `definition.familyIds`, message: `unknown family "${familyId}"` });
    }
  }

  // Version-side sanity
  if (version.abilityId !== definition.id) {
    errors.push({ path: 'version.abilityId', message: 'version.abilityId does not match definition.id' });
  }
  if (version.effects.length === 0) {
    errors.push({ path: 'version.effects', message: 'ability must have at least one effect' });
  }
  if (version.resourceCost < MIN_RESOURCE_COST || version.resourceCost > MAX_RESOURCE_COST) {
    errors.push({
      path: 'version.resourceCost',
      message: `resourceCost must be within [${MIN_RESOURCE_COST}, ${MAX_RESOURCE_COST}]`,
    });
  }
  if (version.resourceType === 'none' && version.resourceCost !== 0) {
    errors.push({ path: 'version.resourceCost', message: 'resourceType "none" requires resourceCost 0' });
  }
  if (version.cooldownRounds != null && (version.cooldownRounds < 0 || version.cooldownRounds > MAX_COOLDOWN_ROUNDS)) {
    errors.push({
      path: 'version.cooldownRounds',
      message: `cooldownRounds must be within [0, ${MAX_COOLDOWN_ROUNDS}]`,
    });
  }
  if (version.maxCharges != null && (version.maxCharges < 1 || version.maxCharges > MAX_CHARGES)) {
    errors.push({ path: 'version.maxCharges', message: `maxCharges must be within [1, ${MAX_CHARGES}]` });
  }

  // Ultimate slot must not be flagged as passive-only trigger
  if (version.slotType === 'ultimate' && version.triggers?.every((t) => TRIGGER_CATALOG[t.type].passive)) {
    errors.push({ path: 'version.triggers', message: 'ultimate must be activatable, not purely passive' });
  }

  // Target rule
  if (!(version.targetRule.type in TARGET_CATALOG)) {
    errors.push({ path: 'version.targetRule.type', message: `unknown target type "${version.targetRule.type}"` });
  }

  // Effects, triggers, conditions
  version.effects.forEach((effect, i) => {
    validateEffect(effect, `version.effects[${i}]`, errors);
  });
  version.triggers?.forEach((trigger, i) => {
    validateTrigger(trigger, `version.triggers[${i}]`, errors);
  });
  version.conditions?.forEach((condition, i) => {
    validateCondition(condition, `version.conditions[${i}]`, errors);
  });
  version.scalingRules?.forEach((scaling, i) => {
    validateScaling(scaling, `version.scalingRules[${i}]`, errors);
  });

  // Power budget
  const powerBudgetScore = calculatePowerBudget(version);
  if (!isWithinBudget(powerBudgetScore, version.slotType, definition.rarity)) {
    const band = getBudgetBand(version.slotType, definition.rarity);
    errors.push({
      path: 'version.powerBudgetScore',
      message: `budget ${powerBudgetScore} outside band [${band.min}, ${band.max}] for ${version.slotType}/${definition.rarity}`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors, powerBudgetScore };
  }
  return { ok: true, powerBudgetScore };
}

function validateEffect(effect: AbilityEffect, path: string, errors: ValidationError[]): void {
  if (!(effect.type in EFFECT_CATALOG)) {
    errors.push({ path: `${path}.type`, message: `unknown effect type "${effect.type}"` });
    return;
  }
  switch (effect.type) {
    case 'direct_damage':
    case 'healing':
    case 'shielding':
    case 'ultimate_charge_gain':
    case 'resource_gain':
    case 'resource_drain':
      if (effect.amount == null || effect.amount < 0) {
        errors.push({ path: `${path}.amount`, message: 'amount must be >= 0' });
      }
      break;
    case 'damage_over_time':
      validateStatusRef(effect.statusId, `${path}.statusId`, errors);
      if (effect.amountPerTick < 0) errors.push({ path: `${path}.amountPerTick`, message: 'amountPerTick must be >= 0' });
      if (effect.duration <= 0) errors.push({ path: `${path}.duration`, message: 'duration must be > 0' });
      break;
    case 'apply_status':
      validateStatusApplication(effect.status, `${path}.status`, errors);
      if (effect.chance != null && (effect.chance < 0 || effect.chance > 1)) {
        errors.push({ path: `${path}.chance`, message: 'chance must be within [0, 1]' });
      }
      break;
    case 'remove_status':
      if (!['positive', 'negative', 'any'].includes(effect.category)) {
        errors.push({ path: `${path}.category`, message: 'category must be positive|negative|any' });
      }
      break;
    case 'multi_hit':
      if (effect.hitCount < 2) errors.push({ path: `${path}.hitCount`, message: 'hitCount must be >= 2' });
      if (effect.amountPerHit < 0) errors.push({ path: `${path}.amountPerHit`, message: 'amountPerHit must be >= 0' });
      break;
    case 'guard':
      if (effect.reductionPercent < 0 || effect.reductionPercent > 1) {
        errors.push({ path: `${path}.reductionPercent`, message: 'reductionPercent must be within [0, 1]' });
      }
      if (effect.duration <= 0) errors.push({ path: `${path}.duration`, message: 'duration must be > 0' });
      break;
    case 'lifesteal':
      if (effect.percentOfDamage < 0 || effect.percentOfDamage > 1) {
        errors.push({ path: `${path}.percentOfDamage`, message: 'percentOfDamage must be within [0, 1]' });
      }
      break;
    case 'taunt':
      if (effect.duration <= 0) errors.push({ path: `${path}.duration`, message: 'duration must be > 0' });
      break;
    case 'summon':
      if (!effect.unitId) errors.push({ path: `${path}.unitId`, message: 'unitId is required' });
      break;
    case 'conditional_bonus':
      validateCondition(effect.condition, `${path}.condition`, errors);
      effect.effects.forEach((inner, i) =>
        validateEffect(inner, `${path}.effects[${i}]`, errors),
      );
      break;
  }
}

function validateTrigger(trigger: AbilityTrigger, path: string, errors: ValidationError[]): void {
  if (!(trigger.type in TRIGGER_CATALOG)) {
    errors.push({ path: `${path}.type`, message: `unknown trigger type "${trigger.type}"` });
    return;
  }
  if (trigger.type === 'below_health_threshold' && (trigger.percent <= 0 || trigger.percent > 1)) {
    errors.push({ path: `${path}.percent`, message: 'percent must be within (0, 1]' });
  }
  if (trigger.type === 'on_status_applied' && trigger.statusId) {
    validateStatusRef(trigger.statusId, `${path}.statusId`, errors);
  }
}

function validateCondition(condition: AbilityCondition, path: string, errors: ValidationError[]): void {
  if (!(condition.type in CONDITION_CATALOG)) {
    errors.push({ path: `${path}.type`, message: `unknown condition type "${condition.type}"` });
    return;
  }
  switch (condition.type) {
    case 'target_has_status':
    case 'user_has_status':
      validateStatusRef(condition.statusId, `${path}.statusId`, errors);
      break;
    case 'user_hp_below_threshold':
    case 'boss_hp_below_threshold':
      if (condition.percent <= 0 || condition.percent > 1) {
        errors.push({ path: `${path}.percent`, message: 'percent must be within (0, 1]' });
      }
      break;
    case 'family_ability_used_earlier':
      if (!ABILITY_FAMILY_IDS.includes(condition.familyId)) {
        errors.push({ path: `${path}.familyId`, message: `unknown family "${condition.familyId}"` });
      }
      break;
  }
}

function validateScaling(scaling: ScalingRule, path: string, errors: ValidationError[]): void {
  if (!['atk', 'def', 'mana', 'tech'].includes(scaling.stat)) {
    errors.push({ path: `${path}.stat`, message: `unknown scaling stat "${scaling.stat}"` });
  }
  if (scaling.coefficient < 0 || scaling.coefficient > MAX_SCALING_COEFFICIENT) {
    errors.push({
      path: `${path}.coefficient`,
      message: `coefficient must be within [0, ${MAX_SCALING_COEFFICIENT}]`,
    });
  }
}

function validateStatusRef(statusId: string, path: string, errors: ValidationError[]): void {
  if (!(statusId in STATUS_CATALOG)) {
    errors.push({ path, message: `unknown status "${statusId}"` });
  }
}

function validateStatusApplication(app: StatusApplication, path: string, errors: ValidationError[]): void {
  validateStatusRef(app.statusId, `${path}.statusId`, errors);
  if (app.duration <= 0) errors.push({ path: `${path}.duration`, message: 'duration must be > 0' });
  if (app.stacks != null && app.stacks < 1) {
    errors.push({ path: `${path}.stacks`, message: 'stacks must be >= 1' });
  }
}
