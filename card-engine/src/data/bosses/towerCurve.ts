/**
 * The tower difficulty curve.
 *
 * One formula, not a hand-tuned table per floor. Eleven hand-set numbers drift
 * against each other the moment the hero roster changes; a curve moves as one
 * piece and can be re-derived from a single measurement.
 *
 * ── Where these came from ────────────────────────────────────────────────
 * Measured, not guessed: a three-hero Forged party clears the 1100 hp
 * Emberborn Wraith in 8 rounds under the greedy harness policy, so party
 * output is ~137 damage per round. Floor 1 at 1380 hp is therefore about ten
 * rounds of clean uptime — a real fight rather than the scenery the Wraith had
 * become (it was losing 100% of sweeps to 3/3 survivors).
 *
 * Party effective HP is roughly 3 × (100 + Def×3 + rank bonus) ≈ 855 at
 * Forged. Floor 1 spending ~62 damage a round over ten rounds burns ~72% of
 * that pool: survivable, but it leaves the party marked going into the next
 * floor, which is the point once run-level attrition lands.
 *
 * ── Why HP grows faster than damage ─────────────────────────────────────
 * 1.13 vs 1.11. The gap means climbing is answered by BUILDING A BETTER PARTY
 * rather than by playing more carefully — higher floors demand more output,
 * not more caution. That is the whole design goal: composition should decide
 * how far you get.
 *
 * ── The compounding warning ─────────────────────────────────────────────
 * An exponential curve multiplies any error in the base by 3.4× at floor 11.
 * Validate floor 1 against the harness BEFORE authoring floors above it; a
 * mis-set base means retuning every floor, not one.
 *
 * These are combat-balance values, not economy values — no §13 approval is
 * required to tune them. Per-floor REWARDS are a different matter and do need
 * sign-off.
 */

/** Rounds a floor is designed to last, at every floor. */
export const TOWER_TARGET_ROUNDS = 10;

const HP_BASE = 1380;
const HP_GROWTH = 1.13;

const DAMAGE_BASE = 62;
const DAMAGE_GROWTH = 1.11;

const MITIGATION_BASE = 4;
const MITIGATION_PER_FLOOR = 1.5;

/**
 * Enrage per round, as a share of the floor's per-round damage.
 *
 * Deliberately small: over a ten-round fight this adds ~4%, enough that
 * stalling is punished without turning a close fight into a cliff.
 */
const SCALING_SHARE = 0.004;

export const TOWER = {
  /** Boss max HP at floor F (1-indexed). F1 1380 … F11 4680. */
  hp(floor: number): number {
    return Math.round(HP_BASE * HP_GROWTH ** (floor - 1));
  },

  /**
   * Total damage the boss should deal per round at floor F. F1 62 … F11 176.
   *
   * A floor SPLITS this across its actions — a boss that hits the whole party
   * every round must divide it, or three heroes each take a full share and the
   * floor is three times as lethal as its number says.
   */
  damage(floor: number): number {
    return Math.round(DAMAGE_BASE * DAMAGE_GROWTH ** (floor - 1));
  },

  /** Flat damage reduction on the boss at floor F. */
  mitigation(floor: number): number {
    return MITIGATION_BASE + Math.floor((floor - 1) * MITIGATION_PER_FLOOR);
  },

  /** Linear enrage added per round elapsed. */
  scaling(floor: number): number {
    return Math.round(TOWER.damage(floor) * SCALING_SHARE * 100) / 100;
  },

  /**
   * The win rate a floor should land near for a well-built party.
   * F1 85% … F11 55% — the top of the tower should be genuinely uncertain,
   * not impossible.
   */
  targetWinRate(floor: number): number {
    return Math.max(0.4, 0.85 - 0.03 * (floor - 1));
  },
} as const;
