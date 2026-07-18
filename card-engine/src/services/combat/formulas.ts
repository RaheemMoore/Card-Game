import type {
  DamageType,
  ScalingRule,
} from '../../types/abilities';
import type { CardStats, Rank } from '../../types/card';
import type {
  HeroSnapshot,
  HeroCombatant,
  BossCombatant,
  HeroDerivedStats,
  DamageResolution,
  HealResolution,
  ShieldPool,
} from '../../types/combat';

/**
 * Combat formulas — pure functions, no state, no I/O. Every formula ties
 * directly to a numbered section of card-engine-boss-battle-spec.md so a
 * balance change means touching both the spec and this file together.
 */

/* ------------------------------------------------------------------ */
/*  §3 HP derivation + §4 resource                                     */
/* ------------------------------------------------------------------ */

const HP_BASE = 100;
const HP_DEF_MULTIPLIER = 3;
const HP_RANK_BONUS: Record<Rank, number> = {
  Foundation: 0,
  Forged: 50,
  Ascendant: 120,
};

const RESOURCE_BASE = 3;
const RESOURCE_STAT_DIVISOR = 20;
const RESOURCE_RANK_BONUS: Record<Rank, number> = {
  Foundation: 0,
  Forged: 1,
  Ascendant: 2,
};
const RESOURCE_REGEN_PER_ROUND = 1;

const DEFENSE_MITIGATION_DIVISOR = 5;

/** Returns hp/resource/scalars derived from a card's stats + rank. */
export function deriveHeroStats(stats: CardStats, rank: Rank): HeroDerivedStats {
  const primaryResourceStat = stats.Mana ?? stats.Tech;
  if (!primaryResourceStat) {
    throw new Error('deriveHeroStats: card has neither Mana nor Tech');
  }

  const maxHp = HP_BASE + stats.Def.value * HP_DEF_MULTIPLIER + HP_RANK_BONUS[rank];
  const maxResource =
    RESOURCE_BASE +
    Math.floor(primaryResourceStat.value / RESOURCE_STAT_DIVISOR) +
    RESOURCE_RANK_BONUS[rank];
  const defenseMitigation = Math.floor(stats.Def.value / DEFENSE_MITIGATION_DIVISOR);
  const attackScalar = stats.Atk.value;

  return {
    maxHp,
    maxResource,
    defenseMitigation,
    resourceRegenPerRound: RESOURCE_REGEN_PER_ROUND,
    attackScalar,
  };
}

/* ------------------------------------------------------------------ */
/*  §5 damage formula                                                  */
/* ------------------------------------------------------------------ */

const MIN_DAMAGE_FLOOR = 1;

function scalingBonus(rule: ScalingRule | undefined, stats: CardStats): number {
  if (!rule) return 0;
  switch (rule.stat) {
    case 'atk':
      return rule.coefficient * stats.Atk.value;
    case 'def':
      return rule.coefficient * stats.Def.value;
    case 'mana':
      return rule.coefficient * (stats.Mana?.value ?? 0);
    case 'tech':
      return rule.coefficient * (stats.Tech?.value ?? 0);
  }
}

export function resistanceMultiplier(
  _target: HeroCombatant | BossCombatant,
  damageType: DamageType,
  resistanceProfile: ResistanceProfile,
): number {
  if (damageType === 'true') return 1.0;
  if (resistanceProfile.resistant.includes(damageType)) return 0.5;
  if (resistanceProfile.weak.includes(damageType)) return 1.5;
  return 1.0;
}

/**
 * Resistance/weakness profile for a target. Bosses ship one on the snapshot;
 * heroes default to a neutral profile in the first slice.
 */
export interface ResistanceProfile {
  resistant: readonly DamageType[];
  weak: readonly DamageType[];
}

export const NEUTRAL_RESISTANCE: ResistanceProfile = {
  resistant: [],
  weak: [],
};

export interface DamageInputs {
  baseAmount: number;
  damageType: DamageType;
  scaling?: ScalingRule;
  attackerStats?: CardStats;
  targetMitigation: number;
  targetResistance: ResistanceProfile;
  targetShields: readonly ShieldPool[];
  /** If true, the damage is an execute check — bypass formula, deal current hp. */
  isExecute?: boolean;
  targetHp?: number;
  targetMaxHp?: number;
  executeThreshold?: number;
}

