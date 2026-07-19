import type { ArchetypeName, Rank, CardStats } from '../types/card';
import type { ElementName, ElementSelection, StoryPillarAnswers } from '../types/bible';
import { getBibleChapter } from '../data/archetypeBible';

/**
 * Local Leonardo prompt fallback for when the Claude API is unavailable.
 * M3.7 rewrite (2026-07-19): action + eruption + world-reacts anchor,
 * per-element visual grammar, per-archetype action vocabulary, rank scaling
 * from eruption at Foundation to cosmic transcendence at Ascendant.
 *
 * Mirrors the shape of services/claudeApi.ts so a fallback card still lands
 * in the target aesthetic when the API is down.
 */

const RANK_CARRIAGE: Record<Rank, string> = {
  Foundation:
    'mid-signature-move with the element already erupting from the body, bold aura reaching beyond the character, ground and air starting to react',
  Forged:
    'mid-legendary-move with the aura extending far, environmental damage from their own power, archetype-appropriate transformations beginning to manifest',
  Ascendant:
    'mid-ultimate with the world crumbling around them, reality reacting to their power, non-human features appropriate to archetype and element unfurled — while the same body, ancestry, disability, and scars are preserved as the same person underneath',
};

const ELEMENT_EFFECT: Record<ElementName, string> = {
  Fire: 'flame licking along the arms and hands, ember trails from fingertips, eyes fire-lit',
  Water: 'water ribbon around the arms, droplets suspended mid-air, wet-shining skin',
  Earth: 'dust cloud around the feet, stone chunks lifting toward the hands, cracked earth beneath',
  Wind: 'cloth and hair swept by their own gust, debris spiraling, translucent wind currents',
  Ice: 'frost forming on the forearms, visible breath, ice shards suspended nearby',
  Lightning: 'lightning arcing between fingers and up the arms, static charge crackling, hair swept upward',
  Stone: 'stone plates fused to the skin, rocky chunks orbiting, cracked earth beneath',
  Storm: 'lightning at the fingers, small storm cloud near the head, rain streaking',
  Nature: 'vines curling up the arms blooming with flowers, moss on the skin, petals suspended',
  Beast: 'claws extending, feral eye-glow, misty spirit-animal silhouettes prowling',
  Blood: 'red mist rising from palms, veins glowing red, blood-red particles in the air',
  Poison: 'green-purple miasma rising from the arms, venom on the fingertips, corroded veins',
  Metal: 'metal shards levitating around the character forming weapons, silver-glow on the skin',
  Spirit: 'translucent wisps rising from the shoulders, spectral silhouettes drifting behind, spirit-glow eyes',
  Shadow: 'darkness clinging to limbs, black tendrils from the hands, silhouette bleeding into background',
  Light: 'prismatic beams from eyes and hands, refracted rainbow around body, gold light through the skin',
  Sound: 'visible sound waves emanating outward, resonance rings, vibration blur at the hands',
  Ash: 'gray-black dust rising from the arms, charred cracking on the skin, embers drifting',
  Holy: 'flame-golden halo burning around the head, gold light shining through the skin, hands aglow with sacred fire',
  Void: 'darkness eating the light around the body, shadow tendrils, starless-black eyes, reality warping at the edges',
  Time: 'sand suspended mid-fall, temporal distortion blur, clock symbols glowing in the air',
  Cosmic: 'constellation patterns lit under the skin, gravity-warped debris orbiting, cosmic dust sparkling',
  Tech: 'circuit lines under the skin along the arms and neck, holographic projections at the hands, HUD light on the face',
  Psychic: 'purple-pink aura around the head, floating debris orbiting, glowing eyes',
  Moon: 'moonlight-silver light through the skin, crescent halo behind the head, moon-phase glyphs on the arms',
  Dream: 'iridescent haze wrapping the character, symbols and butterflies floating, pastel color shift',
};

