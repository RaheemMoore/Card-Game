import { callAnthropicMessages } from './anthropicClient';
import type { ArchetypeName, CardStats, Rank } from '../types/card';
import type {
  ElementName,
  ElementSelection,
  HiddenFate,
  StoryPillarAnswers,
} from '../types/bible';
import type { AbilityCandidate, AbilitySlotType, CardAbilityReference } from '../types/abilities';
import { getBibleChapter } from '../data/archetypeBible';
import { ELEMENT_VISUAL_LANGUAGE, assembleElementLockdown } from '../data/elementVisualLanguage';
import { assembleBodySkinBlock, BODY_SKIN_NEGATIVES } from '../data/bodySkinBible';
import { assembleHairFashionBlock, HAIR_FASHION_NEGATIVES } from '../data/hairFashionBible';
import {
  NAMING_BIBLE,
  NAMING_BANNED_TROPES,
  NAME_STRUCTURE_LABELS,
  EPITHET_BY_RANK,
  NAMING_QUALITY_REMINDERS,
  rotateSlice,
} from '../data/namingBible';
import { getRecentNames, formatRecentForPrompt, recordName, detectCollision } from './nameHistory';
import { getQuestionsForArchetype } from '../data/storyPillars';
import { getDefinition, getCurrentVersion, getFamily } from './abilities/registry';
// M4.9 — assemblePortraitPrompt (from promptAssembler.ts) removed; the
// pre-Bible fallback path was deleted along with promptAssembler.ts itself.
import {
  deriveStatRanks,
  getDominantStat,
  getOverallRank,
  getStatNames,
} from '../data/powerSystem';
import { parseHiddenFate, preserveIdentityAcrossRanks } from './hiddenFate';
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
 * M4.2 — fantasy-humor quirk pool. Rolled ~25% of the time (every 4th
 * forge via localStorage cursor). Injected as an optional clause the
 * portrait prompt weaves into the frame. Keeps the tone playful.
 */
const ELEMENT_QUIRK_POOL: Record<ElementName, readonly string[]> = {
  Fire: [
    'a tiny curl of BBQ-cooking smoke somewhere in the frame',
    'a matchbook tucked into their belt',
    'one candle held mid-lit in the offhand',
    'a marshmallow-on-a-stick charred and forgotten at their feet',
  ],
  Water: [
    'a fish leaping in the ribbon of water',
    'a tiny rubber duck floating in the water swirl',
    'a teakettle steaming somewhere in the frame',
    'a wet umbrella hanging from a belt loop',
  ],
  Earth: [
    'a potted plant somehow surviving the earthquake',
    'a rock-collector\'s pouch overflowing on their belt',
    'a small gecko or lizard perched on their shoulder',
  ],
  Wind: [
    'a paper airplane spiraling in the gust',
    'a wind-chime hanging from a nearby structure',
    'a kite string trailing from their wrist',
    'a leaf stuck to their cheek mid-motion',
  ],
  Ice: [
    'a frozen tavern tankard in one hand',
    'a small ice-skate skid mark under their foot',
    'a snowman half-formed in the background',
  ],
  Lightning: [
    'a jar of pickles with a bolt jumping into it',
    'a battery-lantern flickering nearby',
    'their hair frizzed comically upward',
  ],
  Stone: [
    'a small pet turtle at their feet',
    'a rock they clearly named, tucked in a pocket',
    'stone dust caked comically on the boots',
  ],
  Storm: [
    'an umbrella turned inside-out flying past',
    'a weathervane spinning wildly in the background',
    'a wet cat sheltering under their cloak',
  ],
  Nature: [
    'a bee hovering near their shoulder',
    'a bird\'s nest woven into their hair',
    'a small mushroom growing on their pauldron',
    'a squirrel hoarding acorns at their feet',
  ],
  Beast: [
    'a tiny cub or kit trotting alongside them',
    'a chewed bone at their feet',
    'feathers stuck comically in their hair',
    'a rabbit peeking from a hip pouch',
  ],
  Blood: [
    'a wine glass held incongruously in one hand',
    'a phlebotomy vial on their belt',
    'a rose with red petals scattering nearby',
  ],
  Poison: [
    'a small vial with a skull label on their belt',
    'a bubbling potion in one gloved hand',
    'a squished dead fly on their pauldron',
  ],
  Metal: [
    'a swiss-army-style multi-tool clipped to their belt',
    'a magnetic pincushion stuck to their arm',
    'a bent spoon floating in orbit with the shards',
  ],
  Spirit: [
    'a translucent pet ghost cat rubbing against their leg',
    'a scroll unfurling behind them with spirit-signatures',
    'a candle-in-a-lantern held aloft',
  ],
  Shadow: [
    'a raven or crow perched on their shoulder',
    'their own shadow doing something slightly different than they are',
    'a tiny black cat weaving between their ankles',
  ],
  Light: [
    'a hand-mirror reflecting a prism onto the wall behind',
    'a stained-glass fragment held aloft',
    'a chorus of tiny sun-motes orbiting',
  ],
  Sound: [
    'a fantasy-styled stereo horn or speaker-tower behind them',
    'a lute or drum kit at their feet',
    'concert-tower riggings in the background',
    'a boombox held under one arm',
    'a fantasy microphone dropped mid-air',
    'stacked amps made of stone',
  ],
  Ash: [
    'a burnt scroll fragment tucked into their belt',
    'a phoenix feather (still smoldering) in their hair',
    'a small pile of ash spelling their name at their feet',
  ],
  Holy: [
    'a hymnal book held open, pages fluttering',
    'a censer swinging on a chain from their wrist',
    'a stray choir-boy peeking from behind a pillar',
  ],
  Void: [
    'a single black envelope drifting past',
    'a piece of paper folded into origami of nothing',
    'a stopped-mid-air raindrop of ink',
  ],
  Time: [
    'a broken pocket-watch chained to their belt',
    'an antique hourglass at their feet',
    'a calendar page tearing free in the air',
  ],
  Cosmic: [
    'a tiny orbiting satellite around them',
    'a small comet with a trailing tail',
    'a floating astronaut helmet at their feet',
    'a mini-planet orbiting the head',
  ],
  Tech: [
    'a floating hologram of a to-do list next to their head',
    'a cable trailing from their arm to nothing',
    'a coffee mug with steam holograph',
    'a floating "system booting" notification',
    'a stylus tucked behind their ear',
  ],
  Psychic: [
    'a levitating teacup and spoon stirring itself',
    'floating chess pieces mid-move',
    'a hovering pencil scribbling a note in the air',
  ],
  Moon: [
    'a tiny sleeping owl perched on a shoulder',
    'a jar of moonwater on their belt',
    'a lunar tide-chart unfurled in the air',
  ],
  Dream: [
    'a floating fish swimming through the air',
    'a door standing alone in the background with nothing behind it',
    'a music-box lid open playing a silent tune',
  ],
};

const QUIRK_CURSOR_KEY = 'card-engine-quirk-cursor';
const QUIRK_EVERY_N_FORGES = 4;

function pickElementQuirk(element: ElementName): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(QUIRK_CURSOR_KEY);
  const cursor = raw ? (parseInt(raw, 10) || 0) : 0;
  window.localStorage.setItem(QUIRK_CURSOR_KEY, String((cursor + 1) % 1000));
  if (cursor % QUIRK_EVERY_N_FORGES !== 0) return null;
  const pool = ELEMENT_QUIRK_POOL[element];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}


/**
 * M4.0 — per-archetype pose pools. Phoenix locked onto a single T-pose /
 * "orb-per-fist" composition when given a menu of options. Rotating a
 * SPECIFIC pose per forge (localStorage cursor) forces variety.
 * 8 poses each so a player can forge the same archetype 8 times before
 * seeing a repeat.
 */
