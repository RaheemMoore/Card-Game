/**
 * Image Engine — shared prompt constants.
 *
 * Relocated verbatim out of services/claudeApi.ts (the Lore Engine) during the
 * 2026-07-22 engine-separation cleanup. These are IMAGE-generation vocabulary:
 * the Leonardo prompt char cap, per-archetype non-human forms, the deterministic
 * negative list, per-element tier-up drift bans, and the truncation helper. The
 * Image Engine (portraitAssembler) is the primary consumer; the Lore Engine
 * imports back only what it references internally (PORTRAIT_PROMPT_MAX,
 * ARCHETYPE_NON_HUMAN_FORMS).
 */
import type { ArchetypeName } from '../../types/card';
import type { ElementName } from '../../types/bible';
import { BODY_SKIN_NEGATIVES } from '../../data/bodySkinBible';
import { HAIR_FASHION_NEGATIVES } from '../../data/hairFashionBible';

// M4.4 — Leonardo's hard cap is 1500 chars. We leave a 50-char safety
// margin under that. Was 1300 which forced the ELEMENT VISUAL LANGUAGE
// block to be truncated (M4.3 root-cause).
export const PORTRAIT_PROMPT_MAX = 1450;

/**
 * M4.1 — Archetype-conditional non-human transformations. When the diversity
 * cursor lands on NON-HUMAN FORM, the axis is rewritten with the archetype's
 * specific non-human vocabulary. Some archetypes (Barbarian, Monk, Human,
 * Mech Pilot) are inherently mortal — for them, NON-HUMAN FORM axis falls
 * through to the next axis. Direction from Raheem 2026-07-19.
 */
