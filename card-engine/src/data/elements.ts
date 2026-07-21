import type { ArchetypeName } from '../types/card';
import type {
  ElementBond,
  ElementCompatibility,
  ElementName,
  ElementSelection,
  StoryPillarAnswer,
} from '../types/bible';
import { ELEMENT_BONDS, ELEMENT_NAMES } from '../types/bible';

/**
 * Element system — single source of truth.
 *
 * Bible §Global Element Pillar: every element carries a bond, and every
 * archetype gates elements into four buckets:
 *   1. Naturally Compatible
 *   2. Compatible Through Reinterpretation
 *   3. Rare
 *   4. Not Available
 *
 * Bible §Element rarity — rarity affects DISCOVERY FREQUENCY, not power.
 * Rare elements use two gates: narrative eligibility (Story Pillar answers
 * must support the element) AND weighted discovery (shown less often).
 *
 * Editing this file requires Raheem approval + Lore Director review.
 */

// ---------- Bucket weights (discovery frequency, per Bible) ----------

/**
 * Relative weights for how often each bucket appears in the picker.
 * Not power values. Kept tunable at the top of the file for clarity.
 */
export const BUCKET_WEIGHTS: Record<ElementCompatibility, number> = {
  naturally_compatible: 60,
  compatible_through_reinterpretation: 30,
  rare: 8,
  not_available: 0,
};

// ---------- Per-archetype compatibility, verbatim from Bible §Step 12 ----------

type ArchetypeElementBuckets = {
  naturally_compatible: ElementName[];
  compatible_through_reinterpretation: ElementName[];
  rare: ElementName[];
  not_available?: ElementName[];
};

/**
 * Per Bible §Step 12 per archetype. Every element in ELEMENT_NAMES that is
 * not listed for a given archetype defaults to `not_available`.
 *
 * NOTE (P4 Seraph corruption arc): 'Infernal' is INTENTIONALLY absent from
 * every archetype's buckets, including Seraph. It is the Fallen-Seraph-
 * exclusive element and is only ever assigned by alignment transmutation at
 * tier-up (Light → Infernal — see data/narrativeAxes/seraphAlignment.ts and
 * services/tierUp.ts). It must NOT appear in the normal forge picker.
 */
