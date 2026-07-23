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
import { ELEMENT_VISUAL_LANGUAGE } from '../data/elementVisualLanguage';
import { assembleBodySkinBlock } from '../data/bodySkinBible';
import { assembleHairFashionBlock, ARCHETYPE_FASHION_GUIDES } from '../data/hairFashionBible';
// Image-generation constants relocated to the Image Engine (2026-07-22
// engine-separation cleanup). The Lore Engine imports back only the two it
// references internally.
import { PORTRAIT_PROMPT_MAX, ARCHETYPE_NON_HUMAN_FORMS } from './imageEngine/imageConstants';
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
import { assemblePortraitPrompt } from './portraitAssembler';
import { resolveLockedSelections, buildCharacterSheet } from './portrait/characterSheetFactory';

/**
 * Image/lore decoupling (2026-07-21). EVERY archetype now has its Leonardo
 * prompt built by the deterministic Image Engine (services/portraitAssembler.ts)
 * from a CharacterSheet. The Lore Engine (this Claude call) returns storyMotifs
 * (resolved visual tokens) and NO portraitPrompt/negativePrompt — those are
 * assembled in TypeScript. The legacy Claude-authored portrait path was removed
 * once the full cast migrated.
 */

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

/**
 * P6 Seraph corruption arc — compact per-path visual anchors. Injected into
 * the generation prompt only when the card is a Seraph whose narrative axis
 * has resolved to a path. Kept short (prompt is near its char budget) and
 * always deferred to rank: Foundation stays plain robes regardless of path;
 * the path signs are earned Forged onward. Mirrors rankEvolution in
 * data/archetypeBible/seraph.ts.
 */
