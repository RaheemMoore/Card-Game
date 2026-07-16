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

export const DEMO_STARTING_BALANCES = {
  premium: 100,
  gameplay: 500,
} as const;

export const DEMO_SEED_REASON = 'demo_initial_seed_v1';
export const LEDGER_STORAGE_KEY = 'card-engine-economy-ledger-v1';