export const ELEMENT_COMPATIBILITY: Record<ArchetypeName, ArchetypeElementBuckets> = {
  Barbarian: {
    naturally_compatible: ['Fire', 'Earth', 'Stone', 'Storm', 'Wind', 'Ice', 'Blood', 'Beast', 'Nature'],
    compatible_through_reinterpretation: ['Light', 'Shadow', 'Metal', 'Spirit', 'Poison', 'Water', 'Lightning', 'Sound', 'Ash'],
    rare: ['Holy', 'Void', 'Time', 'Cosmic', 'Tech', 'Psychic'],
  },
  Monk: {
    naturally_compatible: ['Spirit', 'Wind', 'Earth', 'Water', 'Light', 'Sound'],
    compatible_through_reinterpretation: ['Fire', 'Ice', 'Lightning', 'Nature', 'Metal', 'Shadow', 'Blood', 'Poison'],
    rare: ['Time', 'Void', 'Cosmic', 'Psychic', 'Holy', 'Tech'],
    not_available: ['Beast'],
  },
  Beastmaster: {
    naturally_compatible: ['Beast', 'Nature', 'Earth', 'Wind', 'Water', 'Spirit', 'Ice'],
    compatible_through_reinterpretation: ['Fire', 'Lightning', 'Light', 'Shadow', 'Poison', 'Blood', 'Sound'],
    rare: ['Time', 'Void', 'Cosmic', 'Psychic', 'Holy', 'Tech', 'Metal'],
  },
  Druid: {
    naturally_compatible: ['Nature', 'Earth', 'Water', 'Wind', 'Spirit', 'Light', 'Ice'],
    compatible_through_reinterpretation: ['Fire', 'Lightning', 'Shadow', 'Poison', 'Sound'],
    rare: ['Time', 'Void', 'Cosmic', 'Psychic', 'Holy', 'Tech', 'Metal', 'Beast', 'Blood'],
  },
  Necromancer: {
    naturally_compatible: ['Spirit', 'Shadow', 'Blood', 'Poison'],
    compatible_through_reinterpretation: ['Earth', 'Ice', 'Water', 'Sound', 'Psychic'],
    rare: ['Fire', 'Wind', 'Nature', 'Beast', 'Light', 'Holy', 'Lightning', 'Metal', 'Time', 'Void', 'Cosmic', 'Tech', 'Dream'],
  },
  Vampire: {
    // Bible §Vampire: Vampires draw only on Blood, Shadow, and Void — the
    // hunger itself, the dark they hunt in, and the erased self. Blood is the
    // native spine; Shadow and Void are the two reinterpretations. Rare is empty
    // so the narrative-eligibility gate no longer restricts any Vampire element.
    naturally_compatible: ['Blood'],
    compatible_through_reinterpretation: ['Shadow', 'Void'],
    rare: [],
  },
  Lycanthrope: {
    // Layer-A canon re-gate (Tori, lore director, 2026-07-20 — parked for
    // Raheem via proposal f67e3513). Lycan elements are either a natural fit
    // (lunar/pack/wild) or Rare — there is deliberately NO middle tier.
    naturally_compatible: ['Beast', 'Blood', 'Spirit', 'Moon', 'Earth'],
    compatible_through_reinterpretation: [],
    rare: ['Shadow', 'Poison', 'Ice', 'Dream'],
  },
  'Mech Pilot': {
    naturally_compatible: ['Tech', 'Lightning', 'Metal', 'Sound'],
    compatible_through_reinterpretation: ['Earth', 'Wind', 'Ice', 'Psychic', 'Light', 'Spirit', 'Water'],
    rare: ['Time', 'Cosmic', 'Void', 'Holy', 'Nature', 'Beast', 'Blood', 'Poison', 'Dream', 'Moon', 'Shadow'],
    not_available: ['Fire'],
  },
  Android: {
    naturally_compatible: ['Tech', 'Lightning', 'Metal', 'Psychic', 'Light', 'Sound'],
    compatible_through_reinterpretation: ['Ice', 'Water', 'Wind', 'Earth', 'Spirit', 'Moon', 'Shadow'],
    rare: ['Time', 'Void', 'Cosmic', 'Holy', 'Nature', 'Beast', 'Blood', 'Poison', 'Dream', 'Fire'],
  },
  Seraph: {
    naturally_compatible: ['Holy', 'Light', 'Spirit', 'Wind', 'Sound', 'Fire'],
    compatible_through_reinterpretation: ['Lightning', 'Water', 'Earth', 'Metal', 'Ice', 'Psychic', 'Moon'],
    rare: ['Time', 'Cosmic', 'Dream', 'Nature', 'Blood', 'Shadow', 'Void', 'Tech', 'Beast', 'Poison'],
  },
  Human: {
    naturally_compatible: ['Fire', 'Water', 'Wind', 'Earth', 'Light', 'Metal'],
    compatible_through_reinterpretation: ['Ice', 'Lightning', 'Nature', 'Spirit', 'Sound', 'Psychic', 'Tech', 'Moon'],
    rare: ['Holy', 'Shadow', 'Blood', 'Poison', 'Time', 'Void', 'Cosmic', 'Dream', 'Beast'],
  },
};

// ---------- Public helpers ----------

export function bucketFor(
  archetype: ArchetypeName,
  element: ElementName,
): ElementCompatibility {
  const buckets = ELEMENT_COMPATIBILITY[archetype];
  if (buckets.naturally_compatible.includes(element)) return 'naturally_compatible';
  if (buckets.compatible_through_reinterpretation.includes(element)) {
    return 'compatible_through_reinterpretation';
  }
  if (buckets.rare.includes(element)) return 'rare';
  return 'not_available';
}

/** Returns every element the archetype could ever access at any narrative gate. */
export function elementsAvailableToArchetype(archetype: ArchetypeName): ElementName[] {
  const buckets = ELEMENT_COMPATIBILITY[archetype];
  return [
    ...buckets.naturally_compatible,
    ...buckets.compatible_through_reinterpretation,
    ...buckets.rare,
  ];
}

// ---------- Rare narrative-eligibility gate ----------

