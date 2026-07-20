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
  battle_run_entry: {
    actionId: 'battle_run_entry',
    gameplayCost: 50,
    approvedBy: 'Raheem',
    approvedAt: '2026-07-19',
    version: 1,
    notes:
      'Per-battle entry price. Reserved on Start, committed on battle initialization, ' +
      'forfeited on defeat/abandon (never refunded). Feeds analytics via the same battleId ' +
      'the reward ledger scans for idempotency.',
  },
  seraph_resist_fall_forged: {
    actionId: 'seraph_resist_fall_forged',
    gameplayCost: 200,
    approvedBy: 'Raheem',
    approvedAt: '2026-07-20',
    version: 1,
    notes:
      'Approved by Raheem 2026-07-20 — narrative Gold sink; shift alignment score 1 step ' +
      'toward center at tier-up; Gold-only, grindable, never a Forge Crystal paywall.',
  },
  seraph_resist_fall_ascendant: {
    actionId: 'seraph_resist_fall_ascendant',
    gameplayCost: 400,
    approvedBy: 'Raheem',
    approvedAt: '2026-07-20',
    version: 1,
    notes:
      'Approved by Raheem 2026-07-20 — narrative Gold sink; shift alignment score 1 step ' +
      'toward center at tier-up; Gold-only, grindable, never a Forge Crystal paywall.',
  },
};

export const FREE_REROLLS_PER_FORGE = 1;
