/**
 * Character Generation Bible — runtime types.
 *
 * These types encode the Bible's canonical concepts as TypeScript so the
 * generation pipeline, UI, and Codex all read from one shape.
 *
 * Source of truth: /Character_Generation_Bible_Canonical_v1.md
 * Consult the Lore & Fantasy Director agent (.claude/agents/lore-fantasy-director.md)
 * for interpretive questions.
 */

import type { ArchetypeName } from './card';

// ---------- Elements & bonds ----------

/**
 * Master element list per Bible — twenty-six elements. Every element appears
 * across the eleven archetypes' Compatibility bucketing (§Step 12), gated per
 * archetype into Naturally Compatible, Compatible Through Reinterpretation,
 * Rare, or Not Available.
 */
export const ELEMENT_NAMES = [
  // 2026-07-23 element-restructure: Stone merged into Earth, Lightning into
  // Storm, Ash removed (a byproduct of Fire, not its own element).
  'Fire', 'Water', 'Earth', 'Wind', 'Ice', 'Storm',
  'Nature', 'Beast', 'Blood', 'Poison', 'Metal', 'Spirit', 'Shadow',
  'Light', 'Holy', 'Void', 'Time', 'Cosmic', 'Tech',
  'Psychic', 'Moon', 'Dream',
  // Necromancer-exclusive (2026-07-22). A normal pickable element, but only
  // ever in the Necromancer's compatibility set — the physical architecture of
  // the dead (bone/skull/marrow), distinct from Ash (grief), Spirit (souls),
  // Shadow (dark). See data/elementVisualLanguage.ts BONE.
  'Bone',
  // Vampire-exclusive (2026-07-22). Dominion of eternal night — blood-moon,
  // devoured sun, wheeling bats, crimson-into-black. Distinct from Shadow
  // (fear-dark) and Moon (silver cycle). See elementVisualLanguage.ts NOCTURNE.
  'Nocturne',
  // Lycanthrope-exclusive rare (2026-07-22). The SUPERIOR version of Moon — the
  // Moon Goddess's divine blessing: BLAZING silver-fire + full-moon corona +
  // lunar runes, NOT Moon's calm silver glow. See elementVisualLanguage.ts LUNAR.
  'Lunar',
  // Tech-archetype rare family (2026-07-22). Offered to Mech Pilot, Android, and
  // any tech archetype as ascension rares — engineered/machine power only.
  // (Void is the 3rd tech rare, already above.) See elementVisualLanguage.ts.
  'Plasma', 'Nanite',
  // Android-exclusive (2026-07-22). The synthetic soul as refracted spectrum
  // light + volumetric HOLOGRAMS — iridescent rainbow, prismatic facets, holo
  // constructs. Distinct from Light (holy gold) + Tech (circuit-cyan). See PRISM.
  'Prism',
  // Fallen-Seraph-exclusive (P4 Seraph corruption arc). Never appears in
  // any archetype's compatibility buckets — it is only ever assigned by
  // alignment transmutation at tier-up (Light → Infernal when the path
  // resolves to 'fallen'). See data/narrativeAxes/seraphAlignment.ts.
  'Infernal',
] as const;
export type ElementName = typeof ELEMENT_NAMES[number];

/** Bible §Global Element Pillar approved bond pool. */
export const ELEMENT_BONDS = [
  'It is my greatest ally.',
  'It is my greatest burden.',
  'It is my inheritance.',
  'It is my curse.',
  'It is my purpose.',
  'It is my prison.',
  'It is my teacher.',
  'It is my weapon.',
  'It is part of who I am.',
  'I still do not understand it.',
] as const;
export type ElementBond = typeof ELEMENT_BONDS[number];

/**
 * Bible §Element rarity. Compatibility is per-archetype. Rarity affects
 * discovery frequency, NEVER power. See elementCompatibilityBucket() in
 * data/elements.ts.
 */
export type ElementCompatibility =
  | 'naturally_compatible'
  | 'compatible_through_reinterpretation'
  | 'rare'
  | 'not_available';

