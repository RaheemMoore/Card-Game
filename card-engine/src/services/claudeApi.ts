import type { ArchetypeName, CardStats, Rank } from '../types/card';
import type {
  ElementName,
  ElementSelection,
  HiddenFate,
  StoryPillarAnswers,
} from '../types/bible';
import type { AbilityCandidate, AbilitySlotType, CardAbilityReference } from '../types/abilities';
import { getBibleChapter } from '../data/archetypeBible';
import { getQuestionsForArchetype } from '../data/storyPillars';
import { getDefinition, getCurrentVersion, getFamily } from './abilities/registry';
import { assemblePortraitPrompt } from './promptAssembler';
import {
  deriveStatRanks,
  getDominantStat,
  getOverallRank,
  getStatNames,
} from '../data/powerSystem';
import { emptyHiddenFate, parseHiddenFate, preserveIdentityAcrossRanks } from './hiddenFate';
import { buildAbilityPromptFragment, parseAbilityCandidate } from './abilities/promptFragment';

/**
 * Bible-driven card text + portrait prompt generator.
 *
 * Follows Bible §Claude Generation Pipeline (fourteen steps):
 *   1. Global Rules
 *   2. Archetype chapter
 *   3. Story Pillar answers (immutable)
 *   4. Element + bond
 *   5. Classify tensions
 *   6. Preserve valid facts
 *   7. Emotional throughline
 *   8. Coherent summary
 *   9. Hidden Fate
 *   10. Visual identity summary
 *   11. Validate archetype recognition + rank continuity
 *   12. Remove details that do not affect the image
 *   13. Compress Leonardo prompt below 1500 chars
 *   14. Preserve structured facts for future rank evolution
 *
 * Rank continuity is inviolable: no automatic aging, no automatic muscle,
 * no automatic disability erasure, no automatic beauty escalation.
 */

const RANK_MEANINGS: Record<Rank, string> = {
  Foundation:
    'The beginning of their story arc — the character carries their identity into their first depicted battle. This is not a "novice" — they ALREADY command their power at high visible intensity, mid-signature-move. Their story continues from here.',
  Forged:
    'Changed by trials — the character has integrated the consequences of their choices without abandoning who they are. Aura extends far beyond the body; environmental reaction is loud; archetype-appropriate transformations may begin to manifest. Mid-signature-move at legendary scale.',
  Ascendant:
    'Cataclysmic full manifestation — the world CRUMBLES around them, reality tears open, they are EVOLVING BEYOND MORTAL FORM while remaining recognizably the same person. Wings, tails, beast features, spectral silhouettes, constellation-lit skin, demonic marks — non-human features fair game per archetype and element. Bible §Rank continuity still holds: skin tone, base facial structure, ancestry, disability, and scars are the same person. What expands is the POWER DISPLAY on top of that identity. Mid-ULTIMATE — a legend at peak power unleashing their signature ultimate attack.',
};

/**
 * Element-tinted power manifestation library. Every element gets a specific
 * visual grammar so the character's power SHOWS ON THEIR BODY per element,
 * not as a generic aura. Reference: Raheem's feedback 2026-07-19 — "Where is
 * the element shining through their skin?"
 */
