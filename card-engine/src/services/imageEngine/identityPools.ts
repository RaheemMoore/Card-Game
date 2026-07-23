/**
 * Identity pools — the controlled vocabulary the deterministic identity roller
 * (image-first, Stage 3, 2026-07-22) draws from. Replaces the archetype-blind,
 * hardship-framed `DIVERSITY_AXES` with per-archetype, Leonardo-friendly pools.
 *
 * Dimensions are orthogonal (matching `ImageDirective`):
 *   build   → BODY_CLASSES  (mass/frame only — NOT age)
 *   age     → AGE_BANDS
 *   species → 'humanoid' | a BESPOKE_BODIES form id
 *   mark    → FANTASY_MARKS (fantasy prosthetic/condition — never wheelchair/cane)
 *
 * ADDITIVE + INERT at introduction — nothing consumes these until identityRoller
 * (S3.3) and the pipeline flip (S3.5) land. Language principles (art-prompt-director
 * 2026-07-22): name the visual not the deficit; additive/heroic; concrete Leonardo
 * nouns; no pathology/morality words; sex decoupled from body/age.
 */
import type { ArchetypeName } from '../../types/card';
import { ARCHETYPE_NON_HUMAN_FORMS } from './imageConstants';

// ---------- Build (mass + frame only) ----------

export type BodyClassId =
  | 'average'
  | 'stout'
  | 'broad'
  | 'dense'
  | 'chubby'
  | 'towering'
  | 'lean'
  | 'hollowed'
  | 'willowy'
  | 'heroic'
  | 'regal'
  | 'scrawny'
  | 'sly';

export interface BodyClass {
  id: BodyClassId;
  /** Fantasy-friendly label (UI / debug). */
  label: string;
  /** Mass distribution word(s). */
  mass: string;
  /** Frame word(s). */
  frame: string;
  /** Leonardo-ready descriptor clause. */
  leoDescription: string;
}

export const BODY_CLASSES: Record<BodyClassId, BodyClass> = {
  average: { id: 'average', label: 'Ordinary', mass: 'medium', frame: 'medium frame', leoDescription: 'average height, medium frame, ordinary capable build' },
  stout: { id: 'stout', label: 'Stout', mass: 'stocky', frame: 'compact frame', leoDescription: 'short and stout, wide and grounded, low center of gravity, built like a root that will not move' },
  broad: { id: 'broad', label: 'Broad', mass: 'broad', frame: 'broad frame', leoDescription: 'broad-shouldered and big-boned, wide powerful frame' },
  dense: { id: 'dense', label: 'Dense', mass: 'thick', frame: 'heavy frame', leoDescription: 'thick, compact and solid, dense mass, deceptively heavy' },
  chubby: { id: 'chubby', label: 'Chubby', mass: 'soft-bodied', frame: 'heavy frame', leoDescription: 'soft-bodied and substantial, plush and generously built, real weight carried with presence' },
  towering: { id: 'towering', label: 'Towering', mass: 'massive', frame: 'monumental frame', leoDescription: 'towering and monumental, mountainous powerlifter frame, barrel chest and tree-trunk limbs, actually LARGE' },
  lean: { id: 'lean', label: 'Lean', mass: 'lean', frame: 'narrow frame', leoDescription: 'lean and wiry, sinewy and whip-thin, honed by discipline' },
  hollowed: { id: 'hollowed', label: 'Hollowed', mass: 'gaunt', frame: 'slight frame', leoDescription: 'hollow-cheeked and carved-down, ascetic and spare, sharpened rather than sick' },
  willowy: { id: 'willowy', label: 'Willowy', mass: 'slender', frame: 'long-limbed frame', leoDescription: 'tall, narrow and long-limbed, willowy and elongated' },
  // Variety expansion (Raheem 2026-07-23) — no single body type leads; young/striking
  // is a valid roll, and so are the fat king, the scrawny elder, the sly fox.
  heroic: { id: 'heroic', label: 'Heroic', mass: 'athletic', frame: 'balanced frame', leoDescription: 'classically heroic and striking, strong-jawed, fit and handsome/beautiful, the idealized adventurer — attractive is allowed' },
  regal: { id: 'regal', label: 'Regal', mass: 'corpulent', frame: 'imposing frame', leoDescription: 'opulently corpulent and regal, a well-fed king or queen, heavy and imposing with luxurious commanding bearing' },
  scrawny: { id: 'scrawny', label: 'Scrawny', mass: 'thin', frame: 'slight frame', leoDescription: 'scrawny and slight, thin-limbed and unimpressive, small and easy to underestimate — power in an unlikely body' },
  sly: { id: 'sly', label: 'Sly', mass: 'lean', frame: 'narrow frame', leoDescription: 'lean and sharp-featured with a sly fox-like cunning look, quick and narrow, a trickster\'s build' },
};