/** Player's final element choice, plus their bond with it. */
export interface ElementSelection {
  element: ElementName;
  bond: ElementBond;
  /**
   * Bucket at the time of selection — persisted so downstream systems can
   * reference how the element was gated (a Rare pick reads differently in
   * lore than a Naturally Compatible one).
   */
  compatibility: ElementCompatibility;
}

// ---------- Story Pillars ----------

/**
 * Bible §Guided Narrative Chains. Each archetype defines its own pillars —
 * see data/storyPillars.ts. A pillar may have a follow-up (indexed via
 * `followUp: true` and referenced by parentPillarId at answer time).
 */
export interface StoryPillarQuestion {
  /** Stable machine id, e.g. "barbarian_pillar_1", "barbarian_pillar_1_followup". */
  id: string;
  /** Human question exactly as the Bible presents it. */
  prompt: string;
  /** Pillar this belongs to (1, 2, 3, or optional 4 per archetype). */
  pillarIndex: number;
  /** True when this is a nested follow-up to another question. */
  followUp?: boolean;
  /** For follow-ups, the parent question id. */
  parentId?: string;
}

/**
 * A single answer the player selected. Answers are immutable generation
 * facts per Bible §Guided Narrative Chains — Claude may connect and
 * interpret them but must not ignore, replace, soften, or contradict them.
 *
 * The wizard does NOT accept free-form input. Players who dislike the
 * shown options refresh (unlimited during initial implementation) until a
 * pool answer fits.
 */
export interface StoryPillarAnswer {
  questionId: string;
  /** The chosen option id (StoryPillarOption.id). */
  optionId: string;
  /** The chosen option's text at selection time — snapshotted so future edits to the pool don't rewrite existing cards. */
  answer: string;
}

/**
 * Image-first character generation (Stage 3, 2026-07-22). A structured visual
 * directive a StoryPillarOption may carry ALONGSIDE its lore `text`/`tags`. The
 * player never sees which channel a choice feeds — the ritual reads as one
 * story. The deterministic image roll layer (services/imageEngine/identityRoller)
 * reads these tokens VERBATIM; any dimension a choice leaves unset is auto-rolled.
 * Player-facing pins: build / age / mark / species. Auto-rolled (a choice may
 * nudge): bearing / elementExpression. `sex` is normally system-rolled to the
 * 60/40 humanoid/non-human + 50/50 M/F distribution and only rarely pinned.
 * All fields optional. Ids reference BODY_CLASSES / BESPOKE_BODIES / FANTASY_MARKS.
 */
export interface ImageDirective {
  /** BODY_CLASSES id — mass/frame/age vocabulary (e.g. 'stout','towering','ancient'). */
  build?: string;
  /** Age-band pin. */
  age?: string;
  /** FANTASY_MARKS id — fantasy prosthetic/condition (never 'wheelchair'/'cane'). */
  mark?: string;
  /** Bearing/posture nudge (auto-rolled unless pinned). */
  bearing?: string;
  /** Element-expression intensity/placement ONLY — never color (color lives in elementVisualLanguage). */
  elementExpression?: string;
  /** 'humanoid' or a BESPOKE_BODIES form id. Normally distribution-rolled; a choice may pin. */
  species?: string;
  /** Weapon/tool pin — a WEAPON_POOLS id for the archetype (see archetypeWeapons.ts). */
  weapon?: string;
  /** Whether the character appears alone or leading a retinue (archetypes with a companion pool only). */
  companionPresence?: 'solitary' | 'retinue';
  /** Specific retinue pin — a COMPANION_POOLS id (implies 'retinue'; see archetypeCompanions.ts). */
  companion?: string;
  /** Authored concrete visual objects for the portrait (image-first; replaces Claude motifs). */
  motifs?: string[];
  /** Pose hint. */
  poseHint?: string;
  /** Environment tag. */
  environmentTag?: string;
  /** Rare explicit sex pin; otherwise system-rolled to the presentation distribution. */
  sex?: string;
}