const ELEMENT_EFFECT_LIBRARY: Record<ElementName, string> = {
  Fire: 'actual flames licking along the arms and hands, burning ember trails from the fingertips, eyes lit with fire-glow, heat distortion in the air near the body',
  Water: 'water swirling in a controlled ribbon around the arms, droplets suspended mid-air, wet-shining skin catching light, small wave-crest forming at the palms',
  Earth: 'dust cloud swirling around the feet, cracked earth beneath, stone chunks lifting from the ground toward the outstretched hands',
  Wind: 'cloth and hair blown by a gust of the character\'s own making, debris and leaves spiraling around them, translucent wind currents visible',
  Ice: 'frost crystals forming on the skin and forearms, visible breath, ice shards suspended around the body, forearm sheathed in living ice',
  Lightning: 'lightning arcing between the fingers and up the forearms, static charge crackling around the body, sky-flash reflected in the eyes, hair swept upward by static',
  Stone: 'stone plates fused to the skin along the arms and shoulders, rocky chunks orbiting the character, cracked earth beneath the feet',
  Storm: 'lightning arcing between the fingers, storm-charge crackling off the shoulders, a small storm cloud swirling near the head, rain streaking near the body',
  Nature: 'vines curling up the arms and blooming with flowers mid-motion, moss growing on the skin, seeds and petals suspended in air around the character',
  Beast: 'bestial features breaking through — elongated claws extending from the fingertips, feral eye-glow, misty spirit-animal silhouettes prowling behind, fangs revealed',
  Blood: 'red mist rising from the palms, veins glowing red beneath the skin, blood-red particles suspended in the air, red glow around the eyes',
  Poison: 'green-purple miasma rising from the arms, venom dripping and glowing on the fingertips, corroded veins beneath the skin, toxic vapor around the body',
  Metal: 'metal shards levitating and forming weapons around the character, silver-glow on the skin, magnetic pull visible in loose debris, blade-fragments orbiting',
  Spirit: 'translucent ghostly wisps rising from the shoulders and hands, faint spectral silhouettes drifting behind the character, eyes lit with spirit-glow',
  Shadow: 'darkness clinging to the limbs like a second skin, black tendrils extending from the hands, silhouette bleeding into the background',
  Light: 'prismatic beams from the eyes and hands, refracted rainbow around the body, sunburst pattern behind the head, gold light through the skin',
  Sound: 'visible sound waves emanating outward from the character, concentric resonance rings, vibration blur at the hands, air distortion around the mouth',
  Ash: 'gray-black dust rising from the arms, charred cracking patterns on the skin, embers drifting in the air, scorch marks on the ground',
  Holy: 'flame-golden halo around the head burning like sacred torchlight, gold light shining through the skin from within, feathery light drifting in the air, hands aglow with sacred fire',
  Void: 'darkness eating the light around the body, shadow tendrils extending from the hands, points of starless black where the eyes should be, reality warping and cracking at the edges of the frame',
  Time: 'sand or petals suspended mid-fall around the character, temporal distortion blur, clock and hourglass symbols glowing faintly in the air, the character themselves partially aged or de-aged mid-motion',
  Cosmic: 'constellation patterns lit under the skin along the arms and neck, gravity-warped debris and stars orbiting the character, cosmic dust sparkling around, eyes shining with distant starlight',
  Tech: 'glowing circuit lines under the skin along the arms and neck, holographic projections around the hands, energy tools and weapons materializing from thin air, HUD light on the face',
  Psychic: 'purple-pink aura around the head, floating debris and objects orbiting the character, eyes glowing with mental power, faint telekinetic ripples in the air',
  Moon: 'moonlight-silver light through the skin, crescent halo behind the head, moon-phase glyphs on the arms, silver aura wrapping the character',
  Dream: 'iridescent haze wrapping the character, dream-symbols and butterflies floating around them, pastel prismatic color shift, unreal edges',
};

/**
 * Per-archetype action defaults — what "cool action" looks like for each
 * archetype. The prompt weaves this into the pose so a Vampire doesn't
 * end up in the same stance as a Barbarian.
 */
const ARCHETYPE_ACTION_VOCABULARY: Record<ArchetypeName, string> = {
  Barbarian:
    'mid-swing of an inherited weapon with clan sigil visible, roaring stance with the weapon raised high, warband battle-cry mid-charge, or heaving up a massive relic weapon with both hands',
  Monk:
    'mid-form martial arts strike with visible motion trail, chi channeling through open palms, spinning kick mid-air, or deep meditative stance with power aura released outward from the body',
  Beastmaster:
    'alongside their companion mid-hunt or mid-leap with both figures drawing on shared bond, palm raised commanding a beast\'s spirit, or riding their companion mid-charge',
  Druid:
    'arms raised summoning growth from the earth with vines rising, mid-transformation into an animal form, or storm-caller stance with clouds gathering overhead and lightning at the palms',
  Necromancer:
    'mid-cast of a summoning spell with spectral figures emerging from their outstretched hand, whispering to a following spirit that hovers close, or grimoire open mid-page-turn with light spilling from the pages',
  Vampire:
    'mid-transformation into mist or a swarm of bats, fangs revealed with eyes lit red, wing-cloak unfurling behind them, or mid-strike with claw-like hand extended',
  Lycanthrope:
    'mid-slash with elongated claws extended, mid-transformation with fur breaking through the skin and clothing tearing, howling toward the moon overhead, or digitigrade stance mid-leap',
  'Mech Pilot':
    'piloting the mech mid-strike with HUD lit and integrated weapons firing, cockpit open with weapon deployed, or the pilot exposed atop the machine mid-command',
  Android:
    'energy weapon deploying from a chassis panel, mechanical shoulder-plates opening to reveal cores of light, projected weapon materializing in the hand, or holographic construct forming around them',
  Seraph:
    'wings spread mid-flight with feathers burning, sword-of-light drawn and blazing, casting divine light downward from raised hands, or judgment scales manifesting in the air beside them',
  Human:
    'signature tool or weapon mid-use, action appropriate to their chosen path — an elderly wizard reversing his own age with time magic mid-cast, a long-bearded sage casting from a high tower with the storm answering, a heavyset ranger drawing a bow mid-loose, a scholar with runes lighting the air around them; the action fits THEIR specific story',
};

/**
 * Rank-scaled elemental spectacle. Every rank is DRAMATIC — ranks scale from
 * eruption at Foundation to cosmic transcendence at Ascendant. There is no
 * "subtle" rank. Reference: Raheem 2026-07-19 — "Foundation shouldn't be
 * standing calmly. Every rank shows active power. The power radiating off
 * of them at Ascendant needs to be ULTIMATE."
 */