const ARCHETYPE_POSE_POOLS: Record<ArchetypeName, readonly string[]> = {
  Barbarian: [
    'overhead cleave mid-swing, weapon coming down at the viewer, weight forward on the front foot',
    'roaring stance mid-charge with weapon raised aloft, shoulders back, mouth open in a battle-cry',
    'low berserker guard, feet wide, weapon held sideways ready to sweep, glare directly at viewer',
    'heaving up a massive relic weapon with both hands, back arched, weapon almost overhead',
    'mid-tackle grapple, one shoulder driving forward, weapon dropped at their feet',
    'planting a battle-standard into the ground with one hand, other hand raised in a call',
    'shieldwall brace, shield forward and low, spear-hand cocked back, feet planted',
    'follow-through of a thrown axe, torso twisted, arm extended forward, other arm counter-balancing behind',
  ],
  Monk: [
    'crescent kick mid-air, one leg high and horizontal, both arms wide for balance, body sideways to viewer',
    'low one-knee stance with palms cupped together at chest, glowing chi held between the hands',
    'spinning back-fist mid-rotation, one arm whipping through the air, robes trailing in the spin',
    'meditation broken into a forward palm-strike, one hand still in mudra, other punched forward',
    'tiger-claw guard, low crouch, fingers curled like claws, one hand forward and one back',
    'flying knee mid-leap, both feet off the ground, one knee driving forward, arms tucked',
    'open-palm downward chi release, both arms extended toward the ground, energy pouring from the palms into the earth',
    'iron-shirt braced-for-impact, feet rooted, one fist against the chest, other arm blocking outward',
  ],
  Beastmaster: [
    'alongside their companion mid-hunt, both figures leaning forward in matched motion',
    'palm raised commanding a spirit-animal manifesting from mist beside them',
    'kneeling low to a beast in bond, forehead-to-forehead moment with power radiating outward',
    'riding their companion mid-charge, weapon lowered like a lance, wind in the hair',
    'mid-arrow-loose from horseback (or from the back of a beast), bow drawn, mount in stride',
    'companion-defending guard stance, one arm shielding the beast, other arm outstretched at the threat',
    'mid-taming lunge, both hands forward gripping a wild beast\'s spirit, feet braced',
    'campfire-share moment, seated with the beast beside them, both looking at the same distant point, power in the fire between them',
  ],
  Druid: [
    'mid-emerging from the trunk of a living tree, bark peeling around the shoulders as the human silhouette pulls free, roots trailing from the ankles, DEEP-GREEN eye-glow burning through the bark-shadow',
    'arms raised to the sky, MASSIVE ROOTS erupting from the ground in a ring around them and rising up their legs, bark visibly forming along the forearms, deep-green eye-glow',
    'seated at the base of an ancient tree with roots channeling power up through the SPINE, half the body already fused with the trunk, bark on the shoulders and chest',
    'grove-guardian rooted stance, feet FUSED to the ground and becoming tree-trunks, arms wide with branches growing from the shoulders, moss and small ferns on the skin',
    'mid-summoning-a-forest — both palms downward, ancient trees erupting from the ground around them in a widening ring, bark climbing the caster, deep-green eye-glow',
    'mid-blending-BACK-into-a-tree, half the body already wood, human features dissolving into the trunk, roots reaching down',
    'mid-healing-a-forest — palms pressed to a wounded tree, deep-green light flowing from the palms into the bark, moss and new growth spreading from the touch',
    'mid-strangling-a-foe with roots, arms outstretched with a rope of living root snaking from each palm to seize an unseen enemy, bark climbing the caster to the elbow',
  ],
  Necromancer: [
    'mid-cast with a glowing HOLE THROUGH THE CHEST leaking soul-light, one hand raised to summon a spectral figure — the shape of the wound the light escapes through is DIFFERENT than a chest orb, it is a hole',
    'mid-cast with a glowing CRACK running down the sternum, soul-light bleeding from between the ribs, other hand summoning',
    'mid-cast with the JAW SPLIT OPEN and soul-light spilling out of the mouth, hands raised in ritual gesture, ribs partially exposed showing more light within',
    'raising the dead — both hands upward from soil, skeletal hands breaking the ground around them, a glowing SLASH across the caster\'s own ribs from where they paid the price',
    'BONE-FORM half-manifested — one arm fully skeletal, jaw partially bone, exposed spinal-glow, casting with the skeletal hand — Necromancers trade flesh for stronger bone',
    'seated on a throne of bones commanding wraiths, torso partially skeletal with SOUL-LIGHT streaming through the exposed rib gap',
    'mid-drain-of-life, one skeletal palm outstretched toward an unseen target, life-force streaming back toward them and pouring into a glowing wound on their own body',
    'FULL-BONE-CROWN silhouette — the skull visible under stretched skin, hollow eyes glowing with soul-light, jaw split open by inner glow, hands raised in ritual — the price paid is written on the body',
  ],
  Vampire: [
    'mid-mist-transformation, limbs dissolving into black smoke from the fingertips upward',
    'bat-swarm eruption from within an unfurling cloak, dozens of bats spiraling outward',
    'mid-lunge with fangs bared, one hand reaching, cloak flaring behind',
    'cloak-unfurl reveal, arms spread wide inside the cloak, wings-of-cloth catching the light',
    'floating suspended mid-air, feet not touching the ground, cloak hanging still, aura around the head',
    'clawed hand raised commanding blood-mist to rise from the ground toward the palm',
    'mid-blur-of-speed motion trail, body half-erased into the streak of movement, one foot planting',
    'kneeling ritual, drinking from a chalice held in both hands, blood-mist rising around them',
  ],
  Lycanthrope: [
    // Foundation-appropriate: mostly human, subtle tells only.
    'MOSTLY HUMAN character in armor or hunting coat, yellow-gold eyes catching the light, canines slightly elongated at the edges of a subtle smile, faintly pointed ears, prominent knuckles — one hand resting on a weapon or clasp — the beast is BENEATH the skin, not out yet',
    'MOSTLY HUMAN mid-scent-tracking crouched low with one human hand on the earth, yellow-gold eyes lifted toward the viewer, faintly pointed ears pricked, jaw slightly wolfish, no fur yet, no claws yet — pre-transformation stillness',
    'MOSTLY HUMAN standing at the edge of a moonlit forest, moon-silver hair loose, yellow-gold eyes glowing softly, faintly pointed ears, prominent knuckles gripping a hunting spear — the transformation is a whisper, not yet a roar',
    'MOSTLY HUMAN pack-lead stance under the moon, armored coat, wolfish jaw structure, yellow-gold eyes, no claws yet, no fur yet — the leader before the change',
    // Forged-appropriate: hands and feet become wolf-like, fur along forearms and jaw, digitigrade beginning.
    'FORGED transformation — visible FUR along the forearms and jaw, HANDS AND FEET elongated with sharp claws, digitigrade calves beginning, feral posture, wild yellow-gold eyes, torn coat around the shoulders, moon-lit forest background',
    'FORGED mid-slash with elongated wolf-clawed HANDS, spittle flying, fangs bared, fur along the forearms, digitigrade calves visible, torn clothing, moonlit forest behind',
    'FORGED howling toward the moon with muzzle partway extended, thick fur along the jaw and shoulders, hands and feet already fully wolf-clawed, digitigrade stance',
    // Ascendant-appropriate: giant savage wolf.
    'ASCENDANT giant savage wolf-form on all fours — massive wolf the size of a horse with the character\'s fur color, snarling with fangs bared, muscles rippling under thick fur — approaching pure beast form, human silhouette barely present',
  ],
  'Mech Pilot': [
    'STANDING BEFORE THEIR MECH — a massive gundam-class humanoid mech visible in the background at towering scale, pilot in flight-suit gesturing to the mech, mech-weapons visible on the mech-shoulders and mech-arms',
    'INSIDE THE COCKPIT of a MASSIVE MECH — the cockpit interior wraps the pilot, HUD screens all around, hands on the control yokes, and the mech-shell visible around the cockpit frame — the mech HAS to be in the composition',
    'PILOTING THE MECH mid-strike — camera framed so we see both the pilot (visible in the open canopy or through a cockpit window) AND the mech-fist swinging forward, integrated mech-weapons firing, mech HUD lit',
    'MID-EJECT from a battered mech, canopy shattering, one leg still in the seat, the BROKEN MECH visible around them with sparking hydraulics and torn armor plating',
    'STANDING ATOP THE MECH-SHOULDER of a colossal mech, pilot small next to the shoulder-cannon, mech extends down out of frame giving a sense of massive scale, wind in the pilot\'s hair',
    'MID-JUMP-JET from the mech — mech visible mid-thrust, ground scorched by mech-boosters, pilot leaning forward inside the open cockpit visor lit blue',
    'FRONT-LINE with the mech kneeling behind the pilot for repair — pilot in front holding an oversized personal weapon, mech-fist planted like a shield beside them, mech-shoulder guns visible over the pilot\'s head',
    'MID-TARGET-LOCK — HUD reticle superimposed on the pilot\'s face inside the cockpit, mech-shoulder cannons visible outside the canopy, one hand on a weapon trigger — the mech IS in the shot',
  ],
  Android: [
    'mid-transformation with chassis panels opening — BUT one visibly HUMAN eye still behind the optic, and a hand kept intact and human',
    'energy weapon deploying from a forearm with a preserved human FACE turned toward the viewer, remembered scar on the cheek that they refuse to remove',
    'mid-scan analytical stance, head tilted, ocular sensors lit — but ONE hand pressed to the chest holding a small human keepsake (photo, ring, worn cloth)',
    'mid-power-surge with cores glowing at chest and joints, aura extending outward — a human tear on the cheek, human eye behind the glow',
    'kneeling in service to a beloved, one HUMAN HAND (skin still intact) extended offering help, other hand robotic — the humanity is in the offered hand',
    'mid-repair, holding one of their own extracted parts, examining it with a human-faced grief — they remember being flesh',
    'mid-broadcast projecting a hologram from the chest, but the face is a preserved human face and the voice is their own remembered voice',
    'ASCENDANT-only: FULLY TRANSCENDED humanoid form abandoned — chrome-monstrosity or nanite-mist or core-cluster body, no human touchpoints, moved beyond',
  ],
  Seraph: [
    'wings spread mid-descent from above, feet not yet touching ground, sword-of-light drawn',
    'mid-flight banking turn, wings tilted, body twisted, one hand trailing energy',
    'kneeling with sword-of-light planted in the ground, wings folded behind, head bowed',
    'hovering with judgment scales manifested in the air beside them, one hand raised in verdict',
    'mid-diving-strike toward the ground, wings back, sword-of-light forward like a spear',
    'wings folded prayer-stance, both palms together, head bowed, halo burning',
    'ascending pillar-of-light from the feet, wings spread, arms wide, head thrown back',
    'mid-cast summoning a battalion of feathered wings in the sky above and behind them',
  ],
  Human: [
    'signature tool mid-use — the specific tool named in their story, held in the specific way their story implies',
    'mid-cast summoning their signature power — wizard reversing his own age, sage casting from a tower, whatever their story says',
    'mid-strike with signature weapon, weapon-specific stance appropriate to their tool',
    'mid-scroll-reading, one hand on an open scroll or book, other hand raised as power spills from the pages',
    'mid-invention-tinkering, hunched over a mechanical or magical device, tool in one hand, power coalescing at the workbench',
    'mid-teaching stance, one hand raised in explanation, students or apprentices implied at the edges',
    'mid-sprint-with-tool, in motion, weapon or tool carried in one hand, cloak trailing',
    'mid-improvisation-reactive-pose — using an unexpected tool as a weapon or focus, showing quick thinking',
  ],
};

const POSE_CURSOR_PREFIX = 'card-engine-pose-cursor-';

function pickPoseForArchetype(archetype: ArchetypeName): string {
  const pool = ARCHETYPE_POSE_POOLS[archetype];
  if (typeof window === 'undefined') return pool[0];
  const key = `${POSE_CURSOR_PREFIX}${archetype}`;
  const raw = window.localStorage.getItem(key);
  const cursor = raw ? (parseInt(raw, 10) || 0) : 0;
  const pose = pool[cursor % pool.length];
  window.localStorage.setItem(key, String((cursor + 1) % pool.length));
  return pose;
}

/**
 * Rank-scaled elemental spectacle. Every rank is DRAMATIC — ranks scale from
 * eruption at Foundation to cosmic transcendence at Ascendant. There is no
 * "subtle" rank. Reference: Raheem 2026-07-19 — "Foundation shouldn't be
 * standing calmly. Every rank shows active power. The power radiating off
 * of them at Ascendant needs to be ULTIMATE."
 */
