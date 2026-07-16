import type { PremiumPriceEntry, PaidActionId } from '../../types/economy';

const APPROVED_AT = '2026-07-16';

export const PREMIUM_PRICE_CATALOG: Record<PaidActionId, PremiumPriceEntry> = {
  forge_card: {
    actionId: 'forge_card',
    premiumCost: 20,
    approvedBy: 'Raheem',
    approvedAt: APPROVED_AT,
    pricingVersion: 1,
    notes: 'Approved 2026-07-16. ~$0.20 gross, ~5.4x direct cost.',
  },
  evolve_card_art: {
    actionId: 'evolve_card_art',
    premiumCost: 15,
    approvedBy: 'Raheem',
    approvedAt: APPROVED_AT,
    pricingVersion: 1,
    notes: 'Includes bundled ascendant-paths call for Forged→Ascendant.',
  },
  regenerate_portrait: {
    actionId: 'regenerate_portrait',
    premiumCost: 10,
    approvedBy: 'Raheem',
    approvedAt: APPROVED_AT,
    pricingVersion: 1,
  },
  regenerate_text: {
    actionId: 'regenerate_text',
    premiumCost: 3,
    approvedBy: 'Raheem',
    approvedAt: APPROVED_AT,
    pricingVersion: 1,
    notes: 'Priced for friction; direct API cost is near zero.',
  },
};
