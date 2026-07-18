import type {
  AbilityCondition,
  AbilityEffect,
  AbilitySlotType,
  AbilityRarity,
  AbilityTrigger,
  AbilityVersion,
  TargetRule,
} from '../../types/abilities';
import { getEffectEntry } from './effects';
import { getTargetEntry } from './targets';
import { getTriggerEntry } from './triggers';
import { getConditionEntry } from './conditions';

/**
 * Provisional power-budget calculator — hand-tuned starting numbers pending
 * playtest data. Master Plan §14 lists the axes we care about; this file
 * implements a defensible starting formula and marks it as provisional.
 *
 * Formula:
 *   score = Σ(effect.budgetBase × condition.multiplier) × target.multiplier × trigger.multiplier
 *   score -= resourceCreditFor(cost)
 *   score -= cooldownCreditFor(cooldownRounds)
 *   score -= chargeCreditFor(maxCharges)
 *
 * A version is within budget if score is within the band for (slot, rarity).
 * Bands are permissive at A2 — B4 balance work will tighten them against
 * simulated data.
 */

// Provisional credits — retuned at A2 so the 5 hand-authored seed abilities
// land in-band. Real tuning happens at B4 against playtest data.
const RESOURCE_CREDIT_PER_POINT = 1;
const COOLDOWN_CREDIT_PER_ROUND = 1;
const CHARGE_CREDIT_PER_CHARGE = 1;

/**
 * Sum of effect base budgets, with per-effect condition multipliers applied.
 * Unknown effect types contribute 0 rather than crashing — the validator
 * surfaces the "unknown effect type" error separately, and we want the
 * budget calc to keep going so every error accumulates in one report.
 */
function effectBudget(effects: AbilityEffect[]): number {
  let total = 0;
  for (const effect of effects) {
    const entry = getEffectEntry(effect.type);
    const base = entry?.budgetBase ?? 0;
    if (effect.type === 'conditional_bonus') {
      const inner = effectBudget(effect.effects);
      const mult = getConditionEntry(effect.condition.type)?.budgetMultiplier ?? 1;
      total += base + inner * mult;
    } else {
      total += base;
    }
  }
  return total;
}

function targetMultiplier(target: TargetRule): number {
  return getTargetEntry(target.type).budgetMultiplier;
}

function triggerMultiplier(triggers?: AbilityTrigger[]): number {
  if (!triggers || triggers.length === 0) return 1.0;
  let m = 1.0;
  for (const t of triggers) m *= getTriggerEntry(t.type).budgetMultiplier;
  return m;
}

function conditionMultiplier(conditions?: AbilityCondition[]): number {
  if (!conditions || conditions.length === 0) return 1.0;
  let m = 1.0;
  for (const c of conditions) m *= getConditionEntry(c.type).budgetMultiplier;
  return m;
}

export function calculatePowerBudget(version: AbilityVersion): number {
  const eff = effectBudget(version.effects);
  const tgt = targetMultiplier(version.targetRule);
  const trg = triggerMultiplier(version.triggers);
  const cnd = conditionMultiplier(version.conditions);
  const raw = eff * tgt * trg * cnd;
  const resourceCredit = version.resourceCost * RESOURCE_CREDIT_PER_POINT;
  const cooldownCredit = (version.cooldownRounds ?? 0) * COOLDOWN_CREDIT_PER_ROUND;
  const chargeCredit = version.maxCharges != null
    ? (5 - Math.min(version.maxCharges, 5)) * CHARGE_CREDIT_PER_CHARGE
    : 0;
  return Math.round(raw - resourceCredit - cooldownCredit - chargeCredit);
}

/**
 * Permitted budget band per (slot, rarity). A version's calculated budget
 * must land inside its band. Bands are provisional pending B4 playtest data.
 */
export interface BudgetBand {
  min: number;
  max: number;
}

export const BUDGET_BANDS: Record<AbilitySlotType, Record<AbilityRarity, BudgetBand>> = {
  core: {
    common:    { min: 4,  max: 14 },
    uncommon:  { min: 6,  max: 18 },
    rare:      { min: 10, max: 22 },
    legendary: { min: 14, max: 26 },
    mythic:    { min: 18, max: 32 },
  },
  signature: {
    common:    { min: 8,  max: 20 },
    uncommon:  { min: 12, max: 24 },
    rare:      { min: 16, max: 30 },
    legendary: { min: 20, max: 36 },
    mythic:    { min: 26, max: 44 },
  },
  ultimate: {
    common:    { min: 20, max: 38 },
    uncommon:  { min: 26, max: 44 },
    rare:      { min: 32, max: 52 },
    legendary: { min: 40, max: 62 },
    mythic:    { min: 50, max: 78 },
  },
};

export function getBudgetBand(slot: AbilitySlotType, rarity: AbilityRarity): BudgetBand {
  return BUDGET_BANDS[slot][rarity];
}

export function isWithinBudget(
  score: number,
  slot: AbilitySlotType,
  rarity: AbilityRarity,
): boolean {
  const band = getBudgetBand(slot, rarity);
  return score >= band.min && score <= band.max;
}