const ELEMENT_SPECTACLE_BY_RANK: Record<Rank, string> = {
  Foundation:
    'The element ERUPTS visibly through the character\'s body — flame on the arms and shoulders, lightning arcing between the fingers, wisps rising from the skin, ice forming on the forearms. The character is mid-signature-move — a martial strike, a spell mid-cast, a weapon being drawn with the element already flaring. Aura is bold, legible, and reaches beyond the body. This is a person who ALREADY commands their power at high visible intensity. Air and ground around them show the first signs of reacting.',
  Forged:
    'Element manifestation escalates dramatically — the aura extends far beyond the body, elemental effects deepen and multiply (a flame arm becomes a flame torso and floating fire runes; a lightning finger becomes an arm sheathed in lightning with a storm cloud gathering above; spirit wisps become an aura-halo of spectral silhouettes). Environmental reaction is loud — ground scorched or frozen, air torn, sky darkened, water surging, plants blooming or withering. The character\'s body may begin to show archetype-appropriate transformations (Seraph wings starting to unfurl, Lycanthrope claws lengthening, Vampire eyes flame-lit, Necromancer half-spectral). Mid-signature-power-move at legendary scale.',
  Ascendant:
    'CATACLYSMIC full manifestation. The world CRUMBLES and REACTS to the character\'s presence — reality tears open, the sky shatters, the ground fractures, the environment collapses toward the element (fire user = the frame burns; void user = reality cracks into starless black; cosmic user = space warps and stars orbit the character; storm user = the sky is a hurricane centered on them; holy user = pillars of light pierce the environment). The character is EVOLVING BEYOND MORTAL FORM while remaining recognizably the same person — non-human features appropriate to archetype and element MANIFEST VISIBLY (Seraph wings fully spread and burning; Lycanthrope digitigrade wolf form; Vampire mist-and-bats swirling; Necromancer body half-transparent with the veil; Cosmic-element wielder skin lit with constellation patterns; Demon-element wielder with demonic marks; wings, tails, beast features, spectral silhouettes, mist forms all fair game per archetype). Mid-ULTIMATE — a cinematic pose of a legend at peak power unleashing their signature ultimate attack. Bible §Rank continuity still holds: skin tone, base facial structure, ancestry, disability, and scars are the same person; what expands is the power display on top of that identity.',
};

const PORTRAIT_PROMPT_MAX = 1300;
const NEGATIVE_PROMPT_MAX = 400;

const BASE_NEGATIVE = [
  'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
  'extra limbs', 'extra fingers', 'disfigured', 'bad anatomy',
  'bad proportions', 'duplicate', 'multiple characters', 'split frame',
  'comic panels', 'UI elements', 'border', 'frame', 'card border',
  'gore', 'graphic violence', 'severed body parts', 'exposed wounds',
  'blood spatter', 'nudity', 'suggestive',
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
  'identical faces', 'generic fantasy heroine', 'cover-girl face',
  'slim young female default', 'homogenized cast', 'same face every card',
  // M3.7 — anti-modesty.
  'subtle magic', 'restrained effect', 'muted aura',
  'element only in background not on body',
  'element only as ring behind head',
  // Bible §Rank continuity forbids automatic escalation across ranks.
  'younger than previous rank', 'thinner than previous rank',
  'more muscular than previous rank', 'healthier than previous rank',
  'more conventionally attractive than previous rank',
  'disability removed', 'scars erased',
  // Bible §14 universal Avoid signals across archetypes.
  'generic fantasy stereotype', 'costume-carrying stereotype',
].join(', ');

/**
 * Style anchor — MUST open every portraitPrompt verbatim. M3.7 rewrite
 * (2026-07-19): dropped the Magic-the-Gathering / Hearthstone reference
 * that primed Phoenix toward posed cover-girl portraits, replaced with
 * an ACTION + ERUPTION framing per Raheem's clarifying direction.
 *
 * Key traits:
 * - Fantasy ACTION card illustration (not portrait collection)
 * - Character mid-action erupting with elemental power
 * - Element visibly channeling through the body, not just as backdrop
 * - The world reacts to the character
 * - Kinetic pose with cloth and hair in motion
 * - Waist-up 3/4 body composition, character occupies 55–70% of frame
 * - Cinematic backlight tinted by the element
 */
const STYLE_ANCHOR =
  'fantasy action card illustration, painterly digital art with visible brush texture and semi-realistic rendering, character mid-action ERUPTING with elemental power performing a signature power move appropriate to their archetype and element, elemental power visibly channeling and bursting THROUGH the character\'s body with glowing element-tinted energy on hands arms chest skin and hair, the character\'s OWN body is the source of the power display, the world REACTS to the character with dust rising and air distorting and sky answering their element and ground fracturing where they stand, dynamic cinematic pose with kinetic motion, cloth and hair swept by their own power, particles and debris in the air around them, waist-up 3/4 body composition, single character centered occupying 55 to 70 percent of frame, entire head fully visible, cinematic backlight and rim-light tinted by the element\'s color, high contrast, painterly-blurred environmental background carrying narrative meaning and elemental echo';