/**
 * A pre-authored option shown in the wizard. Options are seed material — the
 * player may accept, refresh, lock, or write their own.
 */
export interface StoryPillarOption {
  /** Stable id so we can tell when the same option comes back on refresh. */
  id: string;
  questionId: string;
  text: string;
  /**
   * Optional tags used by the element eligibility check and by Claude to
   * classify tension. e.g. ["protective", "clan", "inherited-burden"].
   */
  tags?: string[];
  /**
   * P5 Seraph corruption arc — contribution of this option to the
   * archetype's narrative-axis alignment score (+1 Good, -1 Fallen,
   * 0 Balanced-leaning). Undefined = untagged (counts as 0 and does not
   * qualify a card for axis computation). See
   * services/narrativeAxisService.ts.
   */
  alignmentWeight?: number;
  /**
   * Image-first (Stage 3) — optional visual directive this choice pins for the
   * portrait. Read ONLY by the deterministic image roll layer, never by lore.
   * The player never sees that a choice carries this. See ImageDirective.
   */
  image?: ImageDirective;
}

/** Full set of a card's Story Pillar answers, keyed by pillar index. */
export interface StoryPillarAnswers {
  /** All answered questions, ordered by pillarIndex then followUp. */
  answers: StoryPillarAnswer[];
}

// ---------- Hidden Fate ----------

/**
 * Bible §Hidden Fate. Claude infers the supporting details the player did
 * not select. These must reinforce the player's story rather than compete
 * with it. Persisted so future tier-ups honor the same body, age, scars, and
 * environment.
 *
 * Body/age/disability/condition on this object are the anchors that rank
 * continuity preserves — Bible §Rank continuity forbids automatic
 * younger/thinner/muscular/healthier changes across ranks.
 */
