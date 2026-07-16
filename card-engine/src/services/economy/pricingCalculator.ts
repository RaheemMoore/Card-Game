import type {
  ApiCostEntry,
  EconomyAssumptions,
  PaidActionId,
  PremiumPriceEntry,
} from '../../types/economy';
import { API_COST_CATALOG } from '../../data/economy/apiCostCatalog';
import { PREMIUM_PRICE_CATALOG } from '../../data/economy/premiumPriceCatalog';
import { ECONOMY_ASSUMPTIONS } from '../../data/economy/assumptions';

export interface PriceRecommendation {
  actionId: PaidActionId;
  directCostUsd: number;
  totalEstimatedCostUsd: number;
  requiredGrossRevenueUsd: number;
  recommendedPremiumCost: number;
  currentPremiumCost: number;
  currentGrossMargin: number;
}

export interface CostChangeReport {
  actionId: PaidActionId;
  currentDirectCostUsd: number;
  previousDirectCostUsd: number;
  percentChange: number;
  currentPremiumCost: number;
  currentEstimatedGrossMargin: number;
  recommendedAction:
    | 'no_price_change'
    | 'monitor'
    | 'propose_price_increase'
    | 'propose_price_decrease';
  reason: string;
}

export function estimateDirectCost(
  entry: ApiCostEntry = API_COST_CATALOG.forge_card,
): number {
  return entry.components.reduce((sum, c) => sum + c.estimatedCostUsd, 0);
}

export function estimateActionCost(
  entry: ApiCostEntry,
  assumptions: EconomyAssumptions = ECONOMY_ASSUMPTIONS,
): number {
  const direct = estimateDirectCost(entry);
  const retryReserve = direct * assumptions.retryReserveRate;
  return (
    direct +
    retryReserve +
    assumptions.infrastructureAllocationUsd +
    assumptions.supportAllocationUsd
  );
}

export function requiredGrossRevenueUsd(
  entry: ApiCostEntry,
  assumptions: EconomyAssumptions = ECONOMY_ASSUMPTIONS,
): number {
  const cost = estimateActionCost(entry, assumptions);
  const marginDenominator =
    1 - assumptions.paymentFeeRate - assumptions.targetContributionMarginRate;
  if (marginDenominator <= 0) {
    throw new Error(
      'Invalid assumptions: paymentFeeRate + targetContributionMarginRate must be < 1',
    );
  }
  return cost / marginDenominator;
}

export function recommendedPremiumPrice(
  actionId: PaidActionId,
  assumptions: EconomyAssumptions = ECONOMY_ASSUMPTIONS,
): PriceRecommendation {
  const entry = API_COST_CATALOG[actionId];
  const priceEntry: PremiumPriceEntry | undefined = PREMIUM_PRICE_CATALOG[actionId];
  const directCostUsd = estimateDirectCost(entry);
  const totalEstimatedCostUsd = estimateActionCost(entry, assumptions);
  const grossRevenueUsd = requiredGrossRevenueUsd(entry, assumptions);
  const rawRecommended = grossRevenueUsd * assumptions.currencyUnitsPerUsd;
  const recommendedPremiumCost = roundToPlayerFriendly(rawRecommended);

  const currentPremiumCost = priceEntry?.premiumCost ?? 0;
  const currentGrossRevenueUsd =
    currentPremiumCost / assumptions.currencyUnitsPerUsd;
  const currentGrossMargin =
    currentGrossRevenueUsd > 0
      ? 1 - totalEstimatedCostUsd / currentGrossRevenueUsd
      : -Infinity;

  return {
    actionId,
    directCostUsd,
    totalEstimatedCostUsd,
    requiredGrossRevenueUsd: grossRevenueUsd,
    recommendedPremiumCost,
    currentPremiumCost,
    currentGrossMargin,
  };
}

export function costChangeReport(
  actionId: PaidActionId,
  previousDirectCostUsd: number,
  assumptions: EconomyAssumptions = ECONOMY_ASSUMPTIONS,
): CostChangeReport {
  const rec = recommendedPremiumPrice(actionId, assumptions);
  const currentDirect = rec.directCostUsd;
  const percentChange =
    previousDirectCostUsd === 0
      ? 0
      : ((currentDirect - previousDirectCostUsd) / previousDirectCostUsd) * 100;

  let recommendedAction: CostChangeReport['recommendedAction'] = 'no_price_change';
  let reason = 'Cost change is within tolerance; current price still meets target margin.';

  if (rec.currentGrossMargin < 0.15) {
    recommendedAction = 'propose_price_increase';
    reason = `Current gross margin ${(rec.currentGrossMargin * 100).toFixed(1)}% is below 15% floor.`;
  } else if (rec.currentGrossMargin > 0.75 && Math.abs(percentChange) < 10) {
    recommendedAction = 'monitor';
    reason = `Current gross margin ${(rec.currentGrossMargin * 100).toFixed(1)}% is well above target; consider whether players get proportional value.`;
  } else if (percentChange > 25) {
    recommendedAction = 'propose_price_increase';
    reason = `Direct cost rose ${percentChange.toFixed(1)}% since last review.`;
  } else if (percentChange < -25 && rec.currentGrossMargin > 0.6) {
    recommendedAction = 'propose_price_decrease';
    reason = `Direct cost fell ${percentChange.toFixed(1)}% and margin is comfortable; passing savings to players is optional.`;
  }

  return {
    actionId,
    currentDirectCostUsd: currentDirect,
    previousDirectCostUsd,
    percentChange,
    currentPremiumCost: rec.currentPremiumCost,
    currentEstimatedGrossMargin: rec.currentGrossMargin,
    recommendedAction,
    reason,
  };
}

// Round to the nearest player-friendly value: 1, 2, 3, 5, 10, 15, 20, 25, 30,
// 40, 50, 75, 100, then multiples of 25 above that. Never rounds down below
// the raw recommendation — always chooses the smallest allowed value that
// meets or exceeds the raw price so the target margin is preserved.
function roundToPlayerFriendly(raw: number): number {
  const anchors = [
    1, 2, 3, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 175, 200,
    250, 300, 400, 500, 750, 1000,
  ];
  for (const a of anchors) {
    if (a >= raw) return a;
  }
  return Math.ceil(raw / 250) * 250;
}
