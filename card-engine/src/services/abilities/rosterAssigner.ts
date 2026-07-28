import type { Card, Rank } from '../../types/card';
import type {
  AbilityDefinition,
  AbilityVersion,
  AbilitySlotType,
  CardAbilityReference,
} from '../../types/abilities';
import type { AbilityStore } from '../persistence/AbilityStore';
import { getOverallRank } from '../../data/powerSystem';
import { ARCHETYPE_PREFERRED_FAMILIES } from '../../data/abilities/families';
import { SHARED_BASIC_ABILITY_IDS } from '../../data/abilities/seedAbilities';
import { seededRng, pickOne } from '../seededRandom';

/**
 * Gives a card its ability loadout, drawn from the fixed roster.
 *
 * Replaces the retired `legacyBackfill.ts`. That only ever ran for cards with
 * ZERO references and always took the single highest-scoring ability, so
 * every card of an archetype ended up with an identical kit. This picks from the top-scoring
 * BAND using a generator seeded from `cardId`, following the pattern
 * `imageEngine/identityRoller.ts` established: code rolls it, deterministically,
 * so the same card always resolves to the same loadout and a resumed or
 * re-run assignment never drifts.
 *
 * ── The door left open ───────────────────────────────────────────────────
 * The RNG is an injected parameter and candidates come from a single
 * `candidatesForSlot` lookup. A future procedural generator swaps the
 * candidate SOURCE; it does not need to touch the assignment logic. That is
 * the seam the "abilities that spawn" idea will use.
 *
 * ── Why the basics fallback is not optional ──────────────────────────────
 * `useBattle` THROWS when a card resolves to zero abilities — "has no
 * abilities yet — forge or tier it up first". With only three archetypes
 * authored, the other eight would hit that on every battle entry. So when
 * archetype affinity yields nothing for a slot, the shared basics pool is
 * used instead. A card must never leave here empty.
 */

/**
 * Exactly what the assigner reads off a card — not a full `Card`.
 *
 * Narrow on purpose: the forge assigns abilities from a card SHELL, before
 * the AI-written name and lore exist. Demanding a complete Card there would
 * force a cast and hide the fact that none of those fields matter here.
 */
export type AssignableCard = Pick<Card, 'cardId' | 'archetype' | 'stats'> &
  Partial<Pick<Card, 'elementSelection'>>;

const SLOTS_BY_RANK: Record<Rank, AbilitySlotType[]> = {
  Foundation: ['core'],
  Forged: ['core', 'signature'],
  Ascendant: ['core', 'signature', 'ultimate'],
};

/**
 * How close to the best score still counts as "worth considering".
 *
 * Must be LESS THAN the gap between a preferred family (10) and a secondary
 * one (5), or a secondary-family ability ties with a preferred one and a
 * Druid can roll a martial signature — which defeats the point of having
 * family affinity at all. 4 keeps genuine equals in contention (including the
 * +2 element nudge) while never letting a secondary beat a preferred.
 */
const SCORE_BAND = 4;

export interface AssignmentResult {
  scanned: number;
  cardsUpdated: number;
  referencesWritten: number;
  /** Cards that fell through to the shared basics for at least one slot. */
  cardsUsingFallback: number;
}

interface Candidate {
  definition: AbilityDefinition;
  version: AbilityVersion;
  score: number;
}

function slotOrder(slot: AbilitySlotType): number {
  return slot === 'core' ? 0 : slot === 'signature' ? 1 : 2;
}

/**
 * Every ability this card could legitimately hold in this slot, scored by
 * archetype family affinity.
 *
 * Scoring is carried over from the retired backfill unchanged — preferred
 * family 10, secondary 5, restricted excluded outright — because that part
 * was right; only the "always take the top one" selection was wrong.
 */