export interface HiddenFate {
  /** Free-form narrative fields — Claude fills them per Bible §Hidden Fate. */
  age: string;
  sex: string;
  bodyType: string;
  skinTone: string;
  facialStructure: string;
  hair: string;
  disabilityOrCondition: string;
  posture: string;
  scars: string;
  weather: string;
  lighting: string;
  clothingConstruction: string;
  minorAccessories: string;
  environmentDetails: string;
  /**
   * Image-Engine locked selections (Archetype_Weapon_and_Companion_Reference +
   * Archetype_Environment_and_Background_Reference). Rolled ONCE at Foundation
   * by services/portrait/characterSheetFactory.resolveLockedSelections and
   * LOCKED across ranks (weaponId via LOCKED_HIDDEN_FATE_FIELDS; companion +
   * environment preserved explicitly in preserveIdentityAcrossRanks). Optional
   * so legacy cards (undefined) keep working — the factory fills any absent id
   * on the next forge/tier-up. Persisted inside the card's `data jsonb`; no SQL
   * migration. `companionPresent` is a boolean (a 50/50 per-card roll) so it is
   * carried explicitly, never via the string-truthy lock loop.
   */
  weaponId?: string;
  companionId?: string;
  companionPresent?: boolean;
  environmentId?: string;
  /**
   * Which fashion variant of the archetype's guide this card resolved to
   * (index into ARCHETYPE_FASHION_GUIDES[archetype].variants). GENERIC — not
   * archetype-specific. For archetypes whose environment families are authored
   * 1:1 parallel to their fashion variants (Barbarian's six Traditions), this
   * couples the background to the tradition so a Glacier-Warden never spawns in
   * a jungle. Set once at Foundation from the fashion cursor; undefined on
   * legacy/tier-up cards, where the environment falls back to a random roll.
   */
  fashionVariantIndex?: number;
  /**
   * A locked ~20% roll (Raheem 2026-07-21) deciding whether this character MAY
   * render bare-chested at the Ascendant peak. Only ever consulted for
   * Ascendant + male; rolled once at Foundation and preserved across ranks so a
   * regen does not flip the look. Boolean, so carried explicitly (not via the
   * string-truthy lock loop).
   */
  bareChestRoll?: boolean;
  /**
   * M4.6 — Body & Skin Representation Bible structured decomposition.
   * Optional; new cards fill both these and the freeform bodyType/skinTone
   * strings above. Existing cards keep working (fields are undefined and
   * the pipeline falls back to bodyType/skinTone). Locked across ranks
   * via preserveIdentityAcrossRanks alongside bodyType/skinTone.
   */
  bodyDimensions?: {
    /** Bible §4.1 — very short / short / average / tall / very tall */
    height: string;
    /** Bible §4.2 — slight / narrow / compact / medium / broad / heavy / long-limbed */
    frame: string;
    /** Bible §4.3 — slim / soft / thick / stocky / broad / heavyset / fat / etc. */
    mass: string;
    /** Bible §4.4 — low / modest / functional / thick / highly-defined */
    muscleVisibility: string;
    /** Bible §4.6 — carriage. Distinct from the legacy top-level posture
     *  field; new cards fill both to keep the SAME PERSON RULE identity
     *  block able to consume either. */
    posture: string;
  };
  skinPresentation?: {
    /** Bible §8.1 — very fair through very deep */
    depth: string;
    /** Bible §8.2 — cool / neutral / warm / olive / golden / red-brown / bronze / ashy / umber */
    undertone: string;
    /** Bible §8.3 — smooth / weathered / freckled / scar-marked / etc. */
    texture: string;
    /** Bible §8.4 — how light responds. Critical for preserving detail on
     *  darker skin per Bible §9. */
    lightingResponse: string;
  };
  /**
   * M4.7 — Fantasy Hair, Fashion, and Clothing Bible structured
   * decomposition. Optional; parallel to freeform `hair` (top-level
   * string) which stays required. Preserved verbatim across ranks by
   * preserveIdentityAcrossRanks alongside the other identity anchors.
   * Bible §Preservation Rules.
   */
  hairDetail?: {
    /** Bible §4 — texture bucket + descriptor (e.g. "dense coils"). */
    texture: string;
    /** short / shoulder-length / long / very long / clipped */
    length: string;
    /** Specific arrangement — the actual hairstyle. */
    style: string;
    /** Bible §5 — from the appropriate color bucket. */
    color: string;
    /** Bible §6 — wind-tangled / polished / battlefield-cut / etc. */
    condition: string;
    /** Bible §8 — optional; ONE or TWO intentional pieces. */
    adornment: string;
    /** Bible §7 — clean-shaven / stubble / full beard / etc. */
    facialHair: string;
    /** Bible §9 — how hair sits under hood/helmet/veil/halo. "none" if bare. */
    headwearInteraction: string;
  };
  /**
   * M4.7 — Fashion composition per Bible §10 layered system. Rank-scaled
   * per Bible §17: Foundation cards fill essentials (primaryGarment,
   * waist, footwear, signatureAccessory); Forged adds structural + armor +
   * outerLayer + rankSignal; Ascendant fills all 12 fields.
   */
  fashion?: {
    /** Bible §16 — the costume identity. One of: heroic / villainous /
     *  aristocratic / scholarly / practical / battlefield / ceremonial /
     *  industrial. M5.4 removed the element-flavored roles (infernal,
     *  celestial, corrupted) — element palette lives in the Element
     *  Visual Language block, not in the fashion role. */
    role: string;
    /** Bible §11 — the underlayer. Optional at Foundation. */
    baseLayer?: string;
    /** The main outfit piece. Always present. */
    primaryGarment: string;
    /** Reinforcement between garment + armor. Forged+ */
    structuralLayer?: string;
    /** Bible §13 — armor library. Foundation = limited/absent. */
    armor?: string;
    /** The waist system — sash / belt / cord / harness. */
    waist: string;
    /** Cape / mantle / travel coat with construction detail. */
    outerLayer?: string;
    /** Specific footwear. */
    footwear: string;
    /** Gauntlets / wrapped forearms / ceremonial gloves. Ascendant primarily. */
    armAndHandTreatment?: string;
    /** Bible §12 — array of 2-4 specific textiles. */
    materials: readonly string[];
    /** Bible §15 — specific wear state. */
    wear: string;
    /** ONE meaningful accessory tied to the character's story. */
    signatureAccessory: string;
    /** Bible §17 — how the character shows their standing. Forged+ */
    rankSignal?: string;
    /** Bible §17 Ascendant — how magic/tech is woven INTO the outfit. Ascendant only. */
    magicalOrTechnologicalIntegration?: string;
  };
}

