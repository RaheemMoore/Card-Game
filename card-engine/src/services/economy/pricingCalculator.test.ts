import { describe, it, expect } from 'vitest';
import {
  estimateDirectCost,
  estimateActionCost,
  requiredGrossRevenueUsd,
  recommendedPremiumPrice,
  costChangeReport,
} from './pricingCalculator';
import { API_COST_CATALOG } from '../../data/economy/apiCostCatalog';
import { ECONOMY_ASSUMPTIONS } from '../../data/economy/assumptions';

describe('estimateDirectCost', () => {
  it('sums all cost components', () => {
    const entry = API_COST_CATALOG.forge_card;
    const expected = entry.components.reduce((s, c) => s + c.estimatedCostUsd, 0);
    expect(estimateDirectCost(entry)).toBeCloseTo(expected, 6);
  });

  it('is close to the entry.estimatedDirectCostUsd', () => {
    for (const entry of Object.values(API_COST_CATALOG)) {
      expect(estimateDirectCost(entry)).toBeCloseTo(
        entry.estimatedDirectCostUsd,
        4,
      );
    }
  });
});

describe('estimateActionCost', () => {
  it('adds retry reserve, infra, and support on top of direct cost', () => {
    const entry = API_COST_CATALOG.forge_card;
    const direct = estimateDirectCost(entry);
    const cost = estimateActionCost(entry);
    const expected =
      direct +
      direct * ECONOMY_ASSUMPTIONS.retryReserveRate +
      ECONOMY_ASSUMPTIONS.infrastructureAllocationUsd +
      ECONOMY_ASSUMPTIONS.supportAllocationUsd;
    expect(cost).toBeCloseTo(expected, 6);
  });
});

describe('requiredGrossRevenueUsd', () => {
  it('divides action cost by (1 - fees - margin)', () => {
    const entry = API_COST_CATALOG.forge_card;
    const cost = estimateActionCost(entry);
    const denominator =
      1 -
      ECONOMY_ASSUMPTIONS.paymentFeeRate -
      ECONOMY_ASSUMPTIONS.targetContributionMarginRate;
    expect(requiredGrossRevenueUsd(entry)).toBeCloseTo(cost / denominator, 6);
  });

  it('throws when assumptions leave no margin room', () => {
    const bad = {
      ...ECONOMY_ASSUMPTIONS,
      paymentFeeRate: 0.6,
      targetContributionMarginRate: 0.5,
    };
    expect(() => requiredGrossRevenueUsd(API_COST_CATALOG.forge_card, bad)).toThrow();
  });
});

describe('recommendedPremiumPrice', () => {
  it('returns a rounded, player-friendly number >= raw recommendation', () => {
    const rec = recommendedPremiumPrice('forge_card');
    const raw =
      requiredGrossRevenueUsd(API_COST_CATALOG.forge_card) *
      ECONOMY_ASSUMPTIONS.currencyUnitsPerUsd;
    expect(rec.recommendedPremiumCost).toBeGreaterThanOrEqual(Math.floor(raw));
  });

  it('reports the currently approved price', () => {
    const rec = recommendedPremiumPrice('forge_card');
    expect(rec.currentPremiumCost).toBe(20);
  });

  it('computes a positive current gross margin for approved prices', () => {
    const rec = recommendedPremiumPrice('forge_card');
    expect(rec.currentGrossMargin).toBeGreaterThan(0);
    expect(rec.currentGrossMargin).toBeLessThan(1);
  });
});

describe('costChangeReport', () => {
  it('recommends monitor when cost is unchanged and margin is comfortable', () => {
    const rec = recommendedPremiumPrice('forge_card');
    const report = costChangeReport('forge_card', rec.directCostUsd);
    expect(['no_price_change', 'monitor']).toContain(report.recommendedAction);
  });

  it('recommends a price increase when cost rises sharply', () => {
    const rec = recommendedPremiumPrice('forge_card');
    const report = costChangeReport('forge_card', rec.directCostUsd * 0.5);
    expect(report.recommendedAction).toBe('propose_price_increase');
  });

  it('reports percent change accurately', () => {
    const rec = recommendedPremiumPrice('forge_card');
    const previous = rec.directCostUsd * 0.9;
    const report = costChangeReport('forge_card', previous);
    const expected = ((rec.directCostUsd - previous) / previous) * 100;
    expect(report.percentChange).toBeCloseTo(expected, 3);
  });
});