function candidatesForSlot(
  store: AbilityStore,
  card: AssignableCard,
  slot: AbilitySlotType,
): Candidate[] {
  const affinity = ARCHETYPE_PREFERRED_FAMILIES[card.archetype];
  const archetypeResource = card.stats.Tech ? 'tech' : 'mana';

  const candidates: Candidate[] = [];
  for (const def of store.getAllDefinitions()) {
    const version = store.getCurrentVersion(def.id);
    if (!version) continue;
    if (version.slotType !== slot) continue;
    if (version.status !== 'approved' && version.status !== 'experimental') continue;
    // 'none' costs nothing and suits any archetype — that is what makes the
    // shared basics a universal fallback.
    if (version.resourceType !== 'none' && version.resourceType !== archetypeResource) continue;

    let score = 0;
    let restricted = false;
    for (const familyId of def.familyIds) {
      if (affinity.restricted.includes(familyId)) restricted = true;
      if (affinity.preferred.includes(familyId)) score += 10;
      else if (affinity.secondary.includes(familyId)) score += 5;
    }
    if (restricted) continue;

    // A card's element nudges ties only. It must NEVER be load-bearing:
    // a Fallen Seraph's element transmutes at tier-up, and a loadout that
    // silently became invalid because the element moved would be a bug.
    if (card.elementSelection?.element && def.tags.includes('element')) score += 2;

    candidates.push({ definition: def, version, score });
  }
  return candidates;
}

/** Abilities from the shared pool that fit this slot. The safety net. */
function basicsForSlot(store: AbilityStore, slot: AbilitySlotType): Candidate[] {
  const out: Candidate[] = [];
  for (const id of SHARED_BASIC_ABILITY_IDS) {
    const def = store.getDefinition(id);
    const version = def ? store.getCurrentVersion(def.id) : undefined;
    if (!def || !version || version.slotType !== slot) continue;
    out.push({ definition: def, version, score: 0 });
  }
  return out;
}

export interface AssignedSlot {
  slot: AbilitySlotType;
  definition: AbilityDefinition;
  version: AbilityVersion;
  /** True when archetype affinity produced nothing and the basics were used. */
  fromFallback: boolean;
}

/**
 * Resolve one card's loadout without writing anything. Pure given the store,
 * so it can be previewed, tested and diffed.
 */
export function assignAbilitiesForCard(
  store: AbilityStore,
  card: AssignableCard,
  rng: () => number = seededRng(`${card.cardId}:abilities`),
): AssignedSlot[] {
  const rank = getOverallRank(card.stats);
  const assigned: AssignedSlot[] = [];

  for (const slot of SLOTS_BY_RANK[rank]) {
    const affinityPicks = candidatesForSlot(store, card, slot).filter((c) => c.score > 0);
    let pool = affinityPicks;
    let fromFallback = false;

    if (pool.length === 0) {
      pool = basicsForSlot(store, slot);
      fromFallback = true;
    }
    if (pool.length === 0) continue;

    // Top-scoring band, then a seeded pick within it. One ability is never
    // strictly destiny, but a Druid still never rolls a martial signature.
    const best = Math.max(...pool.map((c) => c.score));
    const band = pool.filter((c) => c.score >= best - SCORE_BAND);
    // Sorted first so the input order is stable regardless of store iteration
    // order — otherwise the same seed could pick differently between runs.
    band.sort((a, b) => a.definition.id.localeCompare(b.definition.id));

    const chosen = pickOne(band, rng);
    if (!chosen) continue;
    assigned.push({ slot, definition: chosen.definition, version: chosen.version, fromFallback });
  }

  return assigned;
}

export interface ReassignOptions {
  /** Replace existing references. Off by default, so a routine boot only
   *  fills cards that have none rather than reshuffling everyone's kit. */
  force?: boolean;
}

/** Assign loadouts across many cards, writing references to the store. */
export function assignAbilitiesForCards(
  store: AbilityStore,
  cards: AssignableCard[],
  opts: ReassignOptions = {},
): AssignmentResult {
  const result: AssignmentResult = {
    scanned: 0,
    cardsUpdated: 0,
    referencesWritten: 0,
    cardsUsingFallback: 0,
  };

  for (const card of cards) {
    result.scanned++;
    const existing = store.getReferencesForCard(card.cardId);
    if (existing.length > 0 && !opts.force) continue;
    if (existing.length > 0) store.deleteReferencesForCard(card.cardId);

    const rank = getOverallRank(card.stats);
    const assigned = assignAbilitiesForCard(store, card);
    if (assigned.length === 0) continue;

    for (const a of assigned) {
      const ref: CardAbilityReference = {
        cardId: card.cardId,
        abilityId: a.definition.id,
        abilityVersionId: a.version.id,
        slotType: a.slot,
        localTier: rank,
        displayOrder: slotOrder(a.slot),
      };
      store.saveReference(ref);
      result.referencesWritten++;
    }
    result.cardsUpdated++;
    if (assigned.some((a) => a.fromFallback)) result.cardsUsingFallback++;
  }

  return result;
}