interface GeneratedText {
  cardName: string;
  nameAndTitle: string;
  lore: string;
  /** Compressed Leonardo prompt, guaranteed <= PORTRAIT_PROMPT_MAX chars. */
  portraitPrompt: string;
  negativePrompt: string;
  /** Bible §Hidden Fate — what Claude inferred to complete the picture. */
  hiddenFate: HiddenFate;
  /**
   * Ability candidate for the requested slot. Present when abilitySlotToFill
   * is provided. Undefined when Claude omits or malforms the field.
   */
  abilityCandidate?: AbilityCandidate;
}

// ============================================================================
// Prompt assembly
// ============================================================================

function formatAnswers(archetype: ArchetypeName, answers: StoryPillarAnswers): string {
  const questions = getQuestionsForArchetype(archetype);
  const questionById = new Map(questions.map((q) => [q.id, q]));
  return answers.answers
    .map((a) => {
      const q = questionById.get(a.questionId);
      return q ? `Q: ${q.prompt}\nA: ${a.answer}` : `A: ${a.answer}`;
    })
    .join('\n');
}

function formatStats(stats: CardStats, archetype: ArchetypeName): string {
  const ranks = deriveStatRanks(stats);
  return getStatNames(archetype)
    .map((name) => {
      const entry = stats[name]!;
      return `${name} ${entry.value} (${ranks[name]}, bias ${entry.bias})`;
    })
    .join(', ');
}

/**
 * Formats a card's existing ability refs into a prompt block so Claude can
 * weave each ability's visual signature into the portrait. Returns empty
 * string when the card has no existing abilities (Foundation forge).
 */
function formatAbilityContext(refs?: CardAbilityReference[]): string {
  if (!refs || refs.length === 0) return '';
  const lines: string[] = [];
  for (const ref of refs) {
    const def = getDefinition(ref.abilityId);
    if (!def) continue;
    const version = getCurrentVersion(ref.abilityId);
    const familyNames = def.familyIds.map((id) => getFamily(id)?.name ?? id).join(' + ');
    const effectSummary = version?.effects
      .map((e) => e.type.replace(/_/g, ' '))
      .join(', ') ?? '';
    lines.push(
      `- ${def.displayName} (${ref.slotType}, families: ${familyNames}${effectSummary ? `; effects: ${effectSummary}` : ''}) — ${def.descriptionShort}`,
    );
  }
  return lines.join('\n');
}

function formatBibleChapter(archetype: ArchetypeName): string {
  const c = getBibleChapter(archetype);
  return [
    `IDENTITY THROUGH: ${c.identityThrough}`,
    `CORE FANTASY: ${c.coreFantasy}`,
    `CORE FANTASY PROMISE: ${c.coreFantasyPromise.promise}`,
    `EMOTIONAL PILLARS: ${c.coreFantasyPromise.emotionalPillars.join(', ')}`,
    `ORIGINS: ${c.origins}`,
    `CULTURE AND DAILY LIFE: ${c.cultureAndDailyLife}`,
    `VIRTUES: ${c.beliefs.virtues.join(', ')}`,
    `TABOOS: ${c.beliefs.taboos.join(', ')}`,
    `FEARS: ${c.beliefs.fears.join(', ')}`,
    `INTERNAL DIVERSITY: ${c.internalDiversity.groups.join('; ')}`,
    `VISUAL DNA (recognition cues): ${c.visualDNA.recognitionCues}`,
    `VISUAL DNA (AVOID): ${c.visualDNA.avoid}`,
    `MATERIALS: ${c.symbolAndMaterial.materials}`,
    `SYMBOLS: ${c.symbolAndMaterial.symbols}`,
    `GENERATION PRIORITIES: ${c.claudeGuidance.generationPriorities.join(', ')}`,
    `AVOID (§14): ${c.claudeGuidance.avoid.join(', ')}`,
    `RECOGNITION CHECKLIST: ${c.claudeGuidance.recognitionChecklist.join(' | ')}`,
  ].join('\n');
}

