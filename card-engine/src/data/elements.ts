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
  rare: 8,
  not_available: 0,
};

// ---------- Per-archetype compatibility (2-tier: Natural / Rare) ----------

type ArchetypeElementBuckets = {
  naturally_compatible: ElementName[];
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
  // 2-TIER: each archetype offers a curated Natural set (selectable at the forge)
  // + a Rare set (surfaced locked until the deferred narrative-eligibility gate);
  // anything not listed is unavailable. The Barbarian's six Traditions are now
  // decoupled from elements (fashion/environment only).
  // 2026-07-24 (Raheem): tightened per-archetype element limits.
  Barbarian: {
    naturally_compatible: ['Fire', 'Earth'],
    rare: ['Blood', 'Metal'],
  },
  // Moral-fork: PEACE picks Holy/Light (→ Cosmic culmination), VIOLENCE picks
  // Fire/Water/Wind/Earth (→ all-four). Cosmic is MONK-EXCLUSIVE.
  Monk: {
    naturally_compatible: ['Holy', 'Light', 'Fire', 'Water', 'Wind', 'Earth'],
    rare: ['Cosmic'],
    not_available: ['Beast'],
  },
  Beastmaster: {
    naturally_compatible: ['Earth', 'Wind', 'Water', 'Ice'],
    rare: ['Shadow', 'Spirit'],
  },
  Druid: {
    // Nature is Druid-EXCLUSIVE (the good path); Poison is the corrupted path.
    naturally_compatible: ['Nature', 'Poison'],
    rare: [],
  },
  Necromancer: {
    // Bone is Necromancer-EXCLUSIVE.
    naturally_compatible: ['Poison', 'Shadow', 'Blood', 'Bone'],
    rare: ['Void'],
  },
  Vampire: {
    // Nocturne + Sanguine are Vampire-EXCLUSIVE; Void is the Ascension-blocker rare.
    naturally_compatible: ['Blood', 'Shadow', 'Nocturne', 'Sanguine'],
    rare: ['Void'],
  },
  Lycanthrope: {
    // Lunar is Lycan-EXCLUSIVE rare (superior Moon).
    naturally_compatible: ['Moon', 'Beast', 'Blood'],
    rare: ['Lunar', 'Shadow'],
  },
  'Mech Pilot': {
    // 2026-07-24 (Raheem): pure engineered/machine power — the tech family only.
    naturally_compatible: ['Tech', 'Plasma', 'Nanite', 'Void'],
    rare: [],
  },
  Android: {
    // 2026-07-24 (Raheem): the engineered tech core; Void + Prism are the rares.
    naturally_compatible: ['Tech', 'Plasma', 'Nanite'],
    rare: ['Void', 'Prism'],
  },
  Seraph: {
    // 2026-07-24 (Raheem). Light is the radiant path; a Fallen+Light Seraph
    // transmutes Light → Infernal at the forge. Infernal is also offered as a
    // (locked) rare so a non-Light Fallen can reach it once the rare gate lands.
    naturally_compatible: ['Light', 'Shadow'],
    rare: ['Infernal', 'Holy'],
  },
  Human: {
    // Human is the no-element TECH class — elements are vestigial here (the
    // ritual offers a Craft slot instead, a deferred systems item). Kept minimal.
    naturally_compatible: ['Tech', 'Metal'],
    rare: [],
  },
};

// ---------- Public helpers ----------

export function bucketFor(
  archetype: ArchetypeName,
  element: ElementName,
): ElementCompatibility {
  const buckets = ELEMENT_COMPATIBILITY[archetype];
  if (buckets.naturally_compatible.includes(element)) return 'naturally_compatible';
  if (buckets.rare.includes(element)) return 'rare';
  return 'not_available';
}

/** Returns every element the archetype could ever access at any narrative gate. */
export function elementsAvailableToArchetype(archetype: ArchetypeName): ElementName[] {
  const buckets = ELEMENT_COMPATIBILITY[archetype];
  return [
    ...buckets.naturally_compatible,
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
  Storm: ['sudden', 'awakening', 'insight', 'confrontation', 'sky-fury'],
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
