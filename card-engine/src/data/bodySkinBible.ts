import type { ArchetypeName } from '../types/card';

/**
 * Body and Skin Representation Bible (Raheem, v1.0, 2026-07-19) — canonical
 * visual reference for body diversity, skin tone, skin texture, and prompt
 * guidance in character generation. Source of truth:
 * /Body_and_Skin_Representation_Bible.md.
 *
 * Bible §17: "A character should not need a narrow beauty standard to feel
 * legendary. Body diversity is part of the fantasy. Skin diversity is part
 * of the fantasy. Claude should use these traits to make the cast feel
 * larger, richer, and more human, not less heroic."
 *
 * This module condenses the Bible's per-archetype body pools + composition
 * framework + skin vocabulary into structured data. The pipeline composes a
 * compact per-forge block (~500 chars) from these arrays; the full Bible is
 * NEVER copied verbatim into every API request.
 */

/**
 * ---------- Body composition framework (Bible §4, §6) ----------
 *
 * A body is decomposed into 5 independent dimensions. The Bible §6 formula:
 *   height + frame + mass distribution + muscle visibility + posture
 * A strong prompt names ALL five, chosen from the vocabulary below.
 */

export interface BodyCompositionField {
  /** Human-readable label of the dimension. */
  label: string;
  /** Sample vocabulary — Claude picks one intentionally, does not average. */
  samples: readonly string[];
}

/** Bible §4.1 */
export const BODY_HEIGHT: BodyCompositionField = {
  label: 'height',
  samples: [
    'very short', 'short', 'below-average height', 'average height',
    'tall', 'very tall',
  ],
};

/** Bible §4.2 */
export const BODY_FRAME: BodyCompositionField = {
  label: 'frame',
  samples: [
    'slight frame', 'narrow frame', 'compact frame', 'medium frame',
    'broad frame', 'heavy frame', 'long-limbed frame',
  ],
};

/** Bible §4.3 */
export const BODY_MASS: BodyCompositionField = {
  label: 'mass distribution',
  samples: [
    'slim', 'soft-bodied', 'thick', 'stocky', 'broad', 'heavyset', 'fat',
    'fleshy', 'dense', 'padded', 'burly', 'solid', 'large-bodied',
    'generously built', 'plush',
  ],
};

/** Bible §4.4 */
export const BODY_MUSCLE_VISIBILITY: BodyCompositionField = {
  label: 'muscle visibility',
  samples: [
    'low visible muscle definition', 'modest muscle definition',
    'functional musculature', 'thick musculature', 'highly defined musculature',
  ],
};

/** Bible §4.6 */
export const BODY_POSTURE: BodyCompositionField = {
  label: 'posture and carriage',
  samples: [
    'grounded stance', 'poised posture', 'stooped but intense',
    'relaxed and immovable', 'predatory stillness', 'devotional openness',
    'coiled precision', 'floating grace', 'exhausted but defiant',
    'calm upright posture', 'regal posture', 'commanding presence',
  ],
};

/**
 * ---------- Archetype body-direction pools (Bible §7) ----------
 *
 * Each archetype has 6-8 valid body directions. These are TENDENCIES,
 * not restrictions. The diversity axis (from claudeApi.ts) is the primary
 * constraint; the archetype pool provides the vocabulary for expressing
 * that constraint in an archetype-appropriate way.
 *
 * Example: diversity axis rolls EMACIATED for a Barbarian. The pool
 * provides "lean and weather-beaten" and "older and timeworn" as
 * emaciation-compatible directions with Barbarian identity — Claude picks
 * one instead of writing a wispy scholar body.
 */

export interface BodyDirection {
  /** One-clause description, ready to drop into a prompt. */
  description: string;
  /** Compact keywords for the prompt / negative-check tooling. */
  keywords: readonly string[];
}

const D = (description: string, ...keywords: string[]): BodyDirection => ({
  description,
  keywords,
});