const SERAPH_PATH_ANCHORS: Record<string, string> = {
  good:
    'GOOD PATH — gilded and white ceremonial regalia, radiant gold-and-white light, an intact halo; sacred authority earned through service.',
  fallen:
    'FALLEN PATH — blackened obsidian regalia, radiance replaced by molten black light (Infernal is molten obsidian + black light, NEVER fire-orange), a broken or inverted halo; forsaken authority. NO horned-red-imp, pentagram, or sexy-demoness cliché.',
  balanced:
    "BALANCED PATH — asymmetric split-crown regalia, half gold and half obsidian, mismatched wings; contested authority held on the razor's edge.",
};

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
  Bone: [
    'a single finger-bone worn on a cord at the throat',
    'a hairline crack of soul-light along one cheekbone',
    'a ring of tiny orbiting knuckle-bones near one hand',
  ],
  Nocturne: [
    'a single bat alighting on one shoulder',
    'a thin sliver of blood-moon caught in one eye',
    'a wisp of crimson mist curling from one cuff',
  ],
  Lunar: [
    'a ring of glowing lunar runes orbiting one wrist',
    'a hairline of silver-fire tracing the collarbone',
    'a tiny second moon reflected in each eye',
  ],
  Plasma: [
    'a caged plasma-orb hovering above one open hand',
    'magnetic containment rings humming at the wrist',
    'a hairline arc of plasma flickering across the visor',
  ],
  Nanite: [
    'a trickle of silver nanite-dust reforming a fingertip',
    'a small swarm reshaping a shoulder-plate mid-motion',
    'chrome micro-particles orbiting one hand',
  ],
  Prism: [
    'a small holographic data-mandala rotating above one palm',
    'a thin beam of light splitting into a rainbow at the fingertips',
    'a projected holo-glyph flickering near the temple',
  ],
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
  // Fallen-Seraph exclusive (P4). Kept sparse and tonally restrained —
  // Infernal reads as damnation, not comedy.
  Infernal: [
    'a snuffed votive candle still smoking at their feet',
    'a cracked oath-seal hanging from a chain on their belt',
    'a single white feather charring at the edges as it falls',
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
    // Fresh-forge (Foundation) poses — the pool never fires on tier-up, so
    // keep these newly-turned-appropriate: power present but not sovereign.
    'high-collar-coat vampire on a fog-choked gothic street at night, red eyes glowing, crimson blood-ribbons coiling from one raised hand',
    'commanding stance with both hands weaving thin crimson blood-ribbons into an arc, cloak flaring, bats scattering behind',
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
// block, sourced from data/elementVisualLanguage.ts (the real source; there
// is no Element_Visual_Language_Bible.md — the .md was never created).
export const ELEMENT_SPECTACLE_BY_RANK: Record<Rank, string> = {
  Foundation:
    'The element MANIFESTS visibly through the character (using the exact colors, lighting, materials, textures, and motion from the ELEMENT VISUAL LANGUAGE block — do NOT default to fire even if the archetype feels fiery). The character is mid-signature-move — a martial strike, a spell mid-cast, a weapon being drawn with the element already in play. Presence is bold, legible, and reaches beyond the body. This is a person who ALREADY commands their power at high visible intensity. Air and ground around them show the first signs of reacting — reaction shaped by the element (Wind = swept debris; Water = ripples; Void = tearing space; Sound = shock rings; etc.).',
  Forged:
    'Element manifestation escalates dramatically — the presence extends far beyond the body, elemental effects deepen and multiply, still expressed through the element\'s locked colors and materials. Environmental reaction is loud in the element\'s own vocabulary (Water = surging; Ice = freezing; Nature = blooming or withering; Void = reality cracking; Storm = torn sky; Metal = orbiting shards; Sound = concentric waves; each per the ELEMENT VISUAL LANGUAGE block). The character\'s body may begin to show archetype-appropriate transformations (Seraph wings starting to unfurl, Lycanthrope claws lengthening, Vampire true-features surfacing, Necromancer half-spectral). Mid-signature-power-move at legendary scale.',
  Ascendant:
    'CATACLYSMIC full manifestation. The world CRUMBLES and REACTS to the character\'s presence — reality tears open, the sky shatters, the ground fractures, the environment collapses toward the element\'s SPECIFIC identity (Void = starless-black tearing reality; Cosmic = space warps and stars orbit; Storm = hurricane sky centered on them; Holy = pillars of light; Water = tsunami; Sound = concentric shock destroying architecture; Wind = green cyclone; Nature = the ground itself bloomed or overgrown — NEVER default to fire unless the element is Fire). The character is EVOLVING BEYOND MORTAL FORM while remaining recognizably the same person — non-human features appropriate to archetype and element MANIFEST VISIBLY (Seraph wings fully spread; Lycanthrope digitigrade wolf form; Vampire mist-and-bats swirling; Necromancer body half-transparent with the veil; Cosmic-element wielder skin lit with constellation patterns; wings, tails, beast features, spectral silhouettes, mist forms all fair game per archetype). Mid-ULTIMATE — a cinematic pose of a legend at peak power unleashing their signature ultimate attack. Bible §Rank continuity still holds: skin tone, base facial structure, ancestry, disability, and scars are the same person; what expands is the power display on top of that identity.',
};


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
 * Ascendant Lycanthrope pack backdrop (Tori, lore director, 2026-07-20 —
 * proposal f67e3513, parked for Raheem). Only a pack-facing role shows the
 * pack, so the wolves read as EARNED by the character's story rather than
 * decorating every Ascendant card. Kept distant, silhouetted, and out of
 * focus so it never fractures the single-subject framing or duplicates the
 * protagonist. Gated by optionId (stable), not by answer text.
 */
/**
 * Vampire Layer-D escalation — Bible §Vampire §9 sanctioned exception
 * (proposal 759007cb + Raheem direction 2026-07-20). Vampires run the arc
 * BACKWARD from Lycanthrope: they begin closest to the beast and END most
 * human. Foundation = feral, half-sentient predator (~1/3 of fresh forges,
 * gated below) or a barely-holding-on mortal-passing turn; Forged = composed
 * humanoid vampire; Ascendant = sentient blood-sovereign (see
 * ARCHETYPE_NON_HUMAN_FORMS.Vampire). Wings are permitted at every form —
 * the feral↔sovereign contrast is bearing + sentience, not wing presence.
 */
/** ~1/3 of fresh Vampire Foundation forges manifest the feral beast form
 *  (the render-side feral pose lives in the Vampire portrait hook; this gate
 *  only informs the Claude text/storyMotifs context). */
const VAMPIRE_FERAL_CHANCE = 1 / 3;

/**
 * Gothic-night setting directive, per rank. Vampires exist at night and in
 * sinister places — NEVER daylight (Bible §Vampire §14 avoid). This is the
 * first archetype-scoped background directive; if it proves out, the pattern
 * generalizes (Raheem plans per-archetype specifics for the full cast).
 */
/**
 * Per-element spectacle staging for Vampires (proposal 759007cb + the
 * 2026-07-21 image/lore-decoupling direction). Every Vampire card flaunts a
 * MAXIMAL spectacle of its SPECIFIC element (Blood, Shadow, or Void), and the
 * spectacle GROWS per rank via an escalating power lexicon — a growing VERB
 * (motion) + growing NOUN (mass):
 *   Blood:  splash→wave→tide      / leach→drain→extraction
 *   Shadow: seep→shroud→eclipse   / dim→smother→devour
 *   Void:   fracture→rift→collapse / flicker→unravel→erase
 * This is IMAGE-only — it must never touch lore/name/title. It replaces the
 * generic "cataclysm" reframe for Vampire (a code invention, not Bible canon)
 * which was fighting the composed-sovereign lore AND truncating the element
 * block off the prompt. One element-accuracy anchor per tier holds Blood as
 * wet liquid (never fire — Blood is in the fire-family allowlist, so the
 * anti-warm-glow negatives do NOT fire for it) and Shadow/Void as cold
 * (never warm), replacing the old repetitive "NOT ember NOT orange" spam.
 */
/**
 * Presence-growth clause (2026-07-21). Bearing, scale, and command grow with
 * rank as part of the power flaunt — but identity is RE-LOCKED here so the
 * escalation lands in AUTHORITY, never in de-aging/beautifying the person.
 */
/**
 * Vampire override for the generic ELEMENT_SPECTACLE_BY_RANK. The shared map's
 * Ascendant entry is the "CATACLYSMIC / world crumbles / mist-and-bats /
 * wings-tails-beast" language that the 2026-07-21 direction removes for
 * Vampire. Here the escalation lives in the ELEMENT at full scale + the
 * sovereign's PRESENCE, never world-destruction or forced beast morphology.
 */
const VAMPIRE_ELEMENT_SPECTACLE_BY_RANK: Record<Rank, string> = {
  Foundation:
    'The element MANIFESTS visibly through the vampire (exact colors, lighting, materials, textures, motion from the ELEMENT VISUAL LANGUAGE block). Mid-signature-move, power already commanded at high visible intensity, the night around them beginning to react in the element\'s own vocabulary.',
  Forged:
    'Element manifestation escalates dramatically — presence extends far beyond the body, elemental effects deepen and multiply in the element\'s locked colors and materials, the gothic night loud in reaction. Bearing grows more commanding. Mid-signature-power-move at legendary scale.',
  Ascendant:
    'The element manifests at MAXIMUM — flooding the frame in its own vocabulary at full scale (Blood = a crimson tide of wet liquid; Shadow = an eclipse of living darkness; Void = reality collapsing to starless black) around a composed BLOOD-SOVEREIGN in absolute command. The spectacle is the ELEMENT at its peak and the sovereign\'s dominating PRESENCE — NOT world-destruction cliché and NOT a feral crouching beast. Mid-ULTIMATE, a legend at peak power. Bible §Rank continuity holds: skin tone, facial structure, ancestry, age, disability, and scars are the same person; what expands is the power display and authority on top of that identity.',
};

const DIVERSITY_CURSOR_KEY = 'card-engine-diversity-cursor';

function pickDiversityAxis(archetype: ArchetypeName): string {
  if (typeof window === 'undefined') return DIVERSITY_AXES[0];
  const raw = window.localStorage.getItem(DIVERSITY_CURSOR_KEY);
  let cursor = raw ? (parseInt(raw, 10) || 0) : 0;
  // Skip NON-HUMAN FORM axis when the archetype has no non-human form.
  // Vampire is ALSO excluded: its non-human form string is the Ascendant
  // blood-sovereign (apex), which must never fire on a Foundation forge —
  // the dedicated ~1/3 feral-Foundation gate covers Vampire instead.
  // Advance cursor until we land on an eligible axis. Cap at pool length
  // to avoid infinite loop if somehow every axis were ineligible.
  for (let i = 0; i < DIVERSITY_AXES.length; i++) {
    const candidate = DIVERSITY_AXES[cursor % DIVERSITY_AXES.length];
    const isNonHuman = candidate.startsWith('NON-HUMAN FORM');
    if (!isNonHuman || (ARCHETYPE_NON_HUMAN_FORMS[archetype] && archetype !== 'Vampire')) break;
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



// STYLE_ANCHOR removed in the 2026-07-22 engine-separation cleanup. It was a
// 1922-char opener written as Haiku-compression guidance for a portraitPrompt
// Claude no longer writes (image assembly is deterministic in portraitAssembler.ts).
// The LIVE style lead is COMPACT_STYLE_LEAD in services/portraitAssembler.ts.

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
  /**
   * Image/lore decoupling — resolved visual tokens from the Story Pillar
   * answers, returned instead of a portraitPrompt for LOCAL_PORTRAIT_ARCHETYPES
   * and consumed by the deterministic assembler. Undefined for the legacy path.
   */
  storyMotifs?: string[];
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
  /** P6 Seraph corruption arc — resolved narrative-axis path (good/fallen/balanced). */
  narrativeAxis?: { path: string };
}): { prompt: string; fashionVariantIndex?: number } {
  const { archetype, stats, answers, element, overallRank, existingName, existingHiddenFate, abilitySlotToFill, existingAbilityRefs } = input;
  const c = getBibleChapter(archetype);
  // P6 — Seraph path anchor block. Only fires for a Seraph whose axis has
  // resolved; other archetypes / legacy cards get an empty string.
  const seraphPathBlock =
    archetype === 'Seraph' && input.narrativeAxis?.path && SERAPH_PATH_ANCHORS[input.narrativeAxis.path]
      ? `\n=== SERAPH ALIGNMENT PATH (${input.narrativeAxis.path}) ===\n${SERAPH_PATH_ANCHORS[input.narrativeAxis.path]}\nRANK GOVERNS VISIBILITY: Foundation stays plain unbleached robes with NO armor/halo/wings/horns/aura regardless of path; the path signs above are earned Forged onward. The six Orders are independent of this alignment axis.\n`
      : '';
  const isEvolution = Boolean(existingName);
  const rankProgression = c.rankEvolution[overallRank];
  const continuityNote = c.rankEvolution.continuityNote ?? '';
  const abilityContext = formatAbilityContext(existingAbilityRefs);
  const elementSpectacle = input.archetype === 'Vampire'
    ? VAMPIRE_ELEMENT_SPECTACLE_BY_RANK[overallRank]
    : ELEMENT_SPECTACLE_BY_RANK[overallRank];
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
  // Which fashion variant (Tradition, for Barbarian) this forge landed on —
  // threaded out so the environment can be coupled to it. undefined on tier-up.
  const rawFashionIdx = hairFashionResult.variant
    ? ARCHETYPE_FASHION_GUIDES[archetype].variants.indexOf(hairFashionResult.variant)
    : -1;
  const fashionVariantIndex = rawFashionIdx >= 0 ? rawFashionIdx : undefined;

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


  const promptText = `You are the generation authority for a fantasy card game. You are following the Character Generation Bible, which is the canonical source of truth. Ignore any prior stylistic conventions from other fantasy games or previous versions of this game.

=== BIBLE GLOBAL RULES (inviolable) ===
- Every archetype supports the full diversity of real bodies: fat, heavyset, soft-bodied, average-built, muscular, lean, wiry, tall and narrow, short and broad, gaunt, sickly, elderly, disabled, scarred, and visibly weathered. Archetype identity comes from culture, history, beliefs, role, equipment, and lived history — NEVER from one required heroic physique.
- Rank progression preserves sex, age, body type, ancestry, disability, physical condition, defining scars, and core identity. Advancement must NOT automatically make a character younger, thinner, more muscular, healthier, less disabled, or more conventionally attractive. What EXPANDS across ranks is the power display on top of that identity — element effects, aura scale, non-human features (wings, tails, spectral silhouettes) appropriate to the archetype and element.
- Player-selected Story Pillar answers are IMMUTABLE generation facts. You may connect and interpret them, but must not ignore, replace, soften, or contradict them.
- Prestige roles (Alpha, Grandmaster, Archdruid, Clan Chief, Blood Regent, and equivalents) emerge from narrative — you do NOT invent one uninvited. If none is warranted, leave the epithet in the range of ordinary earned titles.
- Element rarity affects DISCOVERY FREQUENCY, not power. Do not treat the Rare bucket as "stronger" — it is less common.
- Hidden Fate details you infer must REINFORCE the player's story, not compete with it.

=== DIVERSITY GUARDRAIL (character generation intent) ===
Bible §Character diversity is DESIGN INTENT. When you write hiddenFate.age, hiddenFate.sex, hiddenFate.bodyType, hiddenFate.skinTone, hiddenFate.disabilityOrCondition, hiddenFate.scars — the GOAL IS VARIETY WITH NO SINGLE DOMINANT LOOK. Every kind of person belongs and should surprise the player: elders and children, heavyset and scrawny, muscular and gaunt, disabled and scarred, sly and regal, AND striking young/beautiful people too. A pretty young man, a fat king, a child prodigy, a scrawly old schemer are ALL good cards. Do NOT ban attractive or young — just do not let ANY one body/age/look dominate the set. Surprise is the point.

Great, surprising examples (mix freely — none is "wrong"):
- A child prodigy Mech Pilot barely tall enough for the cockpit
- An old king who became a Lich to keep his throne forever
- A striking, strong-jawed young Seraph in gilded regalia
- A heavyset ranger drawing a bow with the string humming with wind
- A one-armed Seraph with wings burning around a stump-shoulder prosthetic
- A sly fox-faced Vampire aristocrat mid-mist-transformation
- A gray-haired dwarf-heavy Barbarian shouldering a two-handed relic weapon
- A scarred Lycanthrope elder mid-slash with weathered claws

Diverse people wielding cataclysmic power is the through-line — and "diverse" INCLUDES the young and the beautiful. Vary widely; surprise the player.

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
${seraphPathBlock}
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
  "storyMotifs": ["array of 4-8 SHORT concrete visual objects, materials, and symbols the Story Pillar answers imply — e.g. 'a bone-handled ritual dagger', 'a shroud embroidered with the names of the dead', 'a censer trailing violet smoke'. Each under 60 chars, no full sentences. The portrait itself is assembled deterministically in code from your hiddenFate + these motifs — do NOT write a portraitPrompt or negativePrompt, they are not read."],
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
  return { prompt: promptText, fashionVariantIndex };
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
  /**
   * P6/P7 Seraph corruption arc — the card's resolved narrative-axis state.
   * When the archetype is Seraph and a path is present, the prompt injects a
   * compact per-path visual anchor block. Ignored for other archetypes.
   */
  narrativeAxis?: { path: string };
}

export async function generateCardText(input: GenerateCardTextInput): Promise<GeneratedText> {
  const overallRank = getOverallRank(input.stats);
  // M4.0 — pick diversity axis + pose OUTSIDE buildPrompt so we can also
  // prepend them to the raw Leonardo prompt Phoenix sees. Tier-up/regen
  // keep locked identity + pose family — skipped.
  const diversityAxis = input.existingHiddenFate ? '' : pickDiversityAxis(input.archetype);
  // Vampire feral-Foundation gate (Bible §Vampire §9 exception): ~1/3 of
  // FRESH Vampire Foundation forges manifest as the feral, half-sentient
  // beast the vampire will grow out of. Fires only at Foundation on a fresh
  // forge — tier-ups and Forged/Ascendant are always humanoid, so the gate
  // never needs persisting (Forged inherits identity, not the beast form).
  const vampireFeralFires =
    input.archetype === 'Vampire' &&
    !input.existingHiddenFate &&
    overallRank === 'Foundation' &&
    Math.random() < VAMPIRE_FERAL_CHANCE;
  const requiredPose = input.existingHiddenFate
    ? ''
    : vampireFeralFires
      ? 'crouched low on broken masonry in feral bat-beast form, membrane wings half-furled, clawed hands gripping the stone, fangs bared toward the viewer, hungry glowing eyes'
      : pickPoseForArchetype(input.archetype);
  const elementQuirk = input.existingHiddenFate ? null : pickElementQuirk(input.element.element as ElementName);

  const { prompt, fashionVariantIndex } = buildPrompt({
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
    narrativeAxis: input.narrativeAxis,
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


    // Hidden Fate: parse what Claude returned, then enforce Bible §Rank
    // continuity — if the caller passed an existingHiddenFate, locked
    // fields must survive verbatim.
    let hiddenFate = parseHiddenFate(parsed.hiddenFate);
    if (input.existingHiddenFate) {
      hiddenFate = preserveIdentityAcrossRanks(input.existingHiddenFate, hiddenFate);
    }

    // Image/lore decoupling — the Leonardo prompt is built deterministically by
    // the Image Engine from a CharacterSheet, for EVERY archetype. Claude returns
    // storyMotifs (not a portraitPrompt). hiddenFate is finalised (locked anchors
    // merged) BEFORE the sheet is built, so continuity is enforced in TypeScript,
    // not by Claude honoring prose.
    const rawMotifs = (parsed as { storyMotifs?: unknown }).storyMotifs;
    const storyMotifs = Array.isArray(rawMotifs)
      ? rawMotifs.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
      : [];
    // Roll + lock the weapon/companion/environment ids onto hiddenFate (fill-
    // if-absent; tier-up reads the ids preserveIdentityAcrossRanks carried in).
    // Reassigned so the returned hiddenFate persists the ids with the card.
    // Couple the environment to the chosen fashion Tradition (Barbarian): the
    // fashion block recorded which variant it landed on; carry that onto
    // hiddenFate so resolveLockedSelections picks the parallel-ordered
    // environment family. Only on a fresh forge (existing cards keep their id).
    if (!input.existingHiddenFate && fashionVariantIndex !== undefined && hiddenFate.fashionVariantIndex === undefined) {
      hiddenFate = { ...hiddenFate, fashionVariantIndex };
    }
    hiddenFate = resolveLockedSelections(hiddenFate, input.archetype);
    const sheet = buildCharacterSheet(hiddenFate, {
      archetype: input.archetype,
      rank: overallRank,
      resolvedElement: input.element.element,
      elementBond: input.element.bond,
      diversityAxis,
      isEvolution: Boolean(input.existingHiddenFate),
      narrativeAxisPath: input.narrativeAxis?.path,
      abilityRefs: input.existingAbilityRefs ?? [],
      storyMotifs,
    });
    const assembled = assemblePortraitPrompt(sheet);
    const finalPortraitPrompt = assembled.portraitPrompt;
    const finalNegativePrompt = assembled.negativePrompt;

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
      portraitPrompt: finalPortraitPrompt,
      negativePrompt: finalNegativePrompt,
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

