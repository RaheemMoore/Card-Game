export type CurrencyId = 'premium' | 'gameplay';

export const PAID_ACTION_IDS = [
  'forge_card',
  'evolve_card_art',
  'regenerate_portrait',
  'regenerate_text',
] as const;
export type PaidActionId = typeof PAID_ACTION_IDS[number];

export const GAMEPLAY_ACTION_IDS = [
  'stat_reroll',
] as const;
export type GameplayActionId = typeof GAMEPLAY_ACTION_IDS[number];

export type TransactionStatus =
  | 'pending'
  | 'committed'
  | 'refunded'
  | 'failed'
  | 'cancelled';

export type TransactionType =
  | 'purchase'
  | 'reward'
  | 'spend'
  | 'refund'
  | 'admin_adjustment'
  | 'migration';

export interface EconomyTransaction {
  transactionId: string;
  currency: CurrencyId;
  amount: number;
  type: TransactionType;
  actionId?: string;
  rewardId?: string;
  cardId?: string;
  status: TransactionStatus;
  balanceBefore: number;
  balanceAfter: number;
  // Monotonic per-client counter. Together with createdAt this gives a
  // deterministic order when two writes share a millisecond, and is the
  // tiebreak for cross-device rehydrate.
  sequence: number;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface Wallet {
  premium: number;
  gameplay: number;
  updatedAt: string;
}

export type CostProvider = 'anthropic' | 'leonardo' | 'storage' | 'other';

export interface ApiCostComponent {
  provider: CostProvider;
  operation: string;
  estimatedCostUsd: number;
  notes?: string;
}

export interface ApiCostEntry {
  actionId: PaidActionId;
  version: number;
  enabled: boolean;
  components: ApiCostComponent[];
  estimatedDirectCostUsd: number;
  lastReviewedAt: string;
  reviewedBy: string;
  confidence: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface PremiumPriceEntry {
  actionId: PaidActionId;
  premiumCost: number;
  approvedBy: 'Raheem';
  approvedAt: string;
  pricingVersion: number;
  notes?: string;
}

export interface GameplayPriceEntry {
  actionId: GameplayActionId;
  gameplayCost: number;
  approvedBy: 'Raheem';
  approvedAt: string;
  version: number;
  notes?: string;
}

export interface RewardItem {
  currency: CurrencyId;
  amount: number;
}

export interface WeightedReward {
  weight: number;
  reward: RewardItem;
}

export interface RewardDefinition {
  rewardId: string;
  mode: 'practice' | 'challenge' | 'boss' | 'chest' | 'milestone' | 'event';
  guaranteed: RewardItem[];
  randomPool?: WeightedReward[];
  limits?: {
    daily?: number;
    weekly?: number;
    firstClearOnly?: boolean;
  };
  approvedBy: 'Raheem';
  version: number;
}

export interface CurrencyBundle {
  bundleId: string;
  priceUsd: number;
  basePremiumAmount: number;
  bonusPremiumAmount: number;
  displayOrder: number;
  approvedBy: 'Raheem';
  enabled: boolean;
}

export interface EconomyAssumptions {
  paymentFeeRate: number;
  targetContributionMarginRate: number;
  retryReserveRate: number;
  infrastructureAllocationUsd: number;
  supportAllocationUsd: number;
  currencyUnitsPerUsd: number;
}

export interface CurrencyDisplay {
  id: CurrencyId;
  displayName: string;
  shortName: string;
}