const BARBARIAN_POOL: readonly BodyDirection[] = [
  D('broad, thick, scarred, dense', 'broad', 'thick', 'scarred', 'dense'),
  D('short and stocky', 'short', 'stocky'),
  D('tall and heavyset', 'tall', 'heavyset'),
  D('fat but immensely imposing', 'fat', 'imposing', 'large-bodied'),
  D('lean and weather-beaten', 'lean', 'weather-beaten', 'sinewy'),
  D('older and timeworn', 'older', 'timeworn', 'weathered'),
  D('wide-hipped and powerful', 'wide-hipped', 'powerful'),
  D('soft-bodied with enormous presence', 'soft-bodied', 'presence'),
];

const MONK_POOL: readonly BodyDirection[] = [
  D('compact and grounded', 'compact', 'grounded'),
  D('soft-bodied but disciplined', 'soft-bodied', 'disciplined'),
  D('lean and controlled', 'lean', 'controlled'),
  D('wiry and calloused', 'wiry', 'calloused'),
  D('heavyset with calm balance', 'heavyset', 'balanced'),
  D('older and timeworn', 'older', 'timeworn'),
  D('broad but gentle', 'broad', 'gentle'),
  D('slight but intense', 'slight', 'intense'),
];

const BEASTMASTER_POOL: readonly BodyDirection[] = [
  D('practical and weathered', 'practical', 'weathered'),
  D('lean and sun-browned', 'lean', 'sun-browned'),
  D('broad and fur-clad', 'broad', 'fur-clad'),
  D('thick but mobile', 'thick', 'mobile'),
  D('scar-marked and hardy', 'scar-marked', 'hardy'),
  D('compact and strong', 'compact', 'strong'),
  D('soft-bodied but rugged', 'soft-bodied', 'rugged'),
  D('asymmetrical from field life', 'asymmetrical', 'field-hardened'),
];

const DRUID_POOL: readonly BodyDirection[] = [
  D('broad and rooted', 'broad', 'rooted'),
  D('soft-bodied and ancient-feeling', 'soft-bodied', 'ancient'),
  D('willow-thin and eerie', 'willow-thin', 'eerie'),
  D('older and gnarled', 'older', 'gnarled'),
  D('fat and generous-looking', 'fat', 'generous'),
  D('compact and earthy', 'compact', 'earthy'),
  D('long-limbed and forest-haunted', 'long-limbed', 'forest-haunted'),
  D('physically ordinary but spiritually immense', 'ordinary', 'immense'),
];

const NECROMANCER_POOL: readonly BodyDirection[] = [
  D('gaunt and sleep-deprived', 'gaunt', 'sleep-deprived'),
  D('delicate and pale or dark-skinned with striking contrast', 'delicate', 'striking'),
  D('soft-bodied scholar', 'soft-bodied', 'scholar'),
  D('hollow-eyed and narrow', 'hollow-eyed', 'narrow'),
  D('older and parchment-skinned', 'older', 'parchment-skinned'),
  D('physically unimposing but visually commanding', 'unimposing', 'commanding'),
  D('sickly-looking but majestic', 'sickly', 'majestic'),
  D('refined and ritualized', 'refined', 'ritualized'),
];

const VAMPIRE_POOL: readonly BodyDirection[] = [
  D('elegant and slim', 'elegant', 'slim'),
  D('broad and aristocratic', 'broad', 'aristocratic'),
  D('full-bodied and luxurious', 'full-bodied', 'luxurious'),
  D('ageless and smooth', 'ageless', 'smooth'),
  D('starved-looking and predatory', 'starved', 'predatory'),
  D('statuesque', 'statuesque'),
  D('thick and regal', 'thick', 'regal'),
  D('fragile-looking but dangerous', 'fragile', 'dangerous'),
];

const LYCANTHROPE_POOL: readonly BodyDirection[] = [
  D('thick and animal-powerful', 'thick', 'animal-powerful'),
  D('long-limbed and feral', 'long-limbed', 'feral'),
  D('scarred and compact', 'scarred', 'compact'),
  D('broad and hairy', 'broad', 'hairy'),
  D('soft-bodied in human form but explosive in movement', 'soft-bodied', 'explosive'),
  D('heavyset and intimidating', 'heavyset', 'intimidating'),
  D('lean and rangy', 'lean', 'rangy'),
  D('short and vicious', 'short', 'vicious'),
];

