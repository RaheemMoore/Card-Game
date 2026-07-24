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
    // Sanguine (crystallized blood) — art-director wow-tune + Leonardo-validate before ship.
    { id: 'crystal_sovereign', name: 'Crystal Sovereign', pattern: 'elemental', gate: 'Sanguine',
      concept: 'a regal vampire lord whose body is crystallizing into faceted ruby-and-garnet blood-crystal — jeweled crimson gem-armor, a dark-red crystal crown, sharp garnet spurs, refracted red light, fully robed and commanding' },
    { id: 'garnet_reliquary', name: 'Garnet Reliquary', pattern: 'elemental', gate: 'Sanguine',
      concept: 'a vampire become a walking reliquary of blood-crystal — the body a lattice of dark-red faceted crystal beneath high-collared regalia, cradling a crystallized blood-relic, crimson facets refracting, upright and austere' },
    { id: 'hollow_sovereign', name: 'Hollow Sovereign', pattern: 'ascension', gate: 'Void', ascensionOnly: true, isNonHuman: true,
      concept: 'a crown and red-lined cloak worn by NOTHING — a body-shaped absence of starless black, reality fraying and tearing at the silhouette, two cold pinpricks of light for eyes; regal oblivion' },
    { id: 'star_eater', name: 'Star-Eater', pattern: 'ascension', gate: 'Void', ascensionOnly: true, isNonHuman: true,
      concept: 'a collapsing event-horizon for a torso, light bending and pouring inward, the blood-moon swallowed into a black-hole maw in the chest, constellations spiraling down the throat; drinks stars, not blood' },
  ],

  // ---- Necromancer — FORM blocker (which undead the soul is sacrificed into).
  // Rank-gated: the character is HUMAN at Foundation, the undead form manifests at
  // Forged+. So isNonHuman stays FALSE (the identity roll keeps a person for lore +
  // Foundation; buildNecromancerFormScene renders the undead form at Forged+).
  // ORDER MATCHES NECROMANCER_FORMS in portraitAssembler.ts. ----
  Necromancer: [
    { id: 'death_knight', name: 'Death Knight', pattern: 'form',
      concept: 'a skeletal death knight of fused bone, soul-light eye-sockets, a bone blade' },
    { id: 'skeleton_mage', name: 'Skeleton Mage', pattern: 'form',
      concept: 'a skeleton mage of bare bone, exposed ribs, tattered robes on the bones' },
    { id: 'shadow_wraith', name: 'Shadow Wraith', pattern: 'form',
      concept: 'an incorporeal shadow wraith of living darkness, a skull-like void-face trailing into smoke' },
    { id: 'lich_king', name: 'Lich-King', pattern: 'form',
      concept: 'a crowned skeleton lich-king in tattered royal robes, a bone scepter' },
  ],

  // ---- Lycanthrope — ROLE blocker (the pack role that stays legible even in
  // full-wolf form). The wolf-ascension itself is fixed (rank-driven); the role is
  // the overlay. isNonHuman FALSE — a rolled human the wolf is applied over.
  // ORDER MATCHES LYCAN_PACK_ROLES in portraitAssembler.ts. ----
  Lycanthrope: [
    { id: 'hunter', name: 'Hunter', pattern: 'role',
      concept: 'a hunter of the pack — a bone-tipped hunting spear, trophy-tokens on a reinforced harness' },
    { id: 'moonkeeper', name: 'Moonkeeper', pattern: 'role',
      concept: 'a moonkeeper healer — a herb satchel and a moon-silver charm, calm and tending' },
    { id: 'scout', name: 'Scout', pattern: 'role',
      concept: 'a scout of the boundary — light and swift, a curved signal-horn, alert and watchful' },
    { id: 'lorekeeper', name: 'Lorekeeper', pattern: 'role',
      concept: 'a lorekeeper — a pack-knot tapestry-cloak and a bone-etched story-staff, ceremonial and wise' },
    { id: 'guardian', name: 'Guardian', pattern: 'role',
      concept: 'a guardian — a heavy reinforced war-harness and a boundary-warden’s round shield, stalwart' },
    { id: 'warden', name: 'Warden', pattern: 'role',
      concept: 'a warden of the boundary — twin territory-stakes and glowing border-runes, holding the tree-line' },
  ],

  // ---- Android — DIVISION blocker (the PURPOSE it was built for; the Ascendant
  // PATH fork is a separate tier-up choice). isNonHuman FALSE at forge time (a
  // humanoid chrysalis reflecting the rolled person). ORDER MATCHES
  // ANDROID_PURPOSES in portraitAssembler.ts. ----
  Android: [
    { id: 'guardian_model', name: 'Guardian-model', pattern: 'division',
      concept: 'built to protect — heavy warding shield-plates, a sentinel bearing, a purpose-glyph' },
    { id: 'explorer_model', name: 'Explorer-model', pattern: 'division',
      concept: 'built to survey — survey-sensor masts, long-range optics, a cartographer’s array' },
    { id: 'healer_model', name: 'Healer-model', pattern: 'division',
      concept: 'built to mend — precise medical manipulators, remedy-modules, a caduceus mark' },
    { id: 'diplomat_model', name: 'Diplomat-model', pattern: 'division',
      concept: 'built to speak — an elegant envoy frame, an expressive face-plate, translator-arrays' },
    { id: 'artisan_model', name: 'Artisan-model', pattern: 'division',
      concept: 'built to make — fine crafting-manipulators, tool-fingers, a maker’s rig' },
    { id: 'laborer_model', name: 'Laborer-model', pattern: 'division',
      concept: 'built to haul — a heavy industrial frame, load-bearing limbs, work-worn plating' },
    { id: 'caretaker_model', name: 'Caretaker-model', pattern: 'division',
      concept: 'built to tend — a gentle frame with many soft hands and a tending kit' },
    { id: 'weapon_model', name: 'Weapon-model', pattern: 'division',
      concept: 'built to fight — an armored combat frame, integrated armaments, targeting-optics' },
  ],

  // ---- Druid — FORM blocker (the wildshape). Element-conditional: the GOOD set
  // (ungated) shows unless the player picked Poison, which gates the CORRUPTED
  // set (corruption is decided by the element pick, not asked twice). isNonHuman
  // FALSE — the rolled person stays legible under the plant-matter (Bible
  // continuity). ORDER MATCHES DRUID_GOOD_FORMS / DRUID_CORRUPTED_FORMS. ----
  Druid: [
    { id: 'tree_being', name: 'Tree-Being', pattern: 'form',
      concept: 'a towering tree-being of gnarled oak and hanging moss, branch-limbs, a canopy crown' },
    { id: 'wildbloom', name: 'Wildbloom', pattern: 'form',
      concept: 'a flowering wildbloom being, blossoms erupting from the body, antlers of flowering branch' },
    { id: 'moss_lichen', name: 'Moss-Lichen', pattern: 'form',
      concept: 'a moss-and-lichen being, deep soft moss and damp lichen over a verdant hooded shape' },
    { id: 'bramble_thorn', name: 'Bramble-Thorn', pattern: 'form',
      concept: 'a bramble-thorn colossus, woody thorn-vines and briar as living armor, a crown of thorns' },
    { id: 'water_plant', name: 'Water-Plant', pattern: 'form',
      concept: 'a water-plant being, dripping kelp-fronds, river-reeds and lily-pads for hair and limbs' },
    { id: 'desert_succulent', name: 'Desert-Succulent', pattern: 'form',
      concept: 'a desert-succulent being, thick spined cactus-flesh, waxy leaves and desert-bloom flowers' },
    { id: 'bark_bear', name: 'Bark-Bear', pattern: 'form',
      concept: 'a great bear grown of bark, bramble and thorn, moss across its back, blossoms in its pelt' },
    { id: 'cordyceps', name: 'Cordyceps', pattern: 'form', gate: 'Poison',
      concept: 'a cordyceps-corrupted being, parasitic-fungus stalks erupting, the body hollowed and puppeted' },
    { id: 'carrion_bloom', name: 'Carrion-Bloom', pattern: 'form', gate: 'Poison',
      concept: 'a carrion-bloom blight being, rotting corpse-flowers, blighted foliage, oozing rot' },
    { id: 'bloodmaw', name: 'Bloodmaw', pattern: 'form', gate: 'Poison',
      concept: 'a carnivorous plant-being, venus-flytrap maws and pitcher pods, blood-gorged and dripping' },
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
