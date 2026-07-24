import type { ArchetypeName } from '../../types/card';

/**
 * FORM FAMILIES (2026-07-22) — the per-archetype special-form registry.
 *
 * This is where the archetype "forms" we design in curation become REAL code
 * instead of plan prose. It supersedes the single-entry `ARCHETYPE_NON_HUMAN_FORMS`
 * for any archetype listed here: each form is a distinct rollable/pinnable visual
 * identity (persisted as `hiddenFate.speciesForm`), gated by an evolution pattern.
 *
 * STATUS: additive + INERT. Nothing renders from this yet — it's wired into the
 * ritual form-question + the image roller during the Stage-3 implementation batch.
 * The `concept` strings are FIRST DRAFTS; per the WOW GATE they get wow-tuned by
 * art-prompt-director and validated on Leonardo before ship.
 *
 * Evolution patterns (the "Blocker" formulas, see the plan):
 *   elemental — the element pick gates the form set
 *   moral     — a Good/Evil (or pure/corrupted) pick gates the set
 *   form      — Humanoid vs Non-Human pick gates the set
 *   division  — the pilot/branch pick gates the set
 *   role      — a social-role pick drives the visual (Lycan pack-roles)
 *   moon      — Lycan moon-phase modifies the transformation stage
 *   ascension — unlocked only at Ascendant (a final-tier fork/trade)
 */
export type EvolutionPattern =
  | 'elemental'
  | 'moral'
  | 'form'
  | 'division'
  | 'role'
  | 'moon'
  | 'ascension';

export interface ArchetypeForm {
  /** Stable id — persisted as speciesForm, locked across ranks. */
  id: string;
  /** Display name. */
  name: string;
  /** Which Blocker gates this form. */
  pattern: EvolutionPattern;
  /** The gate value that unlocks it: an element id / 'corrupted' / a division id / a moon phase / etc. */
  gate?: string;
  /** true = only reachable at Ascendant (ascension fork/trade). */
  ascensionOnly?: boolean;
  /**
   * true = the form abandons the humanoid body plan (nosferatu, mist-swarm,
   * star-eater). The identity roller reads this — NOT the id string — to decide
   * the presentation path: non-human forms read as `entity` (no rolled sex /
   * humanoid build), while "count" forms (isNonHuman:false) stay a rolled
   * male/female person wearing the form. Defaults to false when absent.
   */
  isNonHuman?: boolean;
  /**
   * Short flavor string for the SELECTION UI only (the visual-pillar form
   * question). NOT the render source — the portrait prompt comes from the
   * assembler's validated per-rank strings (VAMPIRE_FORM_PAIRS), keyed by id.
   */
  concept: string;
}

export const FORM_FAMILIES: Partial<Record<ArchetypeName, readonly ArchetypeForm[]>> = {
  // ---- Vampire — ELEMENTAL BLOCKER (element gates the pair) + ASCENSION (Void). ----
  Vampire: [
    { id: 'blood_sovereign', name: 'Blood-Sovereign', pattern: 'elemental', gate: 'Blood',
      concept: 'a regal winged bat-lord, grand leathery wings spread, crimson power radiating from within, mist and bats swirling in attendance, commanding and upright' },
    { id: 'crimson_knight', name: 'Crimson Knight', pattern: 'elemental', gate: 'Blood',
      concept: 'an armored blood-warlord in blood-forged plate beaded with wet red, a crusader turned, a blade wreathed in its own crimson aura' },
    { id: 'nosferatu', name: 'Nosferatu', pattern: 'elemental', gate: 'Shadow', isNonHuman: true,
      concept: 'a gaunt plague-horror — bald, hollow-eyed, taloned fingers, rat-fangs, plague-shadow clinging, ancient and wrong; the monster, not the count' },
    { id: 'mist_swarm', name: 'Mist-Swarm', pattern: 'elemental', gate: 'Shadow', isNonHuman: true,
      concept: 'barely a body — a storm of bats and crimson vapor coalescing into a half-formed face and a reaching hand, dissolving at the edges' },
    { id: 'gothic_sovereign', name: 'Gothic Sovereign', pattern: 'elemental', gate: 'Nocturne',
      concept: 'the Dracula/Lestat count — high-collared crimson-lined cloak, immaculate black finery, pale aristocratic menace, one fang at a knowing smile, candlelit ballroom behind' },
    { id: 'court_decadent', name: 'Court-Decadent', pattern: 'elemental', gate: 'Nocturne',
      concept: 'a hypnotic ballroom aristocrat in opulent high-collared brocade and layered finery, a goblet of blood-wine, rose-and-rot grandeur, commanding not exposed' },
    { id: 'hollow_sovereign', name: 'Hollow Sovereign', pattern: 'ascension', gate: 'Void', ascensionOnly: true, isNonHuman: true,
      concept: 'a crown and red-lined cloak worn by NOTHING — a body-shaped absence of starless black, reality fraying and tearing at the silhouette, two cold pinpricks of light for eyes; regal oblivion' },
    { id: 'star_eater', name: 'Star-Eater', pattern: 'ascension', gate: 'Void', ascensionOnly: true, isNonHuman: true,
      concept: 'a collapsing event-horizon for a torso, light bending and pouring inward, the blood-moon swallowed into a black-hole maw in the chest, constellations spiraling down the throat; drinks stars, not blood' },
  ],
};

/** All forms an archetype can become (empty if it uses the legacy single form). */
export function formsFor(archetype: ArchetypeName): readonly ArchetypeForm[] {
  return FORM_FAMILIES[archetype] ?? [];
}

/** Forms unlocked by a given gate value (element id / moral / division / …). */
export function formsForGate(archetype: ArchetypeName, gate: string): readonly ArchetypeForm[] {
  return formsFor(archetype).filter((f) => f.gate === gate);
}

/** Look up a single form by its id (undefined for 'humanoid' / unknown ids). */
export function formById(archetype: ArchetypeName, id: string | undefined): ArchetypeForm | undefined {
  if (!id) return undefined;
  return formsFor(archetype).find((f) => f.id === id);
}

/** True when the pinned/rolled species id names a form that abandons the
 *  humanoid body plan. False for 'humanoid', for "count" forms, and for ids
 *  that are not in this archetype's family. */
export function formIsNonHuman(archetype: ArchetypeName, id: string | undefined): boolean {
  return formById(archetype, id)?.isNonHuman === true;
}