const MECH_PILOT_POOL: readonly BodyDirection[] = [
  D('average and practical', 'average', 'practical'),
  D('broad and armored', 'broad', 'armored'),
  D('short and compact', 'short', 'compact'),
  D('fat and skilled', 'fat', 'skilled'),
  D('slim and sleep-deprived', 'slim', 'sleep-deprived'),
  D('disabled or asymmetrical if lore supports it', 'disabled', 'asymmetrical'),
  D('athletic from training', 'athletic', 'training-built'),
  D('tall and awkward outside the mech', 'tall', 'awkward'),
];

const ANDROID_POOL: readonly BodyDirection[] = [
  D('sleek and humanoid', 'sleek', 'humanoid'),
  D('thick and industrial', 'thick', 'industrial'),
  D('elegant and porcelain-like', 'elegant', 'porcelain-like'),
  D('large-bodied and heavy-framed', 'large-bodied', 'heavy-framed'),
  D('deliberately soft-bodied', 'soft-bodied', 'deliberate'),
  D('unnervingly symmetrical', 'unnerving', 'symmetrical'),
  D('visibly assembled', 'assembled', 'visible-joints'),
  D('androgynous and balanced', 'androgynous', 'balanced'),
];

const SERAPH_POOL: readonly BodyDirection[] = [
  D('broad and monumental', 'broad', 'monumental'),
  D('soft-bodied and luminous', 'soft-bodied', 'luminous'),
  D('androgynous and elegant', 'androgynous', 'elegant'),
  D('full-bodied and divine', 'full-bodied', 'divine'),
  D('thin and ascetic', 'thin', 'ascetic'),
  D('statuesque and towering', 'statuesque', 'towering'),
  D('aged and holy', 'aged', 'holy'),
  D('physically unusual but serene', 'unusual', 'serene'),
];

const HUMAN_POOL: readonly BodyDirection[] = [
  // Bible §7 Human: "any of the above". Broad intentional pool covering
  // the full sweep of body directions to prevent Human = default fit body.
  D('fat and visibly worked', 'fat', 'worked'),
  D('slim and elegant', 'slim', 'elegant'),
  D('stocky and grounded', 'stocky', 'grounded'),
  D('broad and hard-lived', 'broad', 'hard-lived'),
  D('frail-looking but sharp', 'frail', 'sharp'),
  D('tall and awkward', 'tall', 'awkward'),
  D('older and weathered', 'older', 'weathered'),
  D('scarred and rural', 'scarred', 'rural'),
  D('soft-bodied and noble', 'soft-bodied', 'noble'),
  D('short and practical', 'short', 'practical'),
];

export const ARCHETYPE_BODY_POOL: Record<ArchetypeName, readonly BodyDirection[]> = {
  Barbarian: BARBARIAN_POOL,
  Monk: MONK_POOL,
  Beastmaster: BEASTMASTER_POOL,
  Druid: DRUID_POOL,
  Necromancer: NECROMANCER_POOL,
  Vampire: VAMPIRE_POOL,
  Lycanthrope: LYCANTHROPE_POOL,
  'Mech Pilot': MECH_PILOT_POOL,
  Android: ANDROID_POOL,
  Seraph: SERAPH_POOL,
  Human: HUMAN_POOL,
};

/**
 * ---------- Skin presentation (Bible §8, §10) ----------
 */

/** Bible §8.1 depth range. */
export const SKIN_DEPTH_RANGE: readonly string[] = [
  'very fair', 'fair', 'light', 'light-medium', 'medium',
  'medium-deep', 'deep', 'very deep',
];

/** Bible §8.2 undertone vocabulary. */
export const SKIN_UNDERTONES: readonly string[] = [
  'cool', 'neutral', 'warm', 'olive', 'golden', 'red-brown',
  'blue-red', 'peach', 'bronze', 'ashy', 'umber',
];

