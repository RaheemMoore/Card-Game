import type { GameplayPriceEntry, GameplayActionId } from '../../types/economy';

const APPROVED_AT = '2026-07-16';

export const GAMEPLAY_PRICE_CATALOG: Record<GameplayActionId, GameplayPriceEntry> = {
  stat_reroll: {
    actionId: 'stat_reroll',
    gameplayCost: 50,
    approvedBy: 'Raheem',
    approvedAt: APPROVED_AT,
    version: 1,
    notes: 'First reroll per forge is free; subsequent rerolls charge this amount.',
  },
};

export const FREE_REROLLS_PER_FORGE = 1;