// M4.4 — rank spectacle sanitized. Prior version led every rank with
// fire-specific examples ("flame on the arms and shoulders" first in
// Foundation, "flame arm becomes flame torso" in Forged, "fire user = the
// frame burns" in Ascendant). This primed Phoenix to render fire regardless
// of the actual element. Rank scaling is now color/element-agnostic — the
// element-specific manifestation comes from the ELEMENT VISUAL LANGUAGE
// block per Element_Visual_Language_Bible.md.
const ELEMENT_SPECTACLE_BY_RANK: Record<Rank, string> = {
  Foundation:
    'The element MANIFESTS visibly through the character (using the exact colors, lighting, materials, textures, and motion from the ELEMENT VISUAL LANGUAGE block — do NOT default to fire even if the archetype feels fiery). The character is mid-signature-move — a martial strike, a spell mid-cast, a weapon being drawn with the element already in play. Presence is bold, legible, and reaches beyond the body. This is a person who ALREADY commands their power at high visible intensity. Air and ground around them show the first signs of reacting — reaction shaped by the element (Wind = swept debris; Water = ripples; Void = tearing space; Sound = shock rings; etc.).',
  Forged:
    'Element manifestation escalates dramatically — the presence extends far beyond the body, elemental effects deepen and multiply, still expressed through the element\'s locked colors and materials. Environmental reaction is loud in the element\'s own vocabulary (Water = surging; Ice = freezing; Nature = blooming or withering; Void = reality cracking; Storm = torn sky; Metal = orbiting shards; Sound = concentric waves; each per the ELEMENT VISUAL LANGUAGE block). The character\'s body may begin to show archetype-appropriate transformations (Seraph wings starting to unfurl, Lycanthrope claws lengthening, Vampire true-features surfacing, Necromancer half-spectral). Mid-signature-power-move at legendary scale.',
  Ascendant:
    'CATACLYSMIC full manifestation. The world CRUMBLES and REACTS to the character\'s presence — reality tears open, the sky shatters, the ground fractures, the environment collapses toward the element\'s SPECIFIC identity (Void = starless-black tearing reality; Cosmic = space warps and stars orbit; Storm = hurricane sky centered on them; Holy = pillars of light; Water = tsunami; Sound = concentric shock destroying architecture; Wind = green cyclone; Nature = the ground itself bloomed or overgrown — NEVER default to fire unless the element is Fire). The character is EVOLVING BEYOND MORTAL FORM while remaining recognizably the same person — non-human features appropriate to archetype and element MANIFEST VISIBLY (Seraph wings fully spread; Lycanthrope digitigrade wolf form; Vampire mist-and-bats swirling; Necromancer body half-transparent with the veil; Cosmic-element wielder skin lit with constellation patterns; wings, tails, beast features, spectral silhouettes, mist forms all fair game per archetype). Mid-ULTIMATE — a cinematic pose of a legend at peak power unleashing their signature ultimate attack. Bible §Rank continuity still holds: skin tone, base facial structure, ancestry, disability, and scars are the same person; what expands is the power display on top of that identity.',
};

// M4.4 — Leonardo's hard cap is 1500 chars. We leave a 50-char safety
// margin under that. Was 1300 which forced the ELEMENT VISUAL LANGUAGE
// block to be truncated (M4.3 root-cause).
const PORTRAIT_PROMPT_MAX = 1450;
const NEGATIVE_PROMPT_MAX = 400;

/**
 * M3.9 — forced diversity axis. Cycles per-forge via localStorage so a
 * player forging back-to-back cards can't get "handsome young man" three
 * times in a row. Skipped for tier-up / regenerate (identity is locked).
 */
const DIVERSITY_AXES: readonly string[] = [
  'ELDERLY: this character is 60+ years old, with age-lined face, gray or white hair, weathered hands, elder-body posture — power channels through experience, not youth',
  'HEAVYSET / BEEFY: this character has a large, heavy, soft-bodied or barrel-chested frame — substantial belly, wide hips, thick shoulders, real mass — canonically strong through weight not chiseling, power channels through a body society calls unfit',
  'DISABLED / VISIBLY DIFFERENT: this character has a visible disability or physical condition — missing limb with or without prosthetic, using a cane or wheelchair, blind eyes with cloudy irises, scarred face, chronic-illness pallor — power channels through a body that carries limitation',
  'FEMALE MID-LIFE OR LATER: this character is a woman aged 40+ — visible age markers, motherly or grandmotherly bearing, weathered strength, wisdom in the eyes — not a young pin-up',
  'BLACK / DARK-SKINNED AFRICAN OR AFRO-DIASPORIC: this character has deep-brown to dark-brown skin, African or Afro-diasporic features, natural textured hair (locs, coils, braids, close-cropped, headwrap) — canonical to their archetype and culture',
  'SOUTH ASIAN / MIDDLE EASTERN: this character has brown skin, South Asian or Middle Eastern features, culturally-appropriate hair and dress cues — canonical to their archetype',
  'INDIGENOUS / NATIVE / PACIFIC: this character has features from indigenous, Native American, or Pacific Islander heritage, with culturally-resonant details woven into their appearance',
  'GAUNT / SICKLY / ASCETIC: this character is hollow-cheeked, thin from discipline or illness, wiry rather than muscled — power channels through a body that survived hunger',
  'HEAVILY SCARRED: this character\'s face and visible skin carry major scars — burn scars, ritual scars, battle scars — history is written on their body',
  'SHORT AND STOUT: this character is under 5\'4", solidly built, wide and grounded — dwarven proportions or similar — power channels through a body that was underestimated',
  'NON-BINARY / ANDROGYNOUS: this character is visibly androgynous or non-binary in presentation, defying easy male/female read — canonical to their archetype',
  'EMACIATED / STARVATION-THIN: this character is skeletally thin — sunken cheeks, jutting collarbones and ribs, hollow eye-sockets, wiry limbs, the body of someone who paid for their power with hunger, fasting, ritual denial, or long suffering',
  'HEAVILY MUSCLED / BRAWNY: this character has a massive powerlifter build — barrel chest, thick neck, tree-trunk arms, dense torso, real weight-of-body — not lean athletic, actually LARGE',
  'NON-HUMAN FORM: this character is visibly non-human in form appropriate to their archetype — see ARCHETYPE NON-HUMAN FORMS below for the specific manifestation. This is not humanoid-plus-cosmetic; this is a body that no one would mistake for a plain human',
];

/**
 * M4.1 — Archetype-conditional non-human transformations. When the diversity
 * cursor lands on NON-HUMAN FORM, the axis is rewritten with the archetype's
 * specific non-human vocabulary. Some archetypes (Barbarian, Monk, Human,
 * Mech Pilot) are inherently mortal — for them, NON-HUMAN FORM axis falls
 * through to the next axis. Direction from Raheem 2026-07-19.
 */
const ARCHETYPE_NON_HUMAN_FORMS: Record<ArchetypeName, string | null> = {
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
    'the Vampire has stopped pretending to be human — true bat-features (elongated ears, wrinkled nose, exposed fangs), leathery wing-membranes from arms to torso, cloven or clawed feet, mid-mist-transformation. BODY-TYPE PRESERVED: heavyset = barrel-chested bat-lord with heavy wing-membrane and thick torso; gaunt = spectral bat-mist form with wispy limbs; muscular = massive bat-lord with heavy shoulders and powerful wing muscles; elderly = ancient vampire-lord with weathered skin and bone-thin gauntness; the underlying body class is kept',
  Lycanthrope:
    'RANK PROGRESSION IS KEY for Lycans — the character starts mostly human and ENDS as a giant savage wolf. Foundation = MOSTLY HUMAN with only SUBTLE wolfish tells (yellow-gold eyes, slightly elongated canines showing when they smile or snarl, faintly pointed ears, prominent knuckles and jaw structure, hair color that hints at future fur color — NOTHING more transformed than that). Forged = beast features escalate visibly — fur along the forearms and jaw, elongated HANDS AND FEET with claws, digitigrade calves beginning, feral posture, wilder eyes; the hands and feet are where the transformation shows most; background acknowledges the beast (forest, moon, torn earth). Ascendant = giant savage wolf-form with digitigrade wolf-legs, thick fur covering the torso and face (fur color = the character\'s hair color exactly), elongated snout with fangs bared, savage claws, tail lashing — the human silhouette barely present. ABSOLUTELY NEVER WINGS at any rank. ABSOLUTELY NEVER HORNS at any rank — wolves do not have horns, and lycans NEVER have horns. NEVER antlers. NEVER angelic radiance. NEVER pretty or peaceful. BODY-TYPE PRESERVED: heavyset = dire-bear-wolf hybrid with massive shoulders; gaunt = lean sinewy wolf-form; muscular = alpha-wolf massive muscle build; elderly = grizzled silver-fur pack-elder; the underlying body class is kept',
  Android:
    'MOSTLY still humanoid with RETAINED HUMAN TOUCHPOINTS — the humanity is what keeps them sane. Visible anchors REQUIRED: a preserved human face, one still-human eye behind an optic, a remembered scar they refuse to remove, one intact human hand, a heirloom keepsake held tight, human tears, human breath-fog. At Foundation and Forged they should read MORE human than machine. Only at ASCENDANT does the humanoid form fully transcend — chrome-monstrosity, insectoid, multi-cored being, distributed-nanite mist, alien geometry. MACHINE-IDENTITY PRESERVATION (CRITICAL for tier-up): the CHASSIS SILHOUETTE, PLATE PATTERN, OPTIC COLOR, and RETAINED HUMAN TOUCHPOINTS (specific scar, preserved eye behind an optic, kept human hand, engraved maker\'s mark) are all identity anchors — they MUST be echoed VERBATIM across Foundation → Forged → Ascendant, the same way an organic character\'s face and hair are echoed. For Android and other machine archetypes, these anchors live inside hiddenFate.facialStructure (chassis silhouette + plate pattern), hiddenFate.hair (synthetic fiber crop / no hair / etc — WITH the exact color and cropping), hiddenFate.disabilityOrCondition (missing plate / damaged joint / etc), and hiddenFate.scars (dent locations / engraved marks / etc). Those fields are LOCKED across tier-up per Bible §Rank continuity — treat them as machine-identity locks. BODY-TYPE PRESERVED across all ranks: heavyset = tank-form; gaunt = spindle-form; muscular = juggernaut; elderly = weathered veteran-model; the underlying body class is kept',
  Seraph:
    'the winged celestial form — four to six massive feathered wings unfurled (baseline at any rank), a burning halo of gold or fire, extra eyes on the wings or the halo, skin glowing gold from within, feet that do not touch the ground, robes replaced by living light. BODY-TYPE PRESERVED: heavyset = massive winged guardian-angel with substantial body and heavy wing-mass; gaunt = ascetic ascension-form with thin body and delicate wings; muscular = warrior-angel with heavy wings and powerful frame; elderly = ancient watcher with weathered face beneath the halo; the underlying body class is kept',
};
const DIVERSITY_CURSOR_KEY = 'card-engine-diversity-cursor';

