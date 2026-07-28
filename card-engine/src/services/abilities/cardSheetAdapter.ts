import type { Card } from '../../types/card';
import type { CardSheetAbility } from '../../components/CardSheet';
import { getOverallRank } from '../../data/powerSystem';
import { getDefinition, getCurrentVersion, getArtForAbility, getReferencesForCard } from './registry';
import { getArtCrops } from '../../types/abilities';

/** Builds the shared CardSheet's ability rows from the static ability
 *  registry for a card's current rank — no live combat status, since this
 *  is for Collection / Card Detail, not an in-fight view. Mirrors the
 *  lookup pattern already used in CardDetail.tsx's ability section. */
export function buildStaticCardSheetAbilities(card: Card): CardSheetAbility[] {
  const overallRank = getOverallRank(card.stats);
  const refs = getReferencesForCard(card.cardId)
    .filter((r) => r.localTier === overallRank)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return refs.map((ref) => {
    const def = getDefinition(ref.abilityId);
    const version = getCurrentVersion(ref.abilityId);
    const art = getArtForAbility(ref.abilityId);
    return {
      slot: ref.slotType,
      displayName: def?.displayName ?? ref.abilityId,
      descriptionShort: def?.descriptionShort,
      descriptionLong: def?.descriptionLong,
      resourceCost: version?.resourceCost ?? 0,
      resourceLabel: version?.resourceType === 'mana' ? 'MANA' : version?.resourceType === 'tech' ? 'TECH' : 'NONE',
      cooldownRounds: version?.cooldownRounds ?? 0,
      artUrl: art ? getArtCrops(art).combat.url : null,
    };
  });
}
