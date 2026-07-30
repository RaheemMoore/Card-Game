import type { EconomyAssumptions, CurrencyDisplay, CurrencyId } from '../../types/economy';

export const ECONOMY_ASSUMPTIONS: EconomyAssumptions = {
  paymentFeeRate: 0.05,
  targetContributionMarginRate: 0.40,
  retryReserveRate: 0.15,
  infrastructureAllocationUsd: 0.005,
  supportAllocationUsd: 0.003,
  currencyUnitsPerUsd: 100,
};

export const CURRENCY_DISPLAY: Record<CurrencyId, CurrencyDisplay> = {
  premium: { id: 'premium', displayName: 'Forge Crystals', shortName: 'FC' },
  gameplay: { id: 'gameplay', displayName: 'Gold', shortName: 'GP' },
};

/**
 * What a brand-new account starts with.
 *
 * PREMIUM IS ZERO ON PURPOSE. Forge Crystals buy AI generation, so every one
 * handed to a stranger is real Leonardo and Anthropic money. Seeding 100 of
 * them meant anyone who signed up could burn budget immediately — which is
 * exactly what Raheem raised: "anyone can just go to the main page and spend
 * api token to make cards."
 *
 * Zero is the gate, and it is a better gate than an allowlist: it locks nobody
 * OUT — anyone can sign up, log in and look around — it just means spending is
 * something Raheem grants, per account, via the admin currency grant. Changed
 * 2026-07-30 on his explicit instruction ("Users should start with zero forge
 * tokens"), per the approval rule in the economy plan §13.
 *
 * GOLD STAYS. It is earned through play and costs nothing to serve, so a new
 * account still has something to do.
 */
export const DEMO_STARTING_BALANCES = {
  premium: 0,
  gameplay: 500,
} as const;

export const DEMO_SEED_REASON = 'demo_initial_seed_v1';
export const LEDGER_STORAGE_KEY = 'card-engine-economy-ledger-v1';