function pickDiversityAxis(archetype: ArchetypeName): string {
  if (typeof window === 'undefined') return DIVERSITY_AXES[0];
  const raw = window.localStorage.getItem(DIVERSITY_CURSOR_KEY);
  let cursor = raw ? (parseInt(raw, 10) || 0) : 0;
  // Skip NON-HUMAN FORM axis when the archetype has no non-human form.
  // Advance cursor until we land on an eligible axis. Cap at pool length
  // to avoid infinite loop if somehow every axis were ineligible.
  for (let i = 0; i < DIVERSITY_AXES.length; i++) {
    const candidate = DIVERSITY_AXES[cursor % DIVERSITY_AXES.length];
    const isNonHuman = candidate.startsWith('NON-HUMAN FORM');
    if (!isNonHuman || ARCHETYPE_NON_HUMAN_FORMS[archetype]) break;
    cursor = (cursor + 1) % DIVERSITY_AXES.length;
  }
  let axis = DIVERSITY_AXES[cursor % DIVERSITY_AXES.length];
  // Rewrite NON-HUMAN FORM with the archetype-specific transformation.
  if (axis.startsWith('NON-HUMAN FORM')) {
    const form = ARCHETYPE_NON_HUMAN_FORMS[archetype];
    if (form) {
      axis = `NON-HUMAN FORM (${archetype}): ${form}`;
    }
  }
  window.localStorage.setItem(DIVERSITY_CURSOR_KEY, String((cursor + 1) % DIVERSITY_AXES.length));
  return axis;
}

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
  // M3.8 — anti-hero-body / anti-shirtless-default.
  'shirtless hero', 'bodybuilder torso', 'chiseled abs default',
  'action-hero physique', 'bare-chested when robed archetype',
  'undressed monk', 'undressed wizard', 'undressed necromancer',
  'hero anatomy override', 'young slim default overriding identity',
  'Monk shirtless', 'robes removed', 'clothing stripped for action',
  'muscular young man default', 'muscular young woman default',
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
  'Sound with red or orange flame',
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
  Lightning: ', fire replacing lightning, ember bolts, element changed from Lightning',
  Nature: ', burning forest palette, fire replacing growth, element changed from Nature',
  Shadow: ', bright radiant palette replacing shadow, holy glow, element changed from Shadow',
  Void: ', warm colors in void, fire in the void, radiant light replacing void-black, element changed from Void',
  Spirit: ', fire replacing spirit-glow, orange souls, element changed from Spirit',
  Moon: ', sun-gold replacing moonlight, fire palette, element changed from Moon',
  Blood: ', generic fire replacing blood-crimson, orange flames, element changed from Blood',
  Poison: ', fire replacing toxin-green, ember palette, element changed from Poison',
  Sound: ', fire replacing sound-waves, flame rings, element changed from Sound',
  Time: ', fire replacing temporal gold-silver, ember clock imagery, element changed from Time',
  Cosmic: ', fire replacing star-field, orange nebula, element changed from Cosmic',
  Psychic: ', fire replacing psychic violet, ember mind-energy, element changed from Psychic',
  Tech: ', fire replacing tech-glow, ember circuitry, element changed from Tech',
  Dream: ', fire replacing dream-pastels, ember haze, element changed from Dream',
  Metal: ', fire replacing cold metal sheen, forge-fire dominance, element changed from Metal',
  Earth: ', lava replacing earth-brown, fire palette, element changed from Earth',
  Stone: ', lava replacing stone-gray, fire cracks, element changed from Stone',
  Beast: ', fire replacing beast-natural palette, flaming animal, element changed from Beast',
  Ash: ', open flames replacing cold ash, active fire instead of aftermath, element changed from Ash',
  // Fire itself drifts toward generic orange blobs, not other elements.
  Fire: ', blue magic glow replacing fire, ice palette, element changed from Fire',
};

/** Look up the drift-ban string for an element; empty string if none. */
function buildElementDriftBans(element: ElementName): string {
  return ELEMENT_DRIFT_BANS[element] ?? '';
}

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
// M4.4 — STYLE_ANCHOR sanitized. Prior version said "glowing element-tinted
// energy on hands arms chest skin and hair" which Phoenix interpreted as
// warm orange glow regardless of the actual element (Wind Monk came back
// with orange fire aura). The element's specific colors, lighting, and
// materials now come from the ELEMENT VISUAL LANGUAGE block (prepended
// separately) — this anchor is intentionally element-agnostic.
const STYLE_ANCHOR =
  'fantasy action card illustration, painterly digital art with visible brush texture and semi-realistic rendering, character mid-action performing a signature power move appropriate to their archetype, the character\'s OWN body is the source of the power display per the ELEMENT VISUAL LANGUAGE block (colors, lighting, materials, textures, motion all defined there — do NOT default to warm ember or fire palette), the world REACTS to the character in the element\'s own materials and atmosphere (element-specific — see the ELEMENT VISUAL LANGUAGE block), dynamic cinematic pose with kinetic motion, cloth and hair swept by their own power, particles and debris appropriate to the element in the air around them, waist-up 3/4 body composition, single character centered occupying 55 to 70 percent of frame, entire head fully visible, cinematic rim-light in the element\'s locked color (from the ELEMENT VISUAL LANGUAGE block — NOT a default warm rim), high contrast, painterly-blurred environmental background carrying narrative meaning and element-specific atmosphere, action means MOTION and POWER CHANNELING not physique display, the character wears their canonical garb (Monk in robes, Necromancer robed, Vampire cloaked, elderly wizard fully dressed, heavyset ranger in leathers) even mid-power-move, body type age weight and clothing come from the identity block and OVERRIDE any hero-anatomy default, MODEST POWERFUL PRESENTATION — real armor / real robes / real battle-suit / trench-coat / cape / regalia appropriate to culture; NEVER bras / panties / underwear / lingerie / bikini-armor / chainmail-bikini / cleavage-cutout / hip-cutout / bare-midriff / leotard-armor; the strong do not reveal themselves that way';

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
  diversityAxis?: string;
  requiredPose?: string;
  elementQuirk?: string | null;
  retryAttempt?: number;
}): string {
  const { archetype, stats, answers, element, overallRank, existingName, existingHiddenFate, abilitySlotToFill, existingAbilityRefs } = input;
  const c = getBibleChapter(archetype);
  const isEvolution = Boolean(existingName);
  const rankProgression = c.rankEvolution[overallRank];
  const continuityNote = c.rankEvolution.continuityNote ?? '';
  const abilityContext = formatAbilityContext(existingAbilityRefs);
  const elementSpectacle = ELEMENT_SPECTACLE_BY_RANK[overallRank];
  const { diversityAxis = '', requiredPose = '', retryAttempt = 1 } = input;
  // M4.9 — retry compression. Attempt 2+ forces off the optional
  // fantasy quirk (drops ~40 chars of output field), attempt 3 also
  // shortens all rotation slice sizes so Claude sees fewer sample
  // strings and writes a shorter portraitPrompt. Bibles themselves
  // are never dropped; only sample slice widths shrink.
  const elementQuirk = retryAttempt >= 2 ? null : (input.elementQuirk ?? null);
  const nameSampleCount = retryAttempt >= 3 ? 3 : retryAttempt >= 2 ? 4 : 6;
  const nameFullCount = retryAttempt >= 3 ? 2 : retryAttempt >= 2 ? 3 : 4;
  const nameRegisterCount = retryAttempt >= 3 ? 1 : retryAttempt >= 2 ? 2 : 3;

  // M4.5 — Fantasy Character Naming Bible. Skipped on evolution because
  // existingName is locked (Bible §5 rule 1: "Never rename an evolving
  // character"). For fresh forges, we build a per-archetype naming block
  // with rotating sample slices + recent-name avoidance + banned tropes +
  // rank-appropriate epithet guidance.
  const namingGuide = existingName ? null : NAMING_BIBLE[archetype];
  const namingOffset = existingName ? 0 :
    (typeof window !== 'undefined'
      ? (parseInt(window.localStorage.getItem('card-engine-naming-offset') || '0', 10) || 0)
      : 0);
  if (!existingName && typeof window !== 'undefined') {
    window.localStorage.setItem('card-engine-naming-offset', String(namingOffset + 1));
  }
  const rotatedSampleNames = namingGuide
    ? rotateSlice(namingGuide.sampleNames, namingOffset * 3, nameSampleCount)
    : [];
  const rotatedFullNames = namingGuide
    ? rotateSlice(namingGuide.sampleFullNames, namingOffset * 2, nameFullCount)
    : [];
  const rotatedRegisters = namingGuide
    ? rotateSlice(namingGuide.culturalRegisters, namingOffset, nameRegisterCount)
    : [];
  const recentNamesStr = formatRecentForPrompt(getRecentNames(), 15);
  const rankKey = (overallRank === 'Foundation' || overallRank === 'Forged' || overallRank === 'Ascendant')
    ? overallRank : 'Foundation';
  // M4.6 — Body & Skin Representation Bible block. Same pattern as
  // namingBlock: skip on evolution (existingHiddenFate wins), rotate a
  // subset per forge via a localStorage cursor, tell Claude the
  // composition formula + archetype pool + skin decomposition.
  const bodySkinOffset = existingHiddenFate ? 0 :
    (typeof window !== 'undefined'
      ? (parseInt(window.localStorage.getItem('card-engine-bodyskin-offset') || '0', 10) || 0)
      : 0);
  if (!existingHiddenFate && typeof window !== 'undefined') {
    window.localStorage.setItem('card-engine-bodyskin-offset', String(bodySkinOffset + 1));
  }
  const diversityAxisLabel = diversityAxis ? (diversityAxis.split(':')[0] || 'unspecified') : 'no axis (tier-up)';
  const bodySkinBlock = existingHiddenFate ? '' : assembleBodySkinBlock(archetype, bodySkinOffset, diversityAxisLabel);

  // M4.7 — Hair & Fashion block. Skipped on evolution (existingHiddenFate.hairDetail
  // and .fashion are preserved verbatim per Bible §Preservation). Independent
  // cursor per archetype so Barbarian #1 lands on variant 0, Barbarian #2 on
  // variant 1, etc. — same pattern as ARCHETYPE_POSE_POOLS (M4.0).
  const fashionCursorKey = `card-engine-fashion-cursor-${archetype}`;
  const hairCursorKey = `card-engine-hair-cursor-${archetype}`;
  const fashionCursor = existingHiddenFate ? 0 :
    (typeof window !== 'undefined'
      ? (parseInt(window.localStorage.getItem(fashionCursorKey) || '0', 10) || 0)
      : 0);
  const hairCursor = existingHiddenFate ? 0 :
    (typeof window !== 'undefined'
      ? (parseInt(window.localStorage.getItem(hairCursorKey) || '0', 10) || 0)
      : 0);
  if (!existingHiddenFate && typeof window !== 'undefined') {
    window.localStorage.setItem(fashionCursorKey, String(fashionCursor + 1));
    window.localStorage.setItem(hairCursorKey, String(hairCursor + 1));
  }
  const hairFashionResult = existingHiddenFate
    ? { block: '', variant: null }
    : assembleHairFashionBlock(archetype, element.element as ElementName, overallRank, fashionCursor, hairCursor);
  const hairFashionBlock = hairFashionResult.block;

  const namingBlock = existingName ? '' : `
=== FANTASY CHARACTER NAMING BIBLE (Raheem v1.0 — enforce for cardName and nameAndTitle) ===
CORE PRINCIPLE: A name is compressed worldbuilding. It should feel like the character existed BEFORE the prompt. Do NOT sample the example names below verbatim — they are showing STRUCTURE, RHYTHM, and CULTURAL DIRECTION only. Generate an ORIGINAL name that fits THIS character's ancestry (from the diversity axis + hiddenFate.skinTone), archetype, and story.

ARCHETYPE NAMING IDENTITY (${archetype}): ${namingGuide?.identity ?? ''}.

CULTURAL DIRECTION (pick ONE that fits the character's ancestry — do NOT default to a Norse/Latin/East-Asian stereotype for this archetype):
${rotatedRegisters.map((r) => `  - ${r}`).join('\n')}

SUITABLE NAME STRUCTURES for ${archetype} (choose ONE):
${(namingGuide?.structures ?? []).map((s) => `  - ${NAME_STRUCTURE_LABELS[s]}`).join('\n')}

EXAMPLE PERSONAL NAMES (for tone/rhythm reference — DO NOT copy verbatim): ${rotatedSampleNames.join(', ')}
EXAMPLE FULL NAMES (for structure/epithet reference — DO NOT copy verbatim): ${rotatedFullNames.join(' ; ')}

BANNED TROPES (project-wide — DO NOT use, no exceptions):
  ${NAMING_BANNED_TROPES.slice(0, 25).join(', ')}
  (and: any "X, Keeper of Y" / "X, the Warden of Y" / "X, Y's Vigil" default epithets — these are the exact tropes we are eliminating)

ARCHETYPE-SPECIFIC AVOID for ${archetype}:
${(namingGuide?.avoid ?? []).map((a) => `  - ${a}`).join('\n')}

EPITHET GUIDANCE (rank = ${rankKey}): ${EPITHET_BY_RANK[rankKey]}

QUALITY REMINDERS:
${NAMING_QUALITY_REMINDERS.map((q) => `  - ${q}`).join('\n')}

RECENT CARD NAMES (do NOT repeat these, do NOT reuse the same first-name shape or ending): ${recentNamesStr || '(none yet — this is an early forge)'}

Before returning cardName + nameAndTitle, verify: (1) does it fit THIS character's specific ancestry/story, not just a generic archetype cliché? (2) is it structurally different from the recent names above? (3) is it FREE of every banned trope? (4) is any epithet EARNED by a specific Story Pillar answer (Foundation: usually no epithet)? If any answer is weak, revise the name.
`;


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

=== REQUIRED DIVERSITY AXIS FOR THIS FORGE ===
${diversityAxis || '(tier-up/regenerate — preserve locked identity above; no new axis required)'}
This axis is REQUIRED for this specific character. hiddenFate MUST reflect it, portraitPrompt IDENTITY BLOCK MUST reflect it, cardName + lore MUST fit a person with this attribute. Do not soften it. Do not skip it. If it conflicts with a Story Pillar answer, weave both — never drop the axis.

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

=== ELEMENT VISUAL LANGUAGE (${element.element}) ===
Sourced from the Element Visual Language Bible. Every field below is BINDING and must be echoed verbatim (or near-verbatim) into the portraitPrompt's element clause. The Bible principle: "Every element should be recognizable EVEN WITHOUT COLOR. A player should identify an element by silhouette, materials, lighting, motion, textures, atmosphere." Color reinforces the element — it does not define it.
THEME: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.theme ?? 'element identity'}
PRIMARY COLORS: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.primaryColors ?? 'element-appropriate'}
SECONDARY COLORS: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.secondaryColors ?? 'element-appropriate'}
ACCENT COLORS: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.accentColors ?? 'element-appropriate'}
MATERIALS: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.materials ?? 'element-appropriate'}
TEXTURES: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.textures ?? 'element-appropriate'}
LIGHTING (CRITICAL — do NOT default to warm ember): ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.lighting ?? 'element-appropriate'}
MOTION: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.motion ?? 'element-appropriate'}
SHAPES / SILHOUETTE: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.shapes ?? 'element-appropriate'}
ATMOSPHERE: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.atmosphere ?? 'element-appropriate'}
SYMBOLISM (optional flavor): ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.symbolism ?? 'element identity'}
AVOID: ${ELEMENT_VISUAL_LANGUAGE[element.element as ElementName]?.avoid ?? 'generic magical energy'}${elementQuirk ? `
FANTASY QUIRK (weave subtly into the frame, small detail not center-of-attention): ${elementQuirk}` : ''}