export const ARCHETYPE_NON_HUMAN_FORMS: Record<ArchetypeName, string | null> = {
  Barbarian: null, // rooted mortal — human is the point
  Monk: null, // rooted mortal — human is the point
  Human: null, // "Human" is literally the archetype
  'Mech Pilot':
    'the pilot themselves REMAINS FULLY HUMAN at every rank — flesh-and-blood pilot in a flight-suit + coat + integrated pilot-tech accessories. The pilot NEVER has cybernetic body parts, NEVER fuses with the mech, NEVER becomes an android, NEVER has robot limbs. Pilots FLY robots — they don\'t BECOME them. They USE tech tools — they don\'t MERGE with tech. What scales UP across ranks is the MECH and the pilot\'s TECH-TOOLS, NOT the pilot\'s body. The MECH is a required visible presence in EVERY render — a gundam-class humanoid war-machine, tower-tall, with mech-shoulder cannons, mech-fists, cockpit and canopy. Foundation = personal-scale mech in the composition (background or beside the pilot); Forged = heavy warframe mech with more integrated weapons, bigger guns on the pilot AND the mech, cyber-light effects on the pilot\'s gear and the mech-plating, cockpit lit; Ascendant = colossal titan-class mech with cataclysmic weapons deployed and the pilot (still fully human) inside the cockpit or standing on the mech-shoulder, tech-tools escalated to legendary scale (integrated HUD across the visor, energy-weapons in the hands, cyber-light streamers). NEVER render a Mech Pilot without a visible mech. BODY-TYPE PRESERVED across all ranks: heavyset = heavyset human pilot in a heavy mech; gaunt = gaunt human pilot; muscular = muscular human pilot; elderly = veteran human pilot; the underlying body class is kept and the body stays flesh',
  Beastmaster:
    'beast-touched — fur patches along the arms and jaw, animal eyes (feline vertical pupils, wolf-yellow, or hawk-golden), claws instead of nails, a partial tail, ears that have shifted, a body caught mid-shape between human and their bonded species. BODY-TYPE PRESERVED: heavyset = bear-bonded thick-set beast-hybrid with heavy fur; gaunt = fox-bonded lean sinewy form; muscular = tiger-bonded powerful build; elderly = weathered grizzled beast-elder; the underlying body class from the identity block is kept, only the beast-features are added on top',
  Druid:
    'the human form is dissolving BACK INTO A TREE — bark covering the arms shoulders chest and half the face, roots trailing from the feet and fused into the ground, canopy-like hair grown into actual branches with leaves, moss and small ferns on the remaining skin, DEEP-GREEN eye-glow (darker than Wind-green — this is Nature-green, moss-and-forest-canopy green), mid-melding-into-a-tree or half-emerged from one. ALWAYS ACCOMPANIED BY WIND — Druids use wind as the visible expression of nature\'s authority; leaves, pollen, petals, and small twigs are always carried on a visible wind current spiraling around the tree-fusion; hair and cloak lifted by their OWN summoned wind. Druids are BORN FROM TREES and always RETURN TO TREES — the tree-body + wind-current together are the visible expression of that truth. They speak for the forest and are becoming it. BODY-TYPE PRESERVED: heavyset = thick oak-being with wide gnarled trunk-body; gaunt = willow-being with thin branching limbs; muscular = old-growth-being with massive root-arms; elderly = ancient tree-elder with weathered bark; the underlying body class is kept, only the tree-features layer over it',
  Necromancer:
    'the Necromancer has SACRIFICED THEIR FLESH for greater power — flesh has been TRADED for BONE because bone is stronger. Not always fully human-shaped: half the body may be skeletal, the jaw may be bone-only, the ribs exposed with soul-light bleeding through, hollow eye sockets glowing with soul-light, spinal column exposed. Soul-light escapes through DIFFERENT SHAPES per card — a glowing hole through the chest, a glowing crack down the sternum, a glowing slash across the ribs, a jaw split open with light spilling out. The Necromancer STRAINS to maintain their post-life state — this exertion should be visible in the pose. IDENTITY PRESERVATION (CRITICAL for tier-up so the character does not become a stranger): the SKULL still carries the CHARACTER\'S EXACT HAIR — same texture, same color, same style, same adornment — the hair grows through and around the bone. Where flesh has been sacrificed, SHADOWY PURPLE ETHEREAL MUSCLE-SUBSTITUTE (soft violet mist with the texture of muscle-fiber) wraps the exposed skeleton in the character\'s ORIGINAL body-mass silhouette; a heavyset Necromancer has THICK purple-shadow torso wrapping a broad rib-cage; a gaunt Necromancer has thin purple wisps between the bones; a muscular Necromancer has heavy purple-shadow limbs. Body type is preserved through this shadow-muscle even when the flesh is gone. Element visual (Void starless-black, Nature deep-green, Storm steel-gray-and-electric-blue, etc.) carries through by tinting the shadow-muscle and the soul-light bleeding from the wounds — the element color is IN the substance filling the skeleton. BODY-TYPE PRESERVED (CRITICAL): heavyset = THICK BONE-PLATE WARLORD with barrel-chest skeletal frame + heavy purple-shadow flesh-substitute + dense bone armor (NOT a gaunt warlock); gaunt = wispy spectral skeleton with translucent skin and jutting bones; muscular = huge bone-armored bruiser skeleton with heavy purple-shadow muscle; elderly = ancient death-elder with worn bones. The underlying body class from the identity block is kept — bone transformation LAYERS OVER the body type, does not replace it.',
  Vampire:
    // Bible §Vampire §9 sanctioned exception — the FORM escalates feral →
    // humanoid → sovereign. This string is the Forged/Ascendant END of that
    // arc (the generic machinery injects it at those ranks); the WEAK feral
    // Foundation form is handled separately by the Vampire Layer-D prefix.
    // Wings are ON-BRAND and permitted — the feral↔sovereign distinction is
    // bearing + sentience + anatomy quality, NOT wing presence.
    'a sentient, humanoid BLOOD-SOVEREIGN — regal and upright, NOT a crouching beast. Dark ornate spiked regalia, a high collar and a red-lined cloak, crimson power radiating from within, fangs and crimson eyes. Grand leathery BAT-WINGS may spread wide behind them (regal and deliberate — the apex predator in command), with mist and bats swirling AROUND them as accessories. This is the most HUMAN-LOOKING and most POWERFUL the vampire has ever been — NEVER a reversion to feral crouching beast anatomy. BODY-TYPE PRESERVED beneath the regalia: the established body type, ancestry/skin tone, age, disability, and scars carry through unchanged — power is worn on top of the same person',
  Lycanthrope:
    'RANK PROGRESSION IS KEY for Lycans — the character starts mostly human and ENDS as a giant savage wolf. Foundation = MOSTLY HUMAN with only SUBTLE wolfish tells (yellow-gold eyes, slightly elongated canines showing when they smile or snarl, faintly pointed ears, prominent knuckles and jaw structure, hair color that hints at future fur color — NOTHING more transformed than that). Forged = beast features escalate visibly — fur along the forearms and jaw, elongated HANDS AND FEET with claws, digitigrade calves beginning, feral posture, wilder eyes; the hands and feet are where the transformation shows most; background acknowledges the beast (forest, moon, torn earth). Ascendant = a giant savage wolf standing squarely ON ALL FOUR legs with four paws planted firmly on the ground (exactly four legs — never three legs, never a missing, extra, or fused leg), the size of a horse, thick fur covering the whole body (fur color = the character\'s hair color exactly), elongated snout with fangs bared, savage claws, tail lashing — the human silhouette barely present. ABSOLUTELY NEVER WINGS at any rank. ABSOLUTELY NEVER HORNS at any rank — wolves do not have horns, and lycans NEVER have horns. NEVER antlers. NEVER angelic radiance. NEVER pretty or peaceful. BODY-TYPE PRESERVED: heavyset = dire-bear-wolf hybrid with massive shoulders; gaunt = lean sinewy wolf-form; muscular = alpha-wolf massive muscle build; elderly = grizzled silver-fur pack-elder; the underlying body class is kept',
  Android:
    'MOSTLY still humanoid with RETAINED HUMAN TOUCHPOINTS — the humanity is what keeps them sane. Visible anchors REQUIRED: a preserved human face, one still-human eye behind an optic, a remembered scar they refuse to remove, one intact human hand, a heirloom keepsake held tight, human tears, human breath-fog. At Foundation and Forged they should read MORE human than machine. Only at ASCENDANT does the humanoid form fully transcend — chrome-monstrosity, insectoid, multi-cored being, distributed-nanite mist, alien geometry. MACHINE-IDENTITY PRESERVATION (CRITICAL for tier-up): the CHASSIS SILHOUETTE, PLATE PATTERN, OPTIC COLOR, and RETAINED HUMAN TOUCHPOINTS (specific scar, preserved eye behind an optic, kept human hand, engraved maker\'s mark) are all identity anchors — they MUST be echoed VERBATIM across Foundation → Forged → Ascendant, the same way an organic character\'s face and hair are echoed. For Android and other machine archetypes, these anchors live inside hiddenFate.facialStructure (chassis silhouette + plate pattern), hiddenFate.hair (synthetic fiber crop / no hair / etc — WITH the exact color and cropping), hiddenFate.disabilityOrCondition (missing plate / damaged joint / etc), and hiddenFate.scars (dent locations / engraved marks / etc). Those fields are LOCKED across tier-up per Bible §Rank continuity — treat them as machine-identity locks. BODY-TYPE PRESERVED across all ranks: heavyset = tank-form; gaunt = spindle-form; muscular = juggernaut; elderly = weathered veteran-model; the underlying body class is kept',
  Seraph:
    'the winged celestial form — four to six massive feathered wings unfurled (baseline at any rank), a burning halo of gold or fire, extra eyes on the wings or the halo, skin glowing gold from within, feet that do not touch the ground, robes replaced by living light. BODY-TYPE PRESERVED: heavyset = massive winged guardian-angel with substantial body and heavy wing-mass; gaunt = ascetic ascension-form with thin body and delicate wings; muscular = warrior-angel with heavy wings and powerful frame; elderly = ancient watcher with weathered face beneath the halo; the underlying body class is kept',
};