// ---------- Age ----------

export type AgeBandId = 'youth' | 'young' | 'prime' | 'mature' | 'ancient' | 'mummified';

export interface AgeBand {
  id: AgeBandId;
  label: string;
  leoDescription: string;
  /** Only rollable for archetypes in this list; undefined = any archetype. */
  restrictTo?: ArchetypeName[];
}

export const AGE_BANDS: Record<AgeBandId, AgeBand> = {
  // Child/teen prodigy — restricted to archetypes where a young genius or an
  // immortal child reads (a prodigy pilot, a child vampire). Raheem 2026-07-23.
  youth: { id: 'youth', label: 'Youth', leoDescription: 'a child or young teenager, small and unlined, startlingly young for such power — a prodigy', restrictTo: ['Mech Pilot', 'Human', 'Android', 'Vampire', 'Necromancer'] },
  young: { id: 'young', label: 'Young', leoDescription: 'young adult, unlined face, hot-blooded' },
  prime: { id: 'prime', label: 'Prime', leoDescription: 'adult in their prime, assured' },
  mature: { id: 'mature', label: 'Mature', leoDescription: 'seasoned and middle-aged, weathered strength, wisdom in the eyes, commanding' },
  ancient: { id: 'ancient', label: 'Ancient', leoDescription: 'venerable elder, age-lined face, gray or white hair, weathered hands, power earned over lifetimes' },
  // Fantasy undead age — restricted to archetypes where a preserved-dead read fits.
  mummified: { id: 'mummified', label: 'Mummified', leoDescription: 'desiccated and ritually preserved, ageless dead, taut parchment skin over ancient bone', restrictTo: ['Necromancer', 'Vampire', 'Seraph'] },
};

// ---------- Species / bespoke non-human forms ----------

/** The four rooted-mortal archetypes stay 100% humanoid — no bespoke form. */
export const ROOTED_MORTAL_ARCHETYPES: readonly ArchetypeName[] = ['Human', 'Barbarian', 'Monk', 'Mech Pilot'];

export interface BespokeBody {
  /** Stable id, persisted as speciesForm and locked across ranks. */
  id: string;
  archetype: ArchetypeName;
  /** Full Leonardo form descriptor (sourced from ARCHETYPE_NON_HUMAN_FORMS — single source of truth). */
  form: string;
}

/**
 * Promotes ARCHETYPE_NON_HUMAN_FORMS into first-class rollable body options.
 * The underlying BODY class is rolled separately from BODY_ALLOWLIST and stored
 * as the identity's build, so a heavyset bespoke stays heavyset across tier-up
 * (Bible §Rank continuity). Only the 7 non-mortal archetypes have entries.
 */
export const BESPOKE_BODIES: Partial<Record<ArchetypeName, readonly BespokeBody[]>> = {
  Beastmaster: [{ id: 'beast_touched', archetype: 'Beastmaster', form: ARCHETYPE_NON_HUMAN_FORMS.Beastmaster ?? '' }],
  Druid: [{ id: 'tree_melded', archetype: 'Druid', form: ARCHETYPE_NON_HUMAN_FORMS.Druid ?? '' }],
  Necromancer: [{ id: 'flesh_traded_bone', archetype: 'Necromancer', form: ARCHETYPE_NON_HUMAN_FORMS.Necromancer ?? '' }],
  Vampire: [{ id: 'blood_sovereign', archetype: 'Vampire', form: ARCHETYPE_NON_HUMAN_FORMS.Vampire ?? '' }],
  Lycanthrope: [{ id: 'wolf_form', archetype: 'Lycanthrope', form: ARCHETYPE_NON_HUMAN_FORMS.Lycanthrope ?? '' }],
  Android: [{ id: 'transcendent_chassis', archetype: 'Android', form: ARCHETYPE_NON_HUMAN_FORMS.Android ?? '' }],
  Seraph: [{ id: 'celestial_form', archetype: 'Seraph', form: ARCHETYPE_NON_HUMAN_FORMS.Seraph ?? '' }],
};

export function bespokeFormsFor(archetype: ArchetypeName): readonly BespokeBody[] {
  return BESPOKE_BODIES[archetype] ?? [];
}

/** True when the 40% non-human target applies to this archetype. */
export function archetypeSupportsNonHuman(archetype: ArchetypeName): boolean {
  return bespokeFormsFor(archetype).length > 0;
}

// ---------- Per-archetype build allowlist ----------

/**
 * Which build classes each archetype may roll. Generous for variety, but shaped
 * to the archetype's body identity (a Seraph is not "stout and vicious"; a
 * Barbarian is not "willowy"). Mirrors the tendencies in ARCHETYPE_BODY_POOL.
 */
