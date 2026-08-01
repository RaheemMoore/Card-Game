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
  StatusInstance,
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
/**
 * Flat resource returned to the party at end of round.
 *
 * Kept after the shared-chamber rework as a FLOOR, not as the main supply —
 * a party that spends a round entirely on Guard should not be stranded with an
 * empty pool. The real supply is `strike` (see below).
 */
export const RESOURCE_REGEN_PER_ROUND = 1;

/* ---- Basic attack ------------------------------------------------- */

/**
 * Resource a `strike` puts into the caster's chamber.
 *
 * This is the number that decides the whole rhythm. At +2 per strike against
 * a core cost of 1 and a signature of 3, one strike buys two cores or two
 * strikes buy a signature — so the loop is "hit, hit, spend" rather than the
 * old slow drain of +1/round against costs of up to 3.
 *
 * Provisional. `partyBalancePass` is the arbiter, not this comment.
 */
export const STRIKE_RESOURCE_GAIN = 2;

/** Divisor on Atk for a basic strike's damage. */
const STRIKE_ATK_DIVISOR = 4;

/**
 * Damage of a free basic attack.
 *
 * Deliberately weak — a strike is how you PAY for abilities, not how you win.
 * If it ever out-damages a core ability per turn, the ability list stops
 * mattering and the fight becomes "press strike".
 */
export function strikeDamage(atkValue: number): number {
  return Math.max(1, Math.floor(atkValue / STRIKE_ATK_DIVISOR));
}

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
  /** From `statusDamageModifiers`. Default 1 so every existing call site and
   *  every test keeps its current numbers. */
  outgoingMultiplier?: number;
  incomingMultiplier?: number;
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
  // Status multipliers land between resistance and mitigation, so the flat
  // mitigation subtract and the min-1 floor still apply LAST. A weakened
  // attacker can be reduced, but never to zero.
  const statusMultiplier = (input.outgoingMultiplier ?? 1) * (input.incomingMultiplier ?? 1);
  const postResistance = raw * multiplier * statusMultiplier;

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
/*  Status damage modifiers                                            */
/* ------------------------------------------------------------------ */

/** Per-stack magnitudes. Kept here, beside resolveDamage, because these are
 *  balance numbers rather than catalog metadata — `data/abilities/statuses.ts`
 *  describes what a status IS, this decides what it DOES. */
const WEAKENED_REDUCTION = 0.25;
const RAGE_PER_STACK = 0.08;
const RAGE_MAX_STACKS = 4;
const FOCUS_PER_STACK = 0.15;
const FOCUS_MAX_STACKS = 3;
const MARK_BONUS = 0.2;
/**
 * Ceiling on a single application's `amplificationPercent`.
 *
 * Deliberately tighter than `reductionPercent`'s 0.9 cap, and not symmetric
 * with it on purpose: reduction saturating means "you are very well defended",
 * which is a fine place for a player to end up, whereas amplification
 * saturating means "you now die to a chip hit", which is a fight the player
 * cannot read. Applications still MULTIPLY, so stacking several is stronger
 * than one — this caps each one, not the total.
 */
const AMPLIFICATION_CAP = 0.6;
/** `mark` is a hunter's tell — it only sharpens martial and beast damage, so
 *  marking is a setup play for those families rather than a flat global buff. */
const MARK_DAMAGE_TYPES: readonly DamageType[] = ['kinetic', 'primal'];

export interface StatusDamageModifiers {
  /** Applied for the ATTACKER's statuses (weakened, rage, focus). */
  outgoingMultiplier: number;
  /** Applied for the TARGET's statuses (mark). */
  incomingMultiplier: number;
}

/**
 * Turn the combatants' status lists into damage multipliers.
 *
 * This is the single place statuses touch outgoing damage. It lives in
 * formulas.ts rather than the reducer so it stays a pure, reusable function —
 * the pre-commit UI preview (`decision/projectAction`) gets the same answer
 * as the real hit by running the real reducer, not by re-implementing this.
 *
 * Multiplicative, not additive, so stacking several buffs can never invert the
 * sign or zero a hit out.
 */
