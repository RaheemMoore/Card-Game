import type { Card, StatName } from '../../../types/card';
import { BIAS_RANGES, computeRankSum, deriveRank, getStatNames } from '../../../data/powerSystem';

/**
 * Forge Strike stat-training rules — PURE. No storage, no rewards, no card
 * persistence, no randomness, no clocks. Implements the canonical
 * power-system spec §5/§4 exactly (card-engine-power-system-spec.md):
 *
 *   - win  → +1 to the trained stat (subject to hard cap and the rank-sum cap)
 *   - loss → −1 to the trained stat (floored at 1)
 *   - Very Low bias stats need VERY_LOW_WINS_PER_POINT wins to buy one +1;
 *     losses still deduct a full point and (by default) do NOT reset the
 *     banked wins — an OPEN decision flagged for Raheem, see resetVeryLowOnLoss.
 *   - rank-sum cannot exceed 7; a +1 that would push the card over the cap
 *     returns `trade_required` with the demote options, and NEVER consumes the
 *     win (the caller resolves the trade, then re-applies).
 *
 * This module is deliberately unwired: it returns a new Card and never saves.
 * Persistence, ledger idempotency (runId), the trade UI, Practice-vs-Ranked
 * gating, and server validation are the reward-bearing wiring layer, which is
 * gated behind Raheem's explicit approval (plan §14/§15, Gate 6).
 */

export const VERY_LOW_WINS_PER_POINT = 3;
export const RANK_SUM_CAP = 7;
const STAT_FLOOR = 1;

export type TrainingOutcome = 'win' | 'loss';

/**
 * TESTING stat write (Raheem 2026-07-20): the simplest possible rule so the
 * forge can visibly change a card while the real economy is dialed in — win
 * → +1, loss → −1, clamped to [floor, hard cap]. The Very Low grind and the
 * rank-sum-cap demotion trade are intentionally SKIPPED here; those "lock in
 * last" via applyTrainingOutcome once their rules and UI are approved.
 *
 * Returns a fresh card + the actual delta applied (0 if clamped). Pure.
 */
export interface TestingStatResult {
  card: Card;
  stat: StatName;
  delta: 1 | -1 | 0;
  from: number;
  to: number;
}

export function applyTestingStatOutcome(
  card: Card,
  stat: StatName,
  outcome: TrainingOutcome,
): TestingStatResult {
  const entry = card.stats[stat];
  if (!entry) return { card, stat, delta: 0, from: 0, to: 0 };
  const from = entry.value;
  const to =
    outcome === 'win'
      ? Math.min(entry.hardCap, from + 1)
      : Math.max(STAT_FLOOR, from - 1);
  const delta = (to - from) as 1 | -1 | 0;
  if (delta === 0) return { card, stat, delta, from, to };
  return {
    card: { ...card, stats: { ...card.stats, [stat]: { ...entry, value: to } } },
    stat,
    delta,
    from,
    to,
  };
}

export interface TrainingOptions {
  /**
   * OPEN DECISION (spec is silent): should a loss on a Very Low stat wipe the
   * banked wins? Default false — losses sting via the −1 but don't also erase
   * progress (game-systems-designer recommendation). Flip to true only on
   * Raheem's call.
   */
  resetVeryLowOnLoss?: boolean;
}

export type TrainingResult =
  /** A point was applied (+1 or −1). */
  | { kind: 'applied'; card: Card; stat: StatName; delta: 1 | -1 }
  /** Very Low win banked but not yet enough for a point. */
  | { kind: 'accumulated'; card: Card; stat: StatName; wins: number; needed: number }
  /** No change: already at hard cap (win) or floor (loss). */
  | { kind: 'no_change'; card: Card; stat: StatName; reason: 'hard_cap' | 'floor' }
  /**
   * The +1 would raise the stat a rank and push rank-sum over the cap. The
   * win is NOT consumed and `card` is returned unchanged; the caller must
   * resolve a demotion trade and re-apply, or discard (spec §4: refusing the
   * trade voids the win, doesn't consume it).
   */
  | { kind: 'trade_required'; card: Card; stat: StatName; demoteOptions: StatName[] };