const ARCHETYPE_ACTION: Record<ArchetypeName, string> = {
  Barbarian: 'mid-swing of an inherited weapon, roaring stance with clan sigil aloft, warband battle-cry',
  Monk: 'mid-form martial arts strike, chi channeling through open palms, spinning kick with motion trail',
  Beastmaster: 'alongside their companion mid-hunt, both drawing on shared bond, palm raised commanding a beast\'s spirit',
  Druid: 'arms raised summoning growth from the earth, mid-transformation into an animal form, storm-caller with clouds gathering',
  Necromancer: 'mid-cast of a summoning spell, spectral figure emerging from outstretched hand, whispering to a following spirit',
  Vampire: 'mid-transformation into mist or bats, fangs revealed with eyes lit, wing-cloak unfurling',
  Lycanthrope: 'mid-slash with elongated claws, mid-transformation with fur breaking through, howling toward the moon',
  'Mech Pilot': 'piloting the mech mid-strike, HUD lit and integrated weapons firing, cockpit open with weapon deployed',
  Android: 'energy weapon deploying from a chassis panel, mechanical panels opening to reveal cores, projected weapon materializing',
  Seraph: 'wings spread mid-flight with feathers burning, sword-of-light drawn and blazing, casting divine light downward',
  Human: 'signature tool or weapon mid-use per their chosen path — elderly wizard reversing his own age, long-bearded sage casting from a tower, heavyset ranger drawing a bow',
};

const STYLE_ANCHOR =
  'fantasy action card illustration, painterly digital art with visible brush texture and semi-realistic rendering, character mid-action ERUPTING with elemental power performing a signature power move, elemental power visibly channeling and bursting THROUGH the character\'s body with glowing element-tinted energy on hands arms chest skin and hair, the world REACTS to the character with dust rising and air distorting and sky answering their element and ground fracturing where they stand, dynamic cinematic pose with kinetic motion and cloth and hair swept by their own power, waist-up 3/4 body composition, single character centered occupying 55 to 70 percent of frame, entire head fully visible, cinematic backlight tinted by the element\'s color, painterly-blurred environmental background with elemental echo';

const BASE_NEGATIVE = [
  'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
  'extra limbs', 'extra fingers', 'disfigured', 'bad anatomy',
  'bad proportions', 'duplicate', 'multiple characters', 'split frame',
  'comic panels', 'UI elements', 'border', 'frame', 'card border',
  'gore', 'graphic violence', 'severed body parts', 'exposed wounds',
  'blood spatter', 'nudity', 'suggestive',
  'head cropped', 'face cropped', 'face cut off', 'forehead cropped',
  'eyes cropped', 'top of head cropped', 'headless', 'decapitated',
  'chin only', 'face out of frame', 'head out of frame',
  'zoomed too close', 'extreme close-up',
  'static portrait pose', 'standing looking at camera', 'passive posture',
  'hands at sides', 'no aura', 'no elemental effect', 'no visible power',
  'identical faces', 'generic fantasy heroine', 'cover-girl face',
  'slim young female default', 'homogenized cast',
  'subtle magic', 'restrained effect', 'muted aura',
  'element only in background not on body', 'element only as ring behind head',
  'younger than previous rank', 'thinner than previous rank',
  'more muscular than previous rank', 'healthier than previous rank',
  'more conventionally attractive than previous rank',
  'disability removed', 'scars erased',
  'generic fantasy stereotype', 'costume-carrying stereotype',
].join(', ');

export interface AssemblePromptInput {
  archetype: ArchetypeName;
  rank: Rank;
  stats: CardStats;
  element: ElementSelection;
  answers: StoryPillarAnswers;
}

export function assemblePortraitPrompt(
  input: AssemblePromptInput,
): { prompt: string; negativePrompt: string } {
  const c = getBibleChapter(input.archetype);
  const elementEffect = ELEMENT_EFFECT[input.element.element as ElementName] ??
    'element manifests visibly through the character body';
  const archetypeAction = ARCHETYPE_ACTION[input.archetype];

  const pillarSeed = input.answers.answers
    .slice(0, 3)
    .map((a) => a.answer)
    .join(' ; ');

  const parts: string[] = [
    STYLE_ANCHOR,
    `Archetype: ${input.archetype} — identity through ${c.identityThrough}`,
    `Recognition cues: ${c.visualDNA.recognitionCues}`,
    `Materials: ${c.symbolAndMaterial.materials}`,
    `Action (${input.archetype}): ${archetypeAction}`,
    `Element-tinted power (${input.element.element}): ${elementEffect}`,
    `Rank carriage (${input.rank}): ${RANK_CARRIAGE[input.rank]}`,
    `Element bond guiding the aesthetic: "${input.element.bond}"`,
  ];

  if (pillarSeed) parts.push(`Story anchors (must be visible): ${pillarSeed}`);
  parts.push('entire head fully in frame, eyes and forehead visible, waist-up 3/4 body composition centered');

  const prompt = parts.join('. ');

  const archetypeNegatives = c.claudeGuidance.avoid.join(', ');
  const negativePrompt = `${BASE_NEGATIVE}, ${archetypeNegatives}`;

  return { prompt, negativePrompt };
}