export function statusDamageModifiers(
  attackerStatuses: readonly StatusInstance[],
  targetStatuses: readonly StatusInstance[],
  damageType: DamageType,
): StatusDamageModifiers {
  const stacksOf = (list: readonly StatusInstance[], id: string, cap: number) =>
    Math.min(cap, list.filter((s) => s.statusId === id).reduce((n, s) => n + s.stacks, 0));

  let outgoing = 1;
  if (stacksOf(attackerStatuses, 'weakened', 1) > 0) outgoing *= 1 - WEAKENED_REDUCTION;
  outgoing *= 1 + RAGE_PER_STACK * stacksOf(attackerStatuses, 'rage', RAGE_MAX_STACKS);
  outgoing *= 1 + FOCUS_PER_STACK * stacksOf(attackerStatuses, 'focus', FOCUS_MAX_STACKS);

  let incoming = 1;
  if (MARK_DAMAGE_TYPES.includes(damageType) && stacksOf(targetStatuses, 'mark', 1) > 0) {
    incoming *= 1 + MARK_BONUS;
  }
  // Guard-shaped statuses carry their own reduction, so one ability can guard
  // harder than another without a second status id.
  for (const st of targetStatuses) {
    const reduction = st.application.reductionPercent;
    if (reduction) incoming *= 1 - Math.min(0.9, reduction);
    // The mirror. Capped so a stack of vulnerabilities cannot turn a chip hit
    // into a one-shot — the cap is what keeps `vulnerability` a pressure the
    // player answers rather than a coin flip they lose.
    const amplification = st.application.amplificationPercent;
    if (amplification) incoming *= 1 + Math.min(AMPLIFICATION_CAP, amplification);
  }

  return { outgoingMultiplier: outgoing, incomingMultiplier: incoming };
}

/** Thorns reflects a share of damage taken back at the attacker. Reflected as
 *  `true` damage so it neither takes a second resistance pass nor re-triggers
 *  the target's own thorns into a loop. Covers ALL damage types deliberately:
 *  physical-only would make it a dead pick against the only boss in the game,
 *  which deals fire. */
export const THORNS_REFLECT_SHARE = 0.2;

/** Regeneration heals a share of MAX hp per round, so it stays relevant on a
 *  tanky hero instead of becoming rounding noise. */
export const REGENERATION_PER_STACK = 0.06;
export const REGENERATION_MAX_STACKS = 3;

/**
 * The same status on a BOSS, which needs its own share.
 *
 * A percentage of max HP does not transfer between actors whose HP differs by
 * an order of magnitude. At the hero rate, three stacks on a 1559 hp boss
 * healed ~280 per round against a party dealing ~137 — every composition
 * timed out at 0% win. That is not a hard fight, it is an unkillable one.
 *
 * At 1.5% per stack, three stacks heal ~70 per round: roughly half the
 * party's output, so chip damage genuinely struggles and burst or
 * damage-over-time is the answer. That is the sustain race the pressure axis
 * is supposed to create.
 */
export const BOSS_REGENERATION_PER_STACK = 0.015;

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

/**
 * Capacity of each shared chamber — the sum of the contributing heroes'
 * individual `maxResource`.
 *
 * Summing rather than picking a flat party number keeps the existing stat and
 * rank progression meaningful: a party of Ascendants carries a visibly bigger
 * pool than a party of Foundations, exactly as it did when the resource was
 * per-hero. A chamber with no heroes of that type has a max of 0, and callers
 * should HIDE it rather than render an empty vessel.
 */
export function deriveChamberMax(
  heroes: readonly { maxResource: number; resourceType: 'mana' | 'tech' }[],
): { mana: number; tech: number } {
  return heroes.reduce(
    (acc, h) => ({ ...acc, [h.resourceType]: acc[h.resourceType] + h.maxResource }),
    { mana: 0, tech: 0 },
  );
}

/* ------------------------------------------------------------------ */
/*  Fire elemental default resistance profile                          */
/*  Used by the B2 scripted boss + B3 real boss data. Lives here so    */
/*  formula tests can reference it without importing content data.     */
/* ------------------------------------------------------------------ */

export const FIRE_ELEMENTAL_RESISTANCE: ResistanceProfile = {
  resistant: ['searing'],
  weak: ['radiant', 'primal'],
};

/** Neutral resistance for heroes in the first slice. */
export function heroResistance(_snapshot: HeroSnapshot): ResistanceProfile {
  return NEUTRAL_RESISTANCE;
}