// ---------- Prestige roles ----------

/**
 * Bible §Prestige roles — earned through narrative, never player-selected.
 * The card's prestige is null unless prestigeInference finds the completed
 * narrative supports one of the archetype's approved titles.
 */
export interface PrestigeRole {
  /** Approved title, e.g. "Alpha", "Grandmaster", "Archdruid", "Clan Chief", "Blood Regent". */
  title: string;
  /** One-sentence justification citing the Story Pillar answers that support it. */
  justification: string;
  /** Rank at which the prestige was first inferred — typically Ascendant. */
  inferredAtRank: 'Foundation' | 'Forged' | 'Ascendant';
}

// ---------- Structured Bible chapter ----------

/**
 * One archetype's fourteen Bible sections, encoded for runtime.
 * See data/archetypeBible/<archetype>.ts.
 */
export interface ArchetypeBibleChapter {
  archetype: ArchetypeName;
  /** Bible §Archetype Identity Matrix — one-sentence identity anchor. */
  identityThrough: string;
  /** Bible §Archetype Identity Matrix — core fantasy in one sentence. */
  coreFantasy: string;

  // §1 Selection-Screen Lore
  selectionScreen: {
    /** Short label per Bible §Step 1 (e.g. "Warriors of the old clans who turn hardship into strength."). */
    tagline: string;
    /** Body prose. */
    body: string;
    /** Pull-quote used on the tile hover / preview. */
    pullQuote: string;
  };

  // §2 Core Fantasy Promise
  coreFantasyPromise: {
    /** Single-sentence promise. */
    promise: string;
    /** Bible-approved emotional pillars, e.g. ["Resilience", "Belonging", "Burden", "Conviction", "Legacy"]. */
    emotionalPillars: string[];
    /** Optional evocative closer from Bible §2. */
    closer?: string;
  };

  // §3 Origins
  origins: string;

  // §4 Culture and Daily Life
  cultureAndDailyLife: string;

  // §5 Beliefs, Virtues, Taboos, Fears
  beliefs: {
    virtues: string[];
    taboos: string[];
    fears: string[];
    /** Any Bible §5 evocative closer. */
    closer?: string;
  };

  // §6 Internal Diversity
  internalDiversity: {
    /** Named traditions, orders, houses, packs, etc. */
    groups: string[];
    /** Bible §6 closer if present. */
    closer?: string;
  };

  // §7 Visual DNA
  visualDNA: {
    recognitionCues: string;
    avoid: string;
    closer?: string;
  };

  // §8 Symbol and Material Language
  symbolAndMaterial: {
    materials: string;
    symbols: string;
    closer?: string;
  };

  // §9 Rank Evolution
  rankEvolution: {
    Foundation: string;
    Forged: string;
    Ascendant: string;
    /** Bible §9 continuity note — what progression must NOT do. */
    continuityNote?: string;
  };

  // §11 Story Pillar Compatibility framework already lives in storyPillars.ts.
  // §12 Element compatibility already lives in elements.ts.

  // §13 Future Design Space
  futureDesignSpace: string;

  // §14 Claude Generation Guidance and Recognition Checklist
  claudeGuidance: {
    generationPriorities: string[];
    avoid: string[];
    recognitionChecklist: string[];
  };

  // Approved prestige roles for this archetype (see prestigeInference).
  approvedPrestigeRoles: string[];
}