function cloneWithStat(card: Card, stat: StatName, value: number): Card {
  const entry = card.stats[stat]!;
  return { ...card, stats: { ...card.stats, [stat]: { ...entry, value } } };
}

function bankedWins(card: Card, stat: StatName): number {
  return card.trainingProgress?.veryLowWins?.[stat] ?? 0;
}

function withBankedWins(card: Card, stat: StatName, wins: number): Card {
  const prev = card.trainingProgress ?? {};
  return {
    ...card,
    trainingProgress: {
      ...prev,
      veryLowWins: { ...prev.veryLowWins, [stat]: wins },
    },
  };
}

/** Would raising `stat` to `newValue` push the card's rank-sum over the cap? */
function crossesRankSumCap(card: Card, stat: StatName, newValue: number): boolean {
  const entry = card.stats[stat]!;
  const oldRank = deriveRank(entry.value, entry.bias);
  const newRank = deriveRank(newValue, entry.bias);
  if (newRank === oldRank) return false; // rank-sum unchanged, always safe
  const tentative = cloneWithStat(card, stat, newValue);
  return computeRankSum(tentative.stats) > RANK_SUM_CAP;
}

/** Active stats that currently sit above Foundation, so can absorb a demotion. */
function demoteOptions(card: Card, exclude: StatName): StatName[] {
  return getStatNames(card.archetype).filter((s) => {
    if (s === exclude) return false;
    const e = card.stats[s]!;
    return deriveRank(e.value, e.bias) !== 'Foundation';
  });
}

function applyPlusOne(card: Card, stat: StatName): TrainingResult {
  const entry = card.stats[stat]!;
  if (entry.value >= entry.hardCap) {
    return { kind: 'no_change', card, stat, reason: 'hard_cap' };
  }
  const newValue = Math.min(entry.hardCap, entry.value + 1);
  if (crossesRankSumCap(card, stat, newValue)) {
    return { kind: 'trade_required', card, stat, demoteOptions: demoteOptions(card, stat) };
  }
  return { kind: 'applied', card: cloneWithStat(card, stat, newValue), stat, delta: 1 };
}

/**
 * Apply one training outcome to a card. Returns a fresh Card (input untouched)
 * or a `trade_required` signal. Never persists.
 */
export function applyTrainingOutcome(
  card: Card,
  stat: StatName,
  outcome: TrainingOutcome,
  opts: TrainingOptions = {},
): TrainingResult {
  const entry = card.stats[stat];
  if (!entry) return { kind: 'no_change', card, stat, reason: 'floor' };

  if (outcome === 'loss') {
    let next = card;
    if (opts.resetVeryLowOnLoss && bankedWins(card, stat) > 0) {
      next = withBankedWins(next, stat, 0);
    }
    if (entry.value <= STAT_FLOOR) {
      return { kind: 'no_change', card: next, stat, reason: 'floor' };
    }
    return { kind: 'applied', card: cloneWithStat(next, stat, entry.value - 1), stat, delta: -1 };
  }

  // win
  const isVeryLow = entry.bias === 'Very Low';
  if (!isVeryLow) return applyPlusOne(card, stat);

  const banked = bankedWins(card, stat) + 1;
  if (banked < VERY_LOW_WINS_PER_POINT) {
    return {
      kind: 'accumulated',
      card: withBankedWins(card, stat, banked),
      stat,
      wins: banked,
      needed: VERY_LOW_WINS_PER_POINT,
    };
  }
  // Enough banked — try to spend it on a +1. If the point can't land (hard cap
  // or a required trade), leave the accumulator full so the win isn't lost.
  const applied = applyPlusOne(card, stat);
  if (applied.kind === 'applied') {
    return { ...applied, card: withBankedWins(applied.card, stat, 0) };
  }
  return applied;
}

/** Referenced by the spec — exposed for the eventual trade-resolution wiring. */
export { BIAS_RANGES };