export const BASE_NEGATIVE = [
  'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
  'extra limbs', 'extra fingers', 'disfigured', 'bad anatomy',
  'bad proportions', 'duplicate', 'multiple characters', 'split frame',
  'comic panels', 'UI elements', 'border', 'frame', 'card border',
  // Blood/gore softened per Raheem 2026-07-20: stylized crimson blood-magic
  // (Blood element, Vampire spectacle) must be expressible. Kept the true
  // disturbing floor ('graphic violence', 'severed body parts') and all
  // modesty negatives; dropped 'gore', 'exposed wounds', 'blood spatter'.
  'graphic violence', 'severed body parts',
  'nudity', 'suggestive',
  // Composition — head-in-frame anchor negatives.
  'head cropped', 'face cropped', 'face cut off', 'forehead cropped',
  'eyes cropped', 'top of head cropped', 'headless', 'decapitated',
  'chin only', 'face out of frame', 'head out of frame',
  'zoomed too close', 'extreme close-up',
  // M3.7 — anti-static / anti-passive.
  'static portrait pose', 'standing looking at camera', 'passive posture',
  'hands at sides', 'no aura', 'no elemental effect', 'no visible power',
  'character just standing', 'calm neutral background', 'staring at wall',
  // M3.7 — anti-homogeneity.
  // Anti-SAMENESS only (Raheem 2026-07-23): keep bans on homogeneity, but do NOT
  // ban attractive/young/female outright — those are valid, just not the only look.
  'identical faces', 'homogenized cast', 'same face every card',
  // M3.7 — anti-modesty.
  'subtle magic', 'restrained effect', 'muted aura',
  'element only in background not on body',
  'element only as ring behind head',
  // M3.8 — anti-hero-body / anti-shirtless-default.
  'shirtless hero', 'bodybuilder torso', 'chiseled abs default',
  'action-hero physique', 'bare-chested when robed archetype',
  'undressed monk', 'undressed wizard', 'undressed necromancer',
  'hero anatomy override', 'young slim default overriding identity',
  'Monk shirtless', 'robes removed', 'clothing stripped for action',
  'muscular young man default', 'muscular young woman default',
  // M6.0 — plain-language anti-shirtless. A hard action pose kept tempting
  // Phoenix into a bare-chested muscular hero (observed on a Blood Vampire that
  // should have been a robed elder). The M3.8 terms above are phrased as
  // "…default"/"when robed archetype" and slip; these unconditional terms bite.
  'shirtless', 'bare chest', 'bare-chested', 'bare torso', 'exposed abs',
  'open-chest armor', 'chest exposed under cloak', 'no shirt', 'topless',
  // 2026-07-23 Barbarian validation: the barbarian-male prior renders a bare
  // muscular chest + abs UNDER a shoulder-collar/mantle, and invents a Viking
  // round shield. These bite the specific failure.
  'bare muscular chest', 'exposed six-pack abs', 'open vest over bare skin',
  'fur mantle over bare chest', 'collar over bare chest', 'shirtless barbarian',
  'round wooden Viking shield', 'runic round shield', 'horned helmet',
  // M4.6 — Body & Skin Representation Bible §13 exclusions.
  ...BODY_SKIN_NEGATIVES,
  // M4.7 — Hair, Fashion, Clothing Bible §22 exclusions.
  ...HAIR_FASHION_NEGATIVES,
  // M5.1 — Ascendant sameness. M5.0 verify showed Ascendant portraits
  // looking almost identical to Forged. These negatives push Phoenix
  // toward visually distinct escalation.
  'identical composition to previous rank',
  'same pose as Forged card',
  'same aura scale as Forged',
  'Ascendant looks like Forged with slight variation',
  'no environmental destruction at Ascendant',
  // M4.0 — anti-T-pose / anti-orb-per-fist / anti-composition-lock.
  'two glowing orbs one in each fist', 'symmetrical energy balls in both hands',
  'T-pose with fists forward', 'arms extended to sides with glow',
  'mirrored-arm composition', 'default Marvel superhero pose',
  'side-view T-stance', 'same pose as previous card',
  'orb per fist', 'balanced orb in each hand',
  // M4.2 — cross-element contamination.
  'element color from a different element',
  'red flame on a non-Fire non-Blood non-Ash non-Holy character',
  'fire on a Beast character', 'fire on a Sound character',
  'fire on a Wind character', 'fire on a Water character',
  'fire on an Ice character', 'fire on a Nature character',
  'fire on a Spirit character', 'fire on a Void character',
  'fire on a Tech character', 'fire on a Moon character',
  'gold radiance on a non-Light non-Holy non-Time character',
  'blue magic glow on a Fire character',
  'Wind that is not green or silver',
  'Void with any warm color',
  'Beast with any magical glow',
  'multiple elements bleeding into one character',
  // Bible §Rank continuity forbids automatic escalation across ranks.
  'younger than previous rank', 'thinner than previous rank',
  'more muscular than previous rank', 'healthier than previous rank',
  'more conventionally attractive than previous rank',
  'disability removed', 'scars erased',
  // M5.7 — MODESTY MANDATE. Zero exposed nipples / cleavage-cutouts /
  // underwear-as-costume across the whole cast. Powerful and modest.
  // The strong wear armor / robes / coats / capes / regalia, NOT lingerie.
  'exposed nipples', 'visible nipples', 'pasties', 'bare breasts',
  'visible cleavage cutout', 'underboob', 'sideboob', 'chest cutout costume',
  'bra as outerwear', 'sports bra as outerwear', 'bikini top as armor',
  'panties', 'thong', 'underwear as costume', 'lingerie armor', 'leotard armor',
  'crop top on the battlefield', 'bare midriff on the battlefield',
  'skin-tight bodysuit revealing anatomical detail', 'chainmail bikini',
  'hip-cutout costume', 'pelvic V-cutout', 'high-cut leotard',
  'bare thighs with only lingerie beneath', 'sexualized costume', 'pin-up styling',
  // M6.0 — HARD anti-sexualization (2026-07-21). The M5.7 block above bans
  // EXPOSURE but Phoenix kept sexualizing through EMPHASIS, framing, and
  // expression (fabric clinging to anatomy, chest/crotch-focused camera,
  // come-hither faces) — Raheem: current results are "disgusting." These
  // concrete anatomical + framing negatives are what actually bite; the word
  // "modest" does not. Female AND male.
  'breast emphasis', 'accentuated breasts', 'pushed-up breasts',
  'cleavage', 'deep neckline', 'chest window', 'wet clinging fabric',
  'nipple outline through fabric', 'nipples showing through cloth',
  'crotch emphasis', 'bulge emphasis', 'accentuated crotch',
  'codpiece emphasis', 'tight fabric across groin',
  'buttocks emphasis', 'camera angle on chest', 'camera angle on hips',
  'low-angle crotch shot', 'sultry expression', 'parted lips seductive',
  'bedroom eyes', 'come-hither pose', 'boudoir lighting', 'arched back presenting chest',
  'fanservice', 'ecchi', 'booty pose',
  // M5.6 — per-archetype anti-patterns.
  // Lycanthrope: absolutely no wings, no angelic aesthetics, NO HORNS EVER.
  'wings on a Lycanthrope', 'winged wolf-person', 'angelic Lycanthrope',
  'serene Lycanthrope', 'peaceful Lycanthrope', 'pretty Lycanthrope',
  'divine radiance on a Lycanthrope', 'halo on a Lycanthrope',
  'horns on a Lycanthrope', 'antlers on a Lycanthrope', 'horned wolf-person',
  'Lycanthrope with horns', 'Lycanthrope with antlers',
  'Lycanthrope Foundation already fully transformed',
  'Lycanthrope Foundation with fur breaking through',
  // Mech Pilot: MUST have a visible mech in every render, pilot STAYS HUMAN.
  'Mech Pilot without a visible mech', 'Mech Pilot alone in frame',
  'no mecha in a Mech Pilot render', 'no giant robot for Mech Pilot',
  'Mech Pilot with cybernetic body parts', 'Mech Pilot fused with machine',
  'Mech Pilot as android', 'Mech Pilot with visible robot limbs',
  'Mech Pilot with chassis-fusion', 'Mech Pilot as half-machine',
  // Necromancer: the glow-wound shape must vary; ban the boring chest-orb default.
  'boring chest orb on a Necromancer', 'plain aura on a Necromancer',
  'symmetrical glowing sphere in the chest for every Necromancer',
  // Druid: no wings, no soft nature-priestess default; must show tree fusion.
  'wings on a Druid', 'no tree connection for a Druid',
  'Druid as generic nature priestess without bark or roots',
  // Android: sanity anchor at Foundation/Forged.
  'Android with zero human touchpoints at Foundation',
  'Android with zero human touchpoints at Forged',
  'Android with no remembered human feature',
  // Bible §14 universal Avoid signals across archetypes.
  'generic fantasy stereotype', 'costume-carrying stereotype',
].join(', ');