/** Resolve a single damage instance per §5. Pure — does not mutate shields. */
export function resolveDamage(input: DamageInputs): DamageResolution {
  if (input.isExecute) {
    const belowThreshold =
      input.targetHp !== undefined &&
      input.targetMaxHp !== undefined &&
      input.executeThreshold !== undefined &&
      input.targetHp / input.targetMaxHp <= input.executeThreshold;

    const rawAmount = belowThreshold ? (input.targetHp ?? 0) : 0;
    return {
      rawAmount,
      scalingApplied: 0,
      postDefenseAmount: rawAmount,
      postShieldAmount: rawAmount,
      shieldAbsorbed: 0,
      damageType: input.damageType,
      isCrit: false,
      isExecute: true,
    };
  }

  const scalingApplied = input.attackerStats
    ? scalingBonus(input.scaling, input.attackerStats)
    : 0;
  const raw = input.baseAmount + scalingApplied;

  const multiplier =
    input.targetResistance.resistant.includes(input.damageType)
      ? 0.5
      : input.targetResistance.weak.includes(input.damageType)
      ? 1.5
      : input.damageType === 'true'
      ? 1.0
      : 1.0;
  const postResistance = raw * multiplier;

  const mitigation = input.damageType === 'true' ? 0 : input.targetMitigation;
  const postDefenseAmount = Math.max(MIN_DAMAGE_FLOOR, Math.floor(postResistance - mitigation));

  let remaining = postDefenseAmount;
  let shieldAbsorbed = 0;
  for (const pool of input.targetShields) {
    if (remaining <= 0) break;
    if (pool.types.length > 0 && !pool.types.includes(input.damageType)) continue;
    const absorb = Math.min(pool.amount, remaining);
    shieldAbsorbed += absorb;
    remaining -= absorb;
  }

  return {
    rawAmount: raw,
    scalingApplied,
    postDefenseAmount,
    postShieldAmount: remaining,
    shieldAbsorbed,
    damageType: input.damageType,
    isCrit: false,
    isExecute: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Healing                                                            */
/* ------------------------------------------------------------------ */

export function resolveHeal(
  requestedAmount: number,
  targetHp: number,
  targetMaxHp: number,
): HealResolution {
  const clamped = Math.max(0, requestedAmount);
  const capacity = Math.max(0, targetMaxHp - targetHp);
  const actualAmount = Math.min(clamped, capacity);
  return {
    requestedAmount: clamped,
    actualAmount,
    overheal: clamped - actualAmount,
  };
}

/* ------------------------------------------------------------------ */
/*  §8 ultimate charge                                                 */
/* ------------------------------------------------------------------ */

export const ULTIMATE_CHARGE_MAX = 100;

export interface UltimateChargeSources {
  damageDealt?: number;
  damageReceived?: number;
  guardUsed?: boolean;
  focusUsed?: boolean;
  statusAppliedToBoss?: boolean;
  bossPhaseTransition?: boolean;
}

export function ultimateChargeGain(src: UltimateChargeSources): number {
  let gain = 0;
  if (src.damageDealt) gain += Math.floor(src.damageDealt / 20);
  if (src.damageReceived) gain += Math.floor(src.damageReceived / 10);
  if (src.guardUsed) gain += 5;
  if (src.focusUsed) gain += 3;
  if (src.statusAppliedToBoss) gain += 5;
  if (src.bossPhaseTransition) gain += 10;
  return gain;
}

export function clampUltimateCharge(value: number): number {
  return Math.max(0, Math.min(ULTIMATE_CHARGE_MAX, value));
}

/* ------------------------------------------------------------------ */
/*  §6 cooldown ticker                                                 */
/* ------------------------------------------------------------------ */

/**
 * Decrement cooldowns by 1 at end-of-round. Cooldowns that reach 0 are
 * removed. Callers pre-filter out the "newly started this round" cooldown
 * per §6 (start with `remainingRounds = cooldown + 1` so this tick brings
 * it to `cooldown`).
 */
export function tickCooldowns<T extends { remainingRounds: number }>(
  entries: readonly T[],
): T[] {
  return entries
    .map((e) => ({ ...e, remainingRounds: e.remainingRounds - 1 }))
    .filter((e) => e.remainingRounds > 0);
}

/**
 * §10 Guard shield amount — floor(Def / 2) + 5. Exposed so both the
 * runtime and tests can call the same formula.
 */
export function guardShieldAmount(defValue: number): number {
  return Math.floor(defValue / 2) + 5;
}

/**
 * §10 Focus resource restore amount.
 */
export const FOCUS_RESOURCE_GAIN = 2;

/* ------------------------------------------------------------------ */
/*  Snapshot builder                                                   */
/* ------------------------------------------------------------------ */

/** Convenience for tests + harness: derive maxHp/maxResource for a hero snapshot builder. */
export function heroSnapshotVitals(
  stats: CardStats,
  rank: Rank,
): { maxHp: number; maxResource: number } {
  const d = deriveHeroStats(stats, rank);
  return { maxHp: d.maxHp, maxResource: d.maxResource };
}

/** Pull the primary resource type from a card's stat block. Runtime uses this to name the resource. */
export function primaryResourceType(stats: CardStats): 'mana' | 'tech' {
  if (stats.Mana) return 'mana';
  if (stats.Tech) return 'tech';
  throw new Error('primaryResourceType: card has neither Mana nor Tech');
}

/* ------------------------------------------------------------------ */
/*  Fire elemental default resistance profile                          */
/*  Used by the B2 scripted boss + B3 real boss data. Lives here so    */
/*  formula tests can reference it without importing content data.     */
/* ------------------------------------------------------------------ */

export const FIRE_ELEMENTAL_RESISTANCE: ResistanceProfile = {
  resistant: ['fire'],
  weak: ['holy', 'nature'],
};

/** Neutral resistance for heroes in the first slice. */
export function heroResistance(_snapshot: HeroSnapshot): ResistanceProfile {
  return NEUTRAL_RESISTANCE;
}