/**
 * Bible §Element rarity — the Rare bucket requires TWO gates: narrative
 * eligibility (from Story Pillar answers) AND weighted discovery.
 *
 * This function implements the eligibility check. We take a conservative
 * default: a Rare element is eligible when the Story Pillar answers include
 * at least one tag that gestures toward the element's semantic field.
 * Free-form answers pass the check leniently (the player has already
 * committed to something specific enough to justify it) but a hard-block
 * list from the Bible §14 Avoid still applies.
 *
 * The tag families below map elements → answer tags. StoryPillarOption.tags
 * (see data/storyPillars.ts) place answers into these families.
 */
const RARE_ELEMENT_TAG_HINTS: Partial<Record<ElementName, string[]>> = {
  Holy: ['oath', 'sacred', 'faith', 'service', 'hope', 'divine', 'vow'],
  Void: ['loss', 'absence', 'emptiness', 'exile', 'silence', 'erasure'],
  Time: ['memory', 'legacy', 'inheritance', 'cycles', 'ancient', 'preservation'],
  Cosmic: ['stars', 'distant', 'greater-purpose', 'origin', 'inheritance'],
  Tech: ['machine', 'device', 'engineering', 'invention', 'artifact'],
  Psychic: ['insight', 'mind', 'memory', 'connection', 'sacred'],
  Dream: ['vision', 'symbol', 'unresolved', 'mystery', 'memory'],
  Moon: ['lunar', 'cycles', 'transformation', 'guardian', 'boundary'],
  Fire: ['forge', 'transformation', 'passion', 'hearth'],
  Lightning: ['sudden', 'awakening', 'insight', 'confrontation'],
  Nature: ['stewardship', 'cycles', 'restoration'],
  Beast: ['pack', 'partnership', 'wild', 'bond'],
  Blood: ['inheritance', 'sacrifice', 'kinship', 'oath'],
  Metal: ['craft', 'forge', 'inheritance', 'engineering'],
  Wind: ['travel', 'wanderer', 'freedom'],
  Light: ['hope', 'service', 'revelation'],
  Shadow: ['secret', 'restraint', 'grief'],
};

/**
 * Per-archetype override of the global Rare-element tag hints. Use this when
 * an element must be narratively gated for ONE archetype without changing its
 * gating everywhere else. An entry here fully replaces the global hints for
 * that (archetype, element) pair.
 *
 * Lycanthrope → Poison (Tori, lore director, 2026-07-20 — proposal f67e3513):
 * the "Cook" pack-role answer earns Poison ("...the ones that heal and the
 * ones that poison"). Poison has NO global hint entry, so gating it globally
 * would also gate it for Mech Pilot / Android / Seraph / Human, where it is
 * currently open. Scoping the hint here keeps those four untouched.
 */
const ARCHETYPE_RARE_TAG_HINTS: Partial<
  Record<ArchetypeName, Partial<Record<ElementName, string[]>>>
> = {
  Lycanthrope: {
    Poison: ['poison'],
  },
};

/**
 * True when the player's Story Pillar answers narratively support this
 * Rare element per Bible §Element rarity gate A.
 *
 * NB: for Naturally Compatible and Compatible Through Reinterpretation
 * buckets we return true unconditionally — those don't need Gate A.
 */
export function elementIsNarrativelyEligible(
  archetype: ArchetypeName,
  element: ElementName,
  answers: StoryPillarAnswer[],
): boolean {
  const bucket = bucketFor(archetype, element);
  if (bucket === 'not_available') return false;
  if (bucket !== 'rare') return true;

  const hints =
    ARCHETYPE_RARE_TAG_HINTS[archetype]?.[element] ?? RARE_ELEMENT_TAG_HINTS[element];
  if (!hints || hints.length === 0) {
    // No mapped tags yet — err on the side of eligibility so future Bible
    // additions don't silently exclude an element. The weighted-discovery
    // gate (B) still keeps it rare.
    return true;
  }
  const answerBlob = answers.map((a) => a.answer.toLowerCase()).join(' ');
  return hints.some((hint) => answerBlob.includes(hint.toLowerCase()));
}

// ---------- Selection helpers ----------

export function buildSelection(
  archetype: ArchetypeName,
  element: ElementName,
  bond: ElementBond,
): ElementSelection {
  return {
    element,
    bond,
    compatibility: bucketFor(archetype, element),
  };
}

// Re-export for convenience so consumers don't have to import from two places.
export { ELEMENT_BONDS, ELEMENT_NAMES };
export type { ElementBond, ElementName, ElementCompatibility };
