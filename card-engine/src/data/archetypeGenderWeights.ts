import type { ArchetypeName } from '../types/card';

/**
 * Per-archetype sex distribution for the deterministic gender roll
 * (2026-07-21, Raheem). No archetype should silently skew a gender unless it
 * is deliberately weighted here. Default is an even 50/50; overrides below are
 * the intentional exceptions. The roll happens in code (fresh forge only), and
 * the result is set as a HARD constraint on hiddenFate.sex — the lore model
 * writes to fit it rather than choosing it.
 */
export interface GenderWeights {
  /** Probability weight for male; male + female should sum to 1. */
  male: number;
  female: number;
}

const DEFAULT_WEIGHTS: GenderWeights = { male: 0.5, female: 0.5 };

const OVERRIDES: Partial<Record<ArchetypeName, GenderWeights>> = {
  // Raheem 2026-07-21: Necromancers skew male.
  Necromancer: { male: 0.7, female: 0.3 },
};

export function getGenderWeights(archetype: ArchetypeName): GenderWeights {
  return OVERRIDES[archetype] ?? DEFAULT_WEIGHTS;
}

/**
 * Deterministic-enough weighted pick. Pass a [0,1) roll (Math.random() at the
 * call site) so this stays pure + unit-testable.
 */
export function pickSexFromWeights(weights: GenderWeights, roll: number): 'male' | 'female' {
  return roll < weights.male ? 'male' : 'female';
}