=== REQUIRED POSE FOR THIS FORGE (${archetype}) ===
${requiredPose || `(tier-up/regenerate — preserve locked identity's pose family; do not switch to an unrelated action)`}
This pose is REQUIRED for this specific character. Do NOT default to a T-pose with fists forward. Do NOT put a glowing orb in each hand. Do NOT mirror the arms symmetrically. Use the pose above and only that pose.

=== RANK ELEMENT SPECTACLE (${overallRank}) ===
${elementSpectacle}

This is a fantasy card BATTLE game. Every card is an action shot — element ERUPTS through the body, character is mid-signature-move, world reacts. The rank determines SCALE, not presence. Even Foundation shows dramatic element manifestation. The player picked "${element.element}" with bond "${element.bond}" — element MUST show on the body per the ELEMENT-TINTED POWER block above, action MUST use the specific pose named in the REQUIRED POSE block above (no substitution, no menu, no T-pose default).

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
${existingHiddenFate.hairDetail ? `- hairDetail (Bible §Preservation — LOCKED verbatim, echo each subfield into hiddenFate.hairDetail AND weave hairDetail.texture + hairDetail.color into portraitPrompt IDENTITY BLOCK):
  - texture: "${existingHiddenFate.hairDetail.texture}"
  - length: "${existingHiddenFate.hairDetail.length}"
  - style: "${existingHiddenFate.hairDetail.style}"
  - color: "${existingHiddenFate.hairDetail.color}"
  - condition: "${existingHiddenFate.hairDetail.condition}"
  - adornment: "${existingHiddenFate.hairDetail.adornment}"
  - facialHair: "${existingHiddenFate.hairDetail.facialHair}"
  - headwearInteraction: "${existingHiddenFate.hairDetail.headwearInteraction}"` : ''}
${existingHiddenFate.fashion ? `- fashion (Bible §Preservation — LOCKED verbatim, echo each subfield into hiddenFate.fashion AND weave fashion.armor + fashion.primaryGarment + fashion.outerLayer into portraitPrompt IDENTITY BLOCK). THE ROLE IS THE SINGLE STRONGEST LOCK. If Foundation was "${existingHiddenFate.fashion.role}", Forged/Ascendant IS "${existingHiddenFate.fashion.role}" — DO NOT flip to a different role, DO NOT bake element color into the armor description (element palette comes from the ELEMENT VISUAL LANGUAGE block only):
  - role: "${existingHiddenFate.fashion.role}"  (verbatim — no flipping)
  - primaryGarment: "${existingHiddenFate.fashion.primaryGarment}"  (verbatim; rank may add polish/wear but NOT change the base garment)
  - armor: "${existingHiddenFate.fashion.armor ?? ''}"  (verbatim; if Foundation had no armor, do not invent new armor at Forged; if Foundation had a specific armor, keep it verbatim)
  - waist: "${existingHiddenFate.fashion.waist}"  (verbatim)
  - outerLayer: "${existingHiddenFate.fashion.outerLayer ?? ''}"  (verbatim)
  - footwear: "${existingHiddenFate.fashion.footwear}"  (verbatim)
  - materials: [${existingHiddenFate.fashion.materials.map((m) => `"${m}"`).join(', ')}]  (same list, verbatim)
  - wear: "${existingHiddenFate.fashion.wear}"  (verbatim base; rank may add scuffs)
  - signatureAccessory: "${existingHiddenFate.fashion.signatureAccessory}"  (verbatim)
${existingHiddenFate.fashion.baseLayer ? `  - baseLayer: "${existingHiddenFate.fashion.baseLayer}"  (verbatim)` : ''}
${existingHiddenFate.fashion.structuralLayer ? `  - structuralLayer: "${existingHiddenFate.fashion.structuralLayer}"  (verbatim)` : ''}
${existingHiddenFate.fashion.rankSignal ? `  - rankSignal: "${existingHiddenFate.fashion.rankSignal}"  (verbatim base; rank may deepen)` : ''}
${existingHiddenFate.fashion.armAndHandTreatment ? `  - armAndHandTreatment: "${existingHiddenFate.fashion.armAndHandTreatment}"  (verbatim)` : ''}` : ''}

IF you write anything in portraitPrompt or hiddenFate that contradicts an anchor above, you have failed the Bible §Rank continuity rule. Failure examples that will be REJECTED:
- Foundation bodyType "heavyset with barrel chest" → Ascendant portraitPrompt describes "slim" / "elegant" / "narrow-shouldered" / "warrior figure"
- Foundation disability "prosthetic left leg" → Ascendant portraitPrompt shows both legs
- Foundation scars "burn scar across left cheek" → Ascendant portraitPrompt shows unmarked skin
- Foundation fashion.role "practical" + element "Storm" → Forged portraitPrompt bakes "ember-red inner glow" into the armor description. REJECTED — Storm has NO EMBER, element palette lives in the ELEMENT VISUAL LANGUAGE block ONLY.
- Foundation fashion.role "heroic" + element "Nature" → Ascendant portraitPrompt flips role to "villainous" or bakes "shadow tarnish" into the armor. REJECTED — role is locked verbatim; element flavor is applied by the ELEMENT block, not the fashion description.
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

${bodySkinBlock}
${hairFashionBlock}
${namingBlock}

Return ONLY a JSON object with these fields:

{
  "cardName": ${existingName ? `MUST be exactly "${existingName}" — do not change.` : `the character BASE NAME per the FANTASY CHARACTER NAMING BIBLE block above — original, culturally coherent with the character ancestry + archetype + story, NOT a sample from the block, NOT a banned trope. Usually 1-2 words. Foundation-rank characters may have JUST a personal name.`},
  "nameAndTitle": "the character DISPLAY NAME per the Bible §5 name structures. Foundation = usually just the base name or personal+family/clan/order. Forged/Ascendant = MAY include an epithet if earned by story pillar answers. Do NOT default to \\"X, Keeper of Y\\" or \\"X, the Warden\\" or \\"X, of the Vigil\\" — those are banned tropes. If no epithet is earned by lore, just repeat the base name here. Structure examples per archetype are in the Bible block above.",
  "lore": "2-3 sentences of flavor text. Weave the Story Pillar answers into the mood WITHOUT quoting them literally. Reflect the emotional throughline you identified. ${isEvolution ? `Reference the character's growth into ${overallRank} — same person, deepened by trials.` : ''}",
  "portraitPrompt": "single dense comma-separated Leonardo prompt under ${PORTRAIT_PROMPT_MAX} characters. Construct it in this ORDER:\\n  1. STYLE_ANCHOR verbatim — open with: \\"${STYLE_ANCHOR}\\"\\n  2. IDENTITY BLOCK — MUST open with the literal phrase 'SAME PERSON RULE:' then verbatim age/sex/bodyType/skinTone/facialStructure/hair/disabilityOrCondition/scars ${existingHiddenFate ? 'from LOCKED HIDDEN FATE above (verbatim)' : 'from the Hidden Fate you inferred'}.${existingHiddenFate?.fashion || existingHiddenFate?.hairDetail ? ` THEN — because this is a tier-up — append the LOCKED WARDROBE + HAIR clause verbatim: 'wearing ${existingHiddenFate?.fashion?.primaryGarment ?? ''}${existingHiddenFate?.fashion?.armor ? `, armored in ${existingHiddenFate.fashion.armor}` : ''}${existingHiddenFate?.fashion?.outerLayer ? `, ${existingHiddenFate.fashion.outerLayer} over the shoulders` : ''}${existingHiddenFate?.hairDetail ? `, ${existingHiddenFate.hairDetail.texture} ${existingHiddenFate.hairDetail.color} hair ${existingHiddenFate.hairDetail.style}` : ''} — locked from Foundation verbatim, do NOT invent new armor, do NOT change the role, do NOT bake element color into the wardrobe description (element palette comes from the ELEMENT VISUAL LANGUAGE block ONLY). Add ember/warm-glow ONLY if the element is Fire/Blood/Ash/Holy.'.` : ''} Then append verbatim: 'this body is preserved as written, do NOT substitute a slim young hero body, do NOT remove or reduce clothing, do NOT slim or muscle-up or de-age this character, action does NOT mean shirtless or bodybuilder anatomy'. Encode the diversity guardrail above.${existingHiddenFate ? ` Then append verbatim as a distinct clause: 'IDENTITY IMPERATIVE — same character as the previous rank: same skin tone (do NOT lighten, do NOT darken, do NOT shift undertone), same hair color and texture (do NOT restyle to a different color, may show age-silvering only), same ethnicity and ancestry cues, same facial structure and eye color. This is a portrait of the SAME PERSON aged and hardened, not a similar-looking one.'. Leonardo weights early clauses heavier — this identity lock must survive the rank-spectacle and element clauses that follow.` : ''}\\n  3. REQUIRED POSE — write the character mid-EXACTLY-THIS-POSE from the REQUIRED POSE block above. Do NOT paraphrase into a T-pose. Do NOT put a glowing orb in each fist. Do NOT mirror the arms symmetrically.\\n  4. ELEMENT VISUAL LOCKDOWN — pull COLORS, TEXTURE, BODY TELL, ENVIRONMENT, and ANTI-CONTAMINATION verbatim from the ELEMENT VISUAL LOCKDOWN block above; the element manifests through those exact colors and texture on the body and in the environment. Do NOT drift to Phoenix default red-flame + gold-rim palette regardless of element. ${elementQuirk ? `Also weave the FANTASY QUIRK from that block subtly into the frame as a small background detail (not the focal point).` : ''}\\n  5. RANK SPECTACLE — apply the ${overallRank} scaling from the RANK ELEMENT SPECTACLE block above (Foundation erupts already, Forged escalates + environment cracks + non-human features may begin, Ascendant world crumbles + character evolves beyond mortal form with wings/tails/beast features per archetype).\\n  6. Ability spectacle — visual signature of the character's abilities per the EXISTING ABILITIES block, woven into pose or effects.\\n  7. Story-Pillar-derived materials, symbols, and specific objects the answers named.\\n  8. Weather + lighting + environmentDetails from Hidden Fate — should carry elemental echo (fire user in burning environment, void user in cracking reality, etc.).\\n  9. Composition closer — MUST END with: 'entire head fully in frame, eyes and forehead visible, waist-up 3/4 body composition centered'.\\n${overallRank === 'Ascendant' ? "This is a CATACLYSMIC Ascendant portrait — reality crumbles around them, the world reacts to their ultimate, non-human features (wings, tails, beast features, spectral silhouettes, constellation-lit skin, demonic marks) manifest per archetype and element. BUT the same skinTone/bodyType/ancestry/age/scars/disability from LOCKED HIDDEN FATE are preserved — heavyset stays heavyset, elderly stays elderly, disabled stays disabled, ancestry stays ancestry. What EXPANDS is the power display on top of that identity. Bible §Visual quality rule: remove the power effects and the character is still recognizable through silhouette + body + materials + face." : ''} Do NOT contradict any locked identity above.",
  "negativePrompt": "starts with \\"${BASE_NEGATIVE}\\" then add archetype-specific §14 Avoid items and any anti-continuity terms that fit this specific character. Comma-separated, under ${NEGATIVE_PROMPT_MAX} characters.",
  "hiddenFate": {
    "age": "e.g. 'early 60s' — inferred from the answers, LOCKED after this call",
    "sex": "male / female / nonbinary / androgynous — respect the answers where relevant",
    "bodyType": "MUST use the Bible §6 composition formula: 'height + frame + mass distribution + muscle visibility + posture'. Example: 'tall, narrow-framed, soft-bodied, low visible muscle definition, calm upright posture'. Pull vocabulary from the ARCHETYPE BODY POOL and VOCABULARY blocks above. BANNED: the word 'athletic' alone; anything ending in a single trait; any 'V-torso' / 'hourglass' / bodybuilder default.",
    "skinTone": "MUST name depth + undertone + texture + lighting response per Bible §8. Example: 'deep brown skin with warm red undertones, weathered texture, warm reflected light preserving detail'. Do NOT collapse to a single color label like 'tan' or 'olive'. Do NOT flatten dark skin into shadow.",
    "bodyDimensions": {
      "height": "one of: very short / short / below-average height / average height / tall / very tall",
      "frame": "one of: slight / narrow / compact / medium / broad / heavy / long-limbed — each with word 'frame'",
      "mass": "one of the Bible §4.3 mass words: slim / soft-bodied / thick / stocky / broad / heavyset / fat / fleshy / dense / padded / burly / solid / large-bodied — must match the diversity axis constraint",
      "muscleVisibility": "one of: low visible muscle definition / modest muscle definition / functional musculature / thick musculature / highly defined musculature — do NOT default to visible abs",
      "posture": "one of the Bible §4.6 posture words — carriage is part of power: grounded stance / poised posture / stooped but intense / relaxed and immovable / predatory stillness / devotional openness / coiled precision / floating grace / calm upright / regal / commanding"
    },
    "skinPresentation": {
      "depth": "REQUIRED FORMAT: tier + concrete pigment name, TWO words minimum. Examples: 'deep umber-brown', 'medium-deep bronze', 'very deep espresso-black', 'light peach-cream', 'medium olive-tan', 'fair ivory-warm'. Bare tier alone (like 'deep') is BANNED — it's ambiguous and un-verifiable. Tier is one of the Bible §8.1 words (very fair / fair / light / light-medium / medium / medium-deep / deep / very deep). Pigment is a real color/material word (umber-brown / chestnut / espresso-black / bronze / olive / peach-cream / etc.). Pick from FULL range, do NOT bias to light-to-medium.",
      "undertone": "one of the Bible §8.2 undertones: cool / neutral / warm / olive / golden / red-brown / blue-red / peach / bronze / ashy / umber — REQUIRED, do NOT skip",
      "texture": "one or two of the Bible §8.3 textures: smooth / weathered / freckled / sun-worn / scar-marked / dry / luminous / matte / reflective / dewy / roughened / tattooed / painted / vitiligo-patterned / ritual-marked / ash-dusted — do NOT default to 'porcelain smooth' on every character",
      "lightingResponse": "how light behaves on this skin — Bible §8.4. Examples: 'warm reflected highlights across deep brown skin preserving detail', 'cool moonlight over blue-black skin', 'golden reflected light over olive skin', 'soft diffuse light on pale freckled skin'. CRITICAL: darker skin MUST retain detail; never render as silhouette."
    },
    "facialStructure": "specific",
    "hair": "specific",
    "disabilityOrCondition": "if applicable, name it; empty string if not — but Bible diversity mandate says roll for it more than you would by default",
    "posture": "how they hold themselves — reflects role and answers (may echo bodyDimensions.posture)",
    "scars": "specific if any; empty string if none",
    "weather": "reinforces the answers",
    "lighting": "reinforces the answers",
    "clothingConstruction": "materials + repair state per §8",
    "minorAccessories": "small tokens that reference specific answers",
    "environmentDetails": "reinforces the answers",
    "hairDetail": {
      "texture": "Bible §4 bucket + specific descriptor — e.g. 'dense coils', 'thick undulating waves', 'wrapped locs' — NOT 'braided hair' alone",
      "length": "short / shoulder-length / long / very long / clipped",
      "style": "the specific arrangement — e.g. 'high half-knot with two bronze clan rings', 'crown braid with silver thread'",
      "color": "one of Bible §5 colors — natural dark / medium warm / light / gray-age / fantasy (fantasy only through streaks/tips, NOT full-head neon)",
      "condition": "one of Bible §6 conditions — polished / wind-tangled / battlefield-cut / etc. Reflects the character's environment.",
      "adornment": "optional — ONE or TWO intentional pieces (leather cord + bronze clan ring). Empty string if the character wears none.",
      "facialHair": "one of Bible §7 — clean-shaven / stubble / full beard / braided beard / etc. — or 'none' if not applicable",
      "headwearInteraction": "Bible §9 — how hair sits under any hood/helmet/veil/halo. 'none' if no headwear."
    },
    "fashion": {
      "role": "${existingHiddenFate?.fashion?.role ? `MUST equal "${existingHiddenFate.fashion.role}" verbatim — LOCKED from previous rank per Bible §Preservation Rules. DO NOT flip to any other role.` : `MUST equal the REQUIRED FASHION VARIANT role from the HAIR & FASHION block above (${hairFashionResult.variant?.role ?? 'unspecified'})`}",
      "primaryGarment": "${existingHiddenFate?.fashion?.primaryGarment ? `MUST equal "${existingHiddenFate.fashion.primaryGarment}" verbatim — LOCKED. Rank may add polish or wear ONLY in the wear field.` : `the main outfit piece with specific material (Bible §12) — e.g. 'layered indigo wool tunic', 'silk-brocade court coat'`}",
      ${overallRank !== 'Foundation' ? `"baseLayer": "${existingHiddenFate?.fashion?.baseLayer ? `MUST equal "${existingHiddenFate.fashion.baseLayer}" verbatim — LOCKED.` : `the underlayer per Bible §11 — linen shift / quilted gambeson / etc.`}",` : ''}
      ${overallRank !== 'Foundation' ? `"structuralLayer": "${existingHiddenFate?.fashion?.structuralLayer ? `MUST equal "${existingHiddenFate.fashion.structuralLayer}" verbatim — LOCKED.` : `reinforcement between garment + armor — padded vest / arming coat / cotton wrap`}",` : ''}
      "armor": "${existingHiddenFate?.fashion?.armor !== undefined ? `MUST equal "${existingHiddenFate.fashion.armor}" verbatim — LOCKED from previous rank. DO NOT invent a new armor piece; DO NOT bake element color into the armor description.` : (overallRank === 'Foundation' ? 'OPTIONAL at Foundation — Bible §17. Empty string OR a limited piece like reinforced bracers.' : 'Bible §13 armor library — element-neutral defaults ONLY: molded leather cuirass / blackened chain shirt / articulated plate / studded brigandine / lamellar scales / boiled-leather harness. DO NOT bake element color (ember, halo, blood-glow, void-tear) into the armor description — element palette is applied by the ELEMENT VISUAL LANGUAGE block ONLY.')}",
      "waist": "${existingHiddenFate?.fashion?.waist ? `MUST equal "${existingHiddenFate.fashion.waist}" verbatim — LOCKED.` : `sash / belt / cord / harness — Bible §10 waist system`}",
      "outerLayer": "${existingHiddenFate?.fashion?.outerLayer !== undefined ? `MUST equal "${existingHiddenFate.fashion.outerLayer}" verbatim — LOCKED.` : (overallRank === 'Foundation' ? 'OPTIONAL at Foundation — repaired travel mantle / worn cloak / empty string' : 'cape / mantle / ceremonial cloak with construction detail — Bible §17 rank-appropriate')}",
      "footwear": "${existingHiddenFate?.fashion?.footwear ? `MUST equal "${existingHiddenFate.fashion.footwear}" verbatim — LOCKED.` : `specific — Bible §10 — weather-cracked boots / soft training shoes / mag-boots / etc.`}",
      ${overallRank === 'Ascendant' ? `"armAndHandTreatment": "${existingHiddenFate?.fashion?.armAndHandTreatment ? `MUST equal "${existingHiddenFate.fashion.armAndHandTreatment}" verbatim — LOCKED.` : `gauntlets / wrapped forearms / ceremonial gloves — Bible §10.8, Ascendant regalia`}",` : ''}
      "materials": ${existingHiddenFate?.fashion?.materials ? `MUST equal [${existingHiddenFate.fashion.materials.map((m) => `"${m}"`).join(', ')}] verbatim — LOCKED.` : `["array of 2-4 specific Bible §12 textiles — e.g. matte linen, felted wool, boiled leather, blackened iron"]`},
      "wear": "${existingHiddenFate?.fashion?.wear ? `base state from Foundation was "${existingHiddenFate.fashion.wear}"; rank MAY deepen with new scuffs/patches BUT the base descriptor stays and role does NOT flip.` : `Bible §15 wear state — SPECIFIC descriptor (e.g. 'softened by wear', 'blood-stained + hastily stitched', 'moth-eaten + funerary-preserved') — NOT 'battle-worn' alone`}",
      "signatureAccessory": "${existingHiddenFate?.fashion?.signatureAccessory ? `MUST equal "${existingHiddenFate.fashion.signatureAccessory}" verbatim — LOCKED.` : `ONE meaningful piece tied to the character's story — ancestral clasp / house sigil ring / pack-medallion / callsign patch`}",
      ${overallRank !== 'Foundation' ? `"rankSignal": "${existingHiddenFate?.fashion?.rankSignal ? `base from Foundation was "${existingHiddenFate.fashion.rankSignal}"; rank MAY deepen but keep the same insignia.` : `how the character shows standing — earned insignia / clan colors / house crest / order sash — NOT gold-by-default per Bible §17`}",` : ''}
      ${overallRank === 'Ascendant' ? '"magicalOrTechnologicalIntegration": "Ascendant ONLY — how magic/tech is woven INTO the outfit (not glued on) — must use ONLY the element\'s palette from the ELEMENT VISUAL LANGUAGE block above; DO NOT introduce ember/flame/warm-glow unless the element is Fire/Blood/Ash/Holy"' : ''}
    }
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
  /**
   * M4.9 — retry compression level. 1 = full Bible prompt (default),
   * 2 = drop quirk + trim rotation slices, 3 = drop fashion sample
   * fullNames + naming culture-registers + quality reminders. Managed
   * by generateCardTextWithRetry; callers should NOT set this.
   */
  retryAttempt?: number;
}

export async function generateCardText(input: GenerateCardTextInput): Promise<GeneratedText> {
  const overallRank = getOverallRank(input.stats);
  // M4.0 — pick diversity axis + pose OUTSIDE buildPrompt so we can also
  // prepend them to the raw Leonardo prompt Phoenix sees. Tier-up/regen
  // keep locked identity + pose family — skipped.
  const diversityAxis = input.existingHiddenFate ? '' : pickDiversityAxis(input.archetype);
  const requiredPose = input.existingHiddenFate ? '' : pickPoseForArchetype(input.archetype);
  const elementQuirk = input.existingHiddenFate ? null : pickElementQuirk(input.element.element as ElementName);

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
    diversityAxis,
    requiredPose,
    elementQuirk,
    retryAttempt: input.retryAttempt,
  });

  // M4.9 — Haiku for every forge (Foundation, Forged, Ascendant, regen).
  // Sonnet 5 was tested on both fresh and tier-up paths and consistently
  // failed: verbose responses that Leonardo can't use, silently dropping
  // the portraitPrompt field on tier-up (bug root cause), spreading thin
  // across 4 Bibles. Haiku is terser, faster, more reliable, and produced
  // the character diversity Raheem approved in the M4.6 run.
  const model = 'claude-haiku-4-5-20251001';

  try {
    const data = await callAnthropicMessages({
      model,
      // M4.9 — Haiku is the only model now; 6000 fits its response
      // envelope even with 4 Bible blocks + LOCKED HIDDEN FATE echo.
      max_tokens: 6000,
      temperature: 1,
      messages: [{ role: 'user', content: prompt }],
      gameAction: 'forge_card_text',
    });
    if (data.stop_reason === 'max_tokens') {
      throw new Error('Claude output hit max_tokens — JSON is truncated. Bump max_tokens or shrink the prompt.');
    }
    const raw: unknown = data?.content?.[0]?.text;
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new Error(`Claude response missing text content (stop_reason=${data?.stop_reason ?? 'unknown'})`);
    }
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(text) as Partial<GeneratedText>;

    if (!parsed.cardName || !parsed.nameAndTitle || !parsed.lore) {
      throw new Error('Incomplete response — missing lore fields');
    }
    // M4.8 — Sonnet on tier-up was silently dropping portraitPrompt after
    // filling the giant LOCKED HIDDEN FATE echo, and the fallback path
    // used the OLD M3.7 STYLE_ANCHOR with fire-priming language. Enforce
    // portraitPrompt presence so we throw + retry instead of dropping to
    // a stale fallback anchor.
    if (typeof parsed.portraitPrompt !== 'string' || parsed.portraitPrompt.length < 100) {
      throw new Error('Incomplete response — missing or truncated portraitPrompt field');
    }

    // M4.0 — prepend REQUIRED CHARACTER (diversity axis) + REQUIRED POSE to
    // the raw Leonardo prompt so Phoenix reads them FIRST, before STYLE_ANCHOR.
    // M4.4 — ALSO prepend the ELEMENT VISUAL LANGUAGE (colors/lighting/materials/
    // textures/motion) from the Bible so Phoenix cannot fall back to warm ember
    // even if Claude's tail (which would echo the same info) gets truncated.
    // M5.0 — prepend REQUIRED SEX at position 0 above everything. Foundation
    // Barbarian "Amani" rendered masculine despite hiddenFate.sex="female"
    // because the sex field lived only inside Claude's portraitPrompt tail
    // where Phoenix under-weighted it. Now Phoenix reads sex FIRST.
    const finalSex = input.existingHiddenFate?.sex || (parsed.hiddenFate as { sex?: string } | undefined)?.sex || '';
    const sexPrefix = finalSex
      ? `REQUIRED SEX: ${finalSex}. Render clear ${finalSex} presentation. ${
          finalSex === 'female' ? 'Visible breasts, hip line, feminine facial features, feminine musculature. Do NOT default to a masculine warrior body.'
          : finalSex === 'male' ? 'Visible masculine features, jawline, shoulders, chest.'
          : finalSex === 'nonbinary' || finalSex === 'androgynous' ? 'Androgynous features, ambiguous silhouette, defying easy male/female read.'
          : 'Respect the sex written above; do not substitute.'
        } `
      : '';
    const axisPrefix = diversityAxis
      ? `REQUIRED CHARACTER: ${diversityAxis}. This body type IS the character; do not substitute. `
      : '';
    // M4.8 — pose enforcement now fires on tier-up too. Before this, tier-up
    // reverted to the T-pose + orb-per-fist Phoenix default because the
    // anti-language only fired when requiredPose was set (fresh forge only).
    // Tier-up now gets the same anti-T-pose block plus rank-scaled action.
    // M5.0 — archetype-gated rank action. For archetypes with null non-human
    // form (Barbarian, Monk, Mech Pilot, Human — rooted mortals), power at
    // higher ranks manifests through WEAPONS, ARMOR, and ancestral RELICS
    // erupting alongside environmental reaction — NOT wings/tails/bat-mist.
    // Character stays human. Their gear becomes the visible power channel.
    // M5.6 — per-archetype rank scaling. Instead of a generic "wings / tails /
    // bat-mist / bone-form" menu that leaked wings onto Lycans and cosmic-skin
    // onto Necromancers, pull the archetype-specific transformation vocabulary
    // from ARCHETYPE_NON_HUMAN_FORMS. That map now encodes each archetype's
    // rules (Lycan says NEVER wings; Mech Pilot says stay human + scale up
    // the mech; Necromancer says trade flesh for bone; etc.).
    const archetypeForm = ARCHETYPE_NON_HUMAN_FORMS[input.archetype];
    const isRootedMortalArchetype = archetypeForm === null;
    const archetypeTransformation = archetypeForm
      ? `Follow the archetype-specific transformation for ${input.archetype}: ${archetypeForm}`
      : `character stays HUMAN, no wings/tails/bat-mist/bone-form — power erupts through their SIGNATURE WEAPONS (blade blazing with element, hammer wreathed in element, bow drawn with element-arrow), through their ARMOR (runes crackling, plates glowing element-color from inside), through their ANCESTRAL RELICS (heirloom clasp radiating lineage-power, family sigil erupting, ritual paint aglow)`;
    const posePrefix = requiredPose
      ? `REQUIRED POSE: ${requiredPose}. No T-pose, no orb-per-fist, no symmetrical arms. `
      : `RANK-SCALED ACTION: ${
          overallRank === 'Ascendant'
            ? `mid-ULTIMATE cataclysmic action — ${archetypeTransformation} — the world CRUMBLES around them — reality tearing open — Bible §Ascendant CATACLYSM`
            : overallRank === 'Forged'
            ? (isRootedMortalArchetype
                ? 'mid-signature-power-move at legendary scale — character stays HUMAN, no wings/tails/bat-mist — power manifests through their weapons (element crackling along the edge), armor (glowing runes), and ancestral relics (heirloom pieces radiating power) — environment loud in reaction'
                : `mid-signature-power-move at legendary scale — the archetype-specific transformation begins to manifest per: ${archetypeForm} — aura extending far beyond the body — environment loud in reaction`)
            : 'mid-signature-move with element already erupting'
        }. Absolutely NO T-pose, NO orb-per-fist, NO symmetrical arms — the same person from Foundation but the action escalates with rank. `;
    // M5.1 — rank continuity for the element visual. On tier-up (existingHiddenFate
    // present) Phoenix was drifting the element palette across ranks — Storm went
    // from steel-gray+electric-blue at Foundation to warm-orange at Forged and
    // fully lost by Ascendant. Force explicit rank-persistence language.
    // M5.2 — when element is NOT fire-family, add ZERO-TOLERANCE anti-fire language.
    const isFireFamilyElement = ['Fire', 'Blood', 'Ash', 'Holy'].includes(input.element.element);
    const nonFireCatchAll = !isFireFamilyElement
      ? `This character has ZERO connection to fire. NO warm-glow armor. NO ember on the plates. NO orange highlights on the gear. NO fire-lit skin. Everything is ${input.element.element} palette — see ELEMENT VISUAL LANGUAGE block above. If you see fire anywhere in the frame, you have failed this Bible. `
      : '';
    const elementContinuityClause = input.existingHiddenFate
      ? `RANK CONTINUITY: this character's element visual at Foundation was ${input.element.element} with LOCKED palette, materials, and lighting per the Element Visual Language Bible. At ${overallRank} the SAME palette + SAME materials + SAME lighting persist — do NOT drift toward Phoenix defaults, warm ember, or fire-orange. Same Storm colors from Foundation, same Void colors from Foundation, same Nature colors from Foundation — just at escalated scale. ${nonFireCatchAll}`
      : nonFireCatchAll;
    const elementPrefix = `REQUIRED ELEMENT (${input.element.element}): ${assembleElementLockdown(input.element.element as ElementName)}. ${elementContinuityClause}`;
    // M4.8 — Ascendant cataclysm prepend. Bible §Ascendant demands "world
    // crumbles + character evolves beyond mortal form + non-human features"
    // but tier-up was rendering as Forged-with-slight-variation. Force
    // Phoenix to read the cataclysm rule at position 0.
    // M5.0 — archetype-gated Ascendant cataclysm. Barbarian / Monk / Mech
    // Pilot / Human stay HUMAN — no wings/tails/bat-mist. Power expands
    // through their signature weapons, armor, and ancestral relics
    // erupting with cataclysmic energy while the world crumbles around
    // them. The other 7 archetypes still get the non-mortal transformation.
    // M5.6 — archetype-specific cataclysm. Same fix as posePrefix: pull the
    // per-archetype transformation from ARCHETYPE_NON_HUMAN_FORMS so Phoenix
    // never sees a generic wings/tails/cosmic-skin menu that leaks across
    // archetypes.
    const cataclysmPrefix = overallRank === 'Ascendant'
      ? (isRootedMortalArchetype
          ? `ASCENDANT CATACLYSM (Bible §Ascendant — MANDATORY): the world CRUMBLES around them, reality tears open, the sky shatters, the environment collapses toward the element. The character stays HUMAN — no wings, no tails, no bat-mist, no bone-form — but their POWER DISPLAY expands catastrophically THROUGH THEIR GEAR: signature weapons blaze with element-energy, armor reveals hidden power (runes ignited, plates radiating element-color from within), ancestral relics erupt with lineage-power. Same face + body class + skin + hair as Forged. This is cosmic transcendence expressed through their tools of power. `
          : `ASCENDANT CATACLYSM (Bible §Ascendant — MANDATORY) for ${input.archetype}: the world CRUMBLES around them, reality tears open, the sky shatters, the environment collapses toward the element. The archetype-specific transformation FULLY MANIFESTS per: ${archetypeForm}. Same face + body class + skin + hair as Forged (Bible §Rank continuity) but the transformation is complete and the power display expands catastrophically. This is NOT a Forged card with slight variation — this is the archetype's canonical cosmic transcendence. `)
      : '';
    // M4.9 — parsed.portraitPrompt is guaranteed present (M4.8 parse-guard
    // above throws if missing) so no fallback needed. Same for negativePrompt.
    const rawPortraitPrompt = `${sexPrefix}${axisPrefix}${cataclysmPrefix}${posePrefix}${elementPrefix}${parsed.portraitPrompt}`;
    const portraitPrompt = truncateToLimit(rawPortraitPrompt, PORTRAIT_PROMPT_MAX);
    // M5.2 — belt+suspenders anti-warm-glow. If the element is NOT in the
    // fire family, aggressively strip any ember/warm-glow/fire language
    // Phoenix might otherwise interpolate from priors. Storm Barbarian,
    // Nature Druid, etc. get these injected into the negative prompt.
    const fireFamilyElements: readonly string[] = ['Fire', 'Blood', 'Ash', 'Holy'];
    const isFireFamily = fireFamilyElements.includes(input.element.element);
    const warmGlowNegatives = isFireFamily ? '' :
      ', ember-red glow, warm ember lighting, orange rim light, fire aura, warm orange highlights, burning ember effect, glowing coals, molten glow, heat shimmer, flame-lit surface, ember-red inner glow, warm ember on armor';
    // P3 — Element-drift bans on tier-up. Fresh forges let Claude explore;
    // tier-ups must stay locked to the element chosen at Foundation. Each
    // ban names the drift targets Phoenix most commonly reaches for from
    // that source element (observed: Light Seraph → fire visuals). Only
    // fires when existingHiddenFate is present (tier-up, not fresh forge).
    //
    // The appended tails (warm-glow + drift bans) MUST survive the 400-char
    // cap — they're the targeted fixes — so the parsed negative is truncated
    // first to reserve room for them, rather than truncating the whole
    // string tail-first (which would silently delete the bans).
    const elementDriftBans = input.existingHiddenFate
      ? buildElementDriftBans(input.element.element as ElementName)
      : '';
    // Drift bans lead the tail: they're the most targeted fix and must
    // survive even when the combined tails exceed the budget (the warm-glow
    // list is belt+suspenders that BASE_NEGATIVE's M4.2 block already
    // partially covers, so it's the safe one to lose to truncation).
    const appendedTails = elementDriftBans + warmGlowNegatives;
    const parsedNegative = truncateToLimit(
      parsed.negativePrompt ?? BASE_NEGATIVE,
      Math.max(NEGATIVE_PROMPT_MAX - appendedTails.length, 120),
    );
    const negativePrompt = truncateToLimit(parsedNegative + appendedTails, NEGATIVE_PROMPT_MAX);

    // M4.4 debug — log axis + pose + element + prompt head so we can verify
    // enforcement. Element is always logged even on tier-up so we can spot
    // any regression. Remove once aesthetic lands consistently.
    if (diversityAxis || requiredPose || elementPrefix) {
      console.info('[M4.4 forge] axis:', diversityAxis.split(':')[0] || '(locked)');
      console.info('[M4.4 forge] pose:', requiredPose.slice(0, 80) || '(locked)');
      console.info('[M4.4 forge] element:', input.element.element);
      console.info('[M4.4 forge] prompt head (first 500 chars):', portraitPrompt.slice(0, 500));
    }

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

    // M4.5 — record the name in the recent-names history (skip on evolution
    // — existingName already lives in the collection). Also log a collision
    // warning so we notice when Claude ignores the "avoid these" list.
    if (!input.existingName) {
      const collision = detectCollision(cardName);
      if (collision) {
        console.warn(`[M4.5 naming] collision detected — kind=${collision.kind}, new="${cardName}", vs recent="${collision.against.cardName}" (${collision.against.archetype})`);
      }
      recordName({ cardName, nameAndTitle, archetype: input.archetype });
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
    // M4.9 — no more fallback path. Throw up so generateCardTextWithRetry
    // can attempt again with a compressed prompt.
    console.error('[forge] Claude API attempt failed:', err);
    throw err;
  }
}