export const BODY_ALLOWLIST: Record<ArchetypeName, readonly BodyClassId[]> = {
  Barbarian: ['broad', 'dense', 'stout', 'towering', 'chubby', 'lean', 'average', 'heroic', 'regal', 'scrawny'],
  Monk: ['lean', 'stout', 'chubby', 'broad', 'hollowed', 'average', 'willowy', 'heroic', 'scrawny', 'sly'],
  Beastmaster: ['lean', 'broad', 'dense', 'stout', 'chubby', 'average', 'heroic', 'sly', 'scrawny'],
  Druid: ['broad', 'chubby', 'willowy', 'hollowed', 'stout', 'average', 'dense', 'scrawny', 'sly', 'regal'],
  Necromancer: ['hollowed', 'lean', 'chubby', 'willowy', 'average', 'stout', 'regal', 'scrawny', 'sly'],
  Vampire: ['lean', 'broad', 'chubby', 'willowy', 'hollowed', 'towering', 'average', 'heroic', 'regal', 'sly'],
  Lycanthrope: ['dense', 'lean', 'broad', 'stout', 'chubby', 'towering', 'average', 'heroic', 'scrawny', 'sly'],
  'Mech Pilot': ['average', 'broad', 'stout', 'chubby', 'lean', 'willowy', 'heroic', 'scrawny', 'sly'],
  Android: ['lean', 'dense', 'chubby', 'broad', 'average', 'willowy', 'towering', 'heroic', 'sly', 'scrawny'],
  Seraph: ['broad', 'chubby', 'willowy', 'hollowed', 'towering', 'average', 'lean', 'heroic', 'regal', 'scrawny'],
  Human: ['chubby', 'lean', 'stout', 'broad', 'hollowed', 'willowy', 'average', 'dense', 'towering', 'heroic', 'regal', 'scrawny', 'sly'],
};

// ---------- Fantasy marks (replaces free-text disabilityOrCondition) ----------

export interface FantasyMark {
  /** Stable id, persisted + locked across ranks. */
  id: string;
  /** Leonardo-ready descriptor. Concrete fantasy noun — never "wheelchair"/"cane". */
  description: string;
  /** Archetypes this mark reads well on. */
  archetypeAffinity: readonly ArchetypeName[];
}

export const FANTASY_MARKS: readonly FantasyMark[] = [
  { id: 'arcane_prosthetic_forearm', description: 'a rune-etched brass-and-crystal forearm replacing a lost limb', archetypeAffinity: ['Mech Pilot', 'Android', 'Necromancer', 'Human', 'Barbarian'] },
  { id: 'severed_wing_stumps', description: 'cauterized wing-stumps at the shoulders, the feathers long gone', archetypeAffinity: ['Seraph', 'Vampire'] },
  { id: 'soul_light_rib_gap', description: 'a gap in the ribs where steady soul-light shines through', archetypeAffinity: ['Necromancer', 'Seraph'] },
  { id: 'clouded_seer_eyes', description: 'milk-pale blind eyes that see past the veil', archetypeAffinity: ['Druid', 'Necromancer', 'Beastmaster', 'Human', 'Monk'] },
  { id: 'rune_branded_stump', description: 'a sealed limb-stump branded with a glowing binding-rune', archetypeAffinity: ['Necromancer', 'Barbarian', 'Human', 'Druid'] },
  { id: 'crystal_optic_eye', description: 'one eye replaced by a faceted crystal optic ringed in fine metal', archetypeAffinity: ['Mech Pilot', 'Android', 'Necromancer'] },
  { id: 'bark_grown_limb', description: 'an arm regrown as living bark and green wood', archetypeAffinity: ['Druid', 'Beastmaster'] },
  { id: 'iron_jaw_plate', description: 'a riveted iron plate rebuilding a shattered jaw', archetypeAffinity: ['Mech Pilot', 'Android', 'Barbarian', 'Human'] },
  { id: 'beast_maimed_claw_hand', description: 'a hand maimed into a permanent claw by a bonded beast', archetypeAffinity: ['Lycanthrope', 'Beastmaster'] },
  { id: 'ash_blinded_eyes', description: 'eyes gone silver-white and sightless, ringed with old ash-scarring', archetypeAffinity: ['Seraph', 'Human', 'Monk'] },
  { id: 'stone_fused_leg', description: 'one leg fused to living stone below the knee, walked on with a rooted gait', archetypeAffinity: ['Druid', 'Barbarian', 'Human'] },
  { id: 'spectral_missing_arm', description: 'a missing arm rendered as a drifting spectral limb of pale light', archetypeAffinity: ['Necromancer', 'Seraph', 'Vampire'] },
];

export function marksForArchetype(archetype: ArchetypeName): readonly FantasyMark[] {
  return FANTASY_MARKS.filter((m) => m.archetypeAffinity.includes(archetype));
}