/** Bible §8.3 surface / texture. */
export const SKIN_TEXTURES: readonly string[] = [
  'smooth', 'weathered', 'freckled', 'sun-worn', 'scar-marked',
  'dry', 'luminous', 'matte', 'reflective', 'dewy', 'roughened',
  'tattooed', 'painted', 'vitiligo-patterned', 'ritual-marked',
  'ash-dusted', 'frost-touched',
];

/** Bible §8.4 lighting response — critical for preserving detail on
 *  darker skin, per Bible §9 "Very deep skin examples" avoid clause. */
export const SKIN_LIGHTING_RESPONSE: readonly string[] = [
  'warm highlights across deep brown skin',
  'cool moonlight over blue-black skin',
  'golden reflected light over olive skin',
  'soft diffuse light on pale freckled skin',
  'ember light catching textured dark skin',
  'wet specular highlights over bronze skin',
  'silvery moonlit rim across very deep umber skin',
  'warm reflected light preserving detail on deep skin',
];

/** Bible §10 surface-detail palette — used as optional flavor when
 *  the character's story supports it. Do NOT stack multiples on one
 *  character. */
export const SKIN_SURFACE_DETAILS: readonly string[] = [
  'freckles', 'moles', 'sun damage', 'scars', 'stretch marks',
  'ritual paint', 'calluses', 'healed burns', 'cracked lips',
  'dry cheeks', 'subtle sheen', 'acne scarring', 'facial hair texture',
  'vitiligo', 'tattoos', 'age lines', 'rough hands', 'worn knees or elbows',
  'weather-beaten skin',
];

/**
 * ---------- Negative-prompt augments (Bible §13) ----------
 */
export const BODY_SKIN_NEGATIVES: readonly string[] = [
  'shredded abs default',
  'exaggerated bodybuilder proportions',
  'identical athletic physiques across cards',
  'pin-up sexualization',
  'hyper-hourglass default anatomy',
  'superhero V-torso as universal body',
  'porcelain-smooth skin on every character',
  'dark skin flattened into shadow',
  'dark skin losing detail under lighting',
  'fatness treated as comedic',
  'disability rendered grotesque',
  'stereotyped race-to-archetype pairing',
];

/**
 * ---------- Rotation helper ----------
 *
 * Same shape as namingBible.rotateSlice. Deterministic slice with wrap.
 */
export function rotateSliceBS<T>(items: readonly T[], offset: number, count: number): readonly T[] {
  const n = items.length;
  if (n === 0) return [];
  const out: T[] = [];
  const take = Math.min(count, n);
  for (let i = 0; i < take; i++) out.push(items[(offset + i) % n]);
  return out;
}

/**
 * Assemble a compact BODY & SKIN block for a Leonardo prompt. Rotates a
 * subset per forge via a caller-provided offset so Claude sees varied
 * vocabulary. Skipped entirely on regen/tier-up (existing hiddenFate wins).
 *
 * The block is designed to sit alongside the Element and Naming blocks —
 * ~500-600 chars, dense enough to change Claude's default output shape.
 */
