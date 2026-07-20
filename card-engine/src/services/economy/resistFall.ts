import type { Rank } from '../../types/card';
import type { GameplayActionId } from '../../types/economy';
import { GAMEPLAY_PRICE_CATALOG } from '../../data/economy/gameplayPriceCatalog';

/**
 * P8 Seraph corruption arc — "Resist the Fall" pricing lookup. The Gold sink
 * is priced per rank (Forged = 200, Ascendant = 400). Returns null for ranks
 * where the action is not offered (Foundation).
 */
export function resistFallActionId(rank: Rank): GameplayActionId | null {
  if (rank === 'Forged') return 'seraph_resist_fall_forged';
  if (rank === 'Ascendant') return 'seraph_resist_fall_ascendant';
  return null;
}

export function resistFallCost(rank: Rank): number | null {
  const actionId = resistFallActionId(rank);
  return actionId ? GAMEPLAY_PRICE_CATALOG[actionId].gameplayCost : null;
}
