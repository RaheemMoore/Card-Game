import { PAID_ACTION_IDS, GAMEPLAY_ACTION_IDS } from '../../types/economy';
import type { PaidActionId, GameplayActionId } from '../../types/economy';
import { API_COST_CATALOG } from '../../data/economy/apiCostCatalog';
import { PREMIUM_PRICE_CATALOG } from '../../data/economy/premiumPriceCatalog';
import { GAMEPLAY_PRICE_CATALOG } from '../../data/economy/gameplayPriceCatalog';
import { ECONOMY_ASSUMPTIONS } from '../../data/economy/assumptions';

export interface ValidationError {
  severity: 'error' | 'warning';
  code: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export function validateCatalogs(): ValidationResult {
  const errors: ValidationError[] = [];

  for (const id of PAID_ACTION_IDS) {
    const cost = API_COST_CATALOG[id as PaidActionId];
    const price = PREMIUM_PRICE_CATALOG[id as PaidActionId];
    if (!cost) {
      errors.push({
        severity: 'error',
        code: 'missing_cost_entry',
        message: `PaidActionId "${id}" has no API cost catalog entry.`,
      });
    }
    if (!price) {
      errors.push({
        severity: 'error',
        code: 'missing_price_entry',
        message: `PaidActionId "${id}" has no premium price catalog entry.`,
      });
    }
    if (cost && cost.estimatedDirectCostUsd < 0) {
      errors.push({
        severity: 'error',
        code: 'negative_cost',
        message: `PaidActionId "${id}" has negative estimatedDirectCostUsd.`,
      });
    }
    if (price && price.premiumCost <= 0) {
      errors.push({
        severity: 'error',
        code: 'nonpositive_price',
        message: `PaidActionId "${id}" has non-positive premiumCost.`,
      });
    }
    if (cost && price) {
      const sumOfComponents = cost.components.reduce(
        (s, c) => s + c.estimatedCostUsd,
        0,
      );
      if (Math.abs(sumOfComponents - cost.estimatedDirectCostUsd) > 0.0001) {
        errors.push({
          severity: 'warning',
          code: 'cost_component_mismatch',
          message: `PaidActionId "${id}": components sum to ${sumOfComponents.toFixed(4)} but estimatedDirectCostUsd is ${cost.estimatedDirectCostUsd}.`,
        });
      }
    }
  }

  for (const id of GAMEPLAY_ACTION_IDS) {
    const price = GAMEPLAY_PRICE_CATALOG[id as GameplayActionId];
    if (!price) {
      errors.push({
        severity: 'error',
        code: 'missing_gameplay_price_entry',
        message: `GameplayActionId "${id}" has no gameplay price catalog entry.`,
      });
    }
    if (price && price.gameplayCost <= 0) {
      errors.push({
        severity: 'error',
        code: 'nonpositive_gameplay_price',
        message: `GameplayActionId "${id}" has non-positive gameplayCost.`,
      });
    }
  }

  const { paymentFeeRate, targetContributionMarginRate, currencyUnitsPerUsd } =
    ECONOMY_ASSUMPTIONS;
  if (paymentFeeRate < 0 || paymentFeeRate >= 1) {
    errors.push({
      severity: 'error',
      code: 'invalid_payment_fee_rate',
      message: `paymentFeeRate must be in [0, 1); got ${paymentFeeRate}.`,
    });
  }
  if (targetContributionMarginRate < 0 || targetContributionMarginRate >= 1) {
    errors.push({
      severity: 'error',
      code: 'invalid_margin_rate',
      message: `targetContributionMarginRate must be in [0, 1); got ${targetContributionMarginRate}.`,
    });
  }
  if (paymentFeeRate + targetContributionMarginRate >= 1) {
    errors.push({
      severity: 'error',
      code: 'invalid_margin_sum',
      message: `paymentFeeRate + targetContributionMarginRate must be < 1; got ${
        paymentFeeRate + targetContributionMarginRate
      }.`,
    });
  }
  if (currencyUnitsPerUsd <= 0) {
    errors.push({
      severity: 'error',
      code: 'invalid_currency_units',
      message: `currencyUnitsPerUsd must be > 0; got ${currencyUnitsPerUsd}.`,
    });
  }

  const hasError = errors.some((e) => e.severity === 'error');
  return { ok: !hasError, errors };
}
