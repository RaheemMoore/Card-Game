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
    // 2026-07-31 (Raheem): Metal REMOVED. Metal resolves as `tech` damage, and
    // tech is the machine faction's alone — a Metal Barbarian could clear a
    // machine-gated floor with no machine in the party, which is the exact
    // hole the exclusivity rule exists to close. Metal cannot simply be remapped
    // to `physical` instead: it is the Human's ONLY element, so that would
    // strip the entire tech faction's builder of tech damage.
    // 2026-07-31 (Raheem): STORM becomes the Barbarian's exclusive rare. It had
    // been held by no archetype at all, and the Barbarian had no exclusive of
    // its own — Fire, Earth and Blood are all shared, and Metal (removed above)
    // was their one distinctive option. Storm is `kinetic` damage, so it does
    // not touch the machine faction's tech exclusivity.
    naturally_compatible: ['Fire', 'Earth'],
    rare: ['Blood', 'Storm'],
  },
  // Moral-fork: PEACE picks Holy/Light (→ Cosmic culmination), VIOLENCE picks
  // Fire/Water/Wind/Earth (→ all-four). Cosmic is MONK-EXCLUSIVE.
  Monk: {
    // 2026-07-31 (Raheem): Psychic joins Cosmic as the second Monk rare. This
    // RESTORES canon rather than extending it — Bible §Monk §12 lists Psychic
    // as Monk-rare, and the 2026-07-24 tightening narrowed it out.
    //
    // Why it doesn't muddy the PEACE/VIOLENCE fork: the fork is about what the
    // discipline is turned outward ON, not a light/dark axis, and Monk's
    // identityThrough is Discipline — not holiness. Psychic sits on neither
    // prong and does not compete with the Cosmic culmination. Cosmic is the
    // self DISSOLVED outward into the starfield; Psychic is the self kept
    // whole and extended — influence without contact, discipline pointed
    // inward at thought itself. One is the end of the road, the other is a
    // road that never arrives. That is exactly why it is rare.
    //
    // Psychic resolves as `shadow` damage (elementDamageType.ts) only because
    // tech is now the machine faction's alone. It is NOT a shadow element and
    // must never be rendered as one — see elementVisualLanguage.ts, where its
    // avoid-list explicitly excludes Dream's pastels and dissolving edges.
    naturally_compatible: ['Holy', 'Light', 'Fire', 'Water', 'Wind', 'Earth'],
    rare: ['Cosmic', 'Psychic'],
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
    // 2026-07-31 (Raheem): Dream joins Void as a rare — a RESTORATION, not an
    // extension; Bible §Necromancer §12 already lists it, and the 2026-07-24
    // tightening narrowed it out. A Necromancer who raises MEMORY rather than
    // bone is a first-class reading of "alter the relationship with death"
    // (§14 checklist). It already resolved as `shadow`.
    naturally_compatible: ['Poison', 'Shadow', 'Blood', 'Bone'],
    rare: ['Void', 'Dream'],
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
    // 2026-07-25: 'Tech' removed as an element (stat only); Plasma/Nanite/Void carry it.
    // 2026-07-31 (Raheem): Nanite moved to Android alone, leaving PLASMA as the
    // Mech Pilot's exclusive — a war machine's gun. Every archetype should own
    // at least one element nobody else can reach; Mech Pilot had none, and was
    // element-for-element indistinguishable from Android.
    //
    // Kept naturally_compatible rather than rare, deliberately: Plasma is now
    // this archetype's ONLY non-shared element, and an archetype whose sole
    // element is rare-gated has nothing to forge with.
    //
    // 2026-07-31 (Raheem): Void demoted from natural to rare — see the Void
    // note at the bottom of this file. Plasma alone is the Mech Pilot's forge
    // path, which is the point: this archetype IS its gun.
    naturally_compatible: ['Plasma'],
    rare: ['Void'],
  },
  Android: {
    // 2026-07-24 (Raheem): the engineered tech core; Void + Prism are the rares.
    // 2026-07-25: 'Tech' removed as an element (stat only); Plasma/Nanite carry it.
    // 2026-07-31 (Raheem): NANITE is the Android's alone — a body that is itself
    // made of machines. Plasma went to Mech Pilot in the same trade. Android now
    // owns two exclusives: Nanite (natural) and Prism (rare).
    // 2026-07-31 (Raheem): Void demoted from natural to rare, as for Mech Pilot.
    naturally_compatible: ['Nanite'],
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
    // 2026-07-25: 'Tech' removed as an element (stat only); Human keeps Metal.
    naturally_compatible: ['Metal'],
    rare: [],
  },
};

/**
 * VOID — the one element that is rare for EVERYONE (2026-07-31, Raheem).
 *
 * Every other element is either shared and ordinary, or exclusive to a single
 * archetype. Void is neither: four archetypes can reach it — Necromancer,
 * Vampire, Mech Pilot, Android — and **none of them can reach it naturally.**
 * It is rare-gated in all four. That is its own category, and it is deliberate.
 *
 * Raheem's design intent, recorded here because the mechanics do not yet carry
 * it: *"when Void gets into the game it's going to be quite advantageous — a
 * ridiculous element that just cuts through the other elements, since that
 * element in existence kind of absorbs all or avoids all. So we've got to make
 * it hard to get and make it reserved, but it needs to be very effective."*
 *
 * So the rarity is not flavour — it is the PRICE of an effect that has not been
 * built yet. Void currently resolves as ordinary `umbral` damage like eight
 * other elements, which is precisely what it must not stay.
 *
 * OPEN, and needs Raheem's ruling before anyone builds it: "cuts through the
 * other elements" maps almost exactly onto the existing `true` damage type,
 * which `resolveDamage` exempts from BOTH resistance and mitigation. That may
 * be the right answer or may be too much — `true` currently bypasses armour
 * entirely, so a Void card would ignore Def as well as elemental resistance.
 * Do not wire it up on the strength of this comment.
 */

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
