// Published Anthropic Messages API pricing. Sourced from
// https://docs.anthropic.com/en/docs/about-claude/pricing (verified
// 2026-07-19). USD per million base tokens. Cache pricing is separate
// (5m/1h writes, cache reads at 0.1x) — the game doesn't use prompt
// caching yet, so we don't model those columns.
//
// Never edit historical entries in place. If a rate changes, append a
// new object with a fresh effectiveFrom date and update
// `getRateForModel()` to pick the row whose window covers the row's
// started_at timestamp — that keeps prior-period cost calculations
// stable.

export interface AnthropicRate {
  model: string;
  inputPerMTokUsd: number;
  outputPerMTokUsd: number;
  effectiveFrom: string; // ISO date; row applies to calls with started_at >= this.
  effectiveTo?: string;
  source: string;
}

export const ANTHROPIC_RATES: readonly AnthropicRate[] = [
  {
    model: 'claude-haiku-4-5-20251001',
    inputPerMTokUsd: 1.0,
    outputPerMTokUsd: 5.0,
    effectiveFrom: '2025-10-01',
    source: 'https://docs.anthropic.com/en/docs/about-claude/pricing (2026-07-19)',
  },
];

export function findRate(model: string | null, startedAt: string): AnthropicRate | null {
  if (!model) return null;
  const candidates = ANTHROPIC_RATES.filter((r) => r.model === model && r.effectiveFrom <= startedAt);
  if (candidates.length === 0) return null;
  // Latest effectiveFrom wins.
  return candidates.reduce((best, r) => (r.effectiveFrom > best.effectiveFrom ? r : best));
}

export function calculateAnthropicCostUsd(
  model: string | null,
  inputUnits: number | null,
  outputUnits: number | null,
  startedAt: string,
): number | null {
  const rate = findRate(model, startedAt);
  if (!rate) return null;
  const inputCost = ((inputUnits ?? 0) / 1_000_000) * rate.inputPerMTokUsd;
  const outputCost = ((outputUnits ?? 0) / 1_000_000) * rate.outputPerMTokUsd;
  return inputCost + outputCost;
}