/**
 * M4.9 — Bible-adhering retry ladder. Wraps generateCardText in up to
 * maxAttempts calls; each retry uses a progressively compressed prompt
 * (via the retryAttempt param). Bibles are never dropped — only sample
 * rotation slices, optional quirks, and reminder blocks are trimmed.
 * If all attempts fail, throws so the caller can surface an error UI
 * and refund crystals. There is NO pre-Bible fallback.
 */
export async function generateCardTextWithRetry(
  input: GenerateCardTextInput,
  maxAttempts = 3,
): Promise<GeneratedText> {
  let lastErr: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await generateCardText({ ...input, retryAttempt: attempt });
      if (attempt > 1) {
        console.info(`[forge] recovered on attempt ${attempt}/${maxAttempts}`);
      }
      return result;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn(`[forge] attempt ${attempt}/${maxAttempts} failed:`, lastErr.message);
    }
  }
  throw new Error(
    `Forge failed after ${maxAttempts} attempts. Last error: ${lastErr?.message ?? 'unknown'}`,
  );
}

// ============================================================================
// Legacy fallback section — REMOVED in M4.9. Prior versions had
// composePortraitFallback() and generateFallbackText() that produced
// "Unnamed X" placeholder cards using the M3.7 STYLE_ANCHOR from
// promptAssembler.ts. Both are gone. Errors bubble up to
// generateCardTextWithRetry which handles retry + compression.
// ============================================================================

// (composePortraitFallback + generateFallbackText deleted — M4.9)

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