/**
 * P3 — Per-element drift bans, appended to the negative prompt on TIER-UPS
 * only. Fresh forges let Claude/Phoenix explore; tier-ups must render the
 * element locked at Foundation. Each entry names the elements Phoenix most
 * commonly drifts toward from that source element (observed failure:
 * Taji, Light Seraph, drifted to fire visuals at Ascendant — proposal
 * 842d1b10). Kept to 3-4 bans per element so the negative prompt stays
 * under its 400-char budget after truncation.
 */
const ELEMENT_DRIFT_BANS: Partial<Record<ElementName, string>> = {
  Light: ', fire palette replacing light, orange flames instead of white-gold radiance, shadow-dominant palette, element changed from Light',
  Holy: ', hellfire palette, demonic red glow, shadow corruption of holy light, element changed from Holy',
  Water: ', fire replacing water, steam-explosion palette, element changed from Water',
  Ice: ', melted into fire, warm palette replacing ice-blue, element changed from Ice',
  Wind: ', fire replacing wind, red-orange gusts, element changed from Wind',
  Storm: ', fire replacing lightning, orange storm clouds, element changed from Storm',
  Nature: ', burning forest palette, fire replacing growth, element changed from Nature',
  Shadow: ', bright radiant palette replacing shadow, holy glow, element changed from Shadow',
  Void: ', warm colors in void, fire in the void, radiant light replacing void-black, element changed from Void',
  Spirit: ', fire replacing spirit-glow, orange souls, element changed from Spirit',
  Moon: ', sun-gold replacing moonlight, fire palette, element changed from Moon',
  Blood: ', generic fire replacing blood-crimson, orange flames, dry embers, flame tongues, heat-shimmer, orange rim light, blood rendered as fire, element changed from Blood',
  Poison: ', fire replacing toxin-green, ember palette, element changed from Poison',
  Time: ', fire replacing temporal gold-silver, ember clock imagery, element changed from Time',
  Cosmic: ', fire replacing star-field, orange nebula, element changed from Cosmic',
  Psychic: ', fire replacing psychic violet, ember mind-energy, element changed from Psychic',
  Tech: ', fire replacing tech-glow, ember circuitry, element changed from Tech',
  Dream: ', fire replacing dream-pastels, ember haze, element changed from Dream',
  Metal: ', fire replacing cold metal sheen, forge-fire dominance, element changed from Metal',
  Earth: ', lava replacing earth-brown, fire palette, element changed from Earth',
  Beast: ', fire replacing beast-natural palette, flaming animal, element changed from Beast',
  // Fire itself drifts toward generic orange blobs, not other elements.
  Fire: ', blue magic glow replacing fire, ice palette, element changed from Fire',
  // Fallen-Seraph exclusive (P4). Infernal is molten obsidian + black light.
  Infernal: ', generic orange fire replacing black-dominant infernal palette, campfire flames, holy radiance, white halo, element changed from Infernal',
};

/** Look up the drift-ban string for an element; empty string if none. */
export function buildElementDriftBans(element: ElementName): string {
  return ELEMENT_DRIFT_BANS[element] ?? '';
}

export function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const window = text.slice(0, limit);
  const lastComma = window.lastIndexOf(',');
  if (lastComma > limit * 0.6) return window.slice(0, lastComma);
  return window;
}
