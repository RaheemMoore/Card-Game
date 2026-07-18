import type { Card, Rank } from '../../types/card';
import type {
  AbilityDefinition,
  AbilityVersion,
  AbilitySlotType,
  CardAbilityReference,
} from '../../types/abilities';
import type { AbilityStore } from '../persistence/AbilityStore';
import { getStatNames } from '../../data/powerSystem';
import { getOverallRank } from '../../data/powerSystem';
import { ARCHETYPE_PREFERRED_FAMILIES } from '../../data/abilities/families';

/**
 * Legacy backfill: for cards forged before the ability system existed, assign
 * seed abilities per slot per rank using archetype affinity as the picker.
 *
 * A5 will call this once per user during PersistenceGate hydration. The
 * "legacy" state is derived — a card is legacy iff it has zero references
 * in the store. We do not persist a `legacyAbilities: true` marker on the
 * Card blob so the Card type stays untouched.
 *
 * Cards whose archetype has no seed match for a slot are left with fewer
 * slots filled; A5's UI can nudge the player to "reforge abilities" once
 * for free (§9 economy governance approval required before this ships).
 */

export interface BackfillResult {
  scanned: number;
  cardsUpdated: number;
  referencesWritten: number;
  cardsSkippedNoSeedMatch: number;
}

interface Candidate {
  definition: AbilityDefinition;
  version: AbilityVersion;
  score: number;
}

const SLOTS_BY_RANK: Record<Rank, AbilitySlotType[]> = {
  Foundation: ['core'],
  Forged: ['core', 'signature'],
  Ascendant: ['core', 'signature', 'ultimate'],
};

/**
 * Detects whether the card has any ability references. Legacy = zero.
 */
export function isLegacyCard(store: AbilityStore, card: Card): boolean {
  return store.getReferencesForCard(card.cardId).length === 0;
}

/**
 * Pick the best seed ability for an archetype + slot. Returns undefined
 * when nothing scores above zero (e.g. an archetype with no matching
 * family in the current seed set).
 */
function pickForSlot(
  store: AbilityStore,
  card: Card,
  slot: AbilitySlotType,
): Candidate | undefined {
  const archetype = card.archetype;
  const affinity = ARCHETYPE_PREFERRED_FAMILIES[archetype];
  const archetypeResource = card.stats.Tech ? 'tech' : 'mana';

  const candidates: Candidate[] = [];
  for (const def of store.getAllDefinitions()) {
    const version = store.getCurrentVersion(def.id);
    if (!version) continue;
    if (version.slotType !== slot) continue;
    if (version.status !== 'approved' && version.status !== 'experimental') continue;
    if (version.resourceType !== 'none' && version.resourceType !== archetypeResource) continue;

    let score = 0;
    let restricted = false;
    for (const familyId of def.familyIds) {
      if (affinity.restricted.includes(familyId)) restricted = true;
      if (affinity.preferred.includes(familyId)) score += 10;
      else if (affinity.secondary.includes(familyId)) score += 5;
    }
    if (restricted) continue;
    if (score <= 0) continue;

    candidates.push({ definition: def, version, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

export function backfillCardAbilities(store: AbilityStore, cards: Card[]): BackfillResult {
  const result: BackfillResult = {
    scanned: 0,
    cardsUpdated: 0,
    referencesWritten: 0,
    cardsSkippedNoSeedMatch: 0,
  };

  for (const card of cards) {
    result.scanned++;
    if (!isLegacyCard(store, card)) continue;

    const cardRank = getOverallRank(card.stats);
    const slots = SLOTS_BY_RANK[cardRank];
    // Also verify the archetype actually uses the resource we assumed.
    const activeStats = getStatNames(card.archetype);
    if (!activeStats.includes('Atk')) continue; // sanity — never triggers

    let wroteAny = false;
    for (const slot of slots) {
      const pick = pickForSlot(store, card, slot);
      if (!pick) continue;
      const ref: CardAbilityReference = {
        cardId: card.cardId,
        abilityId: pick.definition.id,
        abilityVersionId: pick.version.id,
        slotType: slot,
        localTier: cardRank,
        displayOrder: slotOrder(slot),
      };
      store.saveReference(ref);
      result.referencesWritten++;
      wroteAny = true;
    }

    if (wroteAny) result.cardsUpdated++;
    else result.cardsSkippedNoSeedMatch++;
  }

  return result;
}

function slotOrder(slot: AbilitySlotType): number {
  return slot === 'core' ? 0 : slot === 'signature' ? 1 : 2;
}