export function assembleBodySkinBlock(
  archetype: ArchetypeName,
  offset: number,
  diversityAxisLabel: string,
): string {
  const pool = ARCHETYPE_BODY_POOL[archetype];
  const rotatedDirections = rotateSliceBS(pool, offset, 4);
  const rotatedDepths = rotateSliceBS(SKIN_DEPTH_RANGE, offset, 4);
  const rotatedUndertones = rotateSliceBS(SKIN_UNDERTONES, offset * 2, 4);
  const rotatedTextures = rotateSliceBS(SKIN_TEXTURES, offset, 4);
  const rotatedLighting = rotateSliceBS(SKIN_LIGHTING_RESPONSE, offset, 3);

  return `
=== BODY & SKIN REPRESENTATION BIBLE (Raheem v1.0 — enforce for bodyType, skinTone, bodyDimensions, skinPresentation) ===
CORE PRINCIPLE: Body diversity is part of the fantasy. Skin diversity is part of the fantasy. Use these traits to make the cast feel larger, richer, and more human — NOT less heroic. Do NOT default to muscular / athletic / lean six-pack. Do NOT collapse skin to a single color label.

BODY COMPOSITION FORMULA (§6 — REQUIRED): "height + frame + mass distribution + muscle visibility + posture". A body is ALWAYS 5 fields, chosen from the vocabulary below. "Athletic" alone is BANNED — it is the failure mode this Bible exists to fix.

VOCABULARY (Bible §4):
  HEIGHT (pick one): ${BODY_HEIGHT.samples.join(' / ')}
  FRAME (pick one): ${BODY_FRAME.samples.join(' / ')}
  MASS (pick one — vary intentionally per diversity axis): ${BODY_MASS.samples.join(' / ')}
  MUSCLE VISIBILITY (pick one — visible abs NOT default proof of strength): ${BODY_MUSCLE_VISIBILITY.samples.join(' / ')}
  POSTURE (pick one — power comes from carriage too): ${BODY_POSTURE.samples.join(' / ')}

ARCHETYPE BODY POOL for ${archetype} (Bible §7 — TENDENCIES, not restrictions — pick ONE direction that reconciles the axis constraint below with this archetype's identity):
${rotatedDirections.map((d) => `  - ${d.description}`).join('\n')}

DIVERSITY AXIS × BODY POOL RECONCILIATION: The diversity axis rolled "${diversityAxisLabel}" for this forge. The axis WINS on mass distribution and visible age/health cues. The archetype pool provides the VOCABULARY for expressing that axis. Example: an EMACIATED Barbarian is "lean and weather-beaten" per the Barbarian pool with skeletal-thin mass — NOT "wispy scholar" (wrong pool). A HEAVYSET Monk is "soft-bodied but disciplined" per Monk pool — NOT "chiseled monk". A NON-HUMAN Necromancer keeps the underlying pool body class beneath the bone transformation.

SKIN PRESENTATION (Bible §8, §10 — REQUIRED 4-field decomposition, NOT a single color label):
  DEPTH (REQUIRED FORMAT: tier + concrete pigment name, e.g. "deep umber-brown", "medium-deep bronze", "very deep espresso-black", "light peach-cream" — bare tier alone like "deep" is BANNED, un-verifiable). Tier options: ${rotatedDepths.join(' / ')} (rotating slice; full range: ${SKIN_DEPTH_RANGE.join(', ')}). Pigment word must be a real color/material: umber-brown / chestnut / espresso-black / bronze / olive-tan / peach-cream / ivory-warm / mahogany / clay-red / etc.
  UNDERTONE (pick one — REQUIRED, not "warm"-default): ${rotatedUndertones.join(' / ')} (also valid: ${SKIN_UNDERTONES.join(', ')})
  TEXTURE (pick one — do NOT default to porcelain smooth): ${rotatedTextures.join(' / ')} (also valid: ${SKIN_TEXTURES.join(', ')})
  LIGHTING RESPONSE (pick / adapt one — CRITICAL for preserving detail on darker skin): ${rotatedLighting.map((l) => `"${l}"`).join(' ; ')}

Bible §9 CRITICAL: Deep skin MUST retain detail. NEVER flatten dark skin into shadow or silhouette. NEVER default all medium tones to "tan". NEVER treat "pale" as a synonym for beauty, nobility, or magic.

BIBLE §13 EXCLUSIONS: Actively avoid — shredded abs default, exaggerated bodybuilder proportions, identical athletic physiques across cards, hyper-hourglass default anatomy, superhero V-torso as universal body, porcelain-smooth skin on every character, flattening dark skin into shadow, fatness treated as comedic, disability rendered grotesque, stereotyped race-to-archetype pairing.

BIBLE §14 VALIDATION (before returning bodyType/skinTone): Is the body type MORE specific than "athletic" or "slim"? Would this character look interesting without armor? Is the skin depth clearly named? Is the undertone identified? Is lighting response likely to preserve detail? If any answer is weak, revise.
`;
}
