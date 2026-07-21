import type { Card, TemperProgress } from '../../../types/card';
import type { ForgeStrikeConfig, RunRating } from './types';

/**
 * Forge Strike Temper Gauge — PURE. The persistent, per-card meter that fills
 * a little each successful run and bursts when full (Raheem v2). No storage
 * here; the caller persists the returned card.
 *
 * A run pours `config.temperFill[rating]` into the gauge (a Fail pours
 * nothing but never drains it). Reaching 1.0 BURSTS: the fill wraps to the
 * remainder and the burst count increments. What a burst grants is a separate
 * reward decision (deferred).
 */

const EMPTY: TemperProgress = { fill: 0, bursts: 0 };

export function getTemper(card: Card): TemperProgress {
  return card.temperProgress ?? EMPTY;
}

/** How much a run of this rating pours into the gauge (0..1). */
export function temperGain(config: ForgeStrikeConfig, rating: RunRating): number {
  switch (rating) {
    case 'gold':
      return config.temperFill.gold;
    case 'silver':
      return config.temperFill.silver;
    case 'bronze':
      return config.temperFill.bronze;
    case 'fail':
      return 0;
  }
}

export interface TemperResult {
  card: Card;
  /** Fill added this run (0 for a failed run). */
  gained: number;
  /** True if the gauge reached full and burst this run. */
  burst: boolean;
  /** The gauge state after applying the run. */
  temper: TemperProgress;
}

/**
 * Apply a finished run's rating to the card's Temper Gauge. Returns a fresh
 * card (input untouched). Bursting wraps the fill to the remainder so an
 * overfilling run doesn't waste progress.
 */
export function applyRunToTemper(
  config: ForgeStrikeConfig,
  card: Card,
  rating: RunRating,
): TemperResult {
  const prev = getTemper(card);
  const gained = temperGain(config, rating);
  let fill = prev.fill + gained;
  let bursts = prev.bursts;
  let burst = false;

  if (fill >= 1) {
    burst = true;
    bursts += 1;
    fill = fill - 1; // carry the remainder
    if (fill >= 1) fill = fill % 1; // guard against a single huge pour
  }

  const temper: TemperProgress = { fill, bursts };
  return { card: { ...card, temperProgress: temper }, gained, burst, temper };
}