function buildPrompt(input: {
  archetype: ArchetypeName;
  stats: CardStats;
  answers: StoryPillarAnswers;
  element: ElementSelection;
  overallRank: Rank;
  existingName?: string;
  existingHiddenFate?: HiddenFate;
  abilitySlotToFill?: AbilitySlotType;
  existingAbilityRefs?: CardAbilityReference[];
}): string {
  const { archetype, stats, answers, element, overallRank, existingName, existingHiddenFate, abilitySlotToFill, existingAbilityRefs } = input;
  const c = getBibleChapter(archetype);
  const isEvolution = Boolean(existingName);
  const rankProgression = c.rankEvolution[overallRank];
  const continuityNote = c.rankEvolution.continuityNote ?? '';
  const abilityContext = formatAbilityContext(existingAbilityRefs);
  const elementSpectacle = ELEMENT_SPECTACLE_BY_RANK[overallRank];

  return `You are the generation authority for a fantasy card game. You are following the Character Generation Bible, which is the canonical source of truth. Ignore any prior stylistic conventions from other fantasy games or previous versions of this game.

=== BIBLE GLOBAL RULES (inviolable) ===
- Every archetype supports the full diversity of real bodies: fat, heavyset, soft-bodied, average-built, muscular, lean, wiry, tall and narrow, short and broad, gaunt, sickly, elderly, disabled, scarred, and visibly weathered. Archetype identity comes from culture, history, beliefs, role, equipment, and lived history — NEVER from one required heroic physique.
- Rank progression preserves sex, age, body type, ancestry, disability, physical condition, defining scars, and core identity. Advancement must NOT automatically make a character younger, thinner, more muscular, healthier, less disabled, or more conventionally attractive. What EXPANDS across ranks is the power display on top of that identity — element effects, aura scale, non-human features (wings, tails, spectral silhouettes) appropriate to the archetype and element.
- Player-selected Story Pillar answers are IMMUTABLE generation facts. You may connect and interpret them, but must not ignore, replace, soften, or contradict them.
- Prestige roles (Alpha, Grandmaster, Archdruid, Clan Chief, Blood Regent, and equivalents) emerge from narrative — you do NOT invent one uninvited. If none is warranted, leave the epithet in the range of ordinary earned titles.
- Element rarity affects DISCOVERY FREQUENCY, not power. Do not treat the Rare bucket as "stronger" — it is less common.
- Hidden Fate details you infer must REINFORCE the player's story, not compete with it.

=== DIVERSITY GUARDRAIL (character generation intent) ===
Bible §Character diversity is DESIGN INTENT, not a hedge. When you write hiddenFate.age, hiddenFate.sex, hiddenFate.bodyType, hiddenFate.skinTone, hiddenFate.disabilityOrCondition, hiddenFate.scars — actively choose AWAY from the slim young female default. Roll for elderly, heavyset, muscular, gaunt, disabled, scarred, non-female, and diverse-ancestry bodies. Cards test our claim that everyone can become powerful with enough training and luck. Encode that in the identity you invent.

Better-Bible-compliance examples than "young slim woman":
- An elderly wizard reversing his own age mid-cast with time magic
- A long-bearded sage in a high tower channeling storm from his palms
- A heavyset ranger drawing a bow mid-loose with the string humming with wind
- A one-armed Seraph with wings burning around a stump-shoulder prosthetic
- A Black necromancer whose spectral wisps rise from calloused hands
- A gray-haired dwarf-heavy Barbarian shouldering a two-handed relic weapon
- A wide-hipped middle-aged Vampire mid-mist-transformation
- A scarred Lycanthrope elder mid-slash with weathered claws

Diverse people wielding cataclysmic power is the through-line. If your last three hiddenFate rolls skewed to the young/slim/female/white default, actively break the pattern this call.

=== ARCHETYPE CHAPTER (${archetype}) ===
${formatBibleChapter(archetype)}

=== RANK ===
Overall rank: ${overallRank}
${RANK_MEANINGS[overallRank]}
Rank progression for this archetype: ${rankProgression}
${continuityNote ? `Continuity note: ${continuityNote}` : ''}

=== STATS ===
${formatStats(stats, archetype)}
Dominant stat: ${getDominantStat(stats) ?? 'None (tied)'}

=== STORY PILLAR ANSWERS (immutable) ===
${formatAnswers(archetype, answers)}

=== ELEMENT + BOND ===
Element: ${element.element}
Compatibility bucket: ${element.compatibility}
Bond: "${element.bond}"
The element and bond must affect biography, environment, materials, equipment, posture, visible effects, and ability flavor. Bond guidance: interpret the bond literally — an "inheritance" element is inherited; a "prison" element restricts; a "teacher" element guides; an "ally" element cooperates.

=== ELEMENT-TINTED POWER (${element.element}) ===
Element-specific visual grammar — how ${element.element} SHOWS ON THE CHARACTER'S BODY:
${ELEMENT_EFFECT_LIBRARY[element.element as ElementName] ?? 'element manifests visibly through the character body, aura and effect grounded in element identity'}

=== ARCHETYPE ACTION (${archetype}) ===
What "cool action" looks like for a ${archetype}:
${ARCHETYPE_ACTION_VOCABULARY[archetype]}

=== RANK ELEMENT SPECTACLE (${overallRank}) ===
${elementSpectacle}

This is a fantasy card BATTLE game. Every card is an action shot — element ERUPTS through the body, character is mid-signature-move, world reacts. The rank determines SCALE, not presence. Even Foundation shows dramatic element manifestation. The player picked "${element.element}" with bond "${element.bond}" — element MUST show on the body per the ELEMENT-TINTED POWER block above, action MUST fit the archetype per the ARCHETYPE ACTION block above.

${abilityContext ? `=== EXISTING ABILITIES ON THIS CARD (weave their visual signature into the portrait) ===
${abilityContext}
Weave each ability's visual signature into the portraitPrompt as concrete objects, effects, or pose. If the ability is "Ember Cleave" (fire + martial), the sword or weapon should be visibly wreathed in fire in the pose. If the ability is "Soul Drain" (necromancy), spectral hands, drifting spirits, or drawn-out lifelight should be visible. Ability spectacle intensifies with rank per the ELEMENT SPECTACLE block above.
` : ''}

${existingHiddenFate ? `=== LOCKED HIDDEN FATE (Rank continuity — preserve verbatim, HARD CONSTRAINT) ===
This character has already been generated at at least one lower rank. Rank continuity is INVIOLABLE per Bible §Rank continuity. The following identity anchors MUST NOT change and MUST be echoed verbatim in your hiddenFate output AND woven verbatim into your portraitPrompt IDENTITY BLOCK.

- age: "${existingHiddenFate.age}"  (return this string verbatim in hiddenFate.age; the character reads OLDER in language cues, never younger)
- sex: "${existingHiddenFate.sex}"  (return this string verbatim; no shift)
- bodyType: "${existingHiddenFate.bodyType}"  (return this string verbatim; if it says "heavyset", the Ascendant is heavyset — DO NOT slim, DO NOT gain a "warrior figure", DO NOT trade for elegance)
- skinTone: "${existingHiddenFate.skinTone}"  (verbatim; no lightening, no dulling)
- facialStructure: "${existingHiddenFate.facialStructure}"  (verbatim; same face)
- hair: "${existingHiddenFate.hair}"  (verbatim; may add gray if age forward, may not restyle away entirely)
- disabilityOrCondition: "${existingHiddenFate.disabilityOrCondition}"  (verbatim; a prosthetic stays; a scar-shut eye stays; no healing)
- scars: "${existingHiddenFate.scars}"  (verbatim; scars deepen never disappear)

IF you write anything in portraitPrompt or hiddenFate that contradicts an anchor above, you have failed the Bible §Rank continuity rule. Failure examples that will be REJECTED:
- Foundation bodyType "heavyset with barrel chest" → Ascendant portraitPrompt describes "slim" / "elegant" / "narrow-shouldered" / "warrior figure"
- Foundation disability "prosthetic left leg" → Ascendant portraitPrompt shows both legs
- Foundation scars "burn scar across left cheek" → Ascendant portraitPrompt shows unmarked skin
` : ''}

${existingName ? `=== EVOLUTION CONTEXT (cardName lock — HARD CONSTRAINT) ===
This character's cardName is "${existingName}". Your JSON response MUST return cardName EXACTLY "${existingName}" — do not restyle, do not shorten, do not lengthen, do not translate. "Miren" stays "Miren", not "Miriam", not "Mira". The TITLE (nameAndTitle after the comma) MAY evolve to reflect the ${overallRank} rank per Bible §9. Example: Foundation nameAndTitle "Miren, Keeper of Names" → Ascendant nameAndTitle "Miren, Living Archive" — cardName remains "Miren" in both.

Generate NEW lore that reflects the ${overallRank} rank. If the archetype's approved prestige roles are earned by the story pillar answers, you MAY reference one in the title — but only if plainly earned.
` : ''}

=== YOUR TASK ===
Follow the Bible generation pipeline internally:
  a) Read the archetype chapter, the Story Pillar answers, and the element + bond.
  b) Classify tensions between answers — compatible, productive tension, or hard contradiction. Preserve productive tension; only flag factual impossibilities.
  c) Identify the strongest emotional throughline from the Emotional Pillars.
  d) Generate a coherent character summary (do not output — internal use).
  e) Infer Hidden Fate for age, sex, bodyType, skinTone, facialStructure, hair, disabilityOrCondition, posture, scars, weather, lighting, clothingConstruction, minorAccessories, environmentDetails. These MUST reinforce the answers.
  f) Compose the visual summary, then compress it into a Leonardo prompt below ${PORTRAIT_PROMPT_MAX} characters.

Return ONLY a JSON object with these fields:

{
  "cardName": ${existingName ? `MUST be exactly "${existingName}" — do not change.` : 'a 1-3 word name that fits the archetype\'s culture and the answers'},
  "nameAndTitle": "full name with epithet, e.g. \\"Kaelen, Keeper of Names\\". Ordinary earned title — no prestige role unless the answers plainly earn it.",
  "lore": "2-3 sentences of flavor text. Weave the Story Pillar answers into the mood WITHOUT quoting them literally. Reflect the emotional throughline you identified. ${isEvolution ? `Reference the character's growth into ${overallRank} — same person, deepened by trials.` : ''}",
  "portraitPrompt": "single dense comma-separated Leonardo prompt under ${PORTRAIT_PROMPT_MAX} characters. Construct it in this ORDER:\\n  1. STYLE_ANCHOR verbatim — open with: \\"${STYLE_ANCHOR}\\"\\n  2. IDENTITY BLOCK — verbatim age/sex/bodyType/skinTone/facialStructure/hair/disabilityOrCondition/scars ${existingHiddenFate ? 'from LOCKED HIDDEN FATE above (verbatim)' : 'from the Hidden Fate you inferred'}. Same person, do NOT homogenize to slim young defaults, encode the diversity guardrail above.\\n  3. ARCHETYPE ACTION — pull the ${archetype} action vocabulary from the ARCHETYPE ACTION block above and write the character mid-that-action.\\n  4. ELEMENT-TINTED POWER — pull the ${element.element} visual grammar from the ELEMENT-TINTED POWER block above; the element ERUPTS through the character's body per that grammar.\\n  5. RANK SPECTACLE — apply the ${overallRank} scaling from the RANK ELEMENT SPECTACLE block above (Foundation erupts already, Forged escalates + environment cracks + non-human features may begin, Ascendant world crumbles + character evolves beyond mortal form with wings/tails/beast features per archetype).\\n  6. Ability spectacle — visual signature of the character's abilities per the EXISTING ABILITIES block, woven into pose or effects.\\n  7. Story-Pillar-derived materials, symbols, and specific objects the answers named.\\n  8. Weather + lighting + environmentDetails from Hidden Fate — should carry elemental echo (fire user in burning environment, void user in cracking reality, etc.).\\n  9. Composition closer — MUST END with: 'entire head fully in frame, eyes and forehead visible, waist-up 3/4 body composition centered'.\\n${overallRank === 'Ascendant' ? "This is a CATACLYSMIC Ascendant portrait — reality crumbles around them, the world reacts to their ultimate, non-human features (wings, tails, beast features, spectral silhouettes, constellation-lit skin, demonic marks) manifest per archetype and element. BUT the same skinTone/bodyType/ancestry/age/scars/disability from LOCKED HIDDEN FATE are preserved — heavyset stays heavyset, elderly stays elderly, disabled stays disabled, ancestry stays ancestry. What EXPANDS is the power display on top of that identity. Bible §Visual quality rule: remove the power effects and the character is still recognizable through silhouette + body + materials + face." : ''} Do NOT contradict any locked identity above.",
  "negativePrompt": "starts with \\"${BASE_NEGATIVE}\\" then add archetype-specific §14 Avoid items and any anti-continuity terms that fit this specific character. Comma-separated, under ${NEGATIVE_PROMPT_MAX} characters.",
  "hiddenFate": {
    "age": "e.g. 'early 60s' — inferred from the answers, LOCKED after this call",
    "sex": "male / female / nonbinary / androgynous — respect the answers where relevant",
    "bodyType": "specific — do NOT default to 'lean and wiry' or 'athletic'; roll for real variety per Bible diversity mandate",
    "skinTone": "specific, from any real-world human descent",
    "facialStructure": "specific",
    "hair": "specific",
    "disabilityOrCondition": "if applicable, name it; empty string if not — but Bible diversity mandate says roll for it more than you would by default",
    "posture": "how they hold themselves — reflects role and answers",
    "scars": "specific if any; empty string if none",
    "weather": "reinforces the answers",
    "lighting": "reinforces the answers",
    "clothingConstruction": "materials + repair state per §8",
    "minorAccessories": "small tokens that reference specific answers",
    "environmentDetails": "reinforces the answers"
  }${abilitySlotToFill ? `,
  "abilityCandidate": { see ABILITY GENERATION block below }` : ''}
}

${abilitySlotToFill ? buildAbilityPromptFragment({ archetype, stats, rank: overallRank, slotType: abilitySlotToFill }) : ''}

Respond with ONLY valid JSON, no markdown, no explanation. Ensure portraitPrompt is under ${PORTRAIT_PROMPT_MAX} chars — hard cap from the image API.`;
}

// ============================================================================
// Public entry point
// ============================================================================

export interface GenerateCardTextInput {
  archetype: ArchetypeName;
  stats: CardStats;
  answers: StoryPillarAnswers;
  element: ElementSelection;
  /** Provided on tier-up / regeneration — enforces Bible §Rank continuity. */
  existingHiddenFate?: HiddenFate;
  /** Provided on tier-up — locks the card name. */
  existingName?: string;
  /** Foundation forge = 'core'; Forged tier-up = 'signature'; Ascendant tier-up = 'ultimate'. */
  abilitySlotToFill?: AbilitySlotType;
  /**
   * The card's existing ability refs, so Claude can weave their visual
   * signatures into the portrait prompt. Foundation forge omits this;
   * tier-up passes the current-rank refs before the new slot fills.
   */
  existingAbilityRefs?: CardAbilityReference[];
}

export async function generateCardText(input: GenerateCardTextInput): Promise<GeneratedText> {
  const overallRank = getOverallRank(input.stats);

  const prompt = buildPrompt({
    archetype: input.archetype,
    stats: input.stats,
    answers: input.answers,
    element: input.element,
    overallRank,
    existingName: input.existingName,
    existingHiddenFate: input.existingHiddenFate,
    abilitySlotToFill: input.abilitySlotToFill,
    existingAbilityRefs: input.existingAbilityRefs,
  });

  // Model selection — Sonnet for tier-ups (existingName present) to reduce
  // cardName / body-lock compliance drift observed with Haiku. Foundation
  // forges stay on Haiku (Sonnet is bundled cost — no player-visible price
  // change; see PREMIUM_PRICE_CATALOG for governance).
  const model = input.existingName
    ? 'claude-sonnet-5'
    : 'claude-haiku-4-5-20251001';

  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('No Anthropic API set — using fallback generator');
      return generateFallbackText(input, overallRank);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1800,
        temperature: 1,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const raw = data.content[0].text;
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(text) as Partial<GeneratedText>;

    if (!parsed.cardName || !parsed.nameAndTitle || !parsed.lore) {
      throw new Error('Incomplete response — missing lore fields');
    }

    const composed = composePortraitFallback(input, overallRank);
    const portraitPrompt = truncateToLimit(parsed.portraitPrompt ?? composed.prompt, PORTRAIT_PROMPT_MAX);
    const negativePrompt = truncateToLimit(parsed.negativePrompt ?? composed.negativePrompt, NEGATIVE_PROMPT_MAX);

    // Hidden Fate: parse what Claude returned, then enforce Bible §Rank
    // continuity — if the caller passed an existingHiddenFate, locked
    // fields must survive verbatim.
    let hiddenFate = parseHiddenFate(parsed.hiddenFate);
    if (input.existingHiddenFate) {
      hiddenFate = preserveIdentityAcrossRanks(input.existingHiddenFate, hiddenFate);
    }

    const abilityCandidate = input.abilitySlotToFill
      ? parseAbilityCandidate((parsed as unknown as { abilityCandidate?: unknown }).abilityCandidate)
      : undefined;

    // Bug 2 fix — hard cardName lock. If a tier-up call receives a
    // different cardName than existingName, we do NOT trust Claude and
    // overwrite with existingName. The title/epithet in nameAndTitle
    // is free to evolve; only the leading name is locked.
    let cardName = parsed.cardName;
    let nameAndTitle = parsed.nameAndTitle;
    if (input.existingName && parsed.cardName !== input.existingName) {
      console.warn(
        `Claude drifted cardName "${input.existingName}" → "${parsed.cardName}". Overwriting with existingName; patching nameAndTitle.`,
      );
      cardName = input.existingName;
      // Best-effort: replace the leading name in nameAndTitle up to the first comma.
      const commaIdx = parsed.nameAndTitle.indexOf(',');
      nameAndTitle = commaIdx >= 0
        ? `${input.existingName}${parsed.nameAndTitle.slice(commaIdx)}`
        : input.existingName;
    }

    return {
      cardName,
      nameAndTitle,
      lore: parsed.lore,
      portraitPrompt,
      negativePrompt,
      hiddenFate,
      abilityCandidate,
    };
  } catch (err) {
    console.error('Claude API error, using fallback:', err);
    return generateFallbackText(input, overallRank);
  }
}

// ============================================================================
// Fallbacks
// ============================================================================

function composePortraitFallback(input: GenerateCardTextInput, rank: Rank): { prompt: string; negativePrompt: string } {
  const anchor = input.existingHiddenFate
    ? `${input.existingHiddenFate.sex}, ${input.existingHiddenFate.skinTone}, ${input.existingHiddenFate.bodyType}, ${input.existingHiddenFate.hair}, ${input.existingHiddenFate.disabilityOrCondition ? `${input.existingHiddenFate.disabilityOrCondition}, ` : ''}${input.existingHiddenFate.scars ? `${input.existingHiddenFate.scars}, ` : ''}same character across ranks, identical facial structure and skin tone`
    : '';
  const { prompt, negativePrompt } = assemblePortraitPrompt({
    archetype: input.archetype,
    rank,
    stats: input.stats,
    element: input.element,
    answers: input.answers,
  });
  const finalPrompt = anchor ? `${prompt}. IDENTITY (must be preserved): ${anchor}` : prompt;
  return {
    prompt: truncateToLimit(finalPrompt, PORTRAIT_PROMPT_MAX),
    negativePrompt: truncateToLimit(negativePrompt, NEGATIVE_PROMPT_MAX),
  };
}

function generateFallbackText(input: GenerateCardTextInput, rank: Rank): GeneratedText {
  const c = getBibleChapter(input.archetype);
  const { prompt: portraitPrompt, negativePrompt } = composePortraitFallback(input, rank);
  const hiddenFate = input.existingHiddenFate ?? emptyHiddenFate();
  const name = input.existingName ?? `Unnamed ${input.archetype}`;
  return {
    cardName: name,
    nameAndTitle: `${name}, of the ${c.internalDiversity.groups[0] ?? 'unnamed order'}`,
    lore: `A ${rank.toLowerCase()} ${input.archetype.toLowerCase()} whose story is still being written.`,
    portraitPrompt,
    negativePrompt,
    hiddenFate,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const window = text.slice(0, limit);
  const lastComma = window.lastIndexOf(',');
  if (lastComma > limit * 0.6) return window.slice(0, lastComma);
  return window;
}
